import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

// Necesario para que el browser de autenticación se cierre solo al volver a la app.
WebBrowser.maybeCompleteAuthSession();

// Client ID de tipo "Web application" en Google Cloud Console > Credentials.
// Tiene que ser el mismo que ya está cargado en Supabase > Authentication >
// Providers > Google, campo "Client ID" (no el Client Secret). Ver las
// instrucciones de configuración completas al final de la respuesta.
const GOOGLE_WEB_CLIENT_ID = 'TU_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com';

// Lock a nivel de módulo (no de componente/state) para signInWithGoogle: tiene
// que sobrevivir a re-renders y bloquear igual si el login se dispara desde más
// de una fuente. expo-auth-session ya tiene su propio lock interno (devuelve
// { type: 'locked' } si hay un promptAsync en curso), pero este bail-out
// temprano además evita reconstruir el AuthRequest (nonce, discovery) de
// arranque cada vez que se aprieta el botón sin necesidad.
let googleSignInInFlight = false;

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean; // cargando la sesión inicial
  profileLoading: boolean;
  isOnboardingComplete: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  saveOnboardingData: (data: Partial<Profile>) => Promise<AuthResult>;
  updateProfile: (data: Partial<Profile>) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Id de la última solicitud de perfil "vigente". Como fetchProfile se puede
  // disparar varias veces en paralelo (getSession + onAuthStateChange, o un
  // TOKEN_REFRESHED mientras el usuario completa el onboarding), sin esto una
  // respuesta vieja puede resolver tarde y pisar el perfil recién guardado
  // (ej: rebotar al onboarding después de haberlo completado). Cada llamada
  // a fetchProfile toma su propio id y se descarta si dejó de ser la vigente;
  // saveOnboardingData también invalida las llamadas en vuelo al guardar.
  const requestIdRef = useRef(0);

  // Busca el perfil del usuario. Si no existe (primer login), lo crea vacío
  // para que el flujo pase a la pantalla de Metabolismo Basal.
  const fetchProfile = useCallback(async (userId: string, email: string | null) => {
    const myRequestId = ++requestIdRef.current;
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (requestIdRef.current !== myRequestId) return; // hay una solicitud más nueva, descartar

    if (data) {
      setProfile(data as Profile);
    } else if (!error || error.code === 'PGRST116') {
      const { data: created } = await supabase
        .from('profiles')
        .upsert({ id: userId, email, onboarding_completed: false })
        .select('*')
        .single();

      if (requestIdRef.current !== myRequestId) return; // idem, tras el segundo await
      setProfile((created as Profile) ?? null);
    }
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      if (current?.user) {
        fetchProfile(current.user.id, current.user.email ?? null);
      }
      setLoading(false);
    });

    // Solo refetcheamos el perfil en eventos que realmente pueden cambiarlo o
    // representan un login nuevo. TOKEN_REFRESHED ocurre periódicamente en
    // background y no debería disparar una nueva consulta.
    const RELEVANT_EVENTS = new Set(['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED']);

    const { data: listener } = supabase.auth.onAuthStateChange((event, current) => {
      setSession(current);
      if (!current?.user) {
        setProfile(null);
        return;
      }
      if (RELEVANT_EVENTS.has(event)) {
        fetchProfile(current.user.id, current.user.email ?? null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [fetchProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }, []);

  // Discovery document OIDC de Google (endpoints de authorize/token/etc.).
  // Se resuelve una sola vez por montaje del AuthProvider y se cachea acá.
  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    // Si ya hay un flujo de Google en curso, ignorar por completo este llamado
    // en lugar de arrancar un segundo intento solapado (ver comentario del
    // lock arriba).
    if (googleSignInInFlight) {
      return { error: null };
    }
    if (!discovery) {
      // El discovery document todavía no terminó de cargar (pasa en el primer
      // render); es un estado transitorio, no debería durar más que un instante.
      return { error: 'Todavía se está preparando el login de Google. Probá de nuevo en un segundo.' };
    }
    googleSignInInFlight = true;

    try {
      const redirectUri = AuthSession.makeRedirectUri({ path: 'auth/callback' });
      if (__DEV__) {
        // Tiene que coincidir EXACTO con un URI autorizado en Google Cloud
        // Console > Credentials > (el Client ID de arriba) > Authorized
        // redirect URIs. En Expo Go cambia con la IP/puerto de Metro.
        console.log('[OAuth] redirectUri:', redirectUri);
      }

      // Nonce anti-replay del id_token: el hash (SHA-256) se manda a Google y
      // queda embebido tal cual en el claim "nonce" del id_token devuelto; el
      // valor crudo se lo pasamos después a signInWithIdToken, que lo vuelve a
      // hashear del lado del servidor y compara contra ese claim.
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_WEB_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
        usePKCE: false, // no hay intercambio de "code" del lado del cliente: pedimos el id_token directo
        extraParams: { nonce: hashedNonce },
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'error') {
        const message =
          result.error?.message ?? result.params.error_description ?? 'No se pudo iniciar sesión con Google';
        if (__DEV__) {
          console.log('[OAuth] Google devolvió un error:', message, result.params);
        }
        return { error: message };
      }

      if (result.type !== 'success') {
        // 'cancel' | 'dismiss' | 'locked': el usuario cerró el browser o ya
        // había un intento en curso. No lo mostramos como error.
        return { error: null };
      }

      const idToken = result.params.id_token;
      if (!idToken) {
        if (__DEV__) console.log('[OAuth] respuesta success sin id_token:', result.params);
        return { error: 'Google no devolvió un id_token válido' };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
        nonce: rawNonce,
      });

      if (error && __DEV__) {
        console.log('[OAuth] signInWithIdToken error:', error.message);
      }

      return { error: error?.message ?? null };
    } finally {
      googleSignInInFlight = false;
    }
  }, [discovery]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const saveOnboardingData = useCallback(
    async (data: Partial<Profile>): Promise<AuthResult> => {
      if (!session?.user) return { error: 'No hay sesión activa' };
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({ ...data, onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq('id', session.user.id)
        .select('*')
        .single();
      if (!error) {
        requestIdRef.current++; // invalida cualquier fetchProfile en vuelo (no debe pisar este resultado)
        setProfile((updated as Profile) ?? null);
      }
      return { error: error?.message ?? null };
    },
    [session]
  );

  // Edición de perfil desde Fase 4 (a diferencia de saveOnboardingData, no
  // toca onboarding_completed: el onboarding ya está hecho a esta altura).
  const updateProfile = useCallback(
    async (data: Partial<Profile>): Promise<AuthResult> => {
      if (!session?.user) return { error: 'No hay sesión activa' };
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', session.user.id)
        .select('*')
        .single();
      if (!error) {
        requestIdRef.current++; // invalida cualquier fetchProfile en vuelo (no debe pisar este resultado)
        setProfile((updated as Profile) ?? null);
      }
      return { error: error?.message ?? null };
    },
    [session]
  );

  const value: AuthContextValue = {
    session,
    profile,
    loading,
    profileLoading,
    isOnboardingComplete: !!profile?.onboarding_completed,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    saveOnboardingData,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

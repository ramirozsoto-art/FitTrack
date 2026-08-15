import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

// Necesario para que el navegador de autenticación se cierre solo al volver a la app.
WebBrowser.maybeCompleteAuthSession();

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

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    const redirectTo = Linking.createURL('auth/callback');
    if (__DEV__) {
      // Copiar esta URL exacta a Supabase Dashboard > Authentication > URL
      // Configuration > Redirect URLs (usar un wildcard tipo exp://*/--/auth/callback
      // en desarrollo, ya que cambia con la IP/puerto de Expo Go).
      console.log('[OAuth] redirectTo:', redirectTo);
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      return { error: error?.message ?? 'No se pudo iniciar sesión con Google' };
    }

    // Red de seguridad: en algunos dispositivos Android la promesa de
    // openAuthSessionAsync no se resuelve aunque el deep link sí vuelva a la
    // app. Escuchamos el evento de Linking en paralelo y usamos un flag para
    // no intercambiar el mismo código PKCE dos veces (es de un solo uso).
    let exchanged = false;
    const exchangeOnce = async (url: string): Promise<AuthResult> => {
      if (exchanged) return { error: null };
      exchanged = true;
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(url);
      return { error: exchangeError?.message ?? null };
    };

    let linkingResult: AuthResult | null = null;
    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      if (url.startsWith(redirectTo)) {
        exchangeOnce(url).then((res) => {
          linkingResult = res;
        });
      }
    });

    try {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (__DEV__ && result.type !== 'success') {
        console.log('[OAuth] openAuthSessionAsync result:', result.type);
      }
      if (result.type === 'success' && result.url) {
        return await exchangeOnce(result.url);
      }
      // Si el usuario cancela (result.type === 'cancel'/'dismiss') no lo tratamos
      // como error, salvo que el listener de Linking ya haya resuelto el login.
      return linkingResult ?? { error: null };
    } finally {
      linkingSub.remove();
    }
  }, []);

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

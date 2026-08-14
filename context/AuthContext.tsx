import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

  // Busca el perfil del usuario. Si no existe (primer login), lo crea vacío
  // para que el flujo pase a la pantalla de Metabolismo Basal.
  const fetchProfile = useCallback(async (userId: string, email: string | null) => {
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setProfile(data as Profile);
    } else if (!error || error.code === 'PGRST116') {
      const { data: created } = await supabase
        .from('profiles')
        .upsert({ id: userId, email, onboarding_completed: false })
        .select('*')
        .single();
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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => {
      setSession(current);
      if (current?.user) {
        fetchProfile(current.user.id, current.user.email ?? null);
      } else {
        setProfile(null);
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

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      return { error: error?.message ?? 'No se pudo iniciar sesión con Google' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success' && result.url) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (exchangeError) return { error: exchangeError.message };
    }
    // Si el usuario cancela (result.type === 'cancel'/'dismiss') no lo tratamos como error.
    return { error: null };
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
      if (!error) setProfile((updated as Profile) ?? null);
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

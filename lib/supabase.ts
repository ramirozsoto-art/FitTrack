import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { ExpoSecureStoreAdapter } from './secureStoreAdapter';

const supabaseUrl = 'https://loxdkisosbfwedhtpdaa.supabase.co';
const supabaseAnonKey = 'sb_publishable_TUBla8UG_3Qqn8hcWBU4Hw_NCKR9ytB';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Supabase recomienda pausar/reanudar el auto-refresh del token según si la
// app está en primer plano, para no gastar ciclos en background.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
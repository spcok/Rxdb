import { createClient } from '@supabase/supabase-js';

// HARDCODED CREDENTIALS - Bypasses Vite environment variable issues
const SUPABASE_URL = 'https://dgnncauvnzivsxxiifvs.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_r0yjFsdxKolSme2t2iUs4Q_F0zIenxX';

console.log('🌐 [Supabase] Using hardcoded credentials.');

export const isSupabaseConfigured = () => true;

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Verify Realtime module is present
if (typeof (supabase as { channel?: unknown }).channel !== 'function') {
  console.error('🚨 [Supabase] Realtime module failed to initialize! .channel() is missing.');
} else {
  console.log('✅ [Supabase] Realtime module initialized.');
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
}

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => !!supabaseInstance;

/**
 * Lazy-loaded Supabase client.
 * Throws a descriptive error only when accessed if environment variables are missing.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!supabaseInstance) {
      const msg = 'CRITICAL: Supabase environment variables are missing! The application cannot initialize.\n' +
        'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.';
      console.error(msg);
      throw new Error(msg);
    }
    const value = (supabaseInstance as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === 'function') {
      return value.bind(supabaseInstance);
    }
    return value;
  }
});

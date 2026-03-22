import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debugging: These will help you verify if AI Studio is passing the keys
console.log('🛠️ [Supabase Config] URL Found:', !!supabaseUrl);
console.log('🛠️ [Supabase Config] Key Found:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.info('ℹ️ [Supabase] Environment variables are missing. The application will operate in Offline Mode.');
}

// Create the client (it will be null-safe even if variables are missing)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

export const isSupabaseConfigured = () => !!supabaseUrl && !!supabaseAnonKey;
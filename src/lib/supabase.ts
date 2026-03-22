import { createClient } from '@supabase/supabase-js';

// HARDCODED CREDENTIALS - Bypasses Vite environment variable issues
const SUPABASE_URL = 'https://dgnncauvnzivsxxiifvs.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_r0yjFsdxKolSme2t2iUs4Q_F0zIenxX';

console.log('🌐 [Supabase] Using hardcoded credentials.');

export const isSupabaseConfigured = () => true;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
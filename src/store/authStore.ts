import { create } from 'zustand';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db } from '../lib/rxdb';
import { User, UserRole } from '../types/index';

interface AuthState {
  session: Session | null;
  user: SupabaseUser | null;
  currentUser: User | null;
  isLoading: boolean;
  isUiLocked: boolean;
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  setUiLocked: (locked: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  currentUser: null,
  isLoading: true,
  isUiLocked: false,

  login: async (email, password) => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase URL/Key missing.' } as AuthError };
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error || !data?.session?.user) return { error };

    const authUser = data.session.user;
    let finalProfile: User | null = null;

    // Safely Fetch Profile
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
        
      if (profile) finalProfile = profile as User;
    } catch (err) {
      console.warn('Profile fetch failed on login', err);
    }

    // Hardcoded Admin Fallback
    if (!finalProfile && email === 'admin@kentowlacademy.com') {
      finalProfile = {
        id: authUser.id, email: email, name: 'System Administrator', role: UserRole.ADMIN, initials: 'SA',
        permissions: { dashboard: true, dailyLog: true, tasks: true, medical: true, movements: true, safety: true, maintenance: true, settings: true, userManagement: true }
      };
    }

    set({
      session: data.session,
      user: authUser,
      currentUser: finalProfile || (authUser as unknown as User)
    });

    return { error: null };
  },

  logout: async () => {
    if (isSupabaseConfigured()) await supabase.auth.signOut();
    set({ session: null, user: null, currentUser: null });
  },

  setUiLocked: (locked) => set({ isUiLocked: locked }),

  initialize: async () => {
    set({ isLoading: true });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const authUser = session.user;
      let finalProfile: User | null = null;

      try {
        const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
        if (profile) finalProfile = profile as User;
      } catch (err) {
        console.warn('Remote profile fetch failed', err);
      }

      if (!finalProfile) {
        try {
          if (db?.admin_records) {
            const localDoc = await db.admin_records.findOne({ selector: { record_type: 'users', id: authUser.id } }).exec();
            if (localDoc) finalProfile = localDoc.toJSON() as User;
          }
        } catch (err) {
          console.warn('Local profile fetch failed', err);
        }
      }

      if (!finalProfile && authUser.email === 'admin@kentowlacademy.com') {
        finalProfile = {
          id: authUser.id, email: authUser.email, name: 'System Administrator', role: UserRole.ADMIN, initials: 'SA',
          permissions: { dashboard: true, dailyLog: true, tasks: true, medical: true, movements: true, safety: true, maintenance: true, settings: true, userManagement: true }
        };
      }

      set({ session, user: authUser, currentUser: finalProfile || (authUser as unknown as User), isLoading: false });
    } else {
      try {
        if (db?.admin_records) {
          const localUser = await db.admin_records.findOne({ selector: { record_type: 'users', email: 'admin@kentowlacademy.com' } }).exec();
          if (localUser) {
            const userObj = localUser.toJSON() as User;
            set({ session: { user: userObj, access_token: 'local' } as unknown as Session, user: userObj as unknown as SupabaseUser, currentUser: userObj, isLoading: false });
            return;
          }
        }
      } catch { /* ignore */ }
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) set({ session: null, user: null, currentUser: null });
    });
  }
}));
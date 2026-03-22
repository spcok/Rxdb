import { create } from 'zustand';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db } from '../lib/rxdb';
import { User } from '../types/index';

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
      return { 
        error: { 
          message: 'Supabase URL/Key missing in environment.',
          name: 'AuthError',
          status: 500,
          __isAuthError: true,
          code: 'MISSING_ENV'
        } as unknown as AuthError 
      };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  },

  logout: async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    set({ session: null, user: null, currentUser: null });
  },

  setUiLocked: (locked) => set({ isUiLocked: locked }),

  initialize: async () => {
    set({ isLoading: true });
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      set({ session, user: session.user, currentUser: session.user as unknown as User, isLoading: false });
    } else {
      // Fallback for local admin login
      try {
        const localUser = await db.admin_records.findOne({
          selector: { record_type: 'users', email: 'admin@kentowlacademy.com' }
        }).exec();
        
        if (localUser) {
          const userObj = localUser.toJSON() as User;
          set({ 
            session: { user: userObj, access_token: 'local', refresh_token: 'local', expires_in: 3600, token_type: 'bearer' } as unknown as Session, 
            user: userObj as unknown as SupabaseUser, 
            currentUser: userObj, 
            isLoading: false 
          });
        } else {
          set({ isLoading: false });
        }
      } catch {
        set({ isLoading: false });
      }
    }
  }
}));

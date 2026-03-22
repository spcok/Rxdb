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
        error: { message: 'Supabase URL/Key missing.' } as AuthError 
      };
    }
    
    // 1. Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // 2. CRITICAL FIX: If login is successful, update the app state to trigger the redirect
    if (data?.session) {
      set({ 
        session: data.session, 
        user: data.session.user, 
        currentUser: data.session.user as unknown as User 
      });
    }
    
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
    
    // 1. Check for an existing session on load
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

    // 2. CRITICAL FIX: Listen for background auth changes (like token expiration)
    supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        set({ session: newSession, user: newSession.user, currentUser: newSession.user as unknown as User });
      } else {
        set({ session: null, user: null, currentUser: null });
      }
    });
  }
}));
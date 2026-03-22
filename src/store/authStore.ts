import { create } from 'zustand';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '../types/index';
import { db } from '../lib/rxdb';

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

const fetchUserProfile = async (userId: string, email: string): Promise<User | null> => {
  try {
    // 1. Try Supabase
    const { data: profile, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (profile && !error) return profile as User;

    // 2. Fallback for Admin
    if (email === 'admin@kentowlacademy.com') {
      return { id: userId, email, name: 'System Administrator', role: 'ADMIN', initials: 'SA' } as User;
    }

    // 3. Try RxDB
    const localUser = await db?.admin_records?.findOne({
      selector: { record_type: 'user', id: userId }
    }).exec();
    if (localUser) return localUser.toJSON() as User;

  } catch (err) {
    console.error('🔐 [AuthStore] Profile fetch failed:', err);
  }
  return null;
};

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
    
    if (data?.session) {
      // 2. Fetch Profile
      const profile = await fetchUserProfile(data.session.user.id, email);
      
      set({ 
        session: data.session, 
        user: data.session.user, 
        currentUser: profile || (data.session.user as unknown as User)
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
      const profile = await fetchUserProfile(session.user.id, session.user.email || '');
      set({ 
        session, 
        user: session.user, 
        currentUser: profile || (session.user as unknown as User), 
        isLoading: false 
      });
    } else {
      set({ isLoading: false });
    }

    // 2. Listen for background auth changes
    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession) {
        const profile = await fetchUserProfile(newSession.user.id, newSession.user.email || '');
        set({ 
          session: newSession, 
          user: newSession.user, 
          currentUser: profile || (newSession.user as unknown as User) 
        });
      } else {
        set({ session: null, user: null, currentUser: null });
      }
    });
  }
}));
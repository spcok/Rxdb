import { create } from 'zustand';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';
import { db } from '../lib/db';
import { mutateOnlineFirst } from '../lib/dataEngine';
import { processSyncQueue } from '../lib/syncEngine';

interface AuthState {
  session: Session | null;
  user: SupabaseUser | null;
  currentUser: User | null; // Kept for compatibility with existing components
  isLoading: boolean;
  isUiLocked: boolean;
  login: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  logout: () => Promise<void>;
  initialize: () => Promise<(() => void) | void>;
  setUiLocked: (locked: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  currentUser: null,
  isLoading: true,
  isUiLocked: false,

  login: async (email, password) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.session && navigator.onLine) {
      processSyncQueue().catch(err => console.error('🛠️ [Auth Store] Initial login sync failed:', err));
    }

    return { error };
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  setUiLocked: (locked) => set({ isUiLocked: locked }),

  initialize: async () => {
    set({ isLoading: true });
    
    try {
      // 1. Try to get session from local storage immediately (fast)
      const { data: { session: localSession } } = await supabase.auth.getSession();
      
      if (localSession?.user) {
        // We have a local session, try to sync role but don't block if offline
        await syncUserRole(localSession.user, set);
        
        if (navigator.onLine) {
          processSyncQueue().catch(err => console.error('🛠️ [Auth Store] Boot sync failed:', err));
        }
      } else {
        // No local session, try a network refresh but with a short timeout
        const getSessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: Session | null }, error: AuthError | null }>((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 2000)
        );
        
        const { data: { session }, error } = await Promise.race([getSessionPromise, timeoutPromise]);
        
        if (error) throw error;
        
        if (session?.user) {
          await syncUserRole(session.user, set);
          
          if (navigator.onLine) {
            processSyncQueue().catch(err => console.error('🛠️ [Auth Store] Network boot sync failed:', err));
          }
        } else {
          set({ session: null, user: null, currentUser: null, isLoading: false });
        }
      }
    } catch (error: unknown) {
      console.warn('🛠️ [Auth QA] Session restoration failed or timed out. Checking local cache.', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('Refresh Token Not Found')) {
        await supabase.auth.signOut();
        set({ session: null, user: null, currentUser: null, isLoading: false });
        return;
      }

      // Fallback to Dexie if we are completely offline and Supabase failed
      try {
        const localUser = await db.users.toCollection().first();
        if (localUser) {
          const mockUser = { id: localUser.id, email: localUser.email } as SupabaseUser;
          const mockSession = { user: mockUser, access_token: 'offline-token' } as Session;
          set({ session: mockSession, user: mockUser, currentUser: localUser, isLoading: false });
        } else {
          set({ session: null, user: null, currentUser: null, isLoading: false });
        }
      } catch {
        set({ session: null, user: null, currentUser: null, isLoading: false });
      }
    }

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((event as any) === 'SIGNED_OUT' || (event as any) === 'USER_DELETED') {
        set({ session: null, user: null, currentUser: null, isLoading: false });
        return;
      }

      if (session?.user) {
        await syncUserRole(session.user, set);
      } else {
        set({ session: null, user: null, currentUser: null, isLoading: false });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },
}));

let isSyncing = false;
async function syncUserRole(supabaseUser: SupabaseUser, set: (state: Partial<AuthState>) => void) {
  if (isSyncing) return;
  isSyncing = true;

  if (!supabaseUser.email) {
    set({ session: null, user: null, currentUser: null, isLoading: false });
    isSyncing = false;
    return;
  }

  try {
    // 1. Check if user exists in Dexie
    let localUser = await db.users.where('email').equals(supabaseUser.email).first();

    if (!localUser) {
      // 1.5 Try fetching from Supabase directly if not in local cache
      const { data: remoteUser, error: remoteError } = await supabase
        .from('users')
        .select('*')
        .eq('email', supabaseUser.email)
        .maybeSingle();
      
      if (remoteUser && !remoteError) {
        localUser = remoteUser as User;
        await db.users.put(localUser);
      } else if (supabaseUser.email === 'admin@kentowlacademy.com') {
        // Bootstrap the primary admin if they exist in Auth but not in the users table
        const newAdmin: User = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: 'System Administrator',
          role: UserRole.ADMIN,
          initials: 'SA',
          permissions: {
            dashboard: true,
            dailyLog: true,
            tasks: true,
            medical: true,
            movements: true,
            safety: true,
            maintenance: true,
            settings: true,
            userManagement: true
          }
        };
        await mutateOnlineFirst('users', newAdmin, 'upsert');
        localUser = newAdmin;
      }
    }

    if (localUser) {
      // Update local user ID if it doesn't match Supabase (e.g. if created manually via email)
      if (localUser.id !== supabaseUser.id) {
        const oldId = localUser.id;
        const updatedUser = { ...localUser, id: supabaseUser.id };
        
        await mutateOnlineFirst('users', updatedUser, 'upsert');
        await mutateOnlineFirst('users', { id: oldId }, 'delete');
        
        localUser = updatedUser;
      }
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError && sessionError.message.includes('Refresh Token Not Found')) {
        await supabase.auth.signOut();
        set({ session: null, user: null, currentUser: null, isLoading: false });
        return;
      }

      set({ 
        session, 
        user: supabaseUser, 
        currentUser: localUser, 
        isLoading: false 
      });
    } else {
      // 2. If localUser does NOT exist, treat as unauthorized
      console.warn('Unauthorized access attempt: User not found in local database', supabaseUser.email);
      await supabase.auth.signOut();
      set({ session: null, user: null, currentUser: null, isLoading: false });
    }
  } catch (error) {
    console.error('Error syncing user role:', error);
    set({ isLoading: false });
  } finally {
    isSyncing = false;
  }
}

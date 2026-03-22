import { create } from 'zustand';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User, UserRole } from '../types';
import { initDatabase } from '../lib/rxdb';

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
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase is not configured', status: 500 } as AuthError };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  },

  logout: async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  },

  setUiLocked: (locked) => set({ isUiLocked: locked }),

  initialize: async () => {
    set({ isLoading: true });
    
    if (!isSupabaseConfigured()) {
      console.warn('🛠️ [Auth Store] Supabase is not configured. Falling back to local cache.');
      try {
        const database = await initDatabase();
        const localUserDoc = await database.admin_records.findOne({ 
          selector: { record_type: 'users' } 
        }).exec();
        
        if (localUserDoc) {
          const localUser = localUserDoc.toJSON() as User;
          const mockUser = { id: localUser.id, email: localUser.email } as SupabaseUser;
          const mockSession = { user: mockUser, access_token: 'offline-token' } as Session;
          set({ session: mockSession, user: mockUser, currentUser: localUser, isLoading: false });
        } else {
          set({ session: null, user: null, currentUser: null, isLoading: false });
        }
      } catch (err) {
        console.error('🛠️ [Auth Store] Local fallback failed:', err);
        set({ session: null, user: null, currentUser: null, isLoading: false });
      }
      return;
    }

    try {
      const { data: { session: localSession } } = await supabase.auth.getSession();
      
      if (localSession?.user) {
        await syncUserRole(localSession.user, set);
      } else {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          await syncUserRole(session.user, set);
        } else {
          set({ session: null, user: null, currentUser: null, isLoading: false });
        }
      }
    } catch (error: unknown) {
      console.warn('🛠️ [Auth QA] Session restoration failed. Checking local cache.', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('Refresh Token Not Found')) {
        await supabase.auth.signOut();
        set({ session: null, user: null, currentUser: null, isLoading: false });
        return;
      }

      // Fallback to RxDB if we are completely offline and Supabase failed
      try {
        const database = await initDatabase();
        const localUserDoc = await database.admin_records.findOne({ 
          selector: { record_type: 'users' } 
        }).exec();
        
        if (localUserDoc) {
          const localUser = localUserDoc.toJSON() as User;
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
      if (event === 'SIGNED_OUT') {
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
    const database = await initDatabase();
    
    // 1. Check if user exists in RxDB admin_records
    const localUserDoc = await database.admin_records.findOne({ 
      selector: { record_type: 'users', email: supabaseUser.email } 
    }).exec();
    
    let localUser = localUserDoc ? localUserDoc.toJSON() as User : null;

    if (!localUser) {
      // 1.5 Try fetching from Supabase directly if not in local cache
      const { data: remoteUser, error: remoteError } = await supabase
        .from('users')
        .select('*')
        .eq('email', supabaseUser.email)
        .maybeSingle();
      
      if (remoteUser && !remoteError) {
        localUser = { ...remoteUser, record_type: 'users' } as User;
        await database.admin_records.upsert(localUser);
      } else if (supabaseUser.email === 'admin@kentowlacademy.com') {
        // Bootstrap the primary admin
        const newAdmin: User = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: 'System Administrator',
          role: UserRole.ADMIN,
          initials: 'SA',
          record_type: 'users',
          permissions: {
            dashboard: true,
            dailyLog: true,
            tasks: true,
            medical: true,
            movements: true,
            safety: true,
            maintenance: true,
            settings: true,
            userManagement: true,
            flightRecords: true,
            feedingSchedule: true,
            attendance: true,
            holidayApprover: true,
            attendanceManager: true,
            missingRecords: true,
            reports: true,
            rounds: true
          }
        };
        await database.admin_records.upsert(newAdmin);
        localUser = newAdmin;
      }
    }

    if (localUser) {
      // Update local user ID if it doesn't match Supabase
      if (localUser.id !== supabaseUser.id) {
        const updatedUser = { ...localUser, id: supabaseUser.id, record_type: 'users' };
        await database.admin_records.upsert(updatedUser);
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

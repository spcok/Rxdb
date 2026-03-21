import { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/db';
import { User, RolePermissionConfig } from '../../types';
import { supabase } from '../../lib/supabase';

export function useUsersData() {
  const [users, setUsers] = useState<User[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  const refresh = useCallback(() => setRefreshCount(c => c + 1), []);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (navigator.onLine) {
          // 1. ONLINE: Fetch absolute truth directly from the Cloud
          const { data: usersData, error: usersErr } = await supabase.from('users').select('*').order('name');
          const { data: rolesData, error: rolesErr } = await supabase.from('role_permissions').select('*');

          if (usersErr) throw usersErr;
          if (rolesErr) throw rolesErr;

          if (isMounted && usersData && rolesData) {
            setUsers(usersData as User[]);
            
            // Sort roles logically from lowest to highest
            const roleOrder = ['VOLUNTEER', 'KEEPER', 'SENIOR_KEEPER', 'ADMIN', 'OWNER'];
            const sortedRoles = (rolesData as RolePermissionConfig[]).sort((a, b) => 
              roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
            );
            setRolePermissions(sortedRoles);

            // 2. Quietly update the offline dictionary in a background transaction
            await db.transaction('rw', db.users, db.role_permissions, async () => {
              await db.users.clear();
              await db.users.bulkAdd(usersData);
              await db.role_permissions.clear();
              await db.role_permissions.bulkAdd(sortedRoles);
            });
          }
        } else {
          // 3. OFFLINE: Load the read-only cache from local DB
          const localUsers = await db.users.toArray();
          const localRoles = await db.role_permissions.toArray();
          if (isMounted) {
            setUsers(localUsers);
            setRolePermissions(localRoles);
          }
        }
      } catch (error) {
        console.error("Cloud fetch failed, falling back to local cache:", error);
        if (isMounted) {
          setUsers(await db.users.toArray());
          setRolePermissions(await db.role_permissions.toArray());
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    
    window.addEventListener('online', refresh);
    return () => { 
      isMounted = false; 
      window.removeEventListener('online', refresh);
    };
  }, [refreshCount, refresh]);

  // --- SECURE USER DELETION PIPELINE ---
  const deleteUser = async (id: string) => {
    if (!navigator.onLine) throw new Error("You must be online to delete a user.");
    
    // Invoke the secure Edge Function to destroy the Auth login and Database profile
    const { data, error } = await supabase.functions.invoke('delete-staff-account', {
      body: { userId: id }
    });

    if (error) throw new Error(`Network Error: ${error.message}`);
    if (data?.error) throw new Error(`Deletion Failed: ${data.error}`);
    
    refresh();
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    if (!navigator.onLine) throw new Error("You must be online to update a user.");
    await supabase.from('users').update(updates).eq('id', id);
    refresh();
  };

  const updateRolePermissions = async (role: string, updates: Partial<RolePermissionConfig>) => {
    if (!navigator.onLine) throw new Error("You must be online to update role permissions.");
    const { error } = await supabase.from('role_permissions').update(updates).eq('role', role);
    if (error) throw error;
    refresh();
  };

  return { users, rolePermissions, isLoading, deleteUser, updateUser, updateRolePermissions, refresh };
}

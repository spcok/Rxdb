import { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/rxdb';
import { User, RolePermissionConfig } from '../../types';
import { supabase } from '../../lib/supabase';

export function useUsersData() {
  const [users, setUsers] = useState<User[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    // No-op with RxDB since it's reactive
  }, []);

  useEffect(() => {
    if (!db) return;

    const subUsers = db.admin_records.find({
      selector: {
        record_type: 'user',
        is_deleted: { $eq: false }
      }
    }).$.subscribe(docs => {
      setUsers(docs.map(d => d.toJSON() as unknown as User));
      setIsLoading(false);
    });

    const subRoles = db.admin_records.find({
      selector: {
        record_type: 'role_permission',
        is_deleted: { $eq: false }
      }
    }).$.subscribe(docs => {
      const rolesData = docs.map(d => d.toJSON() as unknown as RolePermissionConfig);
      const roleOrder = ['VOLUNTEER', 'KEEPER', 'SENIOR_KEEPER', 'ADMIN', 'OWNER'];
      const sortedRoles = rolesData.sort((a, b) => 
        roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
      );
      setRolePermissions(sortedRoles);
    });

    return () => {
      subUsers.unsubscribe();
      subRoles.unsubscribe();
    };
  }, []);

  // --- SECURE USER DELETION PIPELINE ---
  const deleteUser = async (id: string) => {
    if (!navigator.onLine) throw new Error("You must be online to delete a user.");
    
    // Invoke the secure Edge Function to destroy the Auth login and Database profile
    const { data, error } = await supabase.functions.invoke('delete-staff-account', {
      body: { userId: id }
    });

    if (error) throw new Error(`Network Error: ${error.message}`);
    if (data?.error) throw new Error(`Deletion Failed: ${data.error}`);
    
    // Also delete locally
    const doc = await db.admin_records.findOne(id).exec();
    if (doc) {
      await doc.patch({ is_deleted: true, updated_at: new Date().toISOString() });
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    const doc = await db.admin_records.findOne(id).exec();
    if (doc) {
      await doc.patch({
        ...updates,
        updated_at: new Date().toISOString()
      });
    }
  };

  const updateRolePermissions = async (role: string, updates: Partial<RolePermissionConfig>) => {
    const docs = await db.admin_records.find({
      selector: {
        record_type: 'role_permission',
        role: role
      }
    }).exec();
    
    if (docs.length > 0) {
      await docs[0].patch({
        ...updates,
        updated_at: new Date().toISOString()
      });
    }
  };

  return { users, rolePermissions, isLoading, deleteUser, updateUser, updateRolePermissions, refresh };
}

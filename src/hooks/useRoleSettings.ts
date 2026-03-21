import { db } from '../lib/db';
import { UserRole, RolePermissionConfig } from '../types';
import { mutateOnlineFirst, useHybridQuery } from '../lib/dataEngine';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';

const defaultPermissions: Omit<RolePermissionConfig, 'role'> = {
  view_animals: false,
  add_animals: false,
  edit_animals: false,
  archive_animals: false,
  view_daily_logs: false,
  create_daily_logs: false,
  edit_daily_logs: false,
  view_tasks: false,
  complete_tasks: false,
  manage_tasks: false,
  view_daily_rounds: false,
  log_daily_rounds: false,
  view_medical: false,
  add_clinical_notes: false,
  prescribe_medications: false,
  administer_medications: false,
  manage_quarantine: false,
  view_movements: false,
  log_internal_movements: false,
  manage_external_transfers: false,
  view_incidents: false,
  report_incidents: false,
  manage_incidents: false,
  view_maintenance: false,
  report_maintenance: false,
  resolve_maintenance: false,
  view_safety_drills: false,
  view_first_aid: false,
  submit_timesheets: false,
  manage_all_timesheets: false,
  request_holidays: false,
  approve_holidays: false,
  view_missing_records: false,
  view_archived_records: false,
  manage_zla_documents: false,
  generate_reports: false,
  view_settings: false,
  manage_users: false,
  manage_roles: false,
};

export const useRoleSettings = () => {
  const roles = useHybridQuery<RolePermissionConfig[]>(
    'role_permissions',
    supabase.from('role_permissions').select('*'),
    () => db.role_permissions.toArray(),
    []
  );

  useEffect(() => {
    if (roles) {
      const existingRoles = roles.map(r => r.role);
      const missingRoles = Object.values(UserRole).filter(role => !existingRoles.includes(role));

      missingRoles.forEach(role => {
        const newRoleConfig: RolePermissionConfig = {
          role,
          ...defaultPermissions,
        };
        mutateOnlineFirst('role_permissions', newRoleConfig as unknown as Record<string, unknown>);
      });
    }
  }, [roles]);

  const handlePermissionChange = async (role: UserRole, permissionKey: keyof RolePermissionConfig, newValue: boolean) => {
    const roleConfig = roles?.find(r => r.role === role);
    if (!roleConfig) return;

    const updatedConfig = {
      ...roleConfig,
      [permissionKey]: newValue,
    };

    try {
      await mutateOnlineFirst('role_permissions', updatedConfig as unknown as Record<string, unknown>);
    } catch (error) {
      console.error('Failed to update permission:', error);
      alert('Failed to update permission. Please try again.');
    }
  };

  return { roles, handlePermissionChange };
};

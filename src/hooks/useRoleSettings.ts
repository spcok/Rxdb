import { useState, useEffect } from 'react';
import { db } from '../lib/rxdb';
import { UserRole, RolePermissionConfig } from '../types';

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
  const [roles, setRoles] = useState<RolePermissionConfig[]>([]);

  useEffect(() => {
    if (!db) return;

    const sub = db.admin_records.find({
      selector: {
        record_type: 'role_permission',
        is_deleted: { $eq: false }
      }
    }).$.subscribe(docs => {
      setRoles(docs.map(d => d.toJSON() as RolePermissionConfig));
    });

    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    if (roles.length > 0 && db) {
      const existingRoles = roles.map(r => r.role);
      const missingRoles = Object.values(UserRole).filter(role => !existingRoles.includes(role));

      missingRoles.forEach(async role => {
        const newRoleConfig: RolePermissionConfig = {
          role,
          ...defaultPermissions,
        };
        try {
          await db.admin_records.upsert({
            ...newRoleConfig,
            id: `role_${role}`,
            record_type: 'role_permission',
            is_deleted: false,
            updated_at: new Date().toISOString()
          });
        } catch (err) {
          console.error('Failed to create missing role:', err);
        }
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
      await db.admin_records.upsert({
        ...updatedConfig,
        id: `role_${role}`,
        record_type: 'role_permission',
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update permission:', error);
      alert('Failed to update permission. Please try again.');
    }
  };

  return { roles, handlePermissionChange };
};

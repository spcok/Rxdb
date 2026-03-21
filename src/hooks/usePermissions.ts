import { useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { UserRole, RolePermissionConfig } from '../types';
import { useHybridQuery } from '../lib/dataEngine';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';

export function usePermissions() {
  const { currentUser } = useAuthStore();

  const rolePermissions = useHybridQuery<RolePermissionConfig | null>(
    'role_permissions',
    currentUser?.role 
      ? supabase.from('role_permissions').select('*').eq('role', currentUser.role).single()
      : Promise.resolve({ data: null, error: null }),
    async () => {
      if (!currentUser?.role) return null;
      return (await db.role_permissions.get(currentUser.role)) || null;
    },
    [currentUser?.role]
  );

  const permissions = useMemo(() => {
    const role = currentUser?.role || UserRole.VOLUNTEER;
    const isAdminOrOwner = role === UserRole.ADMIN || role === UserRole.OWNER;

    if (isAdminOrOwner) {
      return {
        isAdmin: role === UserRole.ADMIN,
        isOwner: role === UserRole.OWNER,
        isSeniorKeeper: false,
        isVolunteer: false,
        isStaff: true,
        // Granular Permissions
        view_animals: true,
        add_animals: true,
        edit_animals: true,
        archive_animals: true,
        view_daily_logs: true,
        create_daily_logs: true,
        edit_daily_logs: true,
        view_tasks: true,
        complete_tasks: true,
        manage_tasks: true,
        view_daily_rounds: true,
        log_daily_rounds: true,
        view_medical: true,
        add_clinical_notes: true,
        prescribe_medications: true,
        administer_medications: true,
        manage_quarantine: true,
        view_movements: true,
        log_internal_movements: true,
        manage_external_transfers: true,
        view_incidents: true,
        report_incidents: true,
        manage_incidents: true,
        view_maintenance: true,
        report_maintenance: true,
        resolve_maintenance: true,
        view_safety_drills: true,
        view_first_aid: true,
        submit_timesheets: true,
        manage_all_timesheets: true,
        request_holidays: true,
        approve_holidays: true,
        view_missing_records: true,
        manage_zla_documents: true,
        generate_reports: true,
        view_settings: true,
        manage_users: true,
        manage_roles: true,
        // Compatibility aliases
        canViewAnimals: true,
        canEditAnimals: true,
        canViewMedical: true,
        canEditMedical: true, // This is fine for Admin/Owner
        canViewReports: true,
        canManageStaff: true,
        canEditSettings: true,
        canViewSettings: true,
        canGenerateReports: true,
        canManageUsers: true,
        canViewMovements: true,
        canEditMovements: true,
        role
      };
    }

    return {
      isAdmin: false,
      isOwner: false,
      isSeniorKeeper: role === UserRole.SENIOR_KEEPER,
      isVolunteer: role === UserRole.VOLUNTEER,
      isStaff: [UserRole.SENIOR_KEEPER, UserRole.KEEPER].includes(role),
      // Granular Permissions from DB
      view_animals: rolePermissions?.view_animals ?? false,
      add_animals: rolePermissions?.add_animals ?? false,
      edit_animals: rolePermissions?.edit_animals ?? false,
      archive_animals: rolePermissions?.archive_animals ?? false,
      view_daily_logs: rolePermissions?.view_daily_logs ?? false,
      create_daily_logs: rolePermissions?.create_daily_logs ?? false,
      edit_daily_logs: rolePermissions?.edit_daily_logs ?? false,
      view_tasks: rolePermissions?.view_tasks ?? false,
      complete_tasks: rolePermissions?.complete_tasks ?? false,
      manage_tasks: rolePermissions?.manage_tasks ?? false,
      view_daily_rounds: rolePermissions?.view_daily_rounds ?? false,
      log_daily_rounds: rolePermissions?.log_daily_rounds ?? false,
      view_medical: rolePermissions?.view_medical ?? false,
      add_clinical_notes: rolePermissions?.add_clinical_notes ?? false,
      prescribe_medications: rolePermissions?.prescribe_medications ?? false,
      administer_medications: rolePermissions?.administer_medications ?? false,
      manage_quarantine: rolePermissions?.manage_quarantine ?? false,
      view_movements: rolePermissions?.view_movements ?? false,
      log_internal_movements: rolePermissions?.log_internal_movements ?? false,
      manage_external_transfers: rolePermissions?.manage_external_transfers ?? false,
      view_incidents: rolePermissions?.view_incidents ?? false,
      report_incidents: rolePermissions?.report_incidents ?? false,
      manage_incidents: rolePermissions?.manage_incidents ?? false,
      view_maintenance: rolePermissions?.view_maintenance ?? false,
      report_maintenance: rolePermissions?.report_maintenance ?? false,
      resolve_maintenance: rolePermissions?.resolve_maintenance ?? false,
      view_safety_drills: rolePermissions?.view_safety_drills ?? false,
      view_first_aid: rolePermissions?.view_first_aid ?? false,
      submit_timesheets: rolePermissions?.submit_timesheets ?? false,
      manage_all_timesheets: rolePermissions?.manage_all_timesheets ?? false,
      request_holidays: rolePermissions?.request_holidays ?? false,
      approve_holidays: rolePermissions?.approve_holidays ?? false,
      view_missing_records: rolePermissions?.view_missing_records ?? false,
      manage_zla_documents: rolePermissions?.manage_zla_documents ?? false,
      generate_reports: rolePermissions?.generate_reports ?? false,
      view_settings: rolePermissions?.view_settings ?? false,
      manage_users: rolePermissions?.manage_users ?? false,
      manage_roles: rolePermissions?.manage_roles ?? false,
      // Compatibility aliases
      canViewAnimals: rolePermissions?.view_animals ?? false,
      canEditAnimals: rolePermissions?.edit_animals ?? false,
      canViewMedical: rolePermissions?.view_medical ?? false,
      canEditMedical: (rolePermissions?.add_clinical_notes || rolePermissions?.prescribe_medications || rolePermissions?.administer_medications || rolePermissions?.manage_quarantine) ?? false,
      canViewReports: rolePermissions?.generate_reports ?? false,
      canManageStaff: rolePermissions?.manage_users ?? false,
      canEditSettings: rolePermissions?.view_settings ?? false,
      canViewSettings: rolePermissions?.view_settings ?? false,
      canGenerateReports: rolePermissions?.generate_reports ?? false,
      canManageUsers: rolePermissions?.manage_users ?? false,
      canViewMovements: rolePermissions?.view_movements ?? false,
      canEditMovements: (rolePermissions?.log_internal_movements || rolePermissions?.manage_external_transfers) ?? false,
      role
    };
  }, [currentUser, rolePermissions]);

  return permissions;
}

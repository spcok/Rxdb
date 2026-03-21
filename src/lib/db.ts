import Dexie, { Table } from 'dexie';
import { Animal, LogEntry, Task, ClinicalNote, MARChart, QuarantineRecord, InternalMovement, ExternalTransfer, Timesheet, Holiday, User, OrgProfileSettings, Contact, ZLADocument, SafetyDrill, MaintenanceLog, FirstAidLog, Incident, DailyRound, RolePermissionConfig, SyncQueueItem, OperationalList, Shift, HusbandryLog } from '../types';

export interface UploadQueueItem {
  id?: number;
  fileData: Blob;
  fileName: string;
  folder: string;
  thumbnailBase64: string;
  status: 'pending' | 'uploading' | 'failed';
  createdAt: string;
}

export interface MediaUploadQueueItem {
  id?: number;
  fileData: Blob | ArrayBuffer;
  fileName: string;
  folder: string;
  recordId: string;
  tableName: string;
  columnName: string;
  status: 'pending' | 'uploading' | 'failed' | 'quarantined';
  createdAt: string;
  retryCount?: number;
}

export class AppDatabase extends Dexie {
  animals!: Table<Animal, string>;
  archived_animals!: Table<Animal, string>;
  daily_logs!: Table<LogEntry, string>;
  daily_logs_v2!: Table<LogEntry, string>; 
  tasks!: Table<Task, string>;
  medical_logs!: Table<ClinicalNote, string>;
  mar_charts!: Table<MARChart, string>;
  quarantine_records!: Table<QuarantineRecord, string>;
  internal_movements!: Table<InternalMovement, string>;
  external_transfers!: Table<ExternalTransfer, string>;
  timesheets!: Table<Timesheet, string>;
  holidays!: Table<Holiday, string>;
  users!: Table<User, string>;
  role_permissions!: Table<RolePermissionConfig, string>;
  organisations!: Table<OrgProfileSettings, string>;
  contacts!: Table<Contact, string>;
  zla_documents!: Table<ZLADocument, string>;
  safety_drills!: Table<SafetyDrill, string>;
  maintenance_logs!: Table<MaintenanceLog, string>;
  first_aid_logs!: Table<FirstAidLog, string>;
  incidents!: Table<Incident, string>;
  daily_rounds!: Table<DailyRound, string>;
  operational_lists!: Table<OperationalList, string>;
  shifts!: Table<Shift, string>;
  husbandry_logs!: Table<HusbandryLog, string>;
  sync_queue!: Table<SyncQueueItem, number>;
  upload_queue!: Table<UploadQueueItem, number>;
  media_upload_queue!: Table<MediaUploadQueueItem, number>;

  constructor() {
    super('KentOwlAcademyDB');
    // BUMPED TO VERSION 33 FOR HUSBANDRY LOGS
    this.version(33).stores({
      animals: 'id, name, species, category, location',
      archived_animals: 'id, name, species, category, location',
      daily_logs: 'id, animal_id, log_type, log_date, created_at',
      tasks: 'id, animal_id, due_date, completed',
      medical_logs: 'id, animal_id, date, note_type',
      mar_charts: 'id, animal_id, medication_name',
      quarantine_records: 'id, animal_id, status',
      internal_movements: 'id, animal_id, log_date, movement_type',
      external_transfers: 'id, animal_id, date, transfer_type',
      timesheets: 'id, staff_name, date, status',
      holidays: 'id, staff_name, status',
      users: 'id, email, name, role',
      role_permissions: 'role, view_animals, add_animals, edit_animals, archive_animals, view_daily_logs, create_daily_logs, edit_daily_logs, view_tasks, complete_tasks, manage_tasks, view_daily_rounds, log_daily_rounds, view_medical, add_clinical_notes, prescribe_medications, administer_medications, manage_quarantine, view_movements, log_internal_movements, manage_external_transfers, view_incidents, report_incidents, manage_incidents, view_maintenance, report_maintenance, resolve_maintenance, view_safety_drills, view_first_aid, submit_timesheets, manage_all_timesheets, request_holidays, approve_holidays, view_missing_records, manage_zla_documents, generate_reports, view_settings, manage_users, manage_roles',
      organisations: 'id',
      contacts: 'id, name, role',
      zla_documents: 'id, name, category',
      safety_drills: 'id, date, title',
      maintenance_logs: 'id, enclosure_id, task_type, status, date_logged',
      first_aid_logs: 'id, date, person_name, type',
      incidents: 'id, date, severity',
      daily_rounds: 'id, date, shift, status, completed_by, completed_at, updated_at',
      operational_lists: 'id, type, category, value',
      shifts: 'id, user_id, user_name, date, user_role, assigned_area, pattern_id, notes',
      husbandry_logs: 'id, animal_id, date, type', // <-- ADDED THIS LINE
      // FLASH UPGRADE: Added [table_name+record_id] compound index
      sync_queue: '++id, [table_name+record_id], table_name, record_id, operation, status, priority, retry_count',
      upload_queue: '++id, status, created_at',
      media_upload_queue: '++id, status, createdAt'
    });
  }

  async clearAllData() {
    console.warn('🧹 [Daily Clean Slate] Purging all local data...');
    const tables = this.tables;
    await Promise.all(tables.map(table => table.clear()));
    console.log('✅ [Daily Clean Slate] Local database purged.');
  }
}

export const db = new AppDatabase();

db.open().catch((err) => {
  console.error('🛠️ [Regression Check] Dexie Schema Mismatch detected.', err);
  if (err.name === 'SchemaError' || err.name === 'VersionError' || err.name === 'BulkError') {
    console.warn('Database schema error. Attempting to recover...');
  }
});
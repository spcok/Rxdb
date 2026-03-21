export interface HusbandryLog {
  id: string;
  record_type?: string;
  animal_id: string;
  date: string;
  type: 'FEED' | 'WEIGHT' | 'FLIGHT' | 'TRAINING' | 'TEMPERATURE';
  value: string;
  author: string;
}

export enum ShiftType {
  FULL_DAY = 'Full Day',
  MORNING = 'Morning',
  AFTERNOON = 'Afternoon',
  NIGHT = 'Night',
  CUSTOM = 'Custom'
}
export interface Shift {
  id: string;
  record_type?: string;
  user_id: string;
  user_name: string; // denormalized for fast offline rendering
  user_role: string; // denormalized for filtering
  date: string; // YYYY-MM-DD
  shift_type: ShiftType;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  assigned_area?: string; // e.g. "Owls", "Mammals", "Site Maintenance"
  notes?: string;
  pattern_id?: string; // UUID linking a repeating block
  updated_at?: string;
  is_deleted?: boolean;
}

export enum AnimalCategory {
  ALL = 'ALL',
  OWLS = 'OWLS',
  RAPTORS = 'RAPTORS',
  MAMMALS = 'MAMMALS',
  REPTILES = 'REPTILES',
  INVERTEBRATES = 'INVERTEBRATES',
  AMPHIBIANS = 'AMPHIBIANS',
  EXOTICS = 'EXOTICS'
}

export enum ConservationStatus {
  NE = 'NE',
  DD = 'DD',
  LC = 'LC',
  NT = 'NT',
  VU = 'VU',
  EN = 'EN',
  CR = 'CR',
  EW = 'EW',
  EX = 'EX'
}

export enum HazardRating {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum UserRole {
  VOLUNTEER = 'VOLUNTEER',
  KEEPER = 'KEEPER',
  SENIOR_KEEPER = 'SENIOR_KEEPER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER'
}

export enum HealthRecordType {
  OBSERVATION = 'OBSERVATION',
  MEDICATION = 'MEDICATION',
  SURGERY = 'SURGERY',
  VACCINATION = 'VACCINATION',
  EXAM = 'EXAM'
}

export enum HealthCondition {
  HEALTHY = 'HEALTHY',
  CONCERN = 'CONCERN',
  CRITICAL = 'CRITICAL',
  DECEASED = 'DECEASED'
}

export enum LogType {
  GENERAL = 'GENERAL',
  WEIGHT = 'WEIGHT',
  FEED = 'FEED',
  FLIGHT = 'FLIGHT',
  TRAINING = 'TRAINING',
  TEMPERATURE = 'TEMPERATURE',
  HEALTH = 'HEALTH',
  EVENT = 'EVENT',
  MISTING = 'MISTING',
  WATER = 'WATER',
  BIRTH = 'BIRTH'
}

export enum MovementType {
  TRANSFER = 'TRANSFER',
  ACQUISITION = 'ACQUISITION',
  DISPOSITION = 'DISPOSITION'
}

export enum TransferType {
  ARRIVAL = 'Arrival',
  DEPARTURE = 'Departure'
}

export enum TransferStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed'
}

export enum TimesheetStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed'
}

export enum LeaveType {
  ANNUAL = 'Annual',
  SICK = 'Sick',
  UNPAID = 'Unpaid',
  OTHER = 'Other'
}

export enum HolidayStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  DECLINED = 'Declined'
}

export enum EntityType {
  INDIVIDUAL = 'INDIVIDUAL',
  GROUP = 'GROUP'
}

export interface Animal {
  id: string;
  record_type?: string;
  entity_type?: EntityType;
  parent_mob_id?: string;
  census_count?: number;
  name: string;
  species: string;
  latin_name?: string;
  category: AnimalCategory;
  location: string;
  image_url?: string;
  hazard_rating: HazardRating;
  is_venomous: boolean;
  weight_unit: 'g' | 'oz' | 'lbs_oz' | 'kg';
  dob?: string;
  is_dob_unknown?: boolean;
  sex?: 'Male' | 'Female' | 'Unknown';
  microchip_id?: string;
  disposition_status?: 'Active' | 'Transferred' | 'Deceased' | 'Missing' | 'Stolen';
  origin_location?: string;
  destination_location?: string;
  transfer_date?: string;
  ring_number?: string;
  has_no_id?: boolean;
  red_list_status?: ConservationStatus;
  description?: string;
  special_requirements?: string;
  critical_husbandry_notes?: string[];
  target_day_temp_c?: number;
  target_night_temp_c?: number;
  target_humidity_min_percent?: number;
  target_humidity_max_percent?: number;
  misting_frequency?: string;
  acquisition_date?: string;
  origin?: string;
  sire_id?: string;
  dam_id?: string;
  flying_weight_g?: number;
  winter_weight_g?: number;
  display_order?: number;
  archived?: boolean;
  archive_reason?: string;
  archived_at?: string;
  archive_type?: 'Disposition' | 'Death' | 'Euthanasia' | 'Missing' | 'Stolen';
  is_quarantine?: boolean;
  distribution_map_url?: string;
  water_tipping_temp?: number;
  acquisition_type?: 'BORN' | 'TRANSFERRED_IN' | 'RESCUE' | 'UNKNOWN';
  updated_at?: string;
  is_deleted?: boolean;
}

export interface LogEntry {
  id: string;
  record_type?: string;
  animal_id: string;
  log_type: LogType;
  log_date: string;
  value: string;
  notes?: string;
  user_initials?: string;
  weight_grams?: number;
  weight?: number;
  weight_unit?: 'g' | 'kg' | 'oz' | 'lbs' | 'lbs_oz';
  health_record_type?: string;
  // Temperature fields
  basking_temp_c?: number;
  cool_temp_c?: number;
  temperature_c?: number;
  created_at?: string;
  created_by?: string;
  integrity_seal?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface Task {
  id: string;
  record_type?: string;
  animal_id?: string;
  title: string;
  notes?: string;
  due_date: string;
  completed: boolean;
  type?: LogType;
  recurring?: boolean;
  assigned_to?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface UserPermissions {
  dashboard: boolean;
  dailyLog: boolean;
  tasks: boolean;
  medical: boolean;
  movements: boolean;
  safety: boolean;
  maintenance: boolean;
  settings: boolean;
  flightRecords: boolean;
  feedingSchedule: boolean;
  attendance: boolean;
  holidayApprover: boolean;
  attendanceManager: boolean;
  missingRecords: boolean;
  reports: boolean;
  rounds: boolean;
  view_archived_records?: boolean;
  userManagement?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  initials: string;
  pin?: string;
  job_position?: string;
  permissions?: Partial<UserPermissions>;
  signature_data?: string;
  integrity_seal?: string;
}

export interface RolePermissionConfig {
  id?: string;
  role: UserRole;
  // Animals
  view_animals: boolean;
  add_animals: boolean;
  edit_animals: boolean;
  archive_animals: boolean;
  // Husbandry
  view_daily_logs: boolean;
  create_daily_logs: boolean;
  edit_daily_logs: boolean;
  view_tasks: boolean;
  complete_tasks: boolean;
  manage_tasks: boolean;
  view_daily_rounds: boolean;
  log_daily_rounds: boolean;
  // Medical
  view_medical: boolean;
  add_clinical_notes: boolean;
  prescribe_medications: boolean;
  administer_medications: boolean;
  manage_quarantine: boolean;
  // Logistics
  view_movements: boolean;
  log_internal_movements: boolean;
  manage_external_transfers: boolean;
  // Safety
  view_incidents: boolean;
  report_incidents: boolean;
  manage_incidents: boolean;
  view_maintenance: boolean;
  report_maintenance: boolean;
  resolve_maintenance: boolean;
  view_safety_drills: boolean;
  view_first_aid: boolean;
  // Staff
  submit_timesheets: boolean;
  manage_all_timesheets: boolean;
  request_holidays: boolean;
  approve_holidays: boolean;
  // Compliance & Admin
  view_missing_records: boolean;
  view_archived_records: boolean;
  manage_zla_documents: boolean;
  generate_reports: boolean;
  view_settings: boolean;
  manage_users: boolean;
  manage_roles: boolean;
}

export type User = UserProfile;

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  address?: string;
}

export interface ZLADocument {
  id: string;
  name: string;
  category: string;
  file_url: string;
  upload_date: Date;
}

export interface OrgProfileSettings {
  id: string;
  org_name: string;
  logo_url?: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  zla_license_number: string;
  official_website?: string;
  adoption_portal?: string;
}

export interface OrgProfile {
  name: string;
  logo_url: string;
  adoption_portal?: string;
}

export interface ClinicalNote {
  id: string;
  record_type?: string;
  animal_id: string;
  animal_name: string;
  date: string;
  note_type: string;
  note_text: string;
  recheck_date?: string;
  staff_initials: string;
  attachment_url?: string;
  thumbnail_url?: string;
  diagnosis?: string;
  bcs?: number;
  weight_grams?: number;
  weight?: number;
  weight_unit?: 'g' | 'kg' | 'oz' | 'lbs' | 'lbs_oz';
  treatment_plan?: string;
  integrity_seal?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface MARChart {
  id: string;
  record_type?: string;
  animal_id: string;
  animal_name: string;
  medication: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  status: 'Active' | 'Completed';
  instructions: string;
  administered_dates: string[];
  staff_initials: string;
  integrity_seal?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface QuarantineRecord {
  id: string;
  record_type?: string;
  animal_id: string;
  animal_name: string;
  reason: string;
  start_date: string;
  end_date: string;
  status: 'Active' | 'Cleared';
  isolation_notes: string;
  staff_initials: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface InternalMovement {
  id: string;
  record_type?: string;
  animal_id: string;
  animal_name: string;
  log_date: string;
  movement_type: MovementType;
  source_location: string;
  destination_location: string;
  notes?: string;
  created_by: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface ExternalTransfer {
  id: string;
  record_type?: string;
  animal_id: string;
  animal_name: string;
  transfer_type: TransferType;
  date: string;
  institution: string;
  transport_method: string;
  cites_article_10_ref: string;
  status: TransferStatus;
  notes?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface Timesheet {
  id: string;
  record_type?: string;
  staff_name: string;
  date: string;
  clock_in: string;
  clock_out?: string;
  total_hours?: number;
  notes?: string;
  status: TimesheetStatus;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface Holiday {
  id: string;
  record_type?: string;
  staff_name: string;
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  status: HolidayStatus;
  notes?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface SafetyDrill {
  id: string;
  record_type?: string;
  date: string;
  title: string;
  location: string;
  priority: string;
  status: string;
  description: string;
  timestamp: number;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface MaintenanceLog {
  id: string;
  record_type?: string;
  enclosure_id: string;
  task_type: 'UV Replacement' | 'Structural Repair' | 'General';
  description: string;
  status: 'Pending' | 'Completed';
  date_logged: string;
  date_completed?: string;
  integrity_seal?: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface FirstAidLog {
  id: string;
  record_type?: string;
  date: string;
  time: string;
  person_name: string;
  type: 'Injury' | 'Illness' | 'Near Miss';
  description: string;
  treatment: string;
  location: string;
  outcome: 'Returned to Work' | 'Restricted Duties' | 'Monitoring' | 'Sent Home' | 'GP Visit' | 'Hospital' | 'Ambulance Called' | 'Refused Treatment' | 'None';
  updated_at?: string;
  is_deleted?: boolean;
}

export enum IncidentType {
  INJURY = 'Injury',
  ILLNESS = 'Illness',
  NEAR_MISS = 'Near Miss',
  FIRE = 'Fire',
  OTHER = 'Other'
}

export enum IncidentSeverity {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface DailyRound {
  id: string;
  record_type?: string;
  date: string;
  shift: 'Morning' | 'Evening';
  section: string;
  check_data?: Record<string, unknown>;
  status: 'Completed' | 'Pending' | 'completed' | 'pending';
  completed_by: string;
  completed_at?: string;
  updated_at?: string;
  notes?: string;
}

export interface Incident {
  id: string;
  record_type?: string;
  date: Date;
  time: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  location: string;
  status: string;
  reported_by: string;
  updated_at?: string;
  is_deleted?: boolean;
}

export interface SyncQueueItem {
  id?: number;
  table_name: string;
  record_id: string;
  operation: 'upsert' | 'delete';
  payload: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  status: 'pending' | 'failed' | 'quarantined';
  priority: number;
  retry_count: number;
  error_log?: string;
}

export interface OperationalList {
  id: string;
  record_type?: string;
  type: 'food' | 'method' | 'location' | 'event';
  category: AnimalCategory;
  value: string;
  is_deleted?: boolean;
  updated_at?: string;
}

export interface SignContent {
    diet: string[];
    habitat: string[];
    didYouKnow: string[];
    speciesBrief?: string;
    wildOrigin?: string;
    speciesStats: {
        lifespanWild: string;
        lifespanCaptivity: string;
        wingspan: string;
        weight: string;
    };
}

export type OrganisationProfile = OrgProfile;

export interface SiteLogEntry {
  id: string;
  log_date: Date;
  title: string;
  description: string;
  user_initials: string;
}

export interface TimeLogEntry {
  id: string;
  staff_name: string;
  date: string;
  clock_in: string;
  clock_out?: string;
  total_hours?: number;
  notes?: string;
  status: TimesheetStatus;
}


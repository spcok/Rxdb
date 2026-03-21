import { createRxDatabase, addRxPlugin, RxDatabase, RxCollection } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv'; // Ensure AJV is installed
import { replicateSupabase, RxSupabaseReplicationState } from 'rxdb/plugins/replication-supabase';
import { supabase } from './supabase';

// Add plugins
addRxPlugin(RxDBDevModePlugin);

// Fix SC39 & Strict Mode: No "primary: true", yes "maxLength"
const baseProperties = {
  id: { type: 'string', maxLength: 100 },
  updated_at: { type: 'string' },
  is_deleted: { type: 'boolean' },
  record_type: { type: 'string' } // Discriminator for the Librarian
};

// --- Consolidated Schemas ---

const animalSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    name: { type: 'string' },
    species: { type: 'string' },
    category: { type: 'string' },
    location: { type: 'string' },
    hazard_rating: { type: 'string' },
    is_venomous: { type: 'boolean' },
    weight_unit: { type: 'string' },
    census_count: { type: 'number' },
    dob: { type: 'string' },
    is_dob_unknown: { type: 'boolean' },
    sex: { type: 'string' },
    microchip_id: { type: 'string' },
    disposition_status: { type: 'string' },
    archived: { type: 'boolean' },
    is_quarantine: { type: 'boolean' },
  },
  required: ['id']
};

const dailyRecordSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    // Daily Logs fields
    animal_id: { type: 'string' },
    log_type: { type: 'string' },
    log_date: { type: 'string' },
    value: { type: 'string' },
    weight_grams: { type: 'number' },
    // Daily Rounds fields
    date: { type: 'string' },
    shift: { type: 'string' },
    section: { type: 'string' },
    status: { type: 'string' },
    completed_by: { type: 'string' },
  },
  required: ['id', 'record_type']
};

const clinicalRecordSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    animal_id: { type: 'string' },
    animal_name: { type: 'string' },
    date: { type: 'string' },
    // Notes fields
    note_type: { type: 'string' },
    note_text: { type: 'string' },
    bcs: { type: 'number' },
    // MAR fields
    medication: { type: 'string' },
    dosage: { type: 'string' },
    frequency: { type: 'string' },
    start_date: { type: 'string' },
    end_date: { type: 'string' },
    administered_dates: { type: 'array', items: { type: 'string' } },
    // Quarantine fields
    reason: { type: 'string' },
    isolation_notes: { type: 'string' },
    staff_initials: { type: 'string' },
  },
  required: ['id', 'record_type']
};

const logisticsRecordSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    animal_id: { type: 'string' },
    animal_name: { type: 'string' },
    log_date: { type: 'string' },
    date: { type: 'string' },
    movement_type: { type: 'string' },
    transfer_type: { type: 'string' },
    source_location: { type: 'string' },
    destination_location: { type: 'string' },
    institution: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['id', 'record_type']
};

const staffRecordSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    user_id: { type: 'string' },
    staff_name: { type: 'string' },
    date: { type: 'string' },
    shift_type: { type: 'string' },
    start_date: { type: 'string' },
    end_date: { type: 'string' },
    clock_in: { type: 'string' },
    clock_out: { type: 'string' },
    status: { type: 'string' },
  },
  required: ['id', 'record_type']
};

// ... (Other schemas like husbandry_logs, incidents, tasks remain 1-to-1 but remove "primary: true")

let replicationStates: RxSupabaseReplicationState<any>[] = [];
export let db: RxDatabase;

export async function initDatabase() {
  if (db) return db;

  db = await createRxDatabase({
    name: 'animaldb',
    storage: wrappedValidateAjvStorage({ storage: getRxStorageDexie() }),
    ignoreDuplicate: true,
  });

  await db.addCollections({
    animals: { schema: animalSchema },
    daily_records: { schema: dailyRecordSchema }, // Combined daily_logs_v2 & daily_rounds
    clinical_records: { schema: clinicalRecordSchema }, // Combined medical, mar, quarantine
    logistics_records: { schema: logisticsRecordSchema }, // Combined movements, transfers
    staff_records: { schema: staffRecordSchema }, // Combined shifts, holidays, timesheets
    husbandry_logs: { schema: { ...husbandryLogSchema, properties: { ...husbandryLogSchema.properties, id: { type: 'string', maxLength: 100 } } } },
    tasks: { schema: taskSchema },
    operational_lists: { schema: operationalListSchema },
    incidents: { schema: incidentSchema },
    maintenance_logs: { schema: maintenanceLogSchema },
    safety_drills: { schema: safetyDrillSchema },
    first_aid_logs: { schema: firstAidLogSchema },
  });

  return db;
}

export async function startReplication(db: RxDatabase) {
  // Mapping logic: Local Collection -> Array of Supabase Tables
  const librarianMap: Record<string, string[]> = {
    animals: ['animals'],
    daily_records: ['daily_logs_v2', 'daily_rounds'],
    clinical_records: ['medical_logs', 'mar_charts', 'quarantine_records'],
    logistics_records: ['movements', 'transfers'],
    staff_records: ['shifts', 'holidays', 'timesheets'],
    husbandry_logs: ['husbandry_logs'],
    tasks: ['tasks'],
    operational_lists: ['operational_lists'],
    incidents: ['incidents'],
    maintenance_logs: ['maintenance_logs'],
    safety_drills: ['safety_drills'],
    first_aid_logs: ['first_aid_logs']
  };

  for (const [colName, tables] of Object.entries(librarianMap)) {
    const collection = db.collections[colName];

    for (const tableName of tables) {
      const replicationState = replicateSupabase({
        collection,
        replicationIdentifier: `${colName}_${tableName}`,
        client: supabase,
        tableName: tableName,
        pull: {
          batchSize: 100,
          // Librarian adds the label when pulling from a specific shelf
          modifier: (doc) => ({ ...doc, record_type: tableName }),
        },
        push: {
          // Librarian only pushes records that belong on this shelf
          filter: (doc) => doc.record_type === tableName,
        },
        live: true,
      });

      replicationStates.push(replicationState);
    }
  }
}

export function stopReplication() {
  replicationStates.forEach(s => s.cancel());
  replicationStates = [];
}
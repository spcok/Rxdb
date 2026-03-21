import { createRxDatabase, addRxPlugin, RxDatabase, RxCollection } from 'rxdb';
export type { RxDatabase, RxCollection };
export { createRxDatabase, addRxPlugin };
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { replicateSupabase, RxSupabaseReplicationState } from 'rxdb/plugins/replication-supabase';
import { supabase } from './supabase';

// Add plugins
addRxPlugin(RxDBDevModePlugin);

// Define Schemas
const baseProperties = {
  id: { type: 'string', primary: true, maxLength: 100 },
  updated_at: { type: 'string' },
  is_deleted: { type: 'boolean' },
};

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
};

const logEntrySchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    animal_id: { type: 'string' },
    log_type: { type: 'string' },
    log_date: { type: 'string' },
    value: { type: 'string' },
    weight_grams: { type: 'number' },
    weight: { type: 'number' },
    basking_temp_c: { type: 'number' },
    cool_temp_c: { type: 'number' },
    temperature_c: { type: 'number' },
  },
};

const clinicalNoteSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    animal_id: { type: 'string' },
    animal_name: { type: 'string' },
    date: { type: 'string' },
    note_type: { type: 'string' },
    note_text: { type: 'string' },
    bcs: { type: 'number' },
    weight_grams: { type: 'number' },
    weight: { type: 'number' },
  },
};

const marChartSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    animal_id: { type: 'string' },
    animal_name: { type: 'string' },
    medication: { type: 'string' },
    dosage: { type: 'string' },
    frequency: { type: 'string' },
    start_date: { type: 'string' },
    end_date: { type: 'string' },
    status: { type: 'string' },
    instructions: { type: 'string' },
    administered_dates: {
      type: 'array',
      items: { type: 'string' }
    },
    staff_initials: { type: 'string' },
  },
};

const quarantineRecordSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    animal_id: { type: 'string' },
    animal_name: { type: 'string' },
    reason: { type: 'string' },
    start_date: { type: 'string' },
    end_date: { type: 'string' },
    status: { type: 'string' },
    isolation_notes: { type: 'string' },
    staff_initials: { type: 'string' },
  },
};

const husbandryLogSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    animal_id: { type: 'string' },
    date: { type: 'string' },
    type: { type: 'string' },
    value: { type: 'string' },
    author: { type: 'string' },
  },
};

const taskSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    title: { type: 'string' },
    due_date: { type: 'string' },
    completed: { type: 'boolean' },
    recurring: { type: 'boolean' },
  },
};

const dailyRoundSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    date: { type: 'string' },
    shift: { type: 'string' },
    section: { type: 'string' },
    status: { type: 'string' },
    completed_by: { type: 'string' },
  },
};

const operationalListSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    type: { type: 'string' },
    category: { type: 'string' },
    value: { type: 'string' },
  },
};

const shiftSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    user_id: { type: 'string' },
    user_name: { type: 'string' },
    date: { type: 'string' },
    shift_type: { type: 'string' },
    start_time: { type: 'string' },
    end_time: { type: 'string' },
  },
};

const incidentSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    date: { type: 'string' },
    time: { type: 'string' },
    type: { type: 'string' },
    severity: { type: 'string' },
    description: { type: 'string' },
    location: { type: 'string' },
    status: { type: 'string' },
    reported_by: { type: 'string' },
  },
};

const maintenanceLogSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    enclosure_id: { type: 'string' },
    task_type: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string' },
    date_logged: { type: 'string' },
  },
};

const movementSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    animal_id: { type: 'string' },
    animal_name: { type: 'string' },
    log_date: { type: 'string' },
    movement_type: { type: 'string' },
    source_location: { type: 'string' },
    destination_location: { type: 'string' },
    notes: { type: 'string' },
    created_by: { type: 'string' },
  },
};

const transferSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    animal_id: { type: 'string' },
    animal_name: { type: 'string' },
    transfer_type: { type: 'string' },
    date: { type: 'string' },
    institution: { type: 'string' },
    transport_method: { type: 'string' },
    cites_article_10_ref: { type: 'string' },
    status: { type: 'string' },
    notes: { type: 'string' },
  },
};

const holidaySchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    staff_name: { type: 'string' },
    start_date: { type: 'string' },
    end_date: { type: 'string' },
    leave_type: { type: 'string' },
    status: { type: 'string' },
    notes: { type: 'string' },
  },
};

const timesheetSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    staff_name: { type: 'string' },
    date: { type: 'string' },
    clock_in: { type: 'string' },
    clock_out: { type: 'string' },
    total_hours: { type: 'number' },
    notes: { type: 'string' },
    status: { type: 'string' },
  },
};

const safetyDrillSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    date: { type: 'string' },
    title: { type: 'string' },
    location: { type: 'string' },
    priority: { type: 'string' },
    status: { type: 'string' },
    description: { type: 'string' },
    timestamp: { type: 'number' },
  },
};

const firstAidLogSchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...baseProperties,
    date: { type: 'string' },
    time: { type: 'string' },
    person_name: { type: 'string' },
    type: { type: 'string' },
    description: { type: 'string' },
    treatment: { type: 'string' },
    location: { type: 'string' },
    outcome: { type: 'string' },
  },
};


let replicationStates: RxSupabaseReplicationState<unknown>[] = [];

export let db: RxDatabase;

export async function initDatabase() {
  if (db) return db;

  const storage = wrappedValidateAjvStorage({
    storage: getRxStorageDexie()
  });

  db = await createRxDatabase({
    name: 'animaldb',
    storage,
    ignoreDuplicate: true,
  });

  await db.addCollections({
    animals: { schema: animalSchema },
    daily_logs_v2: { schema: logEntrySchema },
    medical_logs: { schema: clinicalNoteSchema },
    husbandry_logs: { schema: husbandryLogSchema },
    tasks: { schema: taskSchema },
    daily_rounds: { schema: dailyRoundSchema },
    operational_lists: { schema: operationalListSchema },
    mar_charts: { schema: marChartSchema },
    quarantine_records: { schema: quarantineRecordSchema },
    shifts: { schema: shiftSchema },
    incidents: { schema: incidentSchema },
    maintenance_logs: { schema: maintenanceLogSchema },
    movements: { schema: movementSchema },
    transfers: { schema: transferSchema },
    holidays: { schema: holidaySchema },
    timesheets: { schema: timesheetSchema },
    safety_drills: { schema: safetyDrillSchema },
    first_aid_logs: { schema: firstAidLogSchema },
  });

  return db;
}

export async function startReplication(db: RxDatabase) {
  const collections = [
    'animals', 'daily_logs_v2', 'medical_logs', 'husbandry_logs', 
    'tasks', 'daily_rounds', 'operational_lists', 'mar_charts',
    'quarantine_records', 'shifts', 
    'incidents', 'maintenance_logs', 'movements', 'transfers',
    'holidays', 'timesheets', 'safety_drills', 'first_aid_logs'
  ];

  for (const collectionName of collections) {
    const collection = db.collections[collectionName] as RxCollection;
    
    const replicationState = replicateSupabase({
      collection,
      replicationIdentifier: collectionName,
      client: supabase,
      tableName: collectionName,
      pull: {
        batchSize: 100,
        modifier: (doc) => doc,
      },
      push: {
        modifier: (doc) => doc,
      },
      live: true,
      retryTime: 5000,
    });

    replicationState.error$.subscribe(err => {
      console.error(`🛠️ [RxDB Sync] Error in ${collectionName}:`, err);
      if (err.message.includes('403')) {
        supabase.auth.refreshSession();
      }
    });

    replicationStates.push(replicationState);
  }
}

export function stopReplication() {
  replicationStates.forEach(state => state.cancel());
  replicationStates = [];
}

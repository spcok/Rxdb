import { createRxDatabase, addRxPlugin, RxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { replicateSupabase, RxSupabaseReplicationState } from 'rxdb/plugins/replication-supabase';
import { supabase } from './supabase';

addRxPlugin(RxDBDevModePlugin);

export let db: RxDatabase;
let dbPromise: Promise<RxDatabase> | null = null;
let replicationStates: RxSupabaseReplicationState<unknown>[] = [];

const REPLICATION_CONFIG: Record<string, { table: string, record_type: string }[]> = {
  animals: [
    { table: 'animals', record_type: 'animals' },
    { table: 'archived_animals', record_type: 'archived_animals' }
  ],
  daily_records: [
    { table: 'daily_logs', record_type: 'daily_logs_v2' },
    { table: 'daily_rounds', record_type: 'daily_rounds' }
  ],
  clinical_records: [
    { table: 'medical_logs', record_type: 'medical_logs' },
    { table: 'mar_charts', record_type: 'mar_charts' },
    { table: 'quarantine_records', record_type: 'quarantine_records' },
    { table: 'clinical_note', record_type: 'clinical_note' }
  ],
  logistics_records: [
    { table: 'internal_movements', record_type: 'internal_movements' },
    { table: 'external_transfers', record_type: 'external_transfers' },
    { table: 'movements', record_type: 'movements' },
    { table: 'transfers', record_type: 'transfers' }
  ],
  staff_records: [
    { table: 'shifts', record_type: 'shifts' },
    { table: 'holidays', record_type: 'holidays' },
    { table: 'timesheets', record_type: 'timesheets' }
  ],
  maintenance_logs: [
    { table: 'maintenance_logs', record_type: 'maintenance_logs' }
  ],
  incidents: [
    { table: 'incidents', record_type: 'incidents' }
  ],
  first_aid_logs: [
    { table: 'first_aid_logs', record_type: 'first_aid_logs' }
  ],
  safety_drills: [
    { table: 'safety_drills', record_type: 'safety_drills' }
  ],
  operational_lists: [
    { table: 'operational_lists', record_type: 'operational_lists' }
  ],
  admin_records: [
    { table: 'users', record_type: 'user' },
    { table: 'organisations', record_type: 'organisation' },
    { table: 'role_permissions', record_type: 'role_permission' },
    { table: 'contacts', record_type: 'contact' },
    { table: 'zla_documents', record_type: 'zla_document' },
    { table: 'bug_reports', record_type: 'bug_report' }
  ],
  tasks: [
    { table: 'tasks', record_type: 'tasks' }
  ]
};

const baseProperties = {
  id: { type: 'string', maxLength: 100 },
  updated_at: { type: 'string' },
  is_deleted: { type: 'boolean' },
  record_type: { type: 'string' }
};

export const initDatabase = async () => {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    console.log('💾 [RxDB] Initializing engine (v14)...');
    
    try {
      db = await createRxDatabase({
        name: 'animaldb_v14', 
        storage: wrappedValidateAjvStorage({ storage: getRxStorageDexie() }),
        ignoreDuplicate: true,
      });
      console.log('💾 [RxDB] Database created.');

      await db.addCollections({
        animals: { 
          schema: { 
            version: 0, 
            primaryKey: 'id', 
            type: 'object', 
            properties: { 
              ...baseProperties, 
              name: { type: 'string' }, 
              species: { type: 'string' },
              category: { type: 'string' },
              location: { type: 'string' },
              latin_name: { type: 'string' },
              entity_type: { type: 'string' },
              parent_mob_id: { type: 'string' },
              census_count: { type: 'number' },
              hazard_rating: { type: 'string' },
              is_venomous: { type: 'boolean' },
              weight_unit: { type: 'string' },
              dob: { type: 'string' },
              is_dob_unknown: { type: 'boolean' },
              sex: { type: 'string' },
              microchip_id: { type: 'string' },
              ring_number: { type: 'string' },
              disposition_status: { type: 'string' },
              archived: { type: 'boolean' }
            }, 
            required: ['id', 'record_type'] 
          } 
        },
        admin_records: { 
          schema: { 
            version: 0, 
            primaryKey: 'id', 
            type: 'object', 
            properties: { 
              ...baseProperties, 
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              initials: { type: 'string' },
              permissions: { type: 'object' },
              type: { type: 'string' },
              value: { type: 'string' },
              pin: { type: 'string' }
            }, 
            required: ['id', 'record_type'] 
          } 
        },
        daily_records: { 
          schema: { 
            version: 0, 
            primaryKey: 'id', 
            type: 'object', 
            properties: { 
              ...baseProperties, 
              animal_id: { type: 'string' }, 
              log_type: { type: 'string' },
              log_date: { type: 'string' },
              value: { type: 'string' }, 
              notes: { type: 'string' },
              user_initials: { type: 'string' },
              weight_grams: { type: 'number' },
              weight: { type: 'number' },
              weight_unit: { type: 'string' },
              health_record_type: { type: 'string' },
              shift: { type: 'string' },
              section: { type: 'string' }
            }, 
            required: ['id', 'record_type'] 
          } 
        },
        clinical_records: { 
          schema: { 
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
              staff_initials: { type: 'string' },
              medication: { type: 'string' },
              dosage: { type: 'string' },
              frequency: { type: 'string' },
              status: { type: 'string' }
            }, 
            required: ['id', 'record_type'] 
          } 
        },
        logistics_records: { 
          schema: { 
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
              status: { type: 'string' }
            }, 
            required: ['id', 'record_type'] 
          } 
        },
        staff_records: { 
          schema: { 
            version: 0, 
            primaryKey: 'id', 
            type: 'object', 
            properties: { 
              ...baseProperties, 
              user_id: { type: 'string' }, 
              staff_name: { type: 'string' }, 
              date: { type: 'string' },
              start_date: { type: 'string' },
              end_date: { type: 'string' },
              clock_in: { type: 'string' },
              clock_out: { type: 'string' },
              status: { type: 'string' },
              shift_type: { type: 'string' },
              leave_type: { type: 'string' }
            }, 
            required: ['id', 'record_type'] 
          } 
        },
        maintenance_logs: {
          schema: {
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
              date_completed: { type: 'string' }
            },
            required: ['id', 'record_type']
          }
        },
        incidents: {
          schema: {
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
              reported_by: { type: 'string' }
            },
            required: ['id', 'record_type']
          }
        },
        first_aid_logs: {
          schema: {
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
              outcome: { type: 'string' }
            },
            required: ['id', 'record_type']
          }
        },
        safety_drills: {
          schema: {
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
              description: { type: 'string' }
            },
            required: ['id', 'record_type']
          }
        },
        operational_lists: {
          schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
              ...baseProperties,
              type: { type: 'string' },
              category: { type: 'string' },
              value: { type: 'string' }
            },
            required: ['id', 'record_type']
          }
        },
        tasks: { 
          schema: { 
            version: 0, 
            primaryKey: 'id', 
            type: 'object', 
            properties: { 
              ...baseProperties, 
              animal_id: { type: 'string' },
              title: { type: 'string' }, 
              due_date: { type: 'string' },
              completed: { type: 'boolean' },
              assigned_to: { type: 'string' },
              type: { type: 'string' },
              notes: { type: 'string' }
            }, 
            required: ['id', 'record_type'] 
          } 
        }
      });
      console.log('💾 [RxDB] Collections added.');
      return db;
    } catch (error) {
      console.error('💾 [RxDB] Initialization failed:', error);
      throw error;
    }
  })();
  return dbPromise;
};

export const startReplication = async (database: RxDatabase) => {
  if (!database) return;
  for (const [colName, configs] of Object.entries(REPLICATION_CONFIG)) {
    const collection = database.collections[colName];
    for (const config of configs) {
      const state = replicateSupabase({
        collection,
        replicationIdentifier: `${colName}_${config.table}`,
        client: supabase,
        tableName: config.table,
        pull: { batchSize: 100, modifier: (doc) => ({ ...doc, record_type: config.record_type }) },
        push: { modifier: (doc) => doc.record_type === config.record_type ? doc : null },
        live: true
      });
      replicationStates.push(state);
    }
  }
};

export const stopReplication = () => {
  replicationStates.forEach(s => s.cancel());
  replicationStates = [];
};
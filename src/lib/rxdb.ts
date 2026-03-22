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

const LIBRARIAN_MAP: Record<string, string[]> = {
  animals: ['animals', 'archived_animals'],
  daily_records: ['daily_logs', 'daily_rounds'],
  clinical_records: ['medical_logs', 'mar_charts', 'quarantine_records', 'clinical_note'],
  logistics_records: ['internal_movements', 'external_transfers', 'movements', 'transfers'],
  staff_records: ['shifts', 'holidays', 'timesheets'],
  maintenance_logs: ['maintenance_logs'],
  incidents: ['incidents'],
  first_aid_logs: ['first_aid_logs'],
  safety_drills: ['safety_drills'],
  operational_lists: ['operational_lists'],
  admin_records: ['users', 'organisations', 'role_permissions', 'contacts', 'zla_documents', 'bug_reports'],
  tasks: ['tasks']
};

const baseProperties = {
  id: { type: 'string', maxLength: 100 },
  updated_at: { type: 'string' },
  created_at: { type: 'string' },
  is_deleted: { type: 'boolean' },
  record_type: { type: 'string' }
};

export const initDatabase = async () => {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    console.log('💾 [RxDB] Initializing engine (v14)...');
    
    try {
      db = await createRxDatabase({
        name: 'animaldb_v16', 
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
              section: { type: 'string' },
              completed_by: { type: 'string' },
              temperature_c: { type: 'number' }
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
              status: { type: 'string' },
              start_date: { type: 'string' },
              end_date: { type: 'string' },
              reason: { type: 'string' },
              bcs: { type: 'number' },
              weight: { type: 'number' },
              isolation_notes: { type: 'string' }
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
              status: { type: 'string' },
              created_by: { type: 'string' }
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

  // 1. FATAL CRASH PREVENTION: Ensure Supabase is valid before touching the plugin
  if (!supabase || typeof supabase.channel !== 'function') {
    console.warn('🚨 [Sync Guard] Replication aborted: Supabase client is undefined or missing realtime capabilities. Check supabase.ts or circular imports.');
    return;
  }

  console.log('🔄 [RxDB Sync] Initiating Supabase replication engine...');

  for (const [colName, tables] of Object.entries(LIBRARIAN_MAP)) {
    const collection = database.collections[colName];
    if (!collection) continue;

    for (const tableName of tables) {
      try {
        const state = replicateSupabase({
          collection,
          replicationIdentifier: `${colName}_${tableName}_v6`, // Force fresh state
          supabaseClient: supabase,
          table: tableName,
          deletedField: 'is_deleted',
          pull: { 
            batchSize: 100, 
            modifier: (doc) => ({ ...doc, record_type: tableName }) 
          },
          push: { 
            // @ts-expect-error - filter property is supported by replicateSupabase but missing from types
            filter: (doc) => doc.record_type === tableName 
          },
          live: true
        });
        
        // 2. SILENCE PLUGIN CRASHES: Catch internal errors before they hit the window
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state.error$.subscribe((err: any) => {
          if (err?.message && err.message.includes('channel')) return; // Suppress loop
          console.error(`⚠️ [Sync Error - ${tableName}]:`, err?.message || err);
        });
        
        replicationStates.push(state);
      } catch (err) {
        console.error(`💥 [Sync Setup Failed - ${tableName}]:`, err);
      }
    }
  }
};

export const stopReplication = () => {
  replicationStates.forEach(s => s.cancel());
  replicationStates = [];
};
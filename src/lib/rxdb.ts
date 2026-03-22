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
  clinical_records: ['medical_logs', 'mar_charts', 'quarantine_records'],
  logistics_records: ['internal_movements', 'external_transfers'],
  staff_records: ['shifts', 'holidays', 'timesheets'],
  safety_records: ['incidents', 'safety_drills', 'first_aid_logs', 'maintenance_logs'],
  admin_records: ['users', 'organisations', 'role_permissions', 'contacts', 'zla_documents', 'bug_reports', 'operational_lists'],
  tasks: ['tasks']
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
    console.log('💾 [RxDB] Initializing engine (v11)...');
    
    db = await createRxDatabase({
      name: 'animaldb_v11', 
      storage: wrappedValidateAjvStorage({ storage: getRxStorageDexie() }),
      ignoreDuplicate: true,
    });

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
            hazard_rating: { type: 'string' },
            is_venomous: { type: 'boolean' },
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
            org_name: { type: 'string' }
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
            value: { type: 'string' }, 
            date: { type: 'string' },
            log_date: { type: 'string' },
            log_type: { type: 'string' },
            shift: { type: 'string' },
            section: { type: 'string' },
            status: { type: 'string' }
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
            note_text: { type: 'string' },
            date: { type: 'string' },
            note_type: { type: 'string' },
            medication: { type: 'string' },
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
            destination: { type: 'string' },
            log_date: { type: 'string' },
            date: { type: 'string' },
            movement_type: { type: 'string' },
            transfer_type: { type: 'string' }
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
            status: { type: 'string' },
            shift_type: { type: 'string' }
          }, 
          required: ['id', 'record_type'] 
        } 
      },
      safety_records: { 
        schema: { 
          version: 0, 
          primaryKey: 'id', 
          type: 'object', 
          properties: { 
            ...baseProperties, 
            description: { type: 'string' }, 
            severity: { type: 'string' },
            date: { type: 'string' },
            type: { type: 'string' },
            status: { type: 'string' }
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
            title: { type: 'string' }, 
            due_date: { type: 'string' },
            completed: { type: 'boolean' },
            animal_id: { type: 'string' }
          }, 
          required: ['id', 'record_type'] 
        } 
      }
    });

    return db;
  })();
  return dbPromise;
};

export const startReplication = async (database: RxDatabase) => {
  if (!database) return;
  for (const [colName, tables] of Object.entries(LIBRARIAN_MAP)) {
    const collection = database.collections[colName];
    for (const tableName of tables) {
      const state = replicateSupabase({
        collection,
        replicationIdentifier: `${colName}_${tableName}`,
        client: supabase,
        tableName: tableName,
        pull: { batchSize: 100, modifier: (doc) => ({ ...doc, record_type: tableName }) },
        push: { modifier: (doc) => doc.record_type === tableName ? doc : null },
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
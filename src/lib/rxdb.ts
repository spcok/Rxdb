import { createRxDatabase, addRxPlugin, RxDatabase, RxCollection } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { replicateSupabase, RxSupabaseReplicationState } from 'rxdb/plugins/replication-supabase';
import { supabase } from './supabase';

addRxPlugin(RxDBDevModePlugin);

// The Librarian's Master Map: 8 Collections -> 24 Supabase Tables
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

let dbPromise: Promise<RxDatabase> | null = null;
let replicationStates: RxSupabaseReplicationState<any>[] = [];

const createSchema = (name: string, properties: any = {}) => ({
  title: `${name} schema`,
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    updated_at: { type: 'string' },
    is_deleted: { type: 'boolean' },
    record_type: { type: 'string' }, // Discriminator for Supabase routing
    ...properties
  },
  required: ['id', 'record_type']
});

export const initDatabase = async () => {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const db = await createRxDatabase({
      name: 'animaldb_v4',
      storage: wrappedValidateAjvStorage({ storage: getRxStorageDexie() }),
      ignoreDuplicate: true,
    });

    await db.addCollections({
      animals: { schema: createSchema('animals', { name: { type: 'string' }, species: { type: 'string' } }) },
      daily_records: { schema: createSchema('daily', { date: { type: 'string' }, value: { type: 'string' } }) },
      clinical_records: { schema: createSchema('clinical', { animal_id: { type: 'string' }, note_text: { type: 'string' } }) },
      logistics_records: { schema: createSchema('logistics', { animal_id: { type: 'string' }, notes: { type: 'string' } }) },
      staff_records: { schema: createSchema('staff', { staff_name: { type: 'string' }, status: { type: 'string' } }) },
      safety_records: { schema: createSchema('safety', { description: { type: 'string' }, severity: { type: 'string' } }) },
      admin_records: { schema: createSchema('admin', { type: { type: 'string' }, value: { type: 'string' } }) },
      tasks: { schema: createSchema('tasks', { title: { type: 'string' }, completed: { type: 'boolean' } }) }
    });

    return db;
  })();

  return dbPromise;
};

export const startReplication = async (db: RxDatabase) => {
  for (const [colName, tables] of Object.entries(LIBRARIAN_MAP)) {
    const collection = db.collections[colName];
    for (const tableName of tables) {
      const replicationState = replicateSupabase({
        collection,
        replicationIdentifier: `${colName}_${tableName}`,
        client: supabase,
        tableName: tableName,
        pull: {
          batchSize: 100,
          modifier: (doc) => ({ ...doc, record_type: tableName }),
        },
        push: {
          filter: (doc) => doc.record_type === tableName,
        },
        live: true,
      });
      replicationStates.push(replicationState);
    }
  }
};

export function stopReplication() {
  replicationStates.forEach(s => s.cancel());
  replicationStates = [];
}
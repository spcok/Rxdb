import { createRxDatabase, addRxPlugin, RxDatabase } from 'rxdb';
export type { RxDatabase };
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

export let db: RxDatabase;
let dbPromise: Promise<RxDatabase> | null = null;
let replicationStates: RxSupabaseReplicationState<unknown>[] = [];

const createSchema = (name: string, properties: Record<string, unknown> = {}) => ({
  title: `${name} schema`,
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 }, // Corrected: No 'primary: true'
    updated_at: { type: 'string' },
    is_deleted: { type: 'boolean' },
    record_type: { type: 'string' }, // The Discriminator
    ...properties
  },
  required: ['id', 'record_type']
});

export const initDatabase = async () => {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    db = await createRxDatabase({
      name: 'animaldb_v6', // New name to avoid old schema conflicts
      storage: wrappedValidateAjvStorage({ storage: getRxStorageDexie() }),
      ignoreDuplicate: true,
    });

    await db.addCollections({
      animals: { schema: createSchema('animals', { name: { type: 'string' } }) },
      daily_records: { schema: createSchema('daily', { value: { type: 'string' } }) },
      clinical_records: { schema: createSchema('clinical', { animal_id: { type: 'string' } }) },
      logistics_records: { schema: createSchema('logistics', { animal_id: { type: 'string' } }) },
      staff_records: { schema: createSchema('staff', { staff_name: { type: 'string' } }) },
      safety_records: { schema: createSchema('safety', { description: { type: 'string' } }) },
      admin_records: { schema: createSchema('admin', { email: { type: 'string' }, type: { type: 'string' } }) },
      tasks: { schema: createSchema('tasks', { title: { type: 'string' } }) }
    });

    return db;
  })();

  return dbPromise;
};

export const startReplication = async (database: RxDatabase) => {
  for (const [colName, tables] of Object.entries(LIBRARIAN_MAP)) {
    const collection = database.collections[colName];
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
          modifier: (doc) => {
            if (doc.record_type !== tableName) return null;
            return doc;
          }
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
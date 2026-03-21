import { db, AppDatabase } from './db';
import { supabase } from './supabase';
import { SyncQueueItem } from '../types';

async function resolvePayloadMedia(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const resolvedPayload = { ...payload };
  const BUCKET_NAME = 'koa-attachments';

  for (const key in resolvedPayload) {
    const value = resolvedPayload[key];
    
    if (typeof value === 'string' && value.startsWith('local://')) {
      const fileName = value.replace('local://', '');
      const mediaItem = await db.media_upload_queue.where('fileName').equals(fileName).first();
      
      if (mediaItem) {
        await db.media_upload_queue.update(mediaItem.id!, { status: 'uploading' });
        const filePath = `${mediaItem.folder}/${mediaItem.fileName}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, mediaItem.fileData);

        if (uploadError && !uploadError.message.includes('already exists')) {
          throw new Error(`Media upload failed: ${uploadError.message}`);
        }

        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        resolvedPayload[key] = data.publicUrl;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const table = (db as any)[mediaItem.tableName];
        if (table) {
          await table.update(mediaItem.recordId, { [mediaItem.columnName]: data.publicUrl });
        }
        await db.media_upload_queue.delete(mediaItem.id!);
      }
    } else if (value instanceof Blob || value instanceof File) {
      const fileExt = (value as File).name?.split('.').pop() || 'bin';
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `sync-uploads/${fileName}`; 
      
      const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, value);
      if (uploadError && !uploadError.message.includes('already exists')) {
        throw new Error(`Raw blob upload failed: ${uploadError.message}`);
      }

      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      resolvedPayload[key] = data.publicUrl;
    }
  }
  return resolvedPayload;
}

async function bulkShouldUpsert(table: string, items: { id: string, updated_at: string }[]): Promise<Set<string>> {
  const ids = items.map(i => i.id);
  const validIds = new Set<string>();

  try {
    const { data: remoteRecords, error } = await supabase.from(table).select('id, updated_at').in('id', ids);
    if (error) return new Set(ids);

    const remoteMap = new Map(remoteRecords?.map(r => [r.id, r.updated_at]));

    for (const item of items) {
      const remoteUpdatedAt = remoteMap.get(item.id);
      if (!remoteUpdatedAt) {
        validIds.add(item.id);
        continue;
      }
      const remoteTime = new Date(remoteUpdatedAt).getTime();
      const localTime = new Date(item.updated_at).getTime();

      if (localTime >= remoteTime) validIds.add(item.id);
    }
    return validIds;
  } catch {
    return new Set(ids);
  }
}

export async function prune14DayCache() {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const isoDate = fourteenDaysAgo.toISOString();

  try {
    await Promise.all([
      db.daily_logs.where('log_date').below(isoDate).delete(),
      db.tasks.where('due_date').below(isoDate).delete()
    ]);
  } catch (error) {
    console.error('Janitor Error:', error);
  }
}

export async function forceHydrateFromCloud() {
  const tables = [
    'animals', 'daily_logs', 'medical_logs', 'tasks', 'users', 
    'role_permissions', 'organisations', 'contacts', 'zla_documents',
    'safety_drills', 'maintenance_logs', 'first_aid_logs', 'incidents', 'daily_rounds', 'operational_lists', 'husbandry_logs'
  ];

  try {
    await Promise.all(tables.map(t => {
      const table = db[t as keyof AppDatabase] as import('dexie').Table<unknown, string | number>;
      return table.clear();
    }));

    // WARP SPEED: Concurrent Paginated Hydration
    await Promise.all(tables.map(async (table) => {
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase.from(table).select('*').range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        
        if (data && data.length > 0) {
          const dbTable = db[table as keyof AppDatabase] as import('dexie').Table<unknown, string | number>;
          if (dbTable) {
            await dbTable.bulkPut(data);
          }
          if (data.length < pageSize) hasMore = false;
          page++;
        } else {
          hasMore = false;
        }
      }
    }));
    return true;
  } catch (error) {
    console.error('Hydration Error:', error);
    return false;
  }
}

let isProcessing = false;

export async function processSyncQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    // WARP SPEED: Increased Queue Velocity to 150 records per bite
    const queue = await db.sync_queue
      .where('status')
      .equals('pending')
      .limit(150)
      .toArray();
    
    if (queue.length === 0) return;
    queue.sort((a, b) => a.priority - b.priority);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const tableGroups: Record<string, { upserts: SyncQueueItem[], deletes: SyncQueueItem[] }> = {};
    queue.forEach(item => {
      if (!tableGroups[item.table_name]) tableGroups[item.table_name] = { upserts: [], deletes: [] };
      if (item.operation === 'upsert') tableGroups[item.table_name].upserts.push(item);
      else tableGroups[item.table_name].deletes.push(item);
    });

    const uniqueTables = [...new Set(queue.map(i => i.table_name))];

    for (const table of uniqueTables) {
      const { upserts, deletes } = tableGroups[table];

      if (deletes.length > 0) {
        const deleteIds = deletes.map(d => (d.payload as { id: string }).id);
        try {
          await supabase.from(table).delete().in('id', deleteIds).throwOnError();
          await db.sync_queue.bulkDelete(deletes.map(d => d.id!));
        } catch (err) {
          for (const d of deletes) await handleSyncFailure(d, err);
          break; // Break on failure
        }
      }

      if (upserts.length > 0) {
        try {
          // WARP SPEED: Resolve media uploads concurrently instead of sequentially
          const resolvedItems = (await Promise.all(upserts.map(async (item) => {
            try {
              const resolvedPayload = await resolvePayloadMedia(item.payload as Record<string, unknown>);
              return { queueItem: item, payload: resolvedPayload };
            } catch (err) {
              await handleSyncFailure(item, err);
              return undefined;
            }
          }))).filter((item): item is { queueItem: SyncQueueItem, payload: Record<string, unknown> } => !!item);

          const itemsRequiringCheck = resolvedItems.filter(ri => ri.payload.updated_at !== undefined);
          const itemsBypassingCheck = resolvedItems.filter(ri => ri.payload.updated_at === undefined);

          let validIds = new Set<string>();
          if (itemsRequiringCheck.length > 0) {
            const checkData = itemsRequiringCheck.map(ri => ({
              id: ri.payload.id as string,
              updated_at: (ri.payload.updated_at || ri.queueItem.created_at) as string
            }));
            validIds = await bulkShouldUpsert(table, checkData);
          }

          itemsBypassingCheck.forEach(ri => validIds.add(ri.payload.id as string));

          const finalPayloads = resolvedItems
            .filter(ri => validIds.has(ri.payload.id as string))
            .map(ri => {
              const payload = { ...ri.payload as Record<string, unknown> };
              if (typeof payload.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.id)) {
                 throw new Error(`Invalid UUID detected in payload id: ${payload.id}`);
              }
              if (payload.updated_at === undefined) delete payload.updated_at;
              if (payload.created_at === undefined) delete payload.created_at;
              Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
              return payload;
            });
          
          const staleItems = resolvedItems.filter(ri => !validIds.has(ri.payload.id as string));

          if (finalPayloads.length > 0) {
            JSON.stringify(finalPayloads);
            await supabase.from(table).upsert(finalPayloads, { onConflict: 'id' }).throwOnError();
            const successIds = resolvedItems.filter(ri => validIds.has(ri.payload.id as string)).map(ri => ri.queueItem.id!);
            await db.sync_queue.bulkDelete(successIds);
          }

          if (staleItems.length > 0) {
            await db.sync_queue.bulkDelete(staleItems.map(si => si.queueItem.id!));
          }

        } catch (err) {
          for (const item of upserts) await handleSyncFailure(item, err);
          break; // Break on failure
        }
      }
    }

    // WARP SPEED: Immediate 50ms queue draining for huge offline backlogs
    if (queue.length === 150) {
      setTimeout(() => processSyncQueue(), 50);
    }

  } catch (error) {
    console.error('🛠️ [Sync Engine] Critical error:', error);
  } finally {
    isProcessing = false;
  }
}

async function handleSyncFailure(item: SyncQueueItem, error: unknown) {
  const retryCount = (item.retry_count || 0) + 1;
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const supabaseError = error as { code?: string; status?: number };
  const isDefinitiveError = supabaseError?.code?.startsWith('23') || (supabaseError?.status !== undefined && supabaseError.status >= 400 && supabaseError.status < 500);
  const shouldQuarantine = retryCount >= 3 || isDefinitiveError;
  
  const status = shouldQuarantine ? 'quarantined' : 'pending';

  await db.sync_queue.update(item.id!, {
    retry_count: retryCount,
    status,
    error_log: errorMessage,
    updated_at: new Date().toISOString()
  });

  if (status === 'pending') {
    const delay = Math.min(60000, 2000 * Math.pow(2, retryCount));
    await new Promise(resolve => setTimeout(resolve, delay));
  } else {
    console.error(`🛠️ [Sync Engine] Item ${item.id} QUARANTINED. Manual intervention required.`);
  }
}

export async function reconcileMissedEvents() {
  const tables = [
    'animals', 'archived_animals', 'daily_logs', 'medical_logs', 'tasks', 
    'incidents', 'internal_movements', 'external_transfers', 'daily_rounds', 
    'operational_lists', 'mar_charts', 'quarantine_records', 'shifts', 
    'timesheets', 'holidays', 'safety_drills', 'maintenance_logs', 
    'first_aid_logs', 'organisations', 'contacts', 'zla_documents', 'husbandry_logs', 'users', 'role_permissions'
  ];
  
  const lastSync = localStorage.getItem('last_sync_reconcile') || '2000-01-01T00:00:00.000Z';

  try {
    // WARP SPEED: Concurrent background downloading for all 22 tables at once
    await Promise.all(tables.map(async (table) => {
      const { data, error } = await supabase.from(table).select('*').gt('updated_at', lastSync);
      if (error) throw error;
      if (data && data.length > 0) {
        const dbTable = db[table as keyof AppDatabase] as import('dexie').Table<unknown, string | number>;
        if (dbTable) {
          await dbTable.bulkPut(data);
        } else {
          console.warn(`🛠️ [Sync Engine] Table ${table} not found in local database.`);
        }
      }
    }));
    localStorage.setItem('last_sync_reconcile', new Date().toISOString());
  } catch (err) {
    console.error('🛠️ [Sync Engine] Reconciliation failed:', err);
  }
}

export function startRealtimeSubscription() {
  const channel = supabase.channel('koa-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
        const { table, eventType } = payload;
        const dbTable = db[table as keyof AppDatabase] as import('dexie').Table<unknown, string | number>;
        if (!dbTable) return;
        try {
          if (eventType === 'INSERT' || eventType === 'UPDATE') await dbTable.put(payload.new);
          else if (eventType === 'DELETE') await dbTable.delete(payload.old.id);
        } catch (error) {
          console.error(`Realtime Sync Error on ${table}:`, error);
        }
      }
    ).subscribe();
  return channel;
}

export const pushChangesToSupabase = processSyncQueue;

// WARP SPEED: The Reactive Hair-Trigger.
// Wakes up the engine 100ms after an item enters the queue, rather than waiting for page changes.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    reconcileMissedEvents().then(() => processSyncQueue()).catch(console.error);
  });
  
  const wakeEngine = () => {
    setTimeout(() => {
      if (!isProcessing) processSyncQueue().catch(console.error);
    }, 100);
  };
  db.sync_queue.hook('creating', wakeEngine);
  db.sync_queue.hook('updating', wakeEngine);
}
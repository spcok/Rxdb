import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, AppDatabase } from './db';
import { supabase } from './supabase';
import { Animal } from '../types';

export function useHybridQuery<T>(
  tableName: keyof AppDatabase,
  queryOrDexieFn: (() => T | Promise<T>) | PromiseLike<{ data: unknown; error: unknown }>,
  dexieFnOrDeps?: (() => T | Promise<T>) | unknown[],
  depsOrUndefined?: unknown[]
): T | undefined {
  let onlineQuery: PromiseLike<{ data: unknown; error: unknown }>;
  let offlineQuery: () => T | Promise<T>;
  let deps: unknown[];

  if (typeof queryOrDexieFn === 'function') {
    onlineQuery = supabase.from(tableName as string).select('*');
    offlineQuery = queryOrDexieFn as () => T | Promise<T>;
    deps = (dexieFnOrDeps as unknown[]) || [];
  } else {
    onlineQuery = queryOrDexieFn as PromiseLike<{ data: unknown; error: unknown }>;
    offlineQuery = typeof dexieFnOrDeps === 'function' ? (dexieFnOrDeps as () => T | Promise<T>) : (() => dexieFnOrDeps as T);
    deps = depsOrUndefined || [];
  }

  const data = useLiveQuery(offlineQuery, deps);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      try {
        // FIXED: Safe Promise.all implementation for TypeScript
        const remotePromise = Promise.resolve(onlineQuery);
        const queuePromise = db.sync_queue.where('table_name').equals(tableName as string).toArray();

        const [remoteResult, queuedItems] = await Promise.all([remotePromise, queuePromise]);
        const { data: remoteData, error } = remoteResult;
        
        if (error) throw error;

        if (remoteData && isMounted) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const table = db[tableName] as import('dexie').Table<any, any>;
          const pk = table.schema.primKey.keyPath;

          const queuedIds = new Set(queuedItems.map(item => item.record_id));

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isValid = (item: any) => {
            if (typeof pk === 'string') {
              const id = item[pk];
              return id !== undefined && id !== null && !queuedIds.has(String(id));
            }
            return item && !queuedIds.has(String(item.id));
          };

          if (Array.isArray(remoteData)) {
            const validItems = remoteData.filter(isValid);
            if (validItems.length > 0) {
              await db.transaction('rw', table, async () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const localItems = await table.bulkGet(validItems.map(i => (i as any)[pk as any]));
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const itemsToPut = validItems.filter((remoteItem: any, index) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const localItem: any = localItems[index];
                  if (!localItem) return true;
                  
                  const remoteTime = new Date(remoteItem.updated_at || remoteItem.created_at || 0).getTime();
                  const localTime = new Date(localItem.updated_at || localItem.created_at || 0).getTime();
                  
                  return remoteTime >= localTime;
                });
                
                if (itemsToPut.length > 0) {
                  await table.bulkPut(itemsToPut);
                }
              });
            }
          } else {
            if (isValid(remoteData)) {
              await db.transaction('rw', table, async () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const localItem: any = await table.get((remoteData as any)[pk as any]);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const remoteItem: any = remoteData;
                
                if (!localItem) {
                  await table.put(remoteData);
                } else {
                  const remoteTime = new Date(remoteItem.updated_at || remoteItem.created_at || 0).getTime();
                  const localTime = new Date(localItem.updated_at || localItem.created_at || 0).getTime();
                  
                  if (remoteTime >= localTime) {
                    await table.put(remoteData);
                  }
                }
              });
            }
          }
        }
      } catch (err) {
        console.error(`🛠️ [Engine QA] HybridQuery Error [${tableName}]:`, err);
      }
    }

    const handleOnline = () => fetchData();
    if (navigator.onLine) fetchData();
    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, ...deps]);

  const filteredData = Array.isArray(data)
    ? data.filter((item: Record<string, unknown>) => !item.is_deleted)
    : (data as Record<string, unknown>)?.is_deleted ? undefined : data;

  return filteredData as T;
}

export async function archiveAnimal(animal: Animal, reason: string, type: NonNullable<Animal['archive_type']>) {
  let newDispositionStatus = 'Transferred';
  if (type === 'Death' || type === 'Euthanasia') newDispositionStatus = 'Deceased';
  if (type === 'Missing') newDispositionStatus = 'Missing';
  if (type === 'Stolen') newDispositionStatus = 'Stolen';

  const archivedAnimal = { 
    ...animal, 
    archive_type: type,
    archive_reason: reason, 
    disposition_status: newDispositionStatus as NonNullable<Animal['disposition_status']>,
    archived_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  await db.transaction('rw', db.animals, db.archived_animals, async () => {
    await db.archived_animals.add(archivedAnimal);
    await db.animals.delete(animal.id);
  });

  queueSync('archived_animals', animal.id, 'upsert', archivedAnimal).catch(console.error);
  queueSync('animals', animal.id, 'delete', { id: animal.id }).catch(console.error);
}

export async function restoreAnimal(animal: Animal) {
  const restoredAnimal = {
    ...animal,
    updated_at: new Date().toISOString()
  };
  
  await db.transaction('rw', db.animals, db.archived_animals, async () => {
    await db.animals.add(restoredAnimal);
    await db.archived_animals.delete(animal.id);
  });

  queueSync('animals', animal.id, 'upsert', restoredAnimal as unknown as Record<string, unknown>).catch(console.error);
  queueSync('archived_animals', animal.id, 'delete', { id: animal.id }).catch(console.error);
}

export async function queueSync(tableName: string, recordId: string, operation: 'upsert' | 'delete', payload: Record<string, unknown>) {
  // FLASH UPGRADE: O(1) Compound Index Lookup replaces slow .filter()
  const existing = await db.sync_queue.where('[table_name+record_id]').equals([tableName, recordId]).first();
  
  let priority = 4;
  if (tableName === 'daily_logs') priority = 1;
  else if (['medical_logs', 'incidents', 'missing_animals'].includes(tableName)) priority = 2;
  else if (['internal_movements', 'external_transfers'].includes(tableName)) priority = 3;

  if (existing) {
    await db.sync_queue.put({ 
      ...existing, 
      payload, 
      operation, 
      priority,
      status: 'pending',
      retry_count: 0,
      updated_at: new Date().toISOString() 
    });
  } else {
    await db.sync_queue.add({
      table_name: tableName,
      record_id: recordId,
      operation,
      payload,
      status: 'pending',
      priority,
      retry_count: 0,
      created_at: new Date().toISOString()
    });
  }
}

export async function mutateOnlineFirst<T extends { id?: string | number }>(
  tableName: keyof AppDatabase, 
  payload: T, 
  operation: 'upsert' | 'delete' = 'upsert'
) {
  if (!payload.id) payload.id = crypto.randomUUID();
  const table = db[tableName] as import('dexie').Table<unknown, string>;

  if (operation === 'upsert') {
    (payload as Record<string, unknown>).updated_at = new Date().toISOString();
    
    // 1. TRUE ONLINE-FIRST: Attempt immediate server sync
    if (navigator.onLine) {
      try {
        const { error } = await supabase.from(tableName as string).upsert(payload);
        if (error) {
          console.error(`🚨 [Supabase Rejection] ${tableName}:`, error);
          throw new Error(`Database Error: ${error.message}`);
        }
        // Server accepted! Cache locally and exit.
        await table.put(payload);
        return payload;
      } catch (err) {
        // If Supabase actively rejected the data (schema/RLS), abort and alert the user!
        if (err instanceof Error && err.message && err.message.includes('Database Error')) throw err;
        // Otherwise, it was just a network drop. Catch it and fall back to offline queue.
        console.warn('⚠️ Network unstable. Falling back to 14-day offline failover.');
      }
    }

    // 2. OFFLINE FAILOVER
    await table.put(payload);
    await queueSync(tableName as string, payload.id as string, operation, payload as Record<string, unknown>);
    return payload;

  } else {
    // DELETE OPERATION
    await db.media_upload_queue
      .filter(item => item.tableName === tableName && item.recordId === payload.id)
      .delete();
    
    const softDeletePayload = payload as Record<string, unknown>;
    softDeletePayload.is_deleted = true;
    softDeletePayload.deleted_at = new Date().toISOString();
    softDeletePayload.updated_at = new Date().toISOString();
    
    if (navigator.onLine) {
      try {
        const { error } = await supabase.from(tableName as string).upsert(softDeletePayload);
        if (error) {
          console.error(`🚨 [Supabase Rejection] ${tableName}:`, error);
          throw new Error(`Database Error: ${error.message}`);
        }
        await table.put(softDeletePayload);
        return payload;
      } catch (err) {
        if (err instanceof Error && err.message && err.message.includes('Database Error')) throw err;
        console.warn('⚠️ Network unstable. Falling back to 14-day offline failover.');
      }
    }

    // OFFLINE FAILOVER
    await table.put(softDeletePayload);
    await queueSync(tableName as string, payload.id as string, 'upsert', softDeletePayload);
    return payload;
  }
}
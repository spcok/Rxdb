import { supabase } from '../lib/supabase';

export async function hydrateComplianceData() {
  // No-op: RxDB handles replication automatically
  return Promise.resolve();
}

export async function syncDataToSupabase(tableName: string, data: Record<string, unknown>[]) {
  try {
    const { error } = await supabase.from(tableName).upsert(data);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error(`[SYNC] Sync failed for ${tableName}:`, error);
    return { success: false, error };
  }
}

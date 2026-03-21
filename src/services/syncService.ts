import { supabase } from '../lib/supabase';
import { db } from '../lib/db';

/**
 * hydrateComplianceData
 * Eager Hydration: Fetches critical compliance data from the last 14 days
 * and upserts it into Dexie for offline availability.
 */
export async function hydrateComplianceData() {
  if (!navigator.onLine) return;

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const isoDate = fourteenDaysAgo.toISOString();

  // Mapping based on Zoo Licensing Act 1981 compliance requirements
  const complianceTables = [
    { supabase: 'medical_logs', dexie: 'medical_logs' },
    { supabase: 'quarantine_records', dexie: 'quarantine_records' },
    { supabase: 'mar_charts', dexie: 'mar_charts' },
    { supabase: 'animals', dexie: 'animals' }, // maps to animal_records
    { supabase: 'maintenance_logs', dexie: 'maintenance_logs' }, // maps to enclosure_checks
    { supabase: 'daily_logs', dexie: 'daily_logs' }
  ];

  try {
    // WARP SPEED: Concurrent requests using updated_at to ensure edited records are caught
    await Promise.all(complianceTables.map(async ({ supabase: supabaseTable, dexie: dexieTable }) => {
      const { data, error } = await supabase
        .from(supabaseTable)
        .select('*')
        .gte('updated_at', isoDate); // CHANGED FROM created_at to updated_at

      if (error) {
        console.error(`[SYNC] Error fetching ${supabaseTable}:`, error);
        return;
      }

      if (data && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const table = db[dexieTable as keyof typeof db] as any;
        if (table && typeof table.bulkPut === 'function') {
          await table.bulkPut(data);
        }
      }
    }));
  } catch (error) {
    console.error("[SYNC] Fatal hydration error:", error);
  }
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
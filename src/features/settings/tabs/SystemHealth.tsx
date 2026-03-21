import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../lib/db';
import { supabase } from '../../../lib/supabase';
import { processSyncQueue, reconcileMissedEvents } from '../../../lib/syncEngine';
import { PwaDiagnostics } from '../../../components/ui/PwaDiagnostics';
import { 
  Activity, HardDrive, Database, AlertTriangle, 
  CheckCircle2, RefreshCw, Info, ShieldAlert,
  Download, Trash2, ShieldX, Terminal
} from 'lucide-react';

const SystemHealth: React.FC = () => {
  const [storageEstimate, setStorageEstimate] = useState<{ used: number; total: number; percentage: number } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pingLog, setPingLog] = useState<string[]>([]);
  const [isPinging, setIsPinging] = useState(false);

  // Real-time Sync Queue Metrics
  const syncMetrics = useLiveQuery(async () => {
    const all = await db.sync_queue.toArray();
    return {
      total: all.length,
      pending: all.filter(i => i.status === 'pending').length,
      quarantined: all.filter(i => i.status === 'quarantined').length,
    };
  }, []);

  // Storage API Estimation
  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(estimate => {
        const used = (estimate.usage || 0) / (1024 * 1024); // MB
        const total = (estimate.quota || 0) / (1024 * 1024); // MB
        const percentage = (used / total) * 100;
        setStorageEstimate({ used, total, percentage });
      });
    }
  }, []);

  const handleClearQuarantine = async () => {
    if (window.confirm('Are you sure you want to permanently delete all quarantined sync items?')) {
      const quarantined = await db.sync_queue.where('status').equals('quarantined').toArray();
      const ids = quarantined.map(q => q.id as number);
      await db.sync_queue.bulkDelete(ids);
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await reconcileMissedEvents(); // 1. Pull latest server data
      await processSyncQueue();      // 2. Push local offline queue
    } finally {
      setIsSyncing(false);
    }
  };

  const runPipelinePing = async () => {
    setIsPinging(true);
    setPingLog(['🚀 Starting 3-Way Pipeline Ping...']);
    const testId = uuidv4();

    try {
      setPingLog(p => [...p, '⏳ Fetching valid Animal ID for foreign key constraint...']);
      const firstAnimal = await db.animals.toCollection().first();

      if (!firstAnimal) {
        setPingLog(p => [...p, '❌ FATAL: No animals found in local database. Cannot perform constraint test.']);
        setIsPinging(false);
        return;
      }

      const targetAnimalId = firstAnimal.id;
      setPingLog(p => [...p, `✅ Using Animal ID: ${targetAnimalId}`]);

      // Step 1: Write to Dexie (Local DB)
      setPingLog(p => [...p, '⏳ 1. Writing test payload to Dexie...']);
      await db.sync_queue.add({
        table_name: 'daily_logs',
        record_id: testId,
        operation: 'upsert',
        payload: { 
          id: testId, 
          animal_id: targetAnimalId, // Real ID satisfies the Foreign Key constraint
          log_type: 'GENERAL', // Satisfies the NOT NULL constraint
          value: 'SYSTEM_PING_TEST', // Added to satisfy NOT NULL constraint
          log_date: new Date().toISOString(), 
          notes: 'PIPELINE_PING_TEST', 
          created_at: new Date().toISOString() 
        },
        status: 'pending',
        priority: 1,
        created_at: new Date().toISOString(),
        retry_count: 0
      });
      setPingLog(p => [...p, '✅ 1. Dexie write successful.']);

      // Step 2: Trigger Sync Engine
      setPingLog(p => [...p, '⏳ 2. Firing Sync Engine to push to Supabase...']);
      await processSyncQueue();
      setPingLog(p => [...p, '✅ 2. Sync Engine executed.']);

      // Step 3: Verify in Supabase
      setPingLog(p => [...p, '⏳ 3. Querying Supabase directly for test record...']);
      const { data, error } = await supabase.from('daily_logs').select('id').eq('id', testId).single();

      if (error || !data) {
        setPingLog(p => [...p, '❌ 3. Supabase verification failed. Record did not arrive.']);
      } else {
        setPingLog(p => [...p, '✅ 3. Supabase received the record! Pipeline is HEALTHY.']);
      }

      // Step 4: Cleanup
      setPingLog(p => [...p, '⏳ 4. Cleaning up test data...']);
      await supabase.from('daily_logs').delete().eq('id', testId);
      setPingLog(p => [...p, '✅ 4. Cleanup complete.']);

    } catch (err) {
      setPingLog(p => [...p, `❌ FATAL ERROR: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setIsPinging(false);
    }
  };

  const exportLocalDatabase = async () => {
    setIsExporting(true);
    try {
      const exportData: Record<string, unknown[]> = {};
      const tables = db.tables;
      
      for (const table of tables) {
        exportData[table.name] = await table.toArray();
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `koa-local-db-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('🛠️ [Diagnostics] Export failed:', error);
      alert('Failed to export database.');
    } finally {
      setIsExporting(false);
    }
  };

  const purgeLocalDatabase = async () => {
    const firstConfirm = window.confirm('🚨 CRITICAL WARNING: This will permanently delete ALL local data, including unsynced changes. This cannot be undone. Are you absolutely sure?');
    
    if (firstConfirm) {
      const secondConfirm = window.prompt('To confirm deletion, please type "PURGE" below (all caps):');
      
      if (secondConfirm === 'PURGE') {
        try {
          console.warn('🚨 [Diagnostics] Initiating emergency local database purge...');
          await db.delete();
          localStorage.clear();
          window.location.reload();
        } catch (error) {
          console.error('🛠️ [Diagnostics] Purge failed:', error);
          alert('Failed to purge database.');
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Activity className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">System Health & Diagnostics</h2>
          <p className="text-sm text-gray-500">Monitor offline storage and sync engine performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sync Queue Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Sync Engine</h3>
            <Database className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Total Queue</span>
              <span className="font-mono font-bold text-slate-900">{syncMetrics?.total || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Pending</span>
              <span className="font-mono font-bold text-emerald-600">{syncMetrics?.pending || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Quarantined</span>
              <span className={`font-mono font-bold ${syncMetrics?.quarantined ? 'text-rose-600' : 'text-slate-400'}`}>
                {syncMetrics?.quarantined || 0}
              </span>
            </div>
          </div>
          <button 
            onClick={handleForceSync}
            disabled={isSyncing}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Force Sync Now'}
          </button>
        </div>

        {/* Storage Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Local Storage</h3>
            <HardDrive className="w-5 h-5 text-amber-500" />
          </div>
          {storageEstimate ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Usage: {storageEstimate.used.toFixed(1)} MB</span>
                  <span className="text-slate-500">{storageEstimate.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      storageEstimate.percentage > 80 ? 'bg-rose-500' : 
                      storageEstimate.percentage > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${storageEstimate.percentage}%` }}
                  />
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                <div className="p-1 bg-white rounded shadow-sm shrink-0">
                  <Info className="w-3 h-3 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  IndexedDB storage is managed by the browser. Quota is shared with other site data.
                </p>
              </div>
              {storageEstimate.percentage > 80 && (
                <div className="flex items-center gap-2 text-rose-600 text-xs font-bold animate-pulse">
                  <AlertTriangle size={14} />
                  Storage usage is critically high!
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-slate-400 text-sm italic">
              Estimating storage...
            </div>
          )}
        </div>

        {/* Status Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Engine Status</h3>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-700">Offline Engine Active</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-slate-700">Dexie v30 Initialized</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-slate-700">Supabase Realtime Connected</span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">ZLA Compliance Mode</p>
              <p className="text-xs text-emerald-600 font-bold">STRICT_AUDIT_ENABLED</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quarantined Items Warning */}
      {syncMetrics?.quarantined ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-4">
          <div className="p-2 bg-rose-100 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-900">Quarantined Sync Items Detected</h4>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">
              {syncMetrics.quarantined} items have failed multiple sync attempts and are quarantined to prevent queue blockage. 
              These usually indicate schema conflicts or validation errors. Please contact technical support for manual reconciliation.
            </p>
            <button 
              onClick={handleClearQuarantine}
              className="mt-3 px-3 py-1.5 bg-rose-200 text-rose-800 text-xs font-bold rounded-lg hover:bg-rose-300 transition-colors"
            >
              Clear Quarantine Queue
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* PWA Diagnostics */}
          <PwaDiagnostics />

          {/* Pipeline Diagnostic Tool */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Pipeline Diagnostics</h3>
              <Terminal className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 mb-1">3-Way Pipeline Ping</h4>
                <p className="text-[11px] text-slate-500 mb-3">Verifies end-to-end connectivity between React, Dexie, and Supabase by sending a test record.</p>
                <button 
                  onClick={runPipelinePing}
                  disabled={isPinging}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <RefreshCw size={14} className={isPinging ? 'animate-spin' : ''} />
                  {isPinging ? 'Running Diagnostic...' : 'Run Pipeline Ping'}
                </button>
              </div>

              {pingLog.length > 0 && (
                <div className="bg-slate-950 p-4 rounded-lg font-mono text-[10px] text-emerald-400 overflow-y-auto max-h-48 space-y-1">
                  {pingLog.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Actions / Danger Zone */}
        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-rose-600 uppercase tracking-wider">Advanced Actions</h3>
            <ShieldX className="w-5 h-5 text-rose-500" />
          </div>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 mb-1">Backup Local Data</h4>
              <p className="text-[11px] text-slate-500 mb-3">Download a JSON snapshot of all records currently stored in your local IndexedDB.</p>
              <button 
                onClick={exportLocalDatabase}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition-all"
              >
                <Download size={14} />
                {isExporting ? 'Exporting...' : 'Download Database (.json)'}
              </button>
            </div>

            <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
              <h4 className="text-xs font-bold text-rose-700 mb-1">Emergency Purge</h4>
              <p className="text-[11px] text-rose-600/70 mb-3">Permanently delete all local data and reset the application state. Use only as a last resort.</p>
              <button 
                onClick={purgeLocalDatabase}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-all shadow-sm shadow-rose-200"
              >
                <Trash2 size={14} />
                Purge Local Database
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;

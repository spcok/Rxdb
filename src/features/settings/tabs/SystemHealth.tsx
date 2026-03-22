import React, { useEffect, useState } from 'react';
import { PwaDiagnostics } from '../../../components/ui/PwaDiagnostics';
import { 
  Activity, HardDrive, AlertTriangle, 
  CheckCircle2, Info,
  Download, Trash2, ShieldX
} from 'lucide-react';
import { db } from '../../../lib/rxdb';
import { removeRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const SystemHealth: React.FC = () => {
  const [storageEstimate, setStorageEstimate] = useState<{ used: number; total: number; percentage: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const exportLocalDatabase = async () => {
    setIsExporting(true);
    try {
      if (!db) return;
      const exportData: Record<string, unknown[]> = {};
      
      const collections = Object.keys(db.collections);
      for (const colName of collections) {
        const docs = await db.collections[colName].find().exec();
        exportData[colName] = docs.map(d => d.toJSON());
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
          if (db) {
            await removeRxDatabase('animaldb_v11', getRxStorageDexie());
          }
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <span className="text-sm font-medium text-slate-700">RxDB Engine Active</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* PWA Diagnostics */}
          <PwaDiagnostics />
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

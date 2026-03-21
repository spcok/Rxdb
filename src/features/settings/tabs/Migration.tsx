import React, { useRef } from 'react';
import { Upload, FileJson, AlertTriangle, CheckCircle2, Loader2, Database } from 'lucide-react';
import { useMigrationData } from '../../../hooks/useMigrationData';

const Migration: React.FC = () => {
  const { 
    parseFile, 
    runMigration, 
    previewData, 
    isImporting, 
    error, 
    reset 
  } = useMigrationData();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="text-emerald-600" size={24} />
            Legacy Data Migration
          </h2>
          <p className="text-slate-500 text-sm mt-1">Import V1 JSON backups into the V2 Dexie database.</p>
        </div>
      </div>

      {!previewData && !isImporting && (
        <div 
          onClick={triggerFileInput}
          className="border-2 border-dashed border-slate-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
            <Upload className="text-slate-400 group-hover:text-emerald-600" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-700 group-hover:text-emerald-700">Click to Upload JSON</h3>
          <p className="text-slate-400 text-sm mt-2 max-w-sm">Select your <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-mono text-xs">backup.json</code> file from the legacy system.</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-bold text-rose-800">Migration Error</h4>
            <p className="text-xs text-rose-600 mt-1">{error}</p>
            <button onClick={reset} className="text-xs font-bold text-rose-800 underline mt-2 hover:text-rose-900">Try Again</button>
          </div>
        </div>
      )}

      {previewData && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                <FileJson size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Ready to Import</h3>
                <p className="text-sm text-slate-500">Found <span className="font-bold text-slate-900">{previewData.animalCount}</span> animals and <span className="font-bold text-slate-900">{previewData.logCount}</span> historical logs.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/50 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preview (First 10 Records)</span>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">Avatar</th>
                      <th className="px-4 py-3 whitespace-nowrap">Name</th>
                      <th className="px-4 py-3 whitespace-nowrap">Species</th>
                      <th className="px-4 py-3 whitespace-nowrap">Logs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewData.animals.slice(0, 10).map((animal, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="px-4 py-2 whitespace-nowrap">
                          {animal.imageUrl ? (
                            <img src={animal.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-slate-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400">NA</div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm font-bold text-slate-700 whitespace-nowrap">{animal.name}</td>
                        <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{animal.species}</td>
                        <td className="px-4 py-2 text-xs font-mono text-slate-500 whitespace-nowrap">{animal.logs?.length || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.animalCount > 10 && (
                <div className="px-4 py-2 bg-slate-50 text-center text-xs text-slate-400 italic border-t border-slate-200">
                  ...and {previewData.animalCount - 10} more animals.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={reset}
              className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={runMigration}
              disabled={isImporting}
              className="flex-1 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Importing Database...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} /> Confirm & Import Database
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Migration;

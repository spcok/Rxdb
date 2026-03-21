import { Plus, Lock, History } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

export default function FlightRecords() {
  const { view_movements } = usePermissions();

  if (!view_movements) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full min-h-[50vh] space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 flex flex-col items-center gap-2 max-w-md text-center">
          <Lock size={48} className="opacity-50" />
          <h2 className="text-lg font-bold">Access Restricted</h2>
          <p className="text-sm font-medium">You do not have permission to view Flight Records. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Flight Records</h1>
          <p className="text-sm text-slate-500 mt-1">Log of all training and display flights for collection animals.</p>
        </div>
        <button 
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18}/> Record Flight
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 shadow-sm">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
            <History size={24} />
          </div>
          <div>
            <p className="text-xs font-medium">No flights have been recorded yet.</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Start by recording your first training or display flight.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

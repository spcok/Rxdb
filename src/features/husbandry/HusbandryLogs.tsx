import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Loader2, Edit2, Trash2 } from 'lucide-react';
import { db } from '../../lib/rxdb';
import AddEntryModal from './AddEntryModal';
import { Animal, LogType, LogEntry } from '../../types';
import { formatWeightDisplay, parseLegacyWeightToGrams } from '../../services/weightUtils';

interface Props {
  animalId: string;
  animal: Animal; // Strictly required
}

const validHusbandryTypes = ['FEED', 'WEIGHT', 'FLIGHT', 'TRAINING', 'TEMPERATURE'];

export const HusbandryLogs: React.FC<Props> = ({ animalId, animal }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [displayLimit, setDisplayLimit] = useState(30);

  useEffect(() => {
    if (!db) return;

    const sub = db.daily_records.find({
      selector: {
        animal_id: animalId,
        log_type: { $in: validHusbandryTypes },
        is_deleted: { $eq: false }
      },
      sort: [{ log_date: 'desc' }]
    }).$.subscribe(docs => {
      setLogs(docs.map(d => d.toJSON() as LogEntry));
      setLoading(false);
    });

    return () => sub.unsubscribe();
  }, [animalId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 20) {
      setDisplayLimit(prev => prev + 20);
    }
  };
  
  const filters = ['ALL', ...validHusbandryTypes];

  const handleSaveLog = async (entry: LogEntry) => {
    try {
      await db.daily_records.upsert({
        ...entry,
        record_type: 'daily_logs_v2',
        is_deleted: false
      });
      setIsAddModalOpen(false);
      setSelectedLog(null);
    } catch (err) {
      console.error('Failed to save log:', err);
      alert('Failed to save log. Please try again.');
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this log?')) return;
    try {
      const doc = await db.daily_records.findOne(id).exec();
      if (doc) {
        await doc.patch({ is_deleted: true });
      }
    } catch (err) {
      console.error('Failed to delete log:', err);
      alert('Failed to delete log. Please try again.');
    }
  };

  const filteredLogs = useMemo(() => {
    if (filter === 'ALL') return logs;
    return logs.filter(log => log.log_type?.toUpperCase() === filter);
  }, [logs, filter]);

  // Dynamic formatting for historical logs
  const renderLogValue = (log: LogEntry) => {
    if (log.log_type?.toUpperCase() === 'WEIGHT') {
      const targetUnit = animal.weight_unit || 'g';
      const val = (log.value || '').toLowerCase();

      // Condition 1: If log.weight_unit === animal.weight_unit, strictly return log.value.
      if (log.weight_unit && targetUnit && log.weight_unit === targetUnit) {
        return log.value;
      }

      // Condition 2: If log.value already includes the string representation of the target unit
      if ((targetUnit === 'oz' && val.includes('oz')) || 
          (targetUnit === 'lbs_oz' && (val.includes('lb') || val.includes('oz')))) {
        return log.value;
      }

      // Fallback: Only if the units explicitly mismatch, pass through conversion pipeline
      const grams = log.weight_grams ?? parseLegacyWeightToGrams(log.value);
      if (grams !== null && !isNaN(grams)) {
        const unit = targetUnit === 'lbs_oz' ? 'lbs_oz' : targetUnit;
        return formatWeightDisplay(grams, unit as 'g' | 'kg' | 'oz' | 'lbs_oz');
      }
    }
    return log.value || log.notes || '—';
  };

  const getTypeColor = (type: string) => {
    const safeType = type?.toUpperCase();
    switch (safeType) {
      case 'FEED': return 'bg-emerald-100 text-emerald-800';
      case 'WEIGHT': return 'bg-blue-100 text-blue-800';
      case 'FLIGHT': return 'bg-purple-100 text-purple-800';
      case 'TRAINING': return 'bg-amber-100 text-amber-800';
      case 'TEMPERATURE': return 'bg-rose-100 text-rose-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const currentDate = useMemo(() => new Date(), []);

  return (
    <div className="space-y-2 relative">
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button 
            key={f} 
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <button 
        onClick={() => { setSelectedLog(null); setIsAddModalOpen(true); }}
        className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition"
      >
        <Plus size={16} /> + ADD HUSBANDRY LOG
      </button>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar" onScroll={handleScroll}>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2 font-bold text-slate-500">DATE</th>
              <th className="px-2 py-2 font-bold text-slate-500">TYPE</th>
              <th className="px-2 py-2 font-bold text-slate-500">VALUE</th>
              <th className="px-2 py-2 font-bold text-slate-500 uppercase">INITIALS / ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  <Loader2 className="animate-spin mx-auto" size={24} />
                </td>
              </tr>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.slice(0, displayLimit).map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-2 py-2 text-slate-700">
                    {new Date(log.log_date || log.created_at || currentDate).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getTypeColor(log.log_type)}`}>
                      {log.log_type}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-bold text-slate-900">
                    {renderLogValue(log)}
                  </td>
                  <td className="px-2 py-2 text-slate-500 font-bold uppercase text-xs flex items-center gap-2">
                    {log.user_initials || '—'}
                    <button onClick={() => { setSelectedLog(log); setIsAddModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-1"><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteLog(log.id!)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No husbandry logs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && animal && (
        <AddEntryModal
          isOpen={isAddModalOpen}
          onClose={() => { setIsAddModalOpen(false); setSelectedLog(null); }}
          onSave={handleSaveLog}
          animal={animal}
          existingLog={selectedLog}
          initialType={LogType.FEED}
          initialDate={new Date().toISOString().split('T')[0]}
        />
      )}
    </div>
  );
};
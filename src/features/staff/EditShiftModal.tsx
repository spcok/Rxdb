import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save, AlertTriangle } from 'lucide-react';
import { ShiftType, Shift } from '../../types';
import { useRotaData } from './useRotaData';
import { useUsersData } from '../settings/useUsersData';

interface EditShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingShift: Shift | null;
}

const EditShiftModal: React.FC<EditShiftModalProps> = ({ isOpen, onClose, existingShift }) => {
  const { register, handleSubmit, reset } = useForm<Partial<Shift>>();
  const { updateShift, replaceShiftPattern } = useRotaData();
  const { users } = useUsersData();
  
  const [updateMode, setUpdateMode] = useState<'single' | 'series'>('single');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [weeks, setWeeks] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingShift) {
      reset(existingShift);
      setUpdateMode('single');
      setRepeatDays([new Date(existingShift.date).getDay()]);
      setWeeks(4);
    }
  }, [existingShift, reset]);

  if (!isOpen || !existingShift) return null;

  const onSubmit = async (data: Partial<Shift>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // STRICT MAPPING: Prevents raw HTML/DOM synthetic events from causing circular JSON crashes
      const user = users.find(u => u.id === data.user_id);
      const cleanShiftData: Omit<Shift, 'id' | 'pattern_id'> = {
        user_id: String(data.user_id || ''),
        user_name: String(user?.name || existingShift.user_name),
        user_role: user?.role || existingShift.user_role,
        date: String(data.date || ''),
        shift_type: data.shift_type as ShiftType,
        start_time: String(data.start_time || ''),
        end_time: String(data.end_time || ''),
        assigned_area: data.assigned_area ? String(data.assigned_area) : undefined,
      };

      if (updateMode === 'series') {
        await replaceShiftPattern(existingShift, cleanShiftData, repeatDays, weeks);
      } else {
        await updateShift(existingShift.id, cleanShiftData, false);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysOfWeek = [
    { label: 'M', val: 1 }, { label: 'T', val: 2 }, { label: 'W', val: 3 }, 
    { label: 'T', val: 4 }, { label: 'F', val: 5 }, { label: 'S', val: 6 }, { label: 'S', val: 0 }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">Edit Shift</h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <select {...register('user_id', { required: true })} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-emerald-500 outline-none transition-colors font-medium">
            <option value="">Select User</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          
          <input type="date" {...register('date', { required: true })} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-emerald-500 outline-none transition-colors font-medium" />
          
          <select {...register('shift_type', { required: true })} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-emerald-500 outline-none transition-colors font-medium">
            {Object.values(ShiftType).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          
          <div className="flex gap-3">
            <input type="time" {...register('start_time', { required: true })} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-emerald-500 outline-none transition-colors font-medium" />
            <input type="time" {...register('end_time', { required: true })} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-emerald-500 outline-none transition-colors font-medium" />
          </div>
          
          <input type="text" {...register('assigned_area')} placeholder="Assigned Area" className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-emerald-500 outline-none transition-colors font-medium" />
          
          <div className="mt-6 p-4 bg-slate-50 border-2 border-slate-100 rounded-xl space-y-4">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={updateMode === 'single'} onChange={() => setUpdateMode('single')} className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-700">Update this shift only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={updateMode === 'series'} onChange={() => setUpdateMode('series')} className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-700">Apply new pattern</span>
              </label>
            </div>

            {updateMode === 'series' && (
              <div className="space-y-4 pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <AlertTriangle size={14} /> Replaces future shifts in this series.
                </p>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Repeat on days</label>
                  <div className="flex gap-1">
                    {daysOfWeek.map((day) => (
                      <button 
                        key={day.val} 
                        type="button" 
                        onClick={() => setRepeatDays(prev => prev.includes(day.val) ? prev.filter(d => d !== day.val) : [...prev, day.val])} 
                        className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${repeatDays.includes(day.val) ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-emerald-500'}`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Duration (Weeks)</label>
                  <input type="number" value={weeks} min="1" max="52" onChange={e => setWeeks(Number(e.target.value))} className="w-full border-2 border-slate-200 p-3 rounded-xl focus:border-emerald-500 outline-none transition-colors font-medium" />
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-black text-white p-4 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs transition-all shadow-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={18} /> {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditShiftModal;

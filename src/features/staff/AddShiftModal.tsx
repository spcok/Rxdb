import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Save } from 'lucide-react';
import { ShiftType, Shift } from '../../types';
import { useRotaData } from './useRotaData';
import { useUsersData } from '../settings/useUsersData';

interface AddShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddShiftModal: React.FC<AddShiftModalProps> = ({ isOpen, onClose }) => {
  const { register, handleSubmit } = useForm<Omit<Shift, 'id' | 'pattern_id' | 'user_name' | 'user_role'>>();
  const { createShift } = useRotaData();
  const { users } = useUsersData();
  const [repeat, setRepeat] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [weeks, setWeeks] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const onSubmit = async (data: Omit<Shift, 'id' | 'pattern_id' | 'user_name' | 'user_role'>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const user = users.find(u => u.id === data.user_id);
      
      const cleanShiftData = {
        user_id: String(data.user_id || ''),
        date: String(data.date || ''),
        shift_type: data.shift_type as ShiftType,
        start_time: String(data.start_time || ''),
        end_time: String(data.end_time || ''),
        assigned_area: data.assigned_area ? String(data.assigned_area) : undefined,
        user_name: String(user?.name || 'Unknown'),
        user_role: String(user?.role || 'Unknown')
      };

      await createShift(cleanShiftData, repeat ? repeatDays : [], repeat ? weeks : 1);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Add Shift</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <select {...register('user_id', { required: true })} className="w-full border p-2 rounded">
            <option value="">Select User</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input type="date" {...register('date', { required: true })} className="w-full border p-2 rounded" />
          <select {...register('shift_type', { required: true })} className="w-full border p-2 rounded">
            {Object.values(ShiftType).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="time" {...register('start_time', { required: true })} className="w-full border p-2 rounded" />
            <input type="time" {...register('end_time', { required: true })} className="w-full border p-2 rounded" />
          </div>
          <input type="text" {...register('assigned_area')} placeholder="Assigned Area" className="w-full border p-2 rounded" />
          
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)} />
            Repeat Shift?
          </label>

          {repeat && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[
                  { label: 'M', val: 1 }, { label: 'T', val: 2 }, { label: 'W', val: 3 }, 
                  { label: 'T', val: 4 }, { label: 'F', val: 5 }, { label: 'S', val: 6 }, { label: 'S', val: 0 }
                ].map((day) => (
                  <button 
                    key={day.val} 
                    type="button" 
                    onClick={() => setRepeatDays(prev => prev.includes(day.val) ? prev.filter(d => d !== day.val) : [...prev, day.val])} 
                    className={`flex-1 py-2 rounded font-bold text-xs transition-colors ${repeatDays.includes(day.val) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <input type="number" value={weeks} onChange={e => setWeeks(Number(e.target.value))} placeholder="Duration (Weeks)" className="w-full border p-2 rounded" />
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white p-2 rounded flex items-center justify-center gap-2 disabled:opacity-50">
            <Save size={18} /> {isSubmitting ? 'Saving...' : 'Save Shift'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddShiftModal;

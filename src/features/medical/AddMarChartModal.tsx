import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Animal, MARChart } from '../../types';

const schema = z.object({
  animal_id: z.string().min(1, 'Animal is required'),
  medication: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  instructions: z.string().min(1, 'Instructions are required'),
  staff_initials: z.string().min(2, 'Initials are required'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chart: Omit<MARChart, 'id' | 'animal_name' | 'administered_dates' | 'status'>) => Promise<void>;
  animals: Animal[];
}

export const AddMarChartModal: React.FC<Props> = ({ isOpen, onClose, onSave, animals }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      start_date: new Date().toISOString().split('T')[0],
    }
  });

  if (!isOpen) return null;

  const onSubmit = async (data: FormData) => {
    await onSave(data);
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <h2 className="text-lg font-bold text-slate-900">Add Medication Chart</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Animal</label>
            <select {...register('animal_id')} className="w-full mt-1 border border-slate-300 rounded-lg p-2">
              <option value="">Select an animal</option>
              {animals?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {errors.animal_id && <p className="text-red-500 text-xs">{errors.animal_id.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Medication Name</label>
            <input type="text" {...register('medication')} className="w-full mt-1 border border-slate-300 rounded-lg p-2" />
            {errors.medication && <p className="text-red-500 text-xs">{errors.medication.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Dosage</label>
            <input type="text" {...register('dosage')} className="w-full mt-1 border border-slate-300 rounded-lg p-2" />
            {errors.dosage && <p className="text-red-500 text-xs">{errors.dosage.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Frequency</label>
            <input type="text" {...register('frequency')} className="w-full mt-1 border border-slate-300 rounded-lg p-2" />
            {errors.frequency && <p className="text-red-500 text-xs">{errors.frequency.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Instructions</label>
            <input type="text" {...register('instructions')} className="w-full mt-1 border border-slate-300 rounded-lg p-2" />
            {errors.instructions && <p className="text-red-500 text-xs">{errors.instructions.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Staff Initials <span className="text-red-500">*</span></label>
            <input type="text" {...register('staff_initials')} className="w-full mt-1 border border-slate-300 rounded-lg p-2" required />
            {errors.staff_initials && <p className="text-red-500 text-xs">{errors.staff_initials.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Start Date</label>
            <input type="date" {...register('start_date')} className="w-full mt-1 border border-slate-300 rounded-lg p-2" />
            {errors.start_date && <p className="text-red-500 text-xs">{errors.start_date.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">End Date (Optional)</label>
            <input type="date" {...register('end_date')} className="w-full mt-1 border border-slate-300 rounded-lg p-2" />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:bg-slate-400">
            {isSubmitting ? 'Saving...' : 'Save Chart'}
          </button>
        </form>
      </div>
    </div>
  );
};

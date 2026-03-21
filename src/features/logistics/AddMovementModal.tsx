import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MovementType } from '@/src/types';
import { useMovementsData } from './useMovementsData';
import { useAnimalsData } from '../animals/useAnimalsData';

const schema = z.object({
  animal_id: z.string().min(1, 'Animal is required'),
  log_date: z.string().min(1, 'Date is required'),
  movement_type: z.nativeEnum(MovementType),
  source_location: z.string().min(1, 'Source is required'),
  destination_location: z.string().min(1, 'Destination is required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
}

export default function AddMovementModal({ onClose }: Props) {
  const { addMovement } = useMovementsData();
  const { animals } = useAnimalsData();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      log_date: new Date().toISOString().split('T')[0],
      movement_type: MovementType.TRANSFER
    }
  });

  const onSubmit = async (data: FormData) => {
    const animal = animals.find(a => a.id === data.animal_id);
    await addMovement({
      ...data,
      animal_name: animal?.name || 'Unknown'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border-2 border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-6">Record Internal Movement</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subject Animal</label>
            <select {...register('animal_id')} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold">
              <option value="">-- Choose Animal --</option>
              {(animals || []).map(a => <option key={a.id} value={a.id}>{a.name} ({a.species})</option>)}
            </select>
            {errors.animal_id && <p className="text-rose-500 text-[10px]">{String(errors.animal_id.message)}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</label>
              <input type="date" {...register('log_date')} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Type</label>
              <select {...register('movement_type')} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold">
                {Object.values(MovementType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">From</label>
              <input {...register('source_location')} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">To</label>
              <input {...register('destination_location')} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</label>
            <textarea {...register('notes')} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold h-24" />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
            <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Commit</button>
          </div>
        </form>
      </div>
    </div>
  );
}

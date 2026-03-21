import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TransferType, TransferStatus } from '@/src/types';
import { useTransfersData } from './useTransfersData';
import { useAnimalsData } from '../animals/useAnimalsData';

const schema = z.object({
  animal_id: z.string().min(1, 'Animal is required'),
  transfer_type: z.nativeEnum(TransferType),
  date: z.string().min(1, 'Date is required'),
  institution: z.string().min(1, 'Institution is required'),
  transport_method: z.string().min(1, 'Transport method is required'),
  cites_article_10_ref: z.string().min(1, 'CITES/A10 ref is required'),
  status: z.nativeEnum(TransferStatus),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onClose: () => void;
}

export default function AddTransferModal({ onClose }: Props) {
  const { addTransfer } = useTransfersData();
  const { animals } = useAnimalsData();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      transfer_type: TransferType.ARRIVAL,
      status: TransferStatus.PENDING
    }
  });

  const onSubmit = async (data: FormData) => {
    const animal = animals.find(a => a.id === data.animal_id);
    await addTransfer({
      ...data,
      animal_name: animal?.name || 'Unknown'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border-2 border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mb-6">Record External Transfer</h2>
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
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Type</label>
              <select {...register('transfer_type')} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold">
                {Object.values(TransferType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</label>
              <input type="date" {...register('date')} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Institution</label>
              <input {...register('institution')} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transport</label>
              <input {...register('transport_method')} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CITES / A10 Ref</label>
            <input {...register('cites_article_10_ref')} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold" />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</label>
            <select {...register('status')} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold">
              {Object.values(TransferStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
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

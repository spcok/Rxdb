import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, Loader2 } from 'lucide-react';
import { Animal, ClinicalNote } from '../../types';
import { queueFileUpload } from '../../lib/storageEngine';
import { SignatureCapture } from '../../components/ui/SignatureCapture';
import { convertToGrams, convertFromGrams } from '../../services/weightUtils';

// 1. ZOD SCHEMA AMPUTATION: weight and weight_unit are strictly removed.
const schema = z.object({
  animal_id: z.string().min(1, 'Animal is required'),
  date: z.string().min(1, 'Date is required'),
  note_type: z.enum(['Illness', 'Checkup', 'Injury', 'Routine']),
  diagnosis: z.string().optional(),
  bcs: z.number().min(1).max(5).optional(),
  note_text: z.string().min(5, 'Note must be at least 5 characters'),
  treatment_plan: z.string().optional(),
  recheck_date: z.string().optional(),
  staff_initials: z.string().min(2, 'Initials must be at least 2 characters'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Partial<ClinicalNote>) => Promise<void>;
  animals: Animal[];
  initialData?: ClinicalNote | null;
  preselectedAnimalId?: string;
}

export const AddClinicalNoteModal: React.FC<Props> = ({ isOpen, onClose, onSave, animals, initialData, preselectedAnimalId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [signatureData, setSignatureData] = useState<string | undefined>();
  const [integritySeal, setIntegritySeal] = useState<string | undefined>();
  const [isCapturingSignature, setIsCapturingSignature] = useState(false);
  const recordId = initialData?.id || crypto.randomUUID();

  // 2. FORM INITIALIZATION
  const { register, handleSubmit, control, formState: { errors, isSubmitting }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      animal_id: preselectedAnimalId || '',
      date: new Date().toISOString().split('T')[0],
      note_type: 'Routine',
    }
  });

  // 3. THE OBSERVER PATTERN: Watch the selected animal and derive the unit
  const selectedAnimalId = useWatch({ control, name: 'animal_id' });
  const selectedAnimal = animals?.find(a => a.id === selectedAnimalId);
  const targetUnit = selectedAnimal?.weight_unit === 'lbs_oz' ? 'lb' : (selectedAnimal?.weight_unit === 'oz' ? 'oz' : 'g');
  
  // 4. ABSOLUTE STATE ISOLATION: Manual weight tracking independent of RHF
  const [weightValues, setWeightValues] = useState({ g: 0, lb: 0, oz: 0, eighths: 0 });

  const handleWeightChange = (field: string, val: string) => {
    const num = val === '' ? 0 : parseInt(val, 10);
    setWeightValues(prev => ({ ...prev, [field]: num }));
  };

  // 5. HYDRATION: Load existing data into the form and manual state
  useEffect(() => {
    if (isOpen && initialData) {
      setValue('animal_id', initialData.animal_id);
      setValue('date', initialData.date);
      setValue('note_type', initialData.note_type as 'Illness' | 'Checkup' | 'Injury' | 'Routine');
      setValue('diagnosis', initialData.diagnosis || '');
      setValue('bcs', initialData.bcs);
      setValue('note_text', initialData.note_text);
      setValue('treatment_plan', initialData.treatment_plan || '');
      setValue('recheck_date', initialData.recheck_date || '');
      setValue('staff_initials', initialData.staff_initials);
      setSignatureData(undefined);
      setIntegritySeal(initialData.integrity_seal);

      // Hydrate custom weight state
      if (initialData.weight_grams) {
        setWeightValues(convertFromGrams(initialData.weight_grams, targetUnit as 'g' | 'oz' | 'lb'));
      } else {
        setWeightValues({ g: 0, lb: 0, oz: 0, eighths: 0 });
      }
    } else if (isOpen && !initialData) {
      reset({
        animal_id: preselectedAnimalId || '',
        date: new Date().toISOString().split('T')[0],
        note_type: 'Routine',
      });
      setSignatureData(undefined);
      setIntegritySeal(undefined);
      setWeightValues({ g: 0, lb: 0, oz: 0, eighths: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData, setValue, reset, preselectedAnimalId]); // Exclude targetUnit to prevent overwriting user input on unit change

  if (!isOpen) return null;

  // 6. THE SUBMISSION INTERCEPTOR
  const onSubmit = async (data: FormData) => {
    setUploading(true);
    let attachment_url: string | undefined = initialData?.attachment_url;
    let thumbnail_url: string | undefined = initialData?.thumbnail_url;
    
    try {
      if (file) {
        try {
          const uploadResult = await queueFileUpload(file, 'medical', recordId, 'medical_logs', 'attachment_url');
          attachment_url = uploadResult.attachment_url;
          thumbnail_url = uploadResult.thumbnail_url;
        } catch (err) {
          console.error('🛠️ [Medical QA] File processing error:', err);
          alert(err instanceof Error ? err.message : 'Image too large for offline processing.');
          setFile(null);
          setUploading(false);
          return;
        }
      }
      
      // Calculate final grams securely from isolated state
      const totalGrams = convertToGrams(targetUnit as 'g' | 'oz' | 'lb', weightValues);

      // Manually merge the RHF data with our custom weight data
      const notePayload = { 
        ...data, 
        weight_grams: totalGrams > 0 ? totalGrams : undefined,
        weight: totalGrams > 0 ? totalGrams : undefined,
        weight_unit: selectedAnimal?.weight_unit || 'g',
        attachment_url,
        thumbnail_url,
        integrity_seal: integritySeal
      };

      if (initialData) {
        await onSave({ ...initialData, ...notePayload });
      } else {
        await onSave({ ...notePayload, id: recordId });
      }
      
      reset();
      setFile(null);
      setSignatureData(undefined);
      setIntegritySeal(undefined);
      onClose();
    } catch (error) {
      console.error('Failed to save note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto p-4">
      <div className="flex min-h-full items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <h2 className="text-lg font-bold text-slate-900">{initialData ? 'Edit Clinical Note' : 'Add Clinical Note'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Animal</label>
              <select {...register('animal_id')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm">
                <option value="">Select an animal</option>
                {animals?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors.animal_id && <p className="text-red-500 text-xs mt-1">{errors.animal_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Date</label>
              <input type="date" {...register('date')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Note Type</label>
              <select {...register('note_type')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm">
                <option value="Illness">Illness</option>
                <option value="Checkup">Checkup</option>
                <option value="Injury">Injury</option>
                <option value="Routine">Routine</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Diagnosis / Primary Issue</label>
              <input type="text" {...register('diagnosis')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" placeholder="e.g. Wing Fracture" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Body Condition Score (1-5)</label>
              <select {...register('bcs', { valueAsNumber: true })} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm">
                <option value="">Select BCS</option>
                <option value="1">1 - Emaciated</option>
                <option value="1.5">1.5</option>
                <option value="2">2 - Thin</option>
                <option value="2.5">2.5</option>
                <option value="3">3 - Ideal</option>
                <option value="3.5">3.5</option>
                <option value="4">4 - Overweight</option>
                <option value="4.5">4.5</option>
                <option value="5">5 - Obese</option>
              </select>
            </div>
          </div>

          {/* DYNAMIC WEIGHT ENGINE (Fully Isolated from RHF) */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Current Weight ({targetUnit})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {targetUnit === 'g' && (
                <div className="sm:col-span-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Grams</label>
                  <input type="number" value={weightValues.g || ''} onChange={(e) => handleWeightChange('g', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. 1050" />
                </div>
              )}
              {targetUnit === 'oz' && (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ounces (oz)</label>
                    <input type="number" value={weightValues.oz || ''} onChange={(e) => handleWeightChange('oz', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-blue-500" placeholder="oz" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">8ths</label>
                    <select value={weightValues.eighths || 0} onChange={(e) => handleWeightChange('eighths', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-blue-500">
                      {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}/8</option>)}
                    </select>
                  </div>
                </>
              )}
              {targetUnit === 'lb' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pounds (lb)</label>
                    <input type="number" value={weightValues.lb || ''} onChange={(e) => handleWeightChange('lb', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-blue-500" placeholder="lb" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ounces (oz)</label>
                    <select value={weightValues.oz || 0} onChange={(e) => handleWeightChange('oz', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-blue-500">
                      {Array.from({length: 16}, (_, i) => i).map(n => <option key={n} value={n}>{n} oz</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">8ths</label>
                    <select value={weightValues.eighths || 0} onChange={(e) => handleWeightChange('eighths', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:border-blue-500">
                      {[0,1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}/8</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            <p className="text-[10px] font-medium text-slate-400 italic mt-2">Calculated Value: {convertToGrams(targetUnit as 'g' | 'oz' | 'lb', weightValues).toFixed(2)}g</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Clinical Observation</label>
            <textarea {...register('note_text')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" rows={4} placeholder="Detailed clinical notes..." />
            {errors.note_text && <p className="text-red-500 text-xs mt-1">{errors.note_text.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Treatment Plan</label>
            <textarea {...register('treatment_plan')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" rows={3} placeholder="Medications, procedures, or monitoring plan..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Recheck Date (Optional)</label>
              <input type="date" {...register('recheck_date')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Staff Initials <span className="text-red-500">*</span></label>
              <input type="text" {...register('staff_initials')} className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-sm" required />
              {errors.staff_initials && <p className="text-red-500 text-xs mt-1">{errors.staff_initials.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Attachment (Optional)</label>
            <div className="mt-1 flex items-center gap-4">
              <label className="cursor-pointer bg-slate-100 p-2 rounded-lg hover:bg-slate-200 transition-colors">
                <Upload size={20} className="text-slate-600" />
                <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
              <span className="text-sm text-slate-500">{file ? file.name : initialData?.attachment_url ? 'Existing attachment' : 'No file selected'}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Signature</label>
            {isCapturingSignature ? (
              <SignatureCapture 
                recordId={recordId}
                onSave={(base64, hash) => { 
                  setSignatureData(base64); 
                  setIntegritySeal(hash);
                  setIsCapturingSignature(false); 
                }} 
                onCancel={() => setIsCapturingSignature(false)} 
                initialSignature={signatureData} 
              />
            ) : (
              <div className="flex items-center gap-4">
                {signatureData ? (
                  <img src={signatureData} alt="Signature" className="h-16 w-auto border border-slate-200 rounded-lg" />
                ) : (
                  <span className="text-sm text-slate-500">No signature provided</span>
                )}
                <button
                  type="button"
                  onClick={() => setIsCapturingSignature(true)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  {signatureData ? 'Edit Signature' : 'Add Signature'}
                </button>
              </div>
            )}
            {integritySeal && (
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full"></span>
                Integrity Verified
              </p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting || uploading} className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:bg-slate-400">
            {isSubmitting || uploading ? <><Loader2 className="animate-spin" size={16} /> Saving...</> : 'Save Note'}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
};

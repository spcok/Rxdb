import React, { useEffect, useState } from 'react';
import { useForm, FieldErrors } from 'react-hook-form';
import { X, AlertCircle } from 'lucide-react';
import { User, UserRole } from '../../../types';
import { SignatureCapture } from '../../../components/ui/SignatureCapture';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: User | null;
  onSave?: (data: Partial<User>) => Promise<void>;
  onSuccess: () => void;
}

interface UserFormInputs {
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  password?: string;
  pin?: string;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, initialData, onSave, onSuccess }) => {
  const { register, handleSubmit, reset, setValue } = useForm<UserFormInputs>();
  const { currentUser } = useAuthStore();
  
  const [isCapturingSignature, setIsCapturingSignature] = useState(false);
  const [currentSignature, setCurrentSignature] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    setGlobalError(null);
    if (initialData) {
      setValue('name', initialData.name);
      setValue('email', initialData.email);
      setValue('role', initialData.role);
      setValue('initials', initialData.initials);
      setValue('pin', initialData.pin);
      setCurrentSignature(initialData.signature_data);
    } else {
      reset({ name: '', email: '', role: UserRole.VOLUNTEER, initials: '', password: '', pin: '' });
      setCurrentSignature(undefined);
    }
  }, [initialData, setValue, reset, isOpen]);

  if (!isOpen) return null;

  const onSubmit = async (data: UserFormInputs) => {
    if (!navigator.onLine) {
      setGlobalError("You must be connected to the internet to perform this action.");
      return;
    }

    setGlobalError(null);
    setIsSubmitting(true);
    
    try {
      let integritySeal = undefined;
      if (currentSignature) {
        const recordId = initialData?.id || 'NEW_RECORD';
        const timestamp = new Date().toISOString();
        const userId = currentUser?.id || 'UNKNOWN_USER';
        const dataToHash = `${recordId}${timestamp}${userId}${currentSignature}`;
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(dataToHash);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        integritySeal = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      }

      const cleanData = {
        name: String(data.name || ''),
        email: String(data.email || ''),
        role: String(data.role || UserRole.VOLUNTEER) as UserRole,
        initials: String(data.initials || '').toUpperCase(),
        pin: String(data.pin || ''),
        password: data.password ? String(data.password) : undefined,
        signature_data: currentSignature ? String(currentSignature) : undefined,
        integrity_seal: integritySeal
      };

      if (initialData && onSave) {
        // --- EDIT MODE ---
        try {
          await onSave(cleanData);
        } catch (err: unknown) {
          if (err instanceof Error && err.message?.includes('integrity_seal')) {
            console.error('⚠️ [SCHEMA] Missing integrity_seal column.');
          }
          throw err;
        }
        onSuccess();
        onClose();
      } else {
        // --- CREATE MODE ---
        if (!cleanData.password) throw new Error('Password is required for new accounts.');
        
        const profileData = {
          name: cleanData.name,
          role: cleanData.role,
          initials: cleanData.initials,
          pin: cleanData.pin,
          signature_data: cleanData.signature_data,
          integrity_seal: cleanData.integrity_seal
        };

        // Bypass Dexie entirely and hit Supabase Edge Function directly
        const { data: response, error } = await supabase.functions.invoke('create-staff-account', {
          body: { email: cleanData.email, password: cleanData.password, profileData: profileData }
        });

        if (error) {
          if (error.message?.includes('integrity_seal')) {
            console.error('⚠️ [SCHEMA] Missing integrity_seal column.');
          }
          throw new Error(`Network Error: ${error.message}`);
        }
        if (response?.error) {
          if (response.error.includes('integrity_seal')) {
            console.error('⚠️ [SCHEMA] Missing integrity_seal column.');
          }
          throw new Error(response.error);
        }

        // Notify parent to fetch fresh data from cloud
        onSuccess();
        onClose();
      }
    } catch (error: unknown) {
      setGlobalError(error instanceof Error ? error.message : "An unexpected error occurred.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = (errors: FieldErrors<UserFormInputs>) => {
    const missingFields = Object.keys(errors).map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ');
    setGlobalError(`Missing required fields: ${missingFields}.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
        
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{initialData ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {globalError && (
          <div className="mx-8 mt-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
            <AlertCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest">Action Failed</h4>
              <p className="text-sm font-medium text-rose-600 mt-1">{globalError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest border-b border-slate-100 pb-2">Account Details</h4>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                <input {...register('name', { required: true })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-900" placeholder="e.g. John Smith" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                <input {...register('email', { required: true })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-900" placeholder="e.g. john@kentowlacademy.com" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Initials (Max 3)</label>
                <input {...register('initials', { required: true, maxLength: 3 })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-900 uppercase" placeholder="JS" />
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest border-b border-slate-100 pb-2">Access & Security</h4>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">System Role</label>
                <select {...register('role', { required: true })} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-900 appearance-none cursor-pointer">
                  <option value={UserRole.VOLUNTEER}>Volunteer</option>
                  <option value={UserRole.KEEPER}>Keeper</option>
                  <option value={UserRole.SENIOR_KEEPER}>Senior Keeper</option>
                  <option value={UserRole.ADMIN}>Administrator</option>
                  <option value={UserRole.OWNER}>Owner</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Daily PIN (Up to 6 Digits)</label>
                <input {...register('pin', { required: true, minLength: 4, maxLength: 6 })} type="password" maxLength={6} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-900 tracking-[0.5em]" placeholder="••••••" />
              </div>
              {!initialData && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Login Password</label>
                  <input {...register('password', { required: true, minLength: 6 })} type="password" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-900" placeholder="••••••••" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="max-w-md">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Digital Signature</label>
              {isCapturingSignature ? (
                <SignatureCapture 
                  recordId={initialData?.id || 'new-user'}
                  onSave={(base64) => { 
                    setCurrentSignature(base64); 
                    setIsCapturingSignature(false); 
                  }} 
                  onCancel={() => setIsCapturingSignature(false)} 
                  initialSignature={currentSignature} 
                />
              ) : (
                <div className="space-y-3">
                  {currentSignature && <div className="p-4 border-2 border-slate-100 rounded-2xl bg-white"><img src={currentSignature} alt="Signature" className="h-16 mx-auto" /></div>}
                  <button type="button" onClick={() => setIsCapturingSignature(true)} className="w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
                    {currentSignature ? 'Update Signature' : 'Draw Digital Signature'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-8 py-4 border-2 border-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]">
              {isSubmitting ? 'Saving...' : (initialData ? 'Update Profile' : 'Create Account')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
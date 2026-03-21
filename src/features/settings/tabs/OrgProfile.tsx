/* 
  SQL: CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'koa-attachments');
  NOTE: Ensure a public bucket named 'koa-attachments' exists in your Supabase dashboard.
*/
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOrgSettings } from '../useOrgSettings';
import { OrgProfileSettings } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const schema = z.object({
  id: z.string(),
  org_name: z.string().min(1, 'Organisation Name is required'),
  logo_url: z.string().optional(),
  contact_email: z.string().email('Invalid email'),
  contact_phone: z.string().min(1, 'Contact Phone is required'),
  address: z.string().min(1, 'Address is required'),
  zla_license_number: z.string().min(1, 'ZLA Licence Number is required'),
  official_website: z.string().optional(),
  adoption_portal: z.string().optional(),
});

const OrgProfile: React.FC = () => {
  const { settings, isLoading, saveSettings } = useOrgSettings();
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { register, handleSubmit, setValue, watch } = useForm<OrgProfileSettings>({
    resolver: zodResolver(schema),
    defaultValues: settings
  });

  useEffect(() => {
    if (!isLoading) {
      Object.entries(settings).forEach(([key, value]) => {
        setValue(key as keyof OrgProfileSettings, value);
      });
    }
  }, [settings, isLoading, setValue]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const logoUrl = watch('logo_url');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      try {
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `logos/primary-logo.${fileExt}`;

        // 1. Clean out the old logos to prevent extension clutter (e.g., leaving an old .png when a .jpg is uploaded)
        const { data: existingFiles } = await supabase.storage.from('koa-attachments').list('logos');
        if (existingFiles && existingFiles.length > 0) {
          const filesToRemove = existingFiles.map(f => `logos/${f.name}`);
          await supabase.storage.from('koa-attachments').remove(filesToRemove);
        }

        // 2. Upload the new consistent file
        const { error: uploadError } = await supabase.storage.from('koa-attachments').upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;

        // 3. Get the URL and add a cache-buster so the UI updates immediately
        const { data } = supabase.storage.from('koa-attachments').getPublicUrl(filePath);
        const cacheBustedUrl = `${data.publicUrl}?t=${Date.now()}`;

        setValue('logo_url', cacheBustedUrl, { shouldValidate: true, shouldDirty: true });
      } catch (error) {
        console.error('Upload failed', error);
        showToast('Upload failed. Ensure you have network connectivity.', 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const onSubmit = async (data: OrgProfileSettings) => {
    setIsSaving(true);
    try {
      await saveSettings(data);
      showToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="relative">
      {toast && (
        <div className={`absolute top-0 right-0 p-4 rounded-lg shadow-lg flex items-center gap-2 text-white text-sm font-medium z-50 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex gap-6">
            <div className="w-48 h-48 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-slate-400 text-sm">Logo</span>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <input type="file" onChange={handleLogoUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              {isUploading && <p className="text-sm text-blue-500">Uploading...</p>}
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Academy Name</label>
                  <input {...register('org_name')} className="mt-1 block w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Zoo Licence Number</label>
                  <input {...register('zla_license_number')} className="mt-1 block w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Headquarters Address</label>
            <textarea {...register('address')} className="mt-1 block w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50" />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Professional Email</label>
              <input {...register('contact_email')} className="mt-1 block w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Academy Phone</label>
              <input {...register('contact_phone')} className="mt-1 block w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Official Website</label>
              <input {...register('official_website')} className="mt-1 block w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Adoption Portal</label>
              <input {...register('adoption_portal')} className="mt-1 block w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50" />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSaving}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default OrgProfile;

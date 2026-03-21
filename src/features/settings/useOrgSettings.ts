import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { OrgProfileSettings } from '../../types';
import { supabase } from '../../lib/supabase';
import { queueSync } from '../../lib/dataEngine';

const DEFAULT_SETTINGS: OrgProfileSettings = {
  id: 'profile',
  org_name: 'Kent Owl Academy',
  logo_url: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  zla_license_number: '',
  official_website: '',
  adoption_portal: '',
};

export function useOrgSettings() {
  const settingsData = useLiveQuery<OrgProfileSettings | undefined>(async () => {
    const settings = await db.organisations.get('profile');
    return settings || DEFAULT_SETTINGS;
  }, []);
  
  useEffect(() => {
    async function fetchRemoteSettings() {
      if (!navigator.onLine) return;
      try {
        const { data, error } = await supabase.from('organisations').select('*').limit(1).maybeSingle();
        if (error) throw error;
        if (data) {
          await db.organisations.put({ ...data, id: 'profile' });
        }
      } catch (err) {
        console.error("❌ [OrgSettings] Failed to fetch remote settings:", err);
      }
    }
    fetchRemoteSettings();
  }, []);

  const isLoading = settingsData === undefined;
  const settings = settingsData || DEFAULT_SETTINGS;

  const saveSettings = async (newSettings: OrgProfileSettings) => {
    console.log("🏢 [OrgSettings] Attempting to save profile:", newSettings);
    try {
      const settingsToSave = { ...newSettings, id: 'profile' };
      
      // Update local Dexie cache
      await db.organisations.put(settingsToSave);

      if (navigator.onLine) {
        // Fetch the organization ID from Supabase
        const { data: orgData, error: fetchError } = await supabase
          .from('organisations')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (fetchError) {
          if (fetchError.code === '42501' || fetchError.message?.includes('403')) {
            console.error("❌ [OrgSettings] 403 Forbidden: Check RLS policies on 'organisations' table.");
          }
          throw fetchError;
        }

        const orgId = orgData?.id;

        const payload = {
          org_name: newSettings.org_name,
          logo_url: newSettings.logo_url,
          contact_email: newSettings.contact_email,
          contact_phone: newSettings.contact_phone,
          address: newSettings.address,
          zla_license_number: newSettings.zla_license_number,
          official_website: newSettings.official_website,
          adoption_portal: newSettings.adoption_portal,
        };

        if (orgId) {
          const { error: updateError } = await supabase
            .from('organisations')
            .update(payload)
            .eq('id', orgId);

          if (updateError) {
            console.error("Supabase Save Error:", updateError);
            if (updateError.code === '42501' || updateError.message?.includes('403')) {
              console.error("❌ [OrgSettings] 403 Forbidden on UPDATE: Check RLS policies.");
            } else if (updateError.code === '23505' || updateError.message?.includes('409')) {
              console.error("❌ [OrgSettings] 409 Conflict on UPDATE.");
            }
            throw updateError;
          }
        } else {
          const { error: insertError } = await supabase
            .from('organisations')
            .insert(payload);
            
          if (insertError) {
            console.error("Supabase Save Error:", insertError);
            if (insertError.code === '42501' || insertError.message?.includes('403')) {
              console.error("❌ [OrgSettings] 403 Forbidden on INSERT: Check RLS policies.");
            } else if (insertError.code === '23505' || insertError.message?.includes('409')) {
              console.error("❌ [OrgSettings] 409 Conflict on INSERT.");
            }
            throw insertError;
          }
        }
      } else {
        // Queue for later sync
        await queueSync('organisations', 'profile', 'upsert', settingsToSave);
      }
      console.log("✅ [OrgSettings] Save successful");
    } catch (error) {
      console.error("❌ [OrgSettings] Save failed:", error);
      throw error;
    }
  };

  return { settings, isLoading, saveSettings };
}

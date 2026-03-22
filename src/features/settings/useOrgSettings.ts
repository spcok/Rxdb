import { useState, useEffect } from 'react';
import { db } from '../../lib/rxdb';
import { OrgProfileSettings } from '../../types';

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
  const [settings, setSettings] = useState<OrgProfileSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const sub = db.admin_records.find({
      selector: {
        record_type: 'organisation',
        is_deleted: { $eq: false }
      }
    }).$.subscribe(docs => {
      if (docs.length > 0) {
        setSettings(docs[0].toJSON() as OrgProfileSettings);
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
      setIsLoading(false);
    });

    return () => sub.unsubscribe();
  }, []);

  const saveSettings = async (newSettings: OrgProfileSettings) => {
    console.log("🏢 [OrgSettings] Attempting to save profile:", newSettings);
    try {
      const settingsToSave = {
        ...newSettings,
        id: 'profile',
        record_type: 'organisation',
        is_deleted: false,
        updated_at: new Date().toISOString()
      };
      
      await db.admin_records.upsert(settingsToSave);
      console.log("✅ [OrgSettings] Save successful");
    } catch (error) {
      console.error("❌ [OrgSettings] Save failed:", error);
      throw error;
    }
  };

  return { settings, isLoading, saveSettings };
}

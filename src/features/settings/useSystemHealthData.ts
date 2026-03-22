import { useState, useEffect } from 'react';
import { db as rxdb } from '../../lib/rxdb';
import { supabase } from '../../lib/supabase';

export function useSystemHealthData() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);
  const [isWipingData, setIsWipingData] = useState(false);
  const [wipeProgress, setWipeProgress] = useState(0);

  const [pwaHealth, setPwaHealth] = useState({
    isSecure: window.isSecureContext,
    swActive: false,
    swUpdateWaiting: false,
    manifestValid: false,
    isInstalled: false,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    storageValid: false,
    isPrivateBrowsing: false,
    storageQuota: 0
  });

  useEffect(() => {
    const checkPwaHealth = async () => {
      let swActive = false;
      let swUpdateWaiting = false;
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        swActive = registrations.length > 0;
        
        const registration = await navigator.serviceWorker.ready;
        if (registration.waiting) {
          swUpdateWaiting = true;
        }
      }

      let manifestValid = false;
      try {
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        if (manifestLink && manifestLink.href) {
          const res = await fetch(manifestLink.href, { cache: 'no-store' });
          if (res.ok) {
            const manifest = await res.json();
            manifestValid = !!(manifest.icons && manifest.icons.length > 0);
          }
        }
      } catch (e) {
        console.error('Manifest check failed', e);
      }

      let storageValid = false;
      let isPrivateBrowsing = false;
      let storageQuota = 0;

      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        storageQuota = estimate.quota || 0;
        // If quota is less than 100MB, it's likely private browsing or very low space
        if (storageQuota < 100 * 1024 * 1024) {
          isPrivateBrowsing = true;
        }
      }

      if ('indexedDB' in window) {
        try {
          const request = indexedDB.open('KentOwlAcademyDB');
          storageValid = await new Promise((resolve) => {
            request.onsuccess = () => {
              request.result.close();
              resolve(true);
            };
            request.onerror = () => resolve(false);
          });
        } catch (e) {
          console.error('IndexedDB check failed', e);
        }
      }

      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // @ts-expect-error - deferredPwaPrompt is attached to window globally
      const isInstalled = !!window.deferredPwaPrompt || isStandalone;

      setPwaHealth(prev => ({ 
        ...prev, 
        swActive, 
        swUpdateWaiting,
        manifestValid, 
        storageValid, 
        isInstalled, 
        isStandalone,
        isPrivateBrowsing,
        storageQuota
      }));
    };

    checkPwaHealth();
    
    // Listen for the custom event dispatched in main.tsx
    const handlePwaCaptured = () => {
      setPwaHealth(prev => ({ ...prev, isInstalled: true }));
    };
    window.addEventListener('pwa-prompt-captured', handlePwaCaptured);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('pwa-prompt-captured', handlePwaCaptured);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [tableCounts, setTableCounts] = useState({
    animals: 0,
    users: 0,
    daily_logs: 0,
    tasks: 0,
    medical_logs: 0
  });

  useEffect(() => {
    if (!rxdb) return;

    const updateCounts = async () => {
      try {
        const counts = {
          animals: await rxdb.animals.find().exec().then(docs => docs.length),
          users: await rxdb.admin_records.find({ selector: { record_type: 'user' } }).exec().then(docs => docs.length),
          daily_logs: await rxdb.daily_records.find({ selector: { record_type: 'daily_logs_v2' } }).exec().then(docs => docs.length),
          tasks: await rxdb.tasks.find().exec().then(docs => docs.length),
          medical_logs: await rxdb.clinical_records.find({ selector: { record_type: 'medical_logs' } }).exec().then(docs => docs.length)
        };
        setTableCounts(counts);
      } catch (e) {
        console.error('Failed to update counts', e);
      }
    };

    updateCounts();
    const interval = setInterval(updateCounts, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const executeForceRebuild = async () => {
    setIsHydrating(true);
    try {
      // With RxDB, we don't need manual hydration, it syncs automatically.
      // We could trigger a manual replication restart here if needed.
      return true;
    } catch (error) {
      console.error("Hydration failed:", error);
      return false;
    } finally {
      setIsHydrating(false);
    }
  };

  const executeClearQueue = async () => {
    setIsClearingQueue(true);
    try {
      // No sync_queue table in RxDB
      return true;
    } catch (error) {
      console.error("Failed to clear queue:", error);
      return false;
    } finally {
      setIsClearingQueue(false);
    }
  };

  const executeWipeData = async () => {
    setIsWipingData(true);
    setWipeProgress(0);

    const tablesToWipe = [
      'animals', 'daily_logs', 'tasks', 'medical_logs', 'mar_charts',
      'quarantine_records', 'internal_movements', 'external_transfers',
      'timesheets', 'holidays', 'contacts', 'zla_documents',
      'safety_drills', 'maintenance_logs', 'first_aid_logs',
      'incidents', 'daily_rounds'
    ];

    try {
      for (let i = 0; i < tablesToWipe.length; i++) {
        const table = tablesToWipe[i];
        
        // Wipe Cloud Database
        await supabase.from(table).delete().not('id', 'is', null);
        
        // Wipe Local RxDB Cache
        if (rxdb && rxdb.collections[table]) {
          await rxdb.collections[table].find().remove();
        }

        setWipeProgress(Math.round(((i + 1) / tablesToWipe.length) * 100));
      }
      return true;
    } catch (error) {
      console.error("Data wipe failed:", error);
      return false;
    } finally {
      setIsWipingData(false);
      setWipeProgress(0);
    }
  };

  return { 
    isOnline, isHydrating, pwaHealth, tableCounts,
    executeForceRebuild, executeClearQueue, isClearingQueue,
    executeWipeData, isWipingData, wipeProgress
  };
}

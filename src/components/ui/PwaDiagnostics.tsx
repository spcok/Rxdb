import React, { useEffect, useState } from 'react';

export const PwaDiagnostics: React.FC = () => {
  const [swState, setSwState] = useState<string>('Unknown');
  const [dbStatus, setDbStatus] = useState<string>('Unknown');
  const [lastSync] = useState<string>('N/A');

  useEffect(() => {
    // Service Worker State
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations.length > 0) {
          const sw = registrations[0].active;
          setSwState(sw ? 'Active' : 'Redundant/Installing');
        } else {
          setSwState('No Service Worker');
        }
      });
    }

    // IndexedDB Check
    if ('indexedDB' in window) {
      // Simple check if database exists
      const request = indexedDB.open('KentOwlAcademyDB'); // Replace with actual DB name
      request.onsuccess = () => {
        setDbStatus('Connected');
        request.result.close();
      };
      request.onerror = () => setDbStatus('Error/Not Found');
    }
  }, []);

  const handleClearCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      alert('Caches cleared. Please reload the application.');
    }
  };

  return (
    <div className="p-4 bg-slate-100 rounded-xl border border-slate-200">
      <h3 className="font-semibold text-slate-800 mb-2">PWA Diagnostics</h3>
      <div className="text-sm text-slate-600 space-y-1">
        <p>Service Worker: <span className="font-mono">{swState}</span></p>
        <p>Offline Storage: <span className="font-mono">{dbStatus}</span></p>
        <p>Last Sync: <span className="font-mono">{lastSync}</span></p>
      </div>
      <button onClick={handleClearCache} className="mt-3 w-full bg-red-600 text-white py-2 rounded-lg">
        Force Clear Cache
      </button>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

export const UpdateBanner: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      console.log('🛠️ [PWA] Update banner triggered by event.');
      setShow(true);
    };

    // Check for waiting SW on mount
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg && reg.waiting) {
          setShow(true);
        }
      });
    }

    window.addEventListener('pwa-update-available', handleUpdate);
    return () => window.removeEventListener('pwa-update-available', handleUpdate);
  }, []);

  const handleUpdateNow = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
    // Small delay to allow SW to skip waiting before reload
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-[9999] animate-in slide-in-from-bottom-8 duration-500">
      <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-[0_20px_50px_rgba(79,70,229,0.4)] border border-indigo-400/30 backdrop-blur-md flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-indigo-200" />
            </div>
            <h3 className="font-bold text-base">New Version Ready</h3>
          </div>
          <button 
            onClick={() => setShow(false)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} className="text-indigo-200" />
          </button>
        </div>
        
        <p className="text-sm text-indigo-100 leading-relaxed">
          We've deployed an update with new features and performance improvements. Refresh now to stay up to date.
        </p>
        
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleUpdateNow}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-indigo-600 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-all active:scale-95"
          >
            <RefreshCw size={16} className="animate-spin-slow" />
            Update Now
          </button>
          <button
            onClick={() => setShow(false)}
            className="px-4 py-2.5 bg-indigo-700/50 text-indigo-100 text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

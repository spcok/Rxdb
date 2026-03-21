import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export const InstallButton: React.FC = () => {
  const [isInstallable, setIsInstallable] = useState(() => {
    // @ts-expect-error - custom window property
    return !!window.deferredPwaPrompt;
  });

  useEffect(() => {
    const handlePrompt = () => setIsInstallable(true);
    window.addEventListener('pwa-prompt-captured', handlePrompt);

    return () => window.removeEventListener('pwa-prompt-captured', handlePrompt);
  }, []);

  const handleInstallClick = async () => {
    // @ts-expect-error - custom window property
    const promptEvent = window.deferredPwaPrompt;
    if (!promptEvent) return;

    // Trigger the native browser install prompt
    promptEvent.prompt();

    // Wait for the user's response
    const { outcome } = await promptEvent.userChoice;
    console.log(`🛠️ [PWA] User installation choice: ${outcome}`);

    // The prompt can only be used once, so clear it
    // @ts-expect-error - custom window property
    window.deferredPwaPrompt = null;
    setIsInstallable(false);
  };

  if (!isInstallable) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold text-sm transition-all shadow-sm animate-in fade-in zoom-in duration-300"
    >
      <Download size={16} />
      <span className="hidden sm:inline">Install App</span>
    </button>
  );
};

import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Lock, LogOut, ShieldAlert, Fingerprint } from 'lucide-react';

const LockScreen: React.FC = () => {
  const { currentUser, isUiLocked, setUiLocked, logout } = useAuthStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // If UI is not locked, don't show the screen
  if (!isUiLocked) return null;

  const handleBiometricUnlock = async () => {
    try {
      if (!window.PublicKeyCredential) {
        setError('Biometrics not supported on this device.');
        return;
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          rpId: window.location.hostname,
          userVerification: "required",
        }
      });

      if (credential) {
        setUiLocked(false);
        setPin('');
        setError('');
      }
    } catch (err: unknown) {
      console.error("Biometric error:", err);
      if (err instanceof DOMException || err instanceof Error) {
        setError('Biometric cancelled. Please enter PIN.');
      } else {
        setError('Biometric unlock failed. Please use PIN.');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fallback for legacy users who don't have a PIN set yet
    const userPin = currentUser?.pin;
    
    console.log("🔒 LOCK SCREEN DIAGNOSTIC:");
    console.log("Entered PIN:", pin);
    console.log("currentUser Object in AuthStore:", currentUser);
    console.log("Expected PIN (currentUser.pin):", userPin);
    
    if (!userPin) {
      // Fallback for legacy users: allow '0000' or just let them in if they are admin
      // The user said "including a fallback for legacy users".
      if (pin === '0000') {
        setUiLocked(false);
        setPin('');
        setError('');
      } else {
        setError('No PIN set. Use 0000 or contact admin.');
        setPin('');
      }
      return;
    }

    if (pin === userPin) {
      setUiLocked(false);
      setPin('');
      setError('');
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/98 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 w-full max-w-sm shadow-2xl text-center border border-slate-100">
        <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100">
          <Lock className="w-10 h-10 text-slate-900" />
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">
          System Locked
        </h2>
        <p className="text-slate-400 mb-8 text-xs font-bold uppercase tracking-widest">
          Enter your security PIN to continue
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="password"
              maxLength={6}
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-5xl p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl tracking-[0.5em] focus:border-slate-900 focus:bg-white outline-none transition-all font-black text-slate-900"
              placeholder="••••••"
            />
          </div>
          
          {error && (
            <div className="flex items-center justify-center gap-2 text-rose-500 bg-rose-50 p-3 rounded-xl border border-rose-100">
              <ShieldAlert size={14} />
              <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button 
              type="submit" 
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-xl shadow-slate-200"
            >
              Unlock System
            </button>
            
            {window.PublicKeyCredential && (
              <button
                type="button"
                onClick={handleBiometricUnlock}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-200 mt-2"
              >
                <Fingerprint size={20} /> Biometric Unlock
              </button>
            )}
          </div>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-50">
          <button 
            onClick={logout}
            className="flex items-center justify-center gap-2 text-slate-400 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest w-full transition-colors"
          >
            <LogOut size={14} /> Terminate Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockScreen;

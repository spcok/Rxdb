import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

export const useInactivityTimer = () => {
  const { setUiLocked, session, isUiLocked } = useAuthStore();
  const lastActivityRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!session || isUiLocked) return;

    // Reset activity when session starts or unlocks
    lastActivityRef.current = Date.now();

    const checkInactivity = () => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_LIMIT) {
        setUiLocked(true);
      }
    };

    intervalRef.current = setInterval(checkInactivity, 10000); // Check every 10 seconds

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity, { passive: true }));
    
    // Also check when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session, isUiLocked, setUiLocked, updateActivity, INACTIVITY_LIMIT]);
};

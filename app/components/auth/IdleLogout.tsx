'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export default function IdleLogout() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoggedInRef = useRef(false);

  useEffect(() => {
    // Delay init to avoid racing with AuthGuard on mount
    const initTimeout = setTimeout(() => {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      isLoggedInRef.current = true;

      const logout = () => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        router.replace('/?reason=idle');
      };

      const resetTimer = () => {
        if (!isLoggedInRef.current) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(logout, IDLE_TIMEOUT_MS);
      };

      // Start the timer
      resetTimer();

      // Activity events that reset the timer
      const events: (keyof WindowEventMap)[] = [
        'mousemove',
        'mousedown',
        'keydown',
        'scroll',
        'touchstart',
        'click',
        'focus',
      ];

      events.forEach((event) =>
        window.addEventListener(event, resetTimer, { passive: true })
      );

      // Also reset when the tab becomes visible
      const onVisibility = () => {
        if (document.visibilityState === 'visible') resetTimer();
      };
      document.addEventListener('visibilitychange', onVisibility);

      // Cleanup — attached to the init timer
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        events.forEach((event) =>
          window.removeEventListener(event, resetTimer)
        );
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }, 200);

    return () => clearTimeout(initTimeout);
  }, [router]);

  return null;
}
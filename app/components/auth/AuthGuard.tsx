'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;

    // Retry up to 10 times, every 100ms
    let attempts = 0;
    const maxAttempts = 10;

    const check = () => {
      attempts++;

      const token = sessionStorage.getItem('token');

      if (token) {
        checkedRef.current = true;
        setChecked(true);
        return;
      }

      if (attempts >= maxAttempts) {
        // Genuinely no token after 1 second → redirect
        router.replace(`/?next=${encodeURIComponent(pathname)}`);
        return;
      }

      // Try again in 100ms
      setTimeout(check, 100);
    };

    // First check after a small delay (let login finish writing)
    const initial = setTimeout(check, 100);

    return () => clearTimeout(initial);
  }, [router, pathname]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}
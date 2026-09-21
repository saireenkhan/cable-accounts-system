'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    // Once verified on this mount, never re-check.
    if (checkedRef.current) return;

    const id = setTimeout(() => {
      const token = sessionStorage.getItem('token');

      if (!token) {
        router.replace(`/?next=${encodeURIComponent(pathname)}`);
        return;
      }

      checkedRef.current = true;
      setChecked(true);
    }, 100);

    return () => clearTimeout(id);
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
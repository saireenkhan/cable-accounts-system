
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import MasterSidebar2 from './MasterSidebar2';
import Header from './Header';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function MasterShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verifyMaster = async () => {
      const token = localStorage.getItem('sr_master_token');

      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        const response = await fetch(`${API}/master/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Unauthorized');
        }

        const data = await response.json();

        if (
          !data.success ||
          data.user?.role !== 'superadmin'
        ) {
          throw new Error('Invalid Master account');
        }

        if (!cancelled) {
          setAuthorized(true);
        }
      } catch {
        if (!cancelled) {
          localStorage.removeItem('sr_master_token');
          router.replace('/login');
        }
      }
    };

    void verifyMaster();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7F9] text-slate-600">
        Checking master access...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F4F7F9] text-[#0F172A] dark:bg-[#071A2C] dark:text-white">

      {/* EXISTING MASTER SIDEBAR */}
      <MasterSidebar2 />

      {/* MAIN CONTENT AREA */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* REUSE ORIGINAL HEADER */}
        <Header
          mode="master"
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        {/* MASTER DASHBOARD CONTENT */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

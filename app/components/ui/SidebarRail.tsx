
'use client';

import React, { useEffect, useMemo, useState } from 'react';

import {
  Lock,
  HomeIcon,
  Handshake,
  Truck,
  User,
  ShoppingBag,
  Settings,
  Bell,
} from 'lucide-react';

import { cn } from '@/app/lib/utils';

export type SidebarSection =
  | 'user'
  | 'partner'
  | 'dealer'
  | 'staff'
  | 'expense'
  | 'general'
  | 'notify'
  | 'promise';

interface RailItem {
  section: SidebarSection;
  label: string;
  icon: React.ReactNode;
}

interface SidebarRailProps {
  activeSection: SidebarSection;
  onSectionClick: (section: SidebarSection) => void;
}

// ======================================================
// SECTION ROUTES
// These must match Master Package Management allowedPages
// ======================================================

const sectionRoutes: Record<SidebarSection, string[]> = {
  user: [
    '/dashboard',
    '/users',
    '/billing',
    '/areas',
    '/packages',
  ],

  partner: [
    '/dashboard3',
    '/partner-areas',
    '/partners',
    '/payments',
  ],

  dealer: [
    '/dealers',
    '/dealers/add',
    '/dealer-payments',
    '/area2',
  ],

  staff: [
    '/staff',
    '/attendance',
  ],

  expense: [
    '/purchasing',
    '/installation',
  ],

  general: [
    '/reports',
    '/dashboard2',
    '/bulk-upload',
    '/create-partner',
    '/whatsapp',
    '/ISP',
      '/all-users',
  ],

  notify: [
    '/notification',
  ],

  promise: [
    '/promises',
  ],
};

// ======================================================
// ORIGINAL RAIL ITEMS
// ======================================================

const railItems: RailItem[] = [
  {
    section: 'user',
    label: 'Owner Management',
    icon: <HomeIcon className="h-5 w-5" />,
  },
  {
    section: 'partner',
    label: 'Partner Management',
    icon: <Handshake className="h-5 w-5" />,
  },
  {
    section: 'promise',
    label: 'Promise Management',
    icon: <Lock className="h-5 w-5" />,
  },
  {
    section: 'dealer',
    label: 'Dealer Management',
    icon: <Truck className="h-5 w-5" />,
  },
  {
    section: 'staff',
    label: 'Staff Management',
    icon: <User className="h-5 w-5" />,
  },
  {
    section: 'expense',
    label: 'Expense Management',
    icon: <ShoppingBag className="h-5 w-5" />,
  },
  {
    section: 'general',
    label: 'General',
    icon: <Settings className="h-5 w-5" />,
  },
  {
    section: 'notify',
    label: 'Notification',
    icon: <Bell className="h-5 w-5" />,
  },
];

// ======================================================
// API CONFIGURATION
// ======================================================

const API = (
  process.env.NEXT_PUBLIC_API_URL || '/api'
).replace(/\/$/, '');

// ======================================================
// SIDEBAR RAIL
// ======================================================

export function SidebarRail({
  activeSection,
  onSectionClick,
}: SidebarRailProps) {
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ====================================================
  // FETCH LOGGED-IN COMPANY PACKAGE PERMISSIONS
  // ====================================================

  useEffect(() => {
    let cancelled = false;

    async function fetchPackagePermissions() {
      setLoading(true);
      setError('');

      try {
        const token =
          sessionStorage.getItem('token') ||
          sessionStorage.getItem('sr_token') ||
          localStorage.getItem('token');

        if (!token) {
          throw new Error('Tenant login required');
        }

        const response = await fetch(
          `${API}/tenant-package/me`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          }
        );

        const contentType =
          response.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
          throw new Error(
            'Package API returned a non-JSON response'
          );
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || 'Failed to load package permissions'
          );
        }

        if (!Array.isArray(data.allowedPages)) {
          throw new Error('Invalid package permissions response');
        }

        if (!cancelled) {
          setAllowedPages(data.allowedPages);
        }
      } catch (err) {
        if (!cancelled) {
          setAllowedPages([]);
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load package permissions'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchPackagePermissions();

    return () => {
      cancelled = true;
    };
  }, []);

  // ====================================================
  // FILTER RAIL ICONS BY ALLOWED PAGES
  // ====================================================

  const visibleRailItems = useMemo(() => {
    const allowed = new Set(allowedPages);

    return railItems.filter((item) =>
      sectionRoutes[item.section].some((route) =>
        allowed.has(route)
      )
    );
  }, [allowedPages]);

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <aside className="hidden md:flex flex-col w-[60px] h-screen bg-[#08284D] flex-shrink-0 z-50">

      {/* Brand */}
      <div className="h-14 flex items-center justify-center flex-shrink-0">
        <div className="h-9 w-9 bg-white/10 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">
            SR
          </span>
        </div>
      </div>

      {/* Rail Items */}
      <nav className="flex-1 flex flex-col items-center py-3 gap-2 overflow-y-auto">

        {loading && (
          <div
            className="text-white/50 text-xs py-3"
            title="Loading permissions"
          >
            ...
          </div>
        )}

        {!loading && error && (
          <div
            className="text-red-300 text-xs text-center px-1 py-2"
            title={error}
            role="alert"
          >
            <Lock className="h-4 w-4 mx-auto" />
          </div>
        )}

        {!loading &&
          visibleRailItems.map((item) => {
            const isActive =
              activeSection === item.section;

            return (
              <button
                key={item.section}
                type="button"
                onClick={() =>
                  onSectionClick(item.section)
                }
                title={item.label}
                aria-label={item.label}
                className={cn(
                  'w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200',
                  isActive
                    ? 'bg-[#F8D77A] text-[#08284D] shadow-sm'
                    : 'text-white hover:text-white hover:bg-white/10'
                )}
              >
                {item.icon}
              </button>
            );
          })}
      </nav>
    </aside>
  );
}

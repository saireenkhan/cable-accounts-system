
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  UserPlus,
  Users,
  CreditCard,
  ShieldCheck,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Crown,
} from 'lucide-react';

const menuItems = [
  {
    title: 'OVERVIEW',
    items: [
      {
        label: 'Master Dashboard',
        href: '/master-dashboard',
        icon: LayoutDashboard,
        enabled: true,
      },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      {
        label: 'Create Admin',
        href: '/create-admin',
        icon: UserPlus,
        enabled: true,
      },
      {
        label: 'All Companies',
        href: '/master/companies',
        icon: Building2,
        enabled: true,
      },
      {
        label: 'Admin Management',
        href: '/master/admins',
        icon: Users,
        enabled: false,
      },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      {
        label: 'Subscriptions',
        href: '/master/subscriptions',
        icon: CreditCard,
        enabled: false,
      },
      {
        label: 'Permissions',
        href: '/master/permissions',
        icon: ShieldCheck,
        enabled: false,
      },
      {
        label: 'Activity Logs',
        href: '/master/logs',
        icon: ScrollText,
        enabled: false,
      },
      {
        label: 'Settings',
        href: '/master/settings',
        icon: Settings,
        enabled: false,
      },
    ],
  },
];

export default function MasterSidebar2() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

const handleLogout = () => {
  localStorage.removeItem('sr_master_token');
  router.replace('/');
};

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg bg-[#102A43] p-2 text-white shadow-lg lg:hidden"
      >
        <Menu size={22} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-[264px]
          flex-col border-r border-[#D9E2E8]
          bg-[#F4F7F9] transition-transform duration-200
          dark:border-[#24445D] dark:bg-[#102A43]
          lg:static lg:translate-x-0 lg:shrink-0
          ${
            mobileOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }
        `}
      >
        <div className="flex h-[74px] items-center gap-3 border-b border-[#D9E2E8] px-5 dark:border-[#24445D]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#102A43] text-[#F4D477]">
            <Crown size={21} />
          </div>

          <div className="min-w-0">
            <p className="text-[17px] font-extrabold text-[#08284D] dark:text-white">
              Smart{' '}
              <span className="text-[#BD8D15] dark:text-[#F4D477]">
                Recovery
              </span>
            </p>
            <p className="text-[10px] font-bold tracking-[.18em] text-slate-500 dark:text-slate-300">
              MASTER CONTROL
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-6">
          {menuItems.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[10px] font-bold tracking-[.15em] text-slate-400">
                {group.title}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + '/');

                  if (!item.enabled) {
                    return (
                      <div
                        key={item.href}
                        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400"
                      >
                        <Icon size={18} />
                        <span className="flex-1">
                          {item.label}
                        </span>
                        <span className="text-[9px]">
                          SOON
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        flex items-center gap-3 rounded-lg
                        px-3 py-2.5 text-sm font-semibold
                        transition-colors
                        ${
                          active
                            ? 'bg-[#F4D477] text-[#08284D] shadow-sm'
                            : 'text-[#334155] hover:bg-[#E5EDF2] dark:text-[#D7E1E8] dark:hover:bg-white/10'
                        }
                      `}
                    >
                      <Icon size={18} />
                      <span className="flex-1">
                        {item.label}
                      </span>
                      {active && <ChevronRight size={15} />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

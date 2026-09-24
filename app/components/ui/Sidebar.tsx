'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UserRoundPlus,
  Bell,
  MessageCircle,
  Handshake,
  HomeIcon,
  MapPin,
  Package,
  FileText,
  Truck,
  CreditCard,
  User,
  ClipboardCheck,
  ShoppingBag,
  Wrench,
  PieChart,
  Settings,
  X,
  Upload,
  LogOut,
  UserPlus,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { SidebarSection } from './SidebarRail';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  section: SidebarSection;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
}

const menuItems: MenuItem[] = [
  // OWNER
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-[18px] w-[18px]" />, section: 'user' },
  { label: 'Add User', href: '/users', icon: <UserPlus className="h-[18px] w-[18px]" />, section: 'user' },
  { label: 'Receive Payment', href: '/billing', icon: <FileText className="h-[18px] w-[18px]" />, section: 'user' },
  { label: 'Add Area', href: '/areas', icon: <MapPin className="h-[18px] w-[18px]" />, section: 'user' },
  { label: 'Add Package', href: '/packages', icon: <Package className="h-[18px] w-[18px]" />, section: 'user' },

  // PARTNER
  { label: 'Dashboard', href: '/dashboard3', icon: <LayoutDashboard className="h-[18px] w-[18px]" />, section: 'partner' },
  { label: 'Add Area', href: '/partner-areas', icon: <MapPin className="h-[18px] w-[18px]" />, section: 'partner' },
  { label: 'Add User', href: '/partners', icon: <UserPlus className="h-[18px] w-[18px]" />, section: 'partner' },
  { label: 'Receive Payment', href: '/payments', icon: <FileText className="h-[18px] w-[18px]" />, section: 'partner' },

  // DEALER
  { label: 'Dashboard', href: '/dealers', icon: <LayoutDashboard className="h-[18px] w-[18px]" />, section: 'dealer' },
  { label: 'Add Dealer', href: '/dealers/add', icon: <User className="h-[18px] w-[18px]" />, section: 'dealer' },
  { label: 'Dealer Payment', href: '/dealer-payments', icon: <CreditCard className="h-[18px] w-[18px]" />, section: 'dealer' },
  { label: 'Add Area', href: '/area2', icon: <MapPin className="h-[18px] w-[18px]" />, section: 'dealer' },

  // STAFF
  { label: 'Staff Profile', href: '/staff', icon: <User className="h-[18px] w-[18px]" />, section: 'staff' },
  { label: 'Daily Attendance', href: '/attendance', icon: <ClipboardCheck className="h-[18px] w-[18px]" />, section: 'staff' },

  // EXPENSE
  { label: 'Purchasing', href: '/purchasing', icon: <ShoppingBag className="h-[18px] w-[18px]" />, section: 'expense' },
  { label: 'Installation Charges', href: '/installation', icon: <Wrench className="h-[18px] w-[18px]" />, section: 'expense' },

  // GENERAL
  { label: 'All Report', href: '/reports', icon: <PieChart className="h-[18px] w-[18px]" />, section: 'general' },
  { label: 'Dashboard', href: '/dashboard2', icon: <LayoutDashboard className="h-[18px] w-[18px]" />, section: 'general' },
  { label: 'Bulk Upload', href: '/bulk-upload', icon: <Upload className="h-[18px] w-[18px]" />, section: 'general' },
  { label: 'Add Partner', href: '/create-partner', icon: <UserRoundPlus className="h-[18px] w-[18px]" />, section: 'general' },
  { label: 'WhatsApp Bot', href: '/whatsapp', icon: <MessageCircle className="h-[18px] w-[18px]" />, section: 'general' },

  // NOTIFY
  { label: 'Notification', href: '/notification', icon: <Bell className="h-[18px] w-[18px]" />, section: 'notify' },
];

const sectionTitles: Record<SidebarSection, string> = {
  user: 'Owner Management',
  partner: 'Partner Management',
  dealer: 'Dealer Management',
  staff: 'Staff Management',
  expense: 'Expense Management',
  general: 'General',
  notify: 'Notifications',
};

const sectionOrder: SidebarSection[] = [
  'user',
  'partner',
  'dealer',
  'staff',
  'expense',
  'general',
  'notify',
];

export function Sidebar({
  isOpen,
  onClose,
  activeSection,
  onSectionChange,
}: SidebarProps) {
  const pathname = usePathname();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // ✅ Only ONE section can be open at a time
  const [expanded, setExpanded] = useState<SidebarSection | null>(activeSection);

  // Auto-open the section that contains the current URL
  useEffect(() => {
    const match = menuItems.find(
      (item) => pathname === item.href || pathname?.startsWith(item.href + '/')
    );
    if (match) {
      setExpanded(match.section);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Keep the section open when the parent's activeSection changes
  useEffect(() => {
    setExpanded(activeSection);
  }, [activeSection]);

  const isActive = (href: string) => {
    if (href === '#') return false;
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const toggleSection = (section: SidebarSection) => {
    // Accordion: opening one closes the previous
    setExpanded((prev) => (prev === section ? null : section));
    onSectionChange(section);
  };

  if (isMobile && !isOpen) return null;

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40 transition-transform duration-300 ease-in-out flex flex-col',
          'w-64',
          isMobile ? 'left-0' : 'left-[60px]',
          isMobile ? 'transform' : 'translate-x-0',
          isMobile && !isOpen && '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 px-5 h-14 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <span className="font-semibold text-gray-900 dark:text-white text-[15px] truncate">
            Smart Recovery
          </span>
          {isMobile && (
            <button
              onClick={onClose}
              className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {sectionOrder.map((section) => {
            const items = menuItems.filter((item) => item.section === section);
            if (items.length === 0) return null;

            const isExpanded = expanded === section;
            const isCurrentSection = activeSection === section;

            return (
              <div key={section} className="mb-2">
                {/* Section header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-[13px] font-sans font-semibold ',
                    isCurrentSection
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  )}
                >
                  <span>{sectionTitles[section]}</span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform duration-200',
                      !isExpanded && '-rotate-90'
                    )}
                  />
                </button>

                {/* Items */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    isExpanded
                      ? 'max-h-96 opacity-100 mt-0.5'
                      : 'max-h-0 opacity-0'
                  )}
                >
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            onSectionChange(section);
                            if (isMobile) onClose();
                          }}
                          className={cn(
                            'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                            active
                              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300'
                          )}
                        >
                          <span
                            className={cn(
                              'flex-shrink-0 transition-colors',
                              active
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                            )}
                          >
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-3 flex-shrink-0">
          <div className="flex items-center gap-3 px-1">
            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 dark:text-blue-300 font-semibold text-xs">
                A
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
                Admin User
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                admin@cable.com
              </p>
            </div>
            <button
              onClick={() => {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                window.location.href = '/';
              }}
              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
              title="Logout"
            >
              <LogOut className="h-[18px] w-[18px] text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
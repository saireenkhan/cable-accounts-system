'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  DollarSign,
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
  ChevronRight,
  ChevronDown,
  LogOut,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  section?: string;
  children?: MenuItem[];
  badge?: number;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems: MenuItem[] = [
  // USER MANAGEMENT
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    section: 'user',
  },
  {
    label: 'Add User',
    href: '/users',
    icon: <UserPlus className="h-5 w-5" />,
    section: 'user',
  },
  {
    label: 'Receive Payment',
    href: '/payments',
    icon: <DollarSign className="h-5 w-5" />,
    section: 'user',
  },
  {
    label: 'Add Area',
    href: '/areas',
    icon: <MapPin className="h-5 w-5" />,
    section: 'user',
  },
  {
    label: 'Add Package',
    href: '/packages',
    icon: <Package className="h-5 w-5" />,
    section: 'user',
  },
  {
    label: 'Monthly Billing',
    href: '/billing',
    icon: <FileText className="h-5 w-5" />,
    section: 'user',
  },

  // DEALER MANAGEMENT
  {
    label: 'Dealer Management',
    href: '#',
    icon: <Truck className="h-5 w-5" />,
    section: 'dealer',
    children: [
      { label: 'Dashboard', href: '/dealers', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'Add Dealer', href: '/dealers/add', icon: <User className="h-4 w-4" /> },
      { label: 'Dealer Payment', href: '/dealer-payments', icon: <CreditCard className="h-4 w-4" /> },
      { label: 'Add Area', href: '/areas', icon: <MapPin className="h-4 w-4" /> },
    ],
  },

  // STAFF MANAGEMENT
  {
    label: 'Staff Management',
    href: '#',
    icon: <User className="h-5 w-5" />,
    section: 'staff',
    children: [
      { label: 'Staff Profile', href: '/staff', icon: <User className="h-4 w-4" /> },
      { label: 'Daily Attendance', href: '/attendance', icon: <ClipboardCheck className="h-4 w-4" /> },
    ],
  },

  // EXPENSE MANAGEMENT
  {
    label: 'Expense Management',
    href: '#',
    icon: <ShoppingBag className="h-5 w-5" />,
    section: 'expense',
    children: [
      { label: 'Purchasing', href: '/purchasing', icon: <ShoppingBag className="h-4 w-4" /> },
      { label: 'Installation Charges', href: '/installation', icon: <Wrench className="h-4 w-4" /> },
    ],
  },

  // GENERAL
  {
    label: 'General',
    href: '#',
    icon: <PieChart className="h-5 w-5" />,
    section: 'general',
    children: [
      { label: 'All Report', href: '/reports', icon: <PieChart className="h-4 w-4" /> },
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['user']));
  const isMobile = useMediaQuery('(max-width: 768px)');

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const isActive = (href: string) => {
    if (href === '#') return false;
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const renderMenuItem = (item: MenuItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isItemActive = isActive(item.href);
    const isExpanded = expandedSections.has(item.section || '');

    if (hasChildren) {
      return (
        <div key={item.label} className="w-full">
          <button
            onClick={() => toggleSection(item.section || item.label)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
              'text-sm font-medium'
            )}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="flex-1 text-left">{item.label}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded && item.children && (
            <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
              {item.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => isMobile && onClose()}
                  className={cn(
                    'flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    'text-sm',
                    isActive(child.href)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  <span className="flex-shrink-0">{child.icon}</span>
                  <span>{child.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => isMobile && onClose()}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          'text-sm font-medium',
          isItemActive
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
        )}
      >
        <span className="flex-shrink-0">{item.icon}</span>
        <span>{item.label}</span>
        {item.badge && (
          <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  if (isMobile && !isOpen) {
    return null;
  }

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
          'fixed top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-50 transition-transform duration-300 ease-in-out flex flex-col',
          'w-64',
          isMobile ? 'transform' : 'translate-x-0',
          isMobile && !isOpen && '-translate-x-full',
          !isMobile && 'translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CA</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-lg">
            Cable<span className="text-blue-600">Accounts</span>
          </span>
          {isMobile && (
            <button
              onClick={onClose}
              className="ml-auto p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}
        </div>

        {/* Navigation - ✅ scrollable without scrollbar */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5 scrollbar-hide">
          {/* Section labels */}
          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2">
            User Management
          </div>
          {menuItems
            .filter(item => item.section === 'user')
            .map((item) => renderMenuItem(item))}

          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2 mt-2">
            Dealer Management
          </div>
          {menuItems
            .filter(item => item.section === 'dealer')
            .map((item) => renderMenuItem(item))}

          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2 mt-2">
            Staff Management
          </div>
          {menuItems
            .filter(item => item.section === 'staff')
            .map((item) => renderMenuItem(item))}

          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2 mt-2">
            Expense Management
          </div>
          {menuItems
            .filter(item => item.section === 'expense')
            .map((item) => renderMenuItem(item))}

          <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2 mt-2">
            General
          </div>
          {menuItems
            .filter(item => item.section === 'general')
            .map((item) => renderMenuItem(item))}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                Admin User
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                admin@cable.com
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/';
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
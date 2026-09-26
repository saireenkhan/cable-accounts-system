
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

/* =========================================================
   MENU ITEMS
========================================================= */

const menuItems: MenuItem[] = [
  // OWNER
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
    section: 'user',
  },
  {
    label: 'Add User',
    href: '/users',
    icon: <UserPlus className="h-[18px] w-[18px]" />,
    section: 'user',
  },
  {
    label: 'Receive Payment',
    href: '/billing',
    icon: <FileText className="h-[18px] w-[18px]" />,
    section: 'user',
  },
  {
    label: 'Add Area',
    href: '/areas',
    icon: <MapPin className="h-[18px] w-[18px]" />,
    section: 'user',
  },
  {
    label: 'Add Package',
    href: '/packages',
    icon: <Package className="h-[18px] w-[18px]" />,
    section: 'user',
  },

  // PARTNER
  {
    label: 'Dashboard',
    href: '/dashboard3',
    icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
    section: 'partner',
  },
  {
    label: 'Add Area',
    href: '/partner-areas',
    icon: <MapPin className="h-[18px] w-[18px]" />,
    section: 'partner',
  },
  {
    label: 'Add User',
    href: '/partners',
    icon: <UserPlus className="h-[18px] w-[18px]" />,
    section: 'partner',
  },
  {
    label: 'Receive Payment',
    href: '/payments',
    icon: <FileText className="h-[18px] w-[18px]" />,
    section: 'partner',
  },

  // DEALER
  {
    label: 'Dashboard',
    href: '/dealers',
    icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
    section: 'dealer',
  },
  {
    label: 'Add Dealer',
    href: '/dealers/add',
    icon: <User className="h-[18px] w-[18px]" />,
    section: 'dealer',
  },
  {
    label: 'Dealer Payment',
    href: '/dealer-payments',
    icon: <CreditCard className="h-[18px] w-[18px]" />,
    section: 'dealer',
  },
  {
    label: 'Add Area',
    href: '/area2',
    icon: <MapPin className="h-[18px] w-[18px]" />,
    section: 'dealer',
  },

  // STAFF
  {
    label: 'Staff Profile',
    href: '/staff',
    icon: <User className="h-[18px] w-[18px]" />,
    section: 'staff',
  },
  {
    label: 'Daily Attendance',
    href: '/attendance',
    icon: <ClipboardCheck className="h-[18px] w-[18px]" />,
    section: 'staff',
  },

  // EXPENSE
  {
    label: 'Purchasing',
    href: '/purchasing',
    icon: <ShoppingBag className="h-[18px] w-[18px]" />,
    section: 'expense',
  },
  {
    label: 'Installation Charges',
    href: '/installation',
    icon: <Wrench className="h-[18px] w-[18px]" />,
    section: 'expense',
  },

  // GENERAL
  {
    label: 'All Report',
    href: '/reports',
    icon: <PieChart className="h-[18px] w-[18px]" />,
    section: 'general',
  },
  {
    label: 'Dashboard',
    href: '/dashboard2',
    icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
    section: 'general',
  },
  {
    label: 'Bulk Upload',
    href: '/bulk-upload',
    icon: <Upload className="h-[18px] w-[18px]" />,
    section: 'general',
  },
  {
    label: 'Add Partner',
    href: '/create-partner',
    icon: <UserRoundPlus className="h-[18px] w-[18px]" />,
    section: 'general',
  },
  {
    label: 'WhatsApp Bot',
    href: '/whatsapp',
    icon: <MessageCircle className="h-[18px] w-[18px]" />,
    section: 'general',
  },

  // NOTIFICATIONS
  {
    label: 'Notification',
    href: '/notification',
    icon: <Bell className="h-[18px] w-[18px]" />,
    section: 'notify',
  },
];

/* =========================================================
   SECTION TITLES
========================================================= */

const sectionTitles: Record<SidebarSection, string> = {
  user: 'Owner Management',
  partner: 'Partner Management',
  dealer: 'Dealer Management',
  staff: 'Staff Management',
  expense: 'Expense Management',
  general: 'General',
  notify: 'Notifications',
};

/* =========================================================
   SECTION ORDER
========================================================= */

const sectionOrder: SidebarSection[] = [
  'user',
  'partner',
  'dealer',
  'staff',
  'expense',
  'general',
  'notify',
];

/* =========================================================
   SIDEBAR
========================================================= */

export function Sidebar({
  isOpen,
  onClose,
  activeSection,
  onSectionChange,
}: SidebarProps) {
  const pathname = usePathname();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Only ONE section can be open at a time
  const [expanded, setExpanded] =
    useState<SidebarSection | null>(activeSection);

  /* =======================================================
     AUTO-OPEN SECTION FOR CURRENT URL
  ======================================================= */

  useEffect(() => {
    const match = menuItems.find(
      (item) =>
        pathname === item.href ||
        pathname?.startsWith(item.href + '/')
    );

    if (match) {
      setExpanded(match.section);
      onSectionChange(match.section);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* =======================================================
     ACTIVE ROUTE
  ======================================================= */

  const isActive = (href: string) => {
    if (href === '#') return false;

    return (
      pathname === href ||
      pathname?.startsWith(href + '/')
    );
  };

  /* =======================================================
     ACCORDION
  ======================================================= */

  const toggleSection = (section: SidebarSection) => {
    setExpanded((prev) =>
      prev === section ? null : section
    );

    onSectionChange(section);
  };

  /* =======================================================
     MOBILE CLOSED
  ======================================================= */

  if (isMobile && !isOpen) {
    return null;
  }

  return (
    <>
      {/* ===================================================
          MOBILE OVERLAY
      =================================================== */}

      {isMobile && isOpen && (
        <div
          className="
            fixed inset-0
            bg-[#08284D]/40
            dark:bg-black/60
            z-40
          "
          onClick={onClose}
        />
      )}

      {/* ===================================================
          MAIN SIDEBAR
      =================================================== */}

      <aside
        className={cn(
          `
          fixed top-0 h-full
          bg-[#F4F7F9]
          dark:bg-[#102A43]
          border-r border-[#D9E2E8]
          dark:border-[#24445D]
          z-40
          transition-transform duration-300 ease-in-out
          flex flex-col
          `,
          'w-64',
          isMobile ? 'left-0' : 'left-[60px]',
          isMobile ? 'transform' : 'translate-x-0',
          isMobile && !isOpen && '-translate-x-full'
        )}
      >

        {/* =================================================
            BRAND
        ================================================= */}

        <div
          className="
            flex items-center
            gap-2
            px-5
            h-14
            border-b
            border-[#D9E2E8]
            dark:border-[#24445D]
            flex-shrink-0
          "
        >
          <span
            className="
              font-semibold
              text-[17px]
              truncate
              text-[#08284D]
              dark:text-white
            "
          >
            Smart{' '}
            <span className="text-[#D9A82E] dark:text-[#F4D477]">
              Recovery
            </span>
          </span>

          {/* Mobile Close */}

          {isMobile && (
            <button
              onClick={onClose}
              className="
                ml-auto
                p-1.5
                rounded-lg
                text-[#64748B]
                dark:text-[#B8C7D3]
                hover:bg-[#E5EDF2]
                dark:hover:bg-white/10
                transition-colors
              "
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* =================================================
            MENU
        ================================================= */}

        <nav className="flex-1 overflow-y-auto py-4 px-3">

          {sectionOrder.map((section) => {
            const items = menuItems.filter(
              (item) => item.section === section
            );

            if (items.length === 0) {
              return null;
            }

            const isExpanded = expanded === section;
            const isCurrentSection =
              activeSection === section;

            return (
              <div
                key={section}
                className="mb-2"
              >

                {/* =========================================
                    SECTION HEADER
                ========================================= */}

                <button
                  type="button"
                  onClick={() =>
                    toggleSection(section)
                  }
                  className={cn(
                    `
                    w-full
                    flex
                    items-center
                    justify-between
                    px-3
                    py-2
                    rounded-lg
                    transition-all
                    text-[12px]
                    font-sans
                    font-semibold
                    uppercase
                    tracking-wide
                    `,
                    isCurrentSection
                      ? `
                        text-[#08284D]
                        dark:text-[#F4D477]
                      `
                      : `
                        text-[#718096]
                        dark:text-[#A9BBC8]
                        hover:text-[#08284D]
                        dark:hover:text-white
                      `
                  )}
                >
                  <span>
                    {sectionTitles[section]}
                  </span>

                  <ChevronDown
                    className={cn(
                      `
                      h-3.5
                      w-3.5
                      transition-transform
                      duration-200
                      `,
                      !isExpanded &&
                        '-rotate-90'
                    )}
                  />
                </button>

                {/* =========================================
                    SECTION ITEMS
                ========================================= */}

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
                      const active = isActive(
                        item.href
                      );

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            onSectionChange(
                              section
                            );

                            if (isMobile) {
                              onClose();
                            }
                          }}
                          className={cn(
                            `
                            group
                            flex
                            items-center
                            gap-3
                            px-3
                            py-2
                            rounded-lg
                            text-sm
                            font-medium
                            transition-all
                            duration-150
                            `,
                            active
                              ? `
                                bg-[#F4D477]
                                dark:bg-[#d6b138]
                                text-[#08284D]
                                dark:text-[#102A43]
                                shadow-sm
                              `
                              : `
                                text-[#334155]
                                dark:text-[#D7E1E8]
                                hover:bg-[#E5EDF2]
                                dark:hover:bg-white/10
                                hover:text-[#08284D]
                                dark:hover:text-white
                              `
                          )}
                        >

                          {/* Icon */}

                          <span
                            className={cn(
                              `
                              flex-shrink-0
                              transition-colors
                              `,
                              active
                                ? `
                                  text-[#08284D]
                                  dark:text-[#102A43]
                                `
                                : `
                                  text-[#64748B]
                                  dark:text-[#AFC0CC]
                                  group-hover:text-[#08284D]
                                  dark:group-hover:text-white
                                `
                            )}
                          >
                            {item.icon}
                          </span>

                          {/* Label */}

                          <span className="truncate">
                            {item.label}
                          </span>

                        </Link>
                      );
                    })}

                  </div>
                </div>

              </div>
            );
          })}

        </nav>
      </aside>
    </>
  );
}
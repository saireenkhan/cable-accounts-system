'use client';

import React from 'react';
import {
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
  | 'notify';

interface RailItem {
  section: SidebarSection;
  label: string;
  icon: React.ReactNode;
}

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

interface SidebarRailProps {
  activeSection: SidebarSection;
  onSectionClick: (section: SidebarSection) => void;
}

export function SidebarRail({
  activeSection,
  onSectionClick,
}: SidebarRailProps) {
  return (
    <aside className="hidden md:flex flex-col w-[60px] h-screen bg-[#08284D] flex-shrink-0 z-50">
      
      {/* Brand */}
      <div className="h-14 flex items-center justify-center flex-shrink-0">
        <div className="h-9 w-9 bg-white/10 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">SR</span>
        </div>
      </div>

      {/* Rail Items */}
      <nav className="flex-1 flex flex-col items-center py-3 gap-2 overflow-y-auto">
        {railItems.map((item) => {
          const isActive = activeSection === item.section;

          return (
            <button
              key={item.section}
              onClick={() => onSectionClick(item.section)}
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
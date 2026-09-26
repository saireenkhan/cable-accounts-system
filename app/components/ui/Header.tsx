'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Bell, ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

interface HeaderProps {
  onMenuClick: () => void;
}

function formatName(fullName?: string) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName.trim();
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const [notificationCount, setNotificationCount] = useState(0);

  const [user, setUser] = useState<{
    name?: string;
    email?: string;
    avatar?: string;
    tenantName?: string;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Load user from sessionStorage + listen for updates
  useEffect(() => {
    const loadUser = () => {
      try {
        const raw = sessionStorage.getItem('user');
        if (raw) setUser(JSON.parse(raw));
      } catch {}
    };

    loadUser();

    window.addEventListener('user-updated', loadUser);
    return () => window.removeEventListener('user-updated', loadUser);
  }, [menuOpen]);

  // Notification count
  useEffect(() => {
    const handleNotificationCount = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setNotificationCount(customEvent.detail || 0);
    };

    window.addEventListener(
      'notifications-count-updated',
      handleNotificationCount
    );

    return () => {
      window.removeEventListener(
        'notifications-count-updated',
        handleNotificationCount
      );
    };
  }, []);

  // Close dropdown on outside click / Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    toast.success('Logged out');
    router.replace('/');
  };

  const initial = (user?.name || 'A').trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden flex-shrink-0"
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>

          <h1 className="text-lg text-[#d6b138] dark:text-[#d6b138] hidden sm:block truncate">
            {user?.tenantName || 'Cable Management System'}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Notifications */}
          <button
            onClick={() => router.push('/notification')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
            aria-label={
              notificationCount > 0
                ? `${notificationCount} notifications`
                : 'Notifications'
            }
          >
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />

            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="avatar"
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                  {initial}
                </div>
              )}

              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                {formatName(user?.name) || 'Admin'}
              </span>

              <ChevronDown
                className={cn(
                  'h-4 w-4 text-gray-500 hidden sm:block transition-transform',
                  menuOpen && 'rotate-180'
                )}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-40">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {formatName(user?.name) || 'Admin'}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email || ''}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push('/profile');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <UserCircle className="h-4 w-4" />
                  My Profile
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
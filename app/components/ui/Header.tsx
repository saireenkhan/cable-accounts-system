
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  ChevronDown,
  LogOut,
  UserCircle,
  AlertTriangle,
  Clock,
  User as UserIcon,
  Handshake,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';
import api from '@/app/lib/api';
import {
  dateInput,
  expiryDate,
  effectiveStatus,
  upcomingExpiry,
} from '@/app/lib/userUtils';

interface HeaderProps {
  onMenuClick: () => void;
}

const VIEWED_NOTIFICATIONS_KEY = 'smart-recovery-viewed-notifications';
const NOTIFICATION_COUNT_KEY = 'smart-recovery-notification-count';

type NotificationCategory = 'Expired' | 'Upcoming Expiry';
type NotificationSource = 'Customer' | 'Partner';

interface HeaderNotification {
  id: string;
  customerName: string;
  accountNo: string;
  category: NotificationCategory;
  source: NotificationSource;
  dueDate: string;
}

function formatName(fullName?: string) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName.trim();
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function getViewedNotificationKeys(): Set<string> {
  try {
    const stored = localStorage.getItem(VIEWED_NOTIFICATIONS_KEY);

    if (!stored) return new Set<string>();

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    return new Set(
      parsed.filter(
        (value): value is string => typeof value === 'string'
      )
    );
  } catch {
    return new Set<string>();
  }
}

function getNotificationKey(
  id: string,
  category: NotificationCategory
) {
  return `${id}:${category}`;
}

function getRecoveryNotificationCategory(
  record: any
): NotificationCategory | null {
  if (!record?._id) return null;

  const activation = dateInput(record.activationDate);

  const rawExpiry = record.expiryDate
    ? dateInput(record.expiryDate)
    : expiryDate(activation);

  const shape = {
    ...record,
    activationDate: activation,
    expiryDate: rawExpiry,
    statusRaw: record.status || 'active',
  };

  const status = effectiveStatus(shape);
  const isUpcoming = upcomingExpiry(shape);

  if (status === 'Expired') {
    return 'Expired';
  }

  if (isUpcoming) {
    return 'Upcoming Expiry';
  }

  return null;
}

function buildHeaderNotifications(
  customers: any[],
  partners: any[]
): HeaderNotification[] {
  const result: HeaderNotification[] = [];

  customers.forEach((customer) => {
    const category = getRecoveryNotificationCategory(customer);

    if (!category) return;

    result.push({
      id: `c-${customer._id}`,
      customerName: customer.name || 'Unknown',
      accountNo: customer.customerId || customer.code || 'N/A',
      category,
      source: 'Customer',
      dueDate: customer.expiryDate || customer.activationDate || '',
    });
  });

  partners.forEach((partner) => {
    const category = getRecoveryNotificationCategory(partner);

    if (!category) return;

    result.push({
      id: `p-${partner._id}`,
      customerName: partner.name || 'Unknown',
      accountNo: partner.partnerId || partner.code || 'N/A',
      category,
      source: 'Partner',
      dueDate: partner.expiryDate || partner.activationDate || '',
    });
  });

  return result;
}

function getCategoryIcon(category: NotificationCategory) {
  if (category === 'Expired') {
    return (
      <div className="h-9 w-9 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
      </div>
    );
  }

  return (
    <div className="h-9 w-9 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
      <Clock className="h-4 w-4 text-[#d6b138] dark:text-[#f7ce48]" />
    </div>
  );
}

function getCategoryTextClass(category: NotificationCategory) {
  return category === 'Expired'
    ? 'text-red-600 dark:text-red-400'
    : 'text-[#b89518] dark:text-[#f7ce48]';
}

function getSourceIcon(source: NotificationSource) {
  return source === 'Customer' ? (
    <UserIcon className="h-3 w-3" />
  ) : (
    <Handshake className="h-3 w-3" />
  );
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const [notificationCount, setNotificationCount] = useState(0);
  const [headerNotifications, setHeaderNotifications] = useState<
    HeaderNotification[]
  >([]);

  const [user, setUser] = useState<{
    name?: string;
    email?: string;
    avatar?: string;
    tenantName?: string;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // LOAD USER
  // ============================================================
  useEffect(() => {
    const loadUser = () => {
      try {
        const raw = sessionStorage.getItem('user');

        if (raw) {
          setUser(JSON.parse(raw));
        }
      } catch {}
    };

    loadUser();

    window.addEventListener('user-updated', loadUser);

    return () => {
      window.removeEventListener('user-updated', loadUser);
    };
  }, [menuOpen]);

  // ============================================================
  // LOAD NOTIFICATIONS
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const token = sessionStorage.getItem('token');

        if (!token) {
          if (!cancelled) {
            setNotificationCount(0);
            setHeaderNotifications([]);
          }

          return;
        }

        const safeGet = async (url: string) => {
          try {
            const res = await api.get(url);
            return res?.data;
          } catch {
            return null;
          }
        };

        const [customersData, partnersData] = await Promise.all([
          safeGet('/customers?limit=10000'),
          safeGet('/partners?limit=10000'),
        ]);

        const customers =
          customersData?.customers ||
          customersData?.data ||
          [];

        const partners =
          partnersData?.partners ||
          partnersData?.data ||
          [];

        const allNotifications = buildHeaderNotifications(
          customers,
          partners
        );

        const viewedKeys = getViewedNotificationKeys();

        const unreadNotifications = allNotifications.filter(
          (notification) => {
            const key = getNotificationKey(
              notification.id,
              notification.category
            );

            return !viewedKeys.has(key);
          }
        );

        if (!cancelled) {
          setHeaderNotifications(unreadNotifications);
          setNotificationCount(unreadNotifications.length);

          try {
            localStorage.setItem(
              NOTIFICATION_COUNT_KEY,
              String(unreadNotifications.length)
            );
          } catch {}
        }
      } catch {
        if (!cancelled) {
          try {
            const stored = localStorage.getItem(
              NOTIFICATION_COUNT_KEY
            );

            const fallbackCount = Number(stored || 0);

            setNotificationCount(
              Number.isFinite(fallbackCount)
                ? fallbackCount
                : 0
            );
          } catch {
            setNotificationCount(0);
          }
        }
      }
    };

    const handleNotificationCount = (event: Event) => {
      const customEvent = event as CustomEvent<number>;

      const count = Number(customEvent.detail || 0);

      setNotificationCount(count);

      try {
        localStorage.setItem(
          NOTIFICATION_COUNT_KEY,
          String(count)
        );
      } catch {}
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== NOTIFICATION_COUNT_KEY) return;

      const count = Number(event.newValue || 0);

      setNotificationCount(
        Number.isFinite(count) ? count : 0
      );
    };

    loadNotifications();

    window.addEventListener(
      'notifications-count-updated',
      handleNotificationCount
    );

    window.addEventListener('storage', handleStorage);

    return () => {
      cancelled = true;

      window.removeEventListener(
        'notifications-count-updated',
        handleNotificationCount
      );

      window.removeEventListener(
        'storage',
        handleStorage
      );
    };
  }, []);

  // ============================================================
  // CLOSE DROPDOWNS ON OUTSIDE CLICK / ESCAPE
  // ============================================================
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setNotificationOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // ============================================================
  // MARK HEADER NOTIFICATION AS READ
  // ============================================================
  const markHeaderNotificationAsRead = (
    notification: HeaderNotification
  ) => {
    const viewedKeys = getViewedNotificationKeys();

    const viewedKey = getNotificationKey(
      notification.id,
      notification.category
    );

    viewedKeys.add(viewedKey);

    try {
      localStorage.setItem(
        VIEWED_NOTIFICATIONS_KEY,
        JSON.stringify(Array.from(viewedKeys))
      );
    } catch {}

    // Remove immediately from dropdown.
    setHeaderNotifications((prev) =>
      prev.filter(
        (item) =>
          !(
            item.id === notification.id &&
            item.category === notification.category
          )
      )
    );

    setNotificationCount((prev) =>
      Math.max(0, prev - 1)
    );

    try {
      const newCount = Math.max(
        0,
        headerNotifications.length - 1
      );

      localStorage.setItem(
        NOTIFICATION_COUNT_KEY,
        String(newCount)
      );
    } catch {}

    window.dispatchEvent(
      new CustomEvent(
        'notifications-count-updated',
        {
          detail: Math.max(
            0,
            headerNotifications.length - 1
          ),
        }
      )
    );
  };

  // ============================================================
  // OPEN SPECIFIC NOTIFICATION
  // ============================================================
  const handleNotificationClick = (
    notification: HeaderNotification
  ) => {
    // First mark it as read.
    markHeaderNotificationAsRead(notification);

    // Close dropdown.
    setNotificationOpen(false);

    // Open notification page with exact filters.
    const params = new URLSearchParams();

    params.set(
      'category',
      notification.category
    );

    params.set(
      'source',
      notification.source
    );

    params.set(
      'notificationId',
      notification.id
    );

    router.push(
      `/notification?${params.toString()}`
    );
  };

  // ============================================================
  // LOGOUT
  // ============================================================
  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');

    toast.success('Logged out');

    router.replace('/');
  };

  const initial = (
    user?.name || 'A'
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">

        {/* LEFT */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden flex-shrink-0"
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>

          <h1 className="text-lg text-[#d6b138] dark:text-[#d6b138] hidden sm:block truncate">
            {user?.tenantName ||
              'Cable Management System'}
          </h1>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* ======================================================
              NOTIFICATIONS
          ====================================================== */}
          <div
            className="relative"
            ref={notificationRef}
          >
            <button
              onClick={() => {
                setNotificationOpen((v) => !v);
                setMenuOpen(false);
              }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
              aria-label={
                notificationCount > 0
                  ? `${notificationCount} notifications`
                  : 'Notifications'
              }
              aria-haspopup="menu"
              aria-expanded={notificationOpen}
            >
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />

              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notificationCount > 99
                    ? '99+'
                    : notificationCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">

                {/* HEADER */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </h3>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {headerNotifications.length > 0
                        ? `${headerNotifications.length} unread`
                        : 'No new notifications'}
                    </p>
                  </div>

                  <Bell className="h-4 w-4 text-[#d6b138]" />
                </div>

                {/* NOTIFICATION LIST */}
                {headerNotifications.length > 0 ? (
                  <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">

                    {headerNotifications.map(
                      (notification) => (
                        <button
                          key={`${notification.id}-${notification.category}`}
                          type="button"
                          onClick={() =>
                            handleNotificationClick(
                              notification
                            )
                          }
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                        >
                          <div className="flex items-start gap-3">

                            {getCategoryIcon(
                              notification.category
                            )}

                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {notification.customerName}
                                </p>

                                <span
                                  className={cn(
                                    'text-[11px] font-semibold whitespace-nowrap',
                                    getCategoryTextClass(
                                      notification.category
                                    )
                                  )}
                                >
                                  {notification.category}
                                </span>
                              </div>

                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Account:{' '}
                                {notification.accountNo}
                              </p>

                              <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                                <span className="inline-flex items-center gap-1">
                                  {getSourceIcon(
                                    notification.source
                                  )}
                                  {notification.source}
                                </span>

                                <span>•</span>

                                <span>
                                  Click to view
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    )}

                  </div>
                ) : (
                  <div className="px-6 py-10 text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-gray-400" />
                    </div>

                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-3">
                      You're all caught up
                    </p>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      No new recovery notifications.
                    </p>
                  </div>
                )}

                {/* FOOTER */}
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationOpen(false);
                      router.push('/notification');
                    }}
                    className="w-full px-4 py-3 text-sm font-medium text-[#b89518] dark:text-[#f7ce48] hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================
              USER MENU
          ====================================================== */}
          <div
            className="relative"
            ref={menuRef}
          >
            <button
              onClick={() => {
                setMenuOpen((v) => !v);
                setNotificationOpen(false);
              }}
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
                    {formatName(user?.name) ||
                      'Admin'}
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


'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Layout from '@/app/components/ui/Layout';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import {
  Bell,
  Search,
  RotateCcw,
  Phone,
  MessageSquare,
  Clock,
  AlertTriangle,
  X,
  Edit,
  Check,
  User as UserIcon,
  Handshake,
  DollarSign,
  Save,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';
import {
  dateInput,
  expiryDate,
  effectiveStatus,
  upcomingExpiry,
  areaName,
} from '@/app/lib/userUtils';

// ============================================================
// TYPES
// ============================================================
type NotificationCategory = 'Pending' | 'Partial' | 'Expired' | 'Upcoming Expiry';
type SourceType = 'Customer' | 'Partner';

interface RecoveryNotification {
  id: string;
  customerName: string;
  accountNo: string;
  area: string;
  package: string;
  dueAmount: number;
  monthlyFee: number;
  dueDate: string;
  daysOverdue: number;
  category: NotificationCategory;
  source: SourceType;
  contactNumber: string;
  lastContact: string;
  nextFollowUp: string;
  message: string;
  lastPaidAmount: number;   // ✅ NEW
  lastPaidDate: string;     // ✅ NEW
  raw: any;
}

// ============================================================
// MONTH UTILS
// ============================================================
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getCurrentMonth = () => {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
};

const compareMonths = (a: string, b: string) => {
  const pa = (a || '').split(' ');
  const pb = (b || '').split(' ');
  const ya = parseInt(pa[1] || '0');
  const yb = parseInt(pb[1] || '0');
  const ia = MONTHS.indexOf(pa[0]);
  const ib = MONTHS.indexOf(pb[0]);
  if (isNaN(ya) || isNaN(yb) || ia === -1 || ib === -1) return 0;
  if (ya !== yb) return ya - yb;
  return ia - ib;
};

const toDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const daysBetween = (a: any, b: any): number => {
  const da = toDate(a);
  const db = toDate(b);
  if (!da || !db) return 0;
  return Math.floor((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
};

// ============================================================
// ✅ WhatsApp helpers
// ============================================================
function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  digits = digits.replace(/^0+/, '');
  if (!digits.startsWith('92')) {
    digits = '92' + digits;
  }
  return digits;
}

function openWhatsApp(phone: string, message: string) {
  const formatted = formatPhoneForWhatsApp(phone);
  if (!formatted) {
    toast.error('Invalid phone number');
    return false;
  }

  const encodedMessage = encodeURIComponent(message || '');
  const url = `https://wa.me/${formatted}${encodedMessage ? `?text=${encodedMessage}` : ''}`;

  window.open(url, '_blank');
  return true;
}

// ============================================================
// ✅ CORE: Allocate the ENTIRE payment pool oldest-first
// ============================================================
interface MonthAllocation {
  month: string;
  expected: number;
  applied: number;
  remaining: number;
  isPaid: boolean;
}

function allocatePayments(
  monthlyFee: number,
  payments: { month: string; amount: number }[]
): MonthAllocation[] {
  if (!monthlyFee || monthlyFee <= 0) return [];

  const byMonth: Record<string, number> = {};
  payments.forEach((p) => {
    if (!p.month) return;
    byMonth[p.month] =
      (byMonth[p.month] || 0) + (parseFloat(String(p.amount)) || 0);
  });

  const months = Object.keys(byMonth).sort(compareMonths);
  if (months.length === 0) return [];

  const totalPool = months.reduce((sum, m) => sum + byMonth[m], 0);

  let pool = totalPool;
  const result: MonthAllocation[] = [];

  for (const month of months) {
    const applied = Math.min(pool, monthlyFee);
    const remaining = Math.max(0, monthlyFee - applied);
    pool -= applied;

    result.push({
      month,
      expected: monthlyFee,
      applied,
      remaining,
      isPaid: remaining === 0,
    });
  }

  return result;
}

// ============================================================
// ✅ Universal helpers to extract names from any payment shape
// ============================================================
function getPartnerNameFromPayment(payment: any): string {
  if (!payment) return '';
  if (typeof payment.partner === 'string') return payment.partner.trim();
  if (payment.partner?.name) return String(payment.partner.name).trim();
  if (payment.partnerName) return String(payment.partnerName).trim();
  if (payment.name) return String(payment.name).trim();
  return '';
}

function getCustomerNameFromPayment(payment: any): string {
  if (!payment) return '';
  if (typeof payment.customer === 'string') return payment.customer.trim();
  if (payment.customer?.name) return String(payment.customer.name).trim();
  if (payment.customerName) return String(payment.customerName).trim();
  return '';
}

// ============================================================
// ✅ NEW: Find last paid info for a payment list
// Returns the most recent non-no-payment payment (by paymentDate).
// ============================================================
function getLastPaidInfo(payments: any[]): {
  amount: number;
  date: string;
} {
  if (!payments.length) return { amount: 0, date: '' };

  // Filter out "no payment" markers and any payment with amount <= 0
  const paidOnly = payments.filter(
    (p) => !p.isNoPayment && Number(p.amount || 0) > 0
  );

  if (!paidOnly.length) return { amount: 0, date: '' };

  // Sort by paymentDate descending (fallback to createdAt)
  const sorted = [...paidOnly].sort((a, b) => {
    const da = toDate(a.paymentDate || a.createdAt)?.getTime() || 0;
    const db = toDate(b.paymentDate || b.createdAt)?.getTime() || 0;
    return db - da;
  });

  const latest = sorted[0];

  return {
    amount: Number(latest.amount || 0),
    date: toDate(latest.paymentDate || latest.createdAt)?.toISOString() || '',
  };
}

// ============================================================
// Build notifications for customers
// ============================================================
const buildCustomerNotifications = (
  customers: any[],
  customerPayments: any[],
  customerAreas: any[]
): RecoveryNotification[] => {
  const result: RecoveryNotification[] = [];
  const today = new Date();
  const currentMonth = getCurrentMonth();

  customers.forEach((c) => {
    const activation = dateInput(c.activationDate);
    const rawExpiry = c.expiryDate
      ? dateInput(c.expiryDate)
      : expiryDate(activation);
    const expiry = toDate(rawExpiry);

    const shape = {
      ...c,
      activationDate: activation,
      expiryDate: expiry,
      statusRaw: c.status || 'active',
    };

    const status = effectiveStatus(shape);
    const isUpcoming = upcomingExpiry(shape);

    // ✅ Full payment list for this customer (used for allocation + last paid)
    const allPayments = customerPayments.filter(
      (p) => getCustomerNameFromPayment(p) === (c.name || '').trim()
    );

    // Paid-only list (excludes "no payment" markers)
    const paidPayments = allPayments.filter((p) => !p.isNoPayment);

    const monthlyFee = Number(c.monthlyFee || 0);

    const allocs = allocatePayments(
      monthlyFee,
      paidPayments.map((p) => ({ month: p.month, amount: p.amount }))
    );

    const totalShortfall = allocs.reduce((sum, a) => sum + a.remaining, 0);

    const currentAlloc = allocs.find((a) => a.month === currentMonth);
    const thisMonthRemaining = currentAlloc?.remaining ?? monthlyFee;

    let category: NotificationCategory | null = null;
    if (status === 'Expired') {
      category = 'Expired';
    } else if (isUpcoming) {
      category = 'Upcoming Expiry';
    } else if (paidPayments.length === 0) {
      category = 'Pending';
    } else if (totalShortfall > 0 && totalShortfall < monthlyFee * 2) {
      category = 'Partial';
    } else if (totalShortfall >= monthlyFee * 2) {
      category = 'Pending';
    }

    if (!category) return;

    const dueDateObj = toDate(expiry) || toDate(activation);
    const daysOverdue = dueDateObj
      ? Math.max(0, daysBetween(today, dueDateObj))
      : 0;

    const dueAmount =
      category === 'Partial'
        ? totalShortfall
        : category === 'Pending'
        ? thisMonthRemaining
        : monthlyFee;

    // ✅ Last paid info
    const lastPaid = getLastPaidInfo(allPayments);

    result.push({
      id: `c-${c._id}`,
      customerName: c.name || 'Unknown',
      accountNo: c.customerId || c.code || 'N/A',
      area: areaName(c.area, customerAreas),
      package: c.package || 'N/A',
      dueAmount,
      monthlyFee,
      dueDate: dueDateObj ? dueDateObj.toISOString() : '',
      daysOverdue,
      category,
      source: 'Customer',
      contactNumber: c.phone || 'N/A',
      lastContact: c.updatedAt || new Date().toISOString(),
      nextFollowUp: new Date(Date.now() + 3 * 86400000).toISOString(),
      message: '',
      lastPaidAmount: lastPaid.amount,   // ✅ NEW
      lastPaidDate: lastPaid.date,       // ✅ NEW
      raw: c,
    });
  });

  return result;
};

// ============================================================
// Build notifications for partners
// ============================================================
const buildPartnerNotifications = (
  partners: any[],
  partnerPayments: any[],
  partnerAreas: any[]
): RecoveryNotification[] => {
  const result: RecoveryNotification[] = [];
  const today = new Date();
  const currentMonth = getCurrentMonth();

  partners.forEach((c) => {
    const activation = dateInput(c.activationDate);
    const rawExpiry = c.expiryDate
      ? dateInput(c.expiryDate)
      : expiryDate(activation);
    const expiry = toDate(rawExpiry);

    const shape = {
      ...c,
      activationDate: activation,
      expiryDate: expiry,
      statusRaw: c.status || 'active',
    };

    const status = effectiveStatus(shape);
    const isUpcoming = upcomingExpiry(shape);

    const allPayments = partnerPayments.filter(
      (p) => getPartnerNameFromPayment(p) === (c.name || '').trim()
    );

    const paidPayments = allPayments.filter((p) => !p.isNoPayment);

    const monthlyFee = Number(c.monthlyFee || 0);

    const allocs = allocatePayments(
      monthlyFee,
      paidPayments.map((p) => ({ month: p.month, amount: p.amount }))
    );

    const totalShortfall = allocs.reduce((sum, a) => sum + a.remaining, 0);

    const currentAlloc = allocs.find((a) => a.month === currentMonth);
    const thisMonthRemaining = currentAlloc?.remaining ?? monthlyFee;

    let category: NotificationCategory | null = null;
    if (status === 'Expired') {
      category = 'Expired';
    } else if (isUpcoming) {
      category = 'Upcoming Expiry';
    } else if (paidPayments.length === 0) {
      category = 'Pending';
    } else if (totalShortfall > 0 && totalShortfall < monthlyFee * 2) {
      category = 'Partial';
    } else if (totalShortfall >= monthlyFee * 2) {
      category = 'Pending';
    }

    if (!category) return;

    const dueDateObj = toDate(expiry) || toDate(activation);
    const daysOverdue = dueDateObj
      ? Math.max(0, daysBetween(today, dueDateObj))
      : 0;

    const dueAmount =
      category === 'Partial'
        ? totalShortfall
        : category === 'Pending'
        ? thisMonthRemaining
        : monthlyFee;

    const lastPaid = getLastPaidInfo(allPayments);

    result.push({
      id: `p-${c._id}`,
      customerName: c.name || 'Unknown',
      accountNo: c.partnerId || c.code || 'N/A',
      area: areaName(c.area, partnerAreas),
      package: c.package || 'N/A',
      dueAmount,
      monthlyFee,
      dueDate: dueDateObj ? dueDateObj.toISOString() : '',
      daysOverdue,
      category,
      source: 'Partner',
      contactNumber: c.phone || 'N/A',
      lastContact: c.updatedAt || new Date().toISOString(),
      nextFollowUp: new Date(Date.now() + 3 * 86400000).toISOString(),
      message: '',
      lastPaidAmount: lastPaid.amount,
      lastPaidDate: lastPaid.date,
      raw: c,
    });
  });

  return result;
};

// ============================================================
// BADGE HELPERS
// ============================================================
const getCategoryTextColor = (category: NotificationCategory) => {
  const map = {
    Pending: 'text-amber-600 dark:text-amber-400',
    Partial: 'text-blue-600 dark:text-blue-400',
    Expired: 'text-red-600 dark:text-red-400',
    'Upcoming Expiry': 'text-[#d6b138] dark:text-[#f7ce48]',
  };
  return map[category] || 'text-gray-700 dark:text-gray-300';
};

const getCategoryDot = (category: NotificationCategory) => {
  const map = {
    Pending: 'bg-amber-500',
    Partial: 'bg-blue-500',
    Expired: 'bg-red-500',
    'Upcoming Expiry': 'bg-[#d6b138]',
  };
  return map[category] || 'bg-gray-400';
};

// ============================================================
// DETAIL ROW
// ============================================================
function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: any;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}:</span>
      <span
        className={cn(
          'font-medium text-right text-gray-900 dark:text-white',
          highlight && 'text-base'
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function RecoveryNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<RecoveryNotification[]>([]);
  const [selected, setSelected] = useState<RecoveryNotification | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [messageDraft, setMessageDraft] = useState('');
  const [accordionDrafts, setAccordionDrafts] = useState<Record<string, string>>({});

  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [filterSource, setFilterSource] = useState('All Sources');
  const [filterArea, setFilterArea] = useState('All Areas');
  const [filterDueDate, setFilterDueDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // ✅ Fetch all data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const safeGet = async (url: string) => {
          try {
            const res = await api.get(url);
            return res?.data;
          } catch (err: any) {
            console.warn(`⚠️ Failed: ${url}`, err?.response?.status);
            return null;
          }
        };

        const [
          customersData,
          partnersData,
          customerPaymentsData,
          partnerPaymentsData,
          customerAreasData,
          partnerAreasData,
        ] = await Promise.all([
          safeGet('/customers?limit=10000'),
          safeGet('/partners?limit=10000'),
          safeGet('/payments'),
          safeGet('/partner-payments'),
          safeGet('/areas'),
          safeGet('/partner-areas'),
        ]);

        const customers = customersData?.customers || customersData?.data || [];
        const partners = partnersData?.partners || partnersData?.data || [];
        const customerPayments =
          customerPaymentsData?.payments || customerPaymentsData?.data || [];
        const partnerPayments =
          partnerPaymentsData?.payments || partnerPaymentsData?.data || [];
        const customerAreas =
          customerAreasData?.areas || customerAreasData?.data || [];
        const partnerAreas =
          partnerAreasData?.areas || partnerAreasData?.data || [];

        console.log('📊 Data loaded:', {
          customers: customers.length,
          partners: partners.length,
          customerPayments: customerPayments.length,
          partnerPayments: partnerPayments.length,
          customerAreas: customerAreas.length,
          partnerAreas: partnerAreas.length,
        });

        const customerNotifs = buildCustomerNotifications(
          customers,
          customerPayments,
          customerAreas
        );
        const partnerNotifs = buildPartnerNotifications(
          partners,
          partnerPayments,
          partnerAreas
        );

        console.log('✅ Notifications built:', {
          customers: customerNotifs.length,
          partners: partnerNotifs.length,
        });

        const built = [...customerNotifs, ...partnerNotifs];

        setNotifications(built);
        if (built.length) setSelected(built[0]);
      } catch (err) {
        console.error('Failed to load recovery data:', err);
        toast.error('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (selected) {
      setMessageDraft(selected.message || '');
    } else {
      setMessageDraft('');
    }
  }, [selected]);

  const stats = useMemo(() => {
    const pending = notifications.filter((n) => n.category === 'Pending').length;
    const partial = notifications.filter((n) => n.category === 'Partial').length;
    const expired = notifications.filter((n) => n.category === 'Expired').length;
    const upcoming = notifications.filter(
      (n) => n.category === 'Upcoming Expiry'
    ).length;
    return { pending, partial, expired, upcoming };
  }, [notifications]);
  
  useEffect(() => {
  window.dispatchEvent(
    new CustomEvent('notifications-count-updated', {
      detail: notifications.length,
    })
  );
}, [notifications]);

  // ✅ NEW: Areas filtered by source (so Customer source shows only customer areas)
  const uniqueAreas = useMemo(() => {
    const relevant =
      filterSource === 'All Sources'
        ? notifications
        : notifications.filter((n) => n.source === filterSource);

    return Array.from(new Set(relevant.map((n) => n.area)))
      .filter(Boolean)
      .sort();
  }, [notifications, filterSource]);

  // ✅ Reset area filter when source changes (so we don't keep a stale selection)
  useEffect(() => {
    setFilterArea('All Areas');
  }, [filterSource]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        n.customerName.toLowerCase().includes(q) ||
        n.accountNo.toLowerCase().includes(q) ||
        n.contactNumber.includes(q);

      const matchesCategory =
        filterCategory === 'All Categories' || n.category === filterCategory;

      const matchesSource =
        filterSource === 'All Sources' || n.source === filterSource;

      const matchesArea = filterArea === 'All Areas' || n.area === filterArea;
      const matchesDate = !filterDueDate || n.dueDate.startsWith(filterDueDate);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesSource &&
        matchesArea &&
        matchesDate
      );
    });
  }, [
    notifications,
    searchQuery,
    filterCategory,
    filterSource,
    filterArea,
    filterDueDate,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterSource, filterArea, filterDueDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleReset = () => {
    setSearchQuery('');
    setFilterCategory('All Categories');
    setFilterSource('All Sources');
    setFilterArea('All Areas');
    setFilterDueDate('');
    setCurrentPage(1);
  };

  const persistMessage = (id: string, message: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, message } : n))
    );
    setSelected((prev) => (prev && prev.id === id ? { ...prev, message } : prev));
  };

  const handleSaveMessage = () => {
    if (!selected) return;
    if (!messageDraft.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    persistMessage(selected.id, messageDraft);
    toast.success('Message saved');
  };

  const handleAccordionSave = (n: RecoveryNotification) => {
    const draft = accordionDrafts[n.id] ?? n.message ?? '';
    if (!draft.trim()) {
      toast.error('Message cannot be empty');
      return;
    }
    persistMessage(n.id, draft);
    toast.success('Message saved');
  };

  const handleAccordionWhatsApp = (n: RecoveryNotification) => {
    const draft = accordionDrafts[n.id] ?? n.message ?? '';
    if (!draft.trim()) {
      toast.error('Please type a message before sending');
      return;
    }
    persistMessage(n.id, draft);
    const ok = openWhatsApp(n.contactNumber, draft);
    if (ok) {
      toast.success(`Opening WhatsApp for ${n.customerName}`);
    }
  };

  const handleSendWhatsApp = () => {
    if (!selected) return;
    if (!messageDraft.trim()) {
      toast.error('Please type a message before sending');
      return;
    }
    persistMessage(selected.id, messageDraft);
    const ok = openWhatsApp(selected.contactNumber, messageDraft);
    if (ok) {
      toast.success(`Opening WhatsApp for ${selected.customerName}`);
    }
  };

  const handleCall = () => {
    if (!selected) return;
    toast.success(`Calling ${selected.contactNumber}...`);
  };

  const handleUpdate = () => {
    if (!selected) return;
    toast.success(`Notification updated for ${selected.customerName}`);
  };

  const formatAmount = (n: number) => `Rs. ${n.toLocaleString()}`;
  const formatDate = (s: string) => {
    if (!s) return 'N/A';
    const d = toDate(s);
    if (!d) return 'N/A';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d6b138]"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="h-7 w-7 text-[#d6b138]" />
              Recovery Notifications
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage customer and partner payment reminders and follow-ups.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Pending"
            value={String(stats.pending)}
            hint="Not paid this month"
            icon={<Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            iconBg="bg-amber-50 dark:bg-amber-900/20"
          />
          <StatCard
            label="Partial"
            value={String(stats.partial)}
            hint="Remaining balance"
            icon={<DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatCard
            label="Expired"
            value={String(stats.expired)}
            hint="Subscription ended"
            icon={<AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />}
            iconBg="bg-red-50 dark:bg-red-900/20"
          />
          <StatCard
            label="Upcoming Expiries"
            value={String(stats.upcoming)}
            hint="Within 7 days"
            icon={<AlertTriangle className="h-5 w-5 text-[#d6b138] dark:text-[#f7ce48]" />}
            iconBg="bg-amber-50 dark:bg-amber-900/20"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Filter Notifications
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <FilterSelect
              label="Category"
              value={filterCategory}
              onChange={setFilterCategory}
              options={[
                'All Categories',
                'Pending',
                'Partial',
                'Expired',
                'Upcoming Expiry',
              ]}
            />
            <FilterSelect
              label="Source"
              value={filterSource}
              onChange={setFilterSource}
              options={['All Sources', 'Customer', 'Partner']}
            />
            <FilterSelect
              label="Area"
              value={filterArea}
              onChange={setFilterArea}
              options={['All Areas', ...uniqueAreas]}
            />
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={filterDueDate}
                onChange={(e) => setFilterDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#d6b138] focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <SearchBar
                placeholder="Search by name, account no or phone..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toast.success('Search applied')}
                className="flex items-center gap-2 px-4 py-2 bg-[#d6b138] hover:bg-[#f7ce48] text-white-900  rounded-lg text-sm font-medium transition-colors"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'grid grid-cols-1 gap-5',
            selected ? 'xl:grid-cols-3' : 'xl:grid-cols-1'
          )}
        >
          <div
            className={cn(
              'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden',
              selected ? 'xl:col-span-2' : 'xl:col-span-1'
            )}
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                Notifications List
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Showing {paginated.length} of {filtered.length} notifications
              </span>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <Th>Customer</Th>
                    <Th>Source</Th>
                    <Th>Area / Package</Th>
                    <Th>Due Amount</Th>
                    <Th>Due Date</Th>
                    <Th>Category</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No notifications found matching your search.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((n) => (
                      <tr
                        key={n.id}
                        onClick={() => setSelected(n)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          selected?.id === n.id
                            ? 'bg-amber-50 dark:bg-amber-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                        )}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {n.customerName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {n.accountNo}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                            {n.source === 'Customer' ? (
                              <UserIcon className="h-3.5 w-3.5" />
                            ) : (
                              <Handshake className="h-3.5 w-3.5" />
                            )}
                            {n.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-white">
                              {n.area}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {n.package}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatAmount(n.dueAmount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-white">
                              {formatDate(n.dueDate)}
                            </span>
                            {n.daysOverdue > 0 && (
                              <span
                                className={cn(
                                  'text-xs font-medium',
                                  n.daysOverdue > 15
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                )}
                              >
                                {n.daysOverdue} days
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              getCategoryTextColor(n.category)
                            )}
                          >
                            {n.category}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ACCORDION (mobile/tablet) — now with last paid info */}
            <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {paginated.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  No notifications found matching your search.
                </div>
              ) : (
                paginated.map((n) => {
                  const isOpen = selected?.id === n.id;
                  const draft = accordionDrafts[n.id] ?? n.message ?? '';

                  return (
                    <div key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(isOpen ? null : n);
                          if (!isOpen) {
                            setAccordionDrafts((prev) => ({
                              ...prev,
                              [n.id]: n.message || '',
                            }));
                          }
                        }}
                        className={cn(
                          'w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors',
                          isOpen
                            ? 'bg-amber-50 dark:bg-amber-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white truncate">
                              {n.customerName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                              {n.accountNo}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs">
                            <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              {n.source === 'Customer' ? (
                                <UserIcon className="h-3 w-3" />
                              ) : (
                                <Handshake className="h-3 w-3" />
                              )}
                              {n.source}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {n.area} · {n.package}
                            </span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {formatAmount(n.dueAmount)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full',
                              getCategoryDot(n.category)
                            )}
                          />
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              getCategoryTextColor(n.category)
                            )}
                          >
                            {n.category}
                          </span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 bg-amber-50/50 dark:bg-amber-900/10 space-y-3">
                          {/* Detail grid — includes last paid */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <MiniField label="Contact" value={n.contactNumber} />
                            <MiniField label="Due Date" value={formatDate(n.dueDate)} />
                            <MiniField
                              label="Monthly Fee"
                              value={formatAmount(n.monthlyFee)}
                            />
                            <MiniField
                              label="Remaining"
                              value={formatAmount(n.dueAmount)}
                            />
                            {/* ✅ NEW */}
                            <MiniField
                              label="Last Paid"
                              value={
                                n.lastPaidAmount > 0
                                  ? formatAmount(n.lastPaidAmount)
                                  : 'N/A'
                              }
                            />
                            <MiniField
                              label="Last Paid On"
                              value={
                                n.lastPaidDate
                                  ? formatDate(n.lastPaidDate)
                                  : 'N/A'
                              }
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                                  Message
                                </p>
                              </div>
                              <button
                                onClick={() => handleAccordionSave(n)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#d6b138] dark:text-[#f7ce48] hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-md transition-colors"
                              >
                                <Save className="h-3 w-3" />
                                Save
                              </button>
                            </div>
                            <textarea
                              value={draft}
                              onChange={(e) =>
                                setAccordionDrafts((prev) => ({
                                  ...prev,
                                  [n.id]: e.target.value,
                                }))
                              }
                              placeholder="Type your message here..."
                              rows={4}
                              className="w-full text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#d6b138] focus:border-transparent resize-none leading-relaxed"
                            />
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              onClick={() => handleAccordionWhatsApp(n)}
                              className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              <MessageCircle className="h-4 w-4" />
                              WhatsApp
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* DETAILS PANEL (xl+) */}
          {selected && (
            <div className="hidden xl:flex xl:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex-col">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#d6b138]" />
                  Notification Details
                </h2>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Close"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                <DetailRow label="Customer" value={selected.customerName} />
                <DetailRow label="Account No." value={selected.accountNo} />
                <DetailRow label="Source" value={selected.source} />
                <DetailRow label="Contact" value={selected.contactNumber} />
                <DetailRow label="Area" value={selected.area} />
                <DetailRow label="Package" value={selected.package} />
                <DetailRow
                  label="Monthly Fee"
                  value={formatAmount(selected.monthlyFee)}
                />
                <DetailRow
                  label={
                    selected.category === 'Partial'
                      ? 'Remaining Due'
                      : 'Total Due'
                  }
                  value={formatAmount(selected.dueAmount)}
                  highlight
                />
                {/* ✅ NEW */}
                <DetailRow
                  label="Last Paid Amount"
                  value={
                    selected.lastPaidAmount > 0
                      ? formatAmount(selected.lastPaidAmount)
                      : 'N/A'
                  }
                />
                <DetailRow
                  label="Last Paid On"
                  value={
                    selected.lastPaidDate
                      ? formatDate(selected.lastPaidDate)
                      : 'N/A'
                  }
                />
                <DetailRow label="Due Date" value={formatDate(selected.dueDate)} />
                <DetailRow
                  label="Days Overdue"
                  value={`${selected.daysOverdue} days`}
                />
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                      Category
                    </span>
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        getCategoryTextColor(selected.category)
                      )}
                    >
                      {selected.category}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Message
                      </span>
                    </div>
                    <button
                      onClick={handleSaveMessage}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#d6b138] dark:text-[#f7ce48] hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-colors"
                    >
                      <Save className="h-3 w-3" />
                      Save
                    </button>
                  </div>
                  <textarea
                    value={messageDraft}
                    onChange={(e) => setMessageDraft(e.target.value)}
                    placeholder="Type your message here..."
                    rows={6}
                    className="w-full text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#d6b138] focus:border-transparent resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 bg-gray-50 dark:bg-gray-900/50 mt-auto">
                <button
                  onClick={handleSendWhatsApp}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Send WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Showing{' '}
            {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filtered.length)} of{' '}
            {filtered.length} notifications
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ‹ Previous
            </button>

            {(() => {
              const pages: (number | '…')[] = [];
              const maxVisible = 5;
              let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
              let end = Math.min(totalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) {
                start = Math.max(1, end - maxVisible + 1);
              }

              if (start > 1) {
                pages.push(1);
                if (start > 2) pages.push('…');
              }
              for (let i = start; i <= end; i++) pages.push(i);
              if (end < totalPages) {
                if (end < totalPages - 1) pages.push('…');
                pages.push(totalPages);
              }

              return pages.map((p, idx) =>
                p === '…' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-8 h-8 flex items-center justify-center text-sm text-gray-400"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                      p === currentPage
                        ? 'bg-[#d6b138] text-gray-900'
                        : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    {p}
                  </button>
                )
              );
            })()}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next ›
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ============================================================
// SUBCOMPONENTS
// ============================================================
function StatCard({
  label,
  value,
  hint,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-1 truncate">
            {value}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>
        </div>
        <div
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
            iconBg
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#d6b138] focus:border-transparent outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap',
        align === 'right' ? 'text-right' : 'text-left'
      )}
    >
      {children}
    </th>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{label}</p>
      <p className="text-gray-900 dark:text-white mt-0.5">{value}</p>
    </div>
  );
}
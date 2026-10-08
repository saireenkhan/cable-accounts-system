'use client';
import React, { Suspense, useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Wifi,
  Eye,
  UserCheck,
  UserX,
  UserMinus,
  X,
  Phone,
  MapPin,
  Package as PackageIcon,
  DollarSign,
  Hash,
  Home,
  CheckCircle,
  XCircle,
  Clock,
  User as UserIcon,
  Percent,
  CalendarDays,
  Handshake,
  CreditCard,
  Save,
  RefreshCw,
  Calendar,
  Search,
  Wallet,
} from 'lucide-react';
import Layout from '@/app/components/ui/Layout';
import {
  AddUserModal,
  Field,
} from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';
import {
  areaName,
  findPackage,
  dateInput,
  displayDate,
  expiryDate,
  effectiveStatus,
  statusStyles,
} from '@/app/lib/userUtils';
const spinner = (
  <Layout>
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  </Layout>
);
const colorClasses: Record<string, string> = {
  blue:
    'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-blue-500/30',
  green:
    'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-500 ring-green-500/30',
  gray:
    'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 border-gray-500 ring-gray-500/30',
  orange:
    'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-500 ring-orange-500/30',
  red:
    'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-500 ring-red-500/30',
};
const statusLabels: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  'upcoming-expiry': 'Upcoming Expiries',
  expired: 'Expired',
  suspended: 'Suspended',
};
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
/* ============================================================
   DATE HELPERS
\============================================================ */
const toDateSafe = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};
const getToday = (): Date => {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
};
const getCurrentMonth = (): string => {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
};
/* ============================================================
   PAYMENT HELPERS
\============================================================ */
function getUserPayments(
  user: any,
  payments: any[]
): any[] {
  return payments.filter((p) => {
    if (p.isNoPayment) return false;
    const partner =
      p.partner &&
      typeof p.partner === 'object'
        ? p.partner
        : null;
    const paymentPartnerId =
      partner?._id ??
      partner?.id ??
      (typeof p.partner === 'string'
        ? p.partner
        : null);
    const paymentPartnerCode =
      partner?.partnerId ??
      p.partnerId;
    const hasIdentifier =
      Boolean(paymentPartnerId) ||
      Boolean(paymentPartnerCode);
    if (hasIdentifier) {
      const matchesMongoId =
        paymentPartnerId &&
        String(paymentPartnerId) === String(user.id);
      const matchesPartnerId =
        paymentPartnerCode &&
        String(paymentPartnerCode) ===
          String(user.customerId);
      return (
        Boolean(matchesMongoId) ||
        Boolean(matchesPartnerId)
      );
    }
    const paymentPartnerName =
      partner?.name ??
      p.partnerName ??
      p.name;
    const matchesName =
      paymentPartnerName &&
      String(paymentPartnerName).trim().toLowerCase() ===
        String(user.name).trim().toLowerCase();
    return Boolean(matchesName);
  });
}
function getPaymentPaidAmount(p: any): number {
  const candidates = [
    p.amount,
    p.paidAmount,
    p.amountPaid,
    p.receivedAmount,
    p.amountReceived,
    p.paid,
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && c !== '') {
      const n = parseFloat(String(c));
      if (!isNaN(n)) return n;
    }
  }
  return 0;
}
function getMonthPaidAmount(
  user: any,
  payments: any[],
  month: string
): number {
  const userPayments = getUserPayments(user, payments);
  return userPayments
    .filter((p) => {
      return (
        String(p.month || '').trim().toLowerCase() ===
        String(month || '').trim().toLowerCase()
      );
    })
    .reduce(
      (sum, p) => sum + getPaymentPaidAmount(p),
      0
    );
}
function isMonthPaid(
  user: any,
  payments: any[],
  month: string
): boolean {
  const monthlyFee = Number(user.monthlyFeeRaw || 0);
  if (!monthlyFee) return false;
  const monthTotal = getMonthPaidAmount(
    user,
    payments,
    month
  );
  return monthTotal >= monthlyFee;
}
function isCurrentMonthFullyPaid(
  user: any,
  payments: any[]
): boolean {
  return isMonthPaid(
    user,
    payments,
    getCurrentMonth()
  );
}
/* ============================================================
   PAYMENT-AWARE UPCOMING EXPIRY
\============================================================ */
function isPaymentAwareUpcomingExpiry(
  user: any,
  payments: any[]
): boolean {
  const expiry = toDateSafe(user.expiryDate);
  if (!expiry) return false;
  if (isCurrentMonthFullyPaid(user, payments)) {
    return false;
  }
  const today = getToday();
  const expiryDay = new Date(
    expiry.getFullYear(),
    expiry.getMonth(),
    expiry.getDate()
  );
  if (expiryDay < today) {
    return false;
  }
  const diffMs =
    expiryDay.getTime() - today.getTime();
  const diffDays = Math.floor(
    diffMs / (1000 * 60 * 60 * 24)
  );
  return diffDays >= 0 && diffDays <= 7;
}
/* ============================================================
   EFFECTIVE STATUS
\============================================================ */
function computeEffectiveStatus(
  user: any,
  payments: any[]
): string {
  const rawStatus = String(
    user.statusRaw || ''
  ).toLowerCase();
  if (
    rawStatus === 'inactive' ||
    rawStatus === 'suspended'
  ) {
    return rawStatus === 'inactive'
      ? 'Inactive'
      : 'Suspended';
  }
  if (isCurrentMonthFullyPaid(user, payments)) {
    return 'Active';
  }
  const expiry = toDateSafe(user.expiryDate);
  if (!expiry) {
    return effectiveStatus(user);
  }
  const today = getToday();
  const expiryDay = new Date(
    expiry.getFullYear(),
    expiry.getMonth(),
    expiry.getDate()
  );
  if (expiryDay < today) {
    return 'Expired';
  }
  const diffMs =
    expiryDay.getTime() - today.getTime();
  const diffDays = Math.floor(
    diffMs / (1000 * 60 * 60 * 24)
  );
  if (diffDays >= 0 && diffDays <= 7) {
    return 'Upcoming Expiry';
  }
  return effectiveStatus(user);
}
/* ============================================================
   VIEW FIELD
\============================================================ */
function ViewField({
  icon,
  label,
  value,
  highlight,
  fullWidth,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
  highlight?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        fullWidth && 'sm:col-span-2',
        highlight
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      )}
    >
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
        {icon}
        {label}
      </div>
      <p
        className={cn(
          'font-semibold',
          highlight
            ? 'text-blue-700 dark:text-blue-400 text-lg'
            : 'text-gray-900 dark:text-white'
        )}
      >
        {value}
      </p>
    </div>
  );
}
/* ============================================================
   PAGE
\============================================================ */
const parseMonth = (monthStr: string) => {
  const parts = (monthStr || '').split(' ');
  return {
    name: parts[0] || '',
    year: parseInt(parts[1] || '0'),
    idx: MONTHS.indexOf(parts[0]),
  };
};
const compareMonths = (a: string, b: string) => {
  const pa = parseMonth(a);
  const pb = parseMonth(b);
  if (isNaN(pa.year) || isNaN(pb.year) || pa.idx === -1 || pb.idx === -1) return 0;
  if (pa.year !== pb.year) return pa.year - pb.year;
  return pa.idx - pb.idx;
};
// ============================================================
// Resolve a partner's area to its display name
// ============================================================
function resolveAreaName(
  partnerArea: any,
  areaLookup: Record<string, string>
): string {
  if (!partnerArea) return 'No Area';
  if (typeof partnerArea === 'object' && partnerArea.name) {
    return partnerArea.name;
  }
  const asString = String(partnerArea).trim();
  if (areaLookup[asString]) return areaLookup[asString];
  const isObjectId = /^[a-fA-F0-9]{24}$/.test(asString);
  if (!isObjectId) return asString;
  return 'Unknown Area';
}
// ============================================================
// Resolve a partner's ISP to a display name
// ============================================================
function resolveIspName(partnerIsp: any): string {
  if (!partnerIsp) return '';
  if (typeof partnerIsp === 'object') {
    return partnerIsp.name || partnerIsp.ispName || '';
  }
  return String(partnerIsp).trim();
}
// ============================================================
// Resolve the master "partner" name stored on a partner record
// ============================================================
function resolvePartnerName(raw: any): string {
  if (!raw) return '';
  if (typeof raw === 'object' && raw.name) {
    return String(raw.name).trim();
  }
  return String(raw).trim();
}
// ============================================================
// CORE: allocate the ENTIRE payment pool oldest-first
// ============================================================
interface MonthAllocation {
  month: string;
  expected: number;
  applied: number;
  remaining: number;
  isPaid: boolean;
  overpaid: number;
}
function allocatePayments(
  monthlyFee: number,
  paymentsForPartner: { month: string; amount: number }[]
): MonthAllocation[] {
  if (!monthlyFee || monthlyFee <= 0) return [];
  const byMonth: Record<string, number> = {};
  paymentsForPartner.forEach((p) => {
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
      overpaid: 0,
    });
  }
  return result;
}
// ============ SEARCHABLE SELECT ============
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  disabled,
}: {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  disabled?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const selected = options.find((opt) => opt.value === value);
    setDisplayValue(selected?.label || '');
  }, [value, options]);
  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
      setSearchTerm('');
    }
  }, [disabled]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleSelect = (optValue: string, optLabel: string) => {
    setDisplayValue(optLabel);
    setIsOpen(false);
    setSearchTerm('');
    onChange(optValue);
  };
  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={cn(
          'w-full px-3 py-2 rounded-lg border cursor-pointer flex items-center justify-between',
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/50'
            : 'border-gray-300 dark:border-gray-600',
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span
            className={cn(
              'truncate',
              displayValue ? 'text-gray-900 dark:text-white' : 'text-gray-400'
            )}
          >
            {displayValue || placeholder}
          </span>
        </div>
        <span className="text-gray-400 ml-2">{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${label || 'options'}...`}
                className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                No {label?.toLowerCase() || 'options'} found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    'px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                    value === opt.value &&
                      'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  )}
                  onClick={() => handleSelect(opt.value, opt.label)}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
// ============ PARTNER PAYMENT MODAL ============
function ReceivePartnerPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  initialPartnerId,
  customers,
  payments,
  packages,
  areas,
  isps,
  areaLookup,
  fetchData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialPartnerId?: string;
  customers: any[];
  payments: any[];
  packages: any[];
  areas: any[];
  isps: any[];
  areaLookup: Record<string, string>;
  fetchData: () => void;
}) {
  const [selectedIsp, setSelectedIsp] = useState('');
  const [selectedPartner, setSelectedPartner] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingNoPayment, setIsSubmittingNoPayment] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthAllocation[]>([]);
  // Only show the ISP step if ISPs exist
  const showIspFilter = isps.length > 0;
  // ISP options come from the /isps endpoint
  const ispOptions = useMemo(
    () =>
      isps
        .map((isp: any) => ({
          label: isp.name || String(isp._id),
          value: isp.name || String(isp._id),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [isps]
  );
  // Partners limited to the chosen ISP (when the ISP step is active)
  const ispScopedCustomers = useMemo(() => {
    if (!showIspFilter) return customers;
    if (!selectedIsp) return [];
    return customers.filter(
      (c: any) => resolveIspName(c.isp) === selectedIsp
    );
  }, [customers, showIspFilter, selectedIsp]);
  // Unique master-partner names within the chosen ISP
  const partnerOptions = useMemo(() => {
    const names = new Set<string>();
    ispScopedCustomers.forEach((c: any) => {
      const name = resolvePartnerName(c.partner);
      if (name) names.add(name);
    });
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name, value: name }));
  }, [ispScopedCustomers]);
  // Areas that belong to the selected partner (within the chosen ISP)
  const partnerAreaOptions = useMemo(() => {
    if (!selectedPartner) return [];
    const areaNames = new Set<string>();
    ispScopedCustomers.forEach((c: any) => {
      if (resolvePartnerName(c.partner) !== selectedPartner) return;
      const resolved = resolveAreaName(c.area, areaLookup);
      if (resolved && resolved !== 'Unknown Area' && resolved !== 'No Area') {
        areaNames.add(resolved);
      }
    });
    return Array.from(areaNames)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name, value: name }));
  }, [selectedPartner, ispScopedCustomers, areaLookup]);
  // Users filtered by ISP, partner AND area
  const filteredCustomers = useMemo(() => {
    if (!selectedPartner || !selectedArea) return [];
    return ispScopedCustomers.filter((c: any) => {
      if (resolvePartnerName(c.partner) !== selectedPartner) return false;
      return resolveAreaName(c.area, areaLookup) === selectedArea;
    });
  }, [selectedPartner, selectedArea, ispScopedCustomers, areaLookup]);
  const userOptions = filteredCustomers.map((c: any) => {
    const userId = c.partnerId || c.code || 'N/A';
    return {
      label: `${userId} - ${c.name} - Rs. ${c.monthlyFee?.toLocaleString() || 0}`,
      value: c._id,
    };
  });
  const currentYear = new Date().getFullYear();
  const monthOptions = MONTHS.map((month) => `${month} ${currentYear}`);
  // Initialize modal from the partner whose dollar action was clicked.
  useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    setSelectedMonth(`${MONTHS[now.getMonth()]} ${now.getFullYear()}`);
    setPaymentDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    setReceiveAmount('');
    setPaymentMethod('Cash');
    setNotes('');
    setCustomerDetails(null);
    setMonthlySummary([]);
    const chosen = customers.find((c: any) => String(c._id) === String(initialPartnerId || ''));
    setSelectedIsp(chosen ? resolveIspName(chosen.isp) : '');
    setSelectedPartner(chosen ? resolvePartnerName(chosen.partner) : '');
    setSelectedArea(chosen ? resolveAreaName(chosen.area, areaLookup) : '');
    setSelectedCustomerId(chosen ? String(chosen._id) : '');
  }, [isOpen, initialPartnerId]);
  // When a user is selected, compute their payment summary
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(
        (c) => String(c._id) === String(selectedCustomerId)
      );
      setCustomerDetails(customer || null);
      if (customer) {
        // Formatted payments carry the partner's _id in `customerId`
        const customerPayments = payments.filter(
          (p) =>
            (String(p.customerId) === String(customer._id) ||
              p.partner?._id === customer._id ||
              p.partner === customer._id ||
              p.partnerId === customer._id) &&
            !p.isNoPayment
        );
        const allocs = allocatePayments(
          customer.monthlyFee || 0,
          customerPayments.map((p: any) => ({ month: p.month, amount: p.amount }))
        );
        setMonthlySummary(allocs);
      }
    } else {
      setCustomerDetails(null);
      setMonthlySummary([]);
    }
  }, [selectedCustomerId, customers, payments]);
  // Reset dependent fields only for actual user selections, not during prefill.
  const changeIsp = (value: string) => {
    setSelectedIsp(value);
    setSelectedPartner('');
    setSelectedArea('');
    setSelectedCustomerId('');
  };
  const changePartner = (value: string) => {
    setSelectedPartner(value);
    setSelectedArea('');
    setSelectedCustomerId('');
  };
  const changeArea = (value: string) => {
    setSelectedArea(value);
    setSelectedCustomerId('');
  };
  const getPackageName = () => {
    if (!customerDetails?.package) return 'No package assigned';
    if (typeof customerDetails.package === 'string') return customerDetails.package;
    if (typeof customerDetails.package === 'object')
      return customerDetails.package.name || 'Unknown Package';
    return 'No package assigned';
  };
  const getCurrentMonthBalance = () => {
    if (!customerDetails) {
      return { previousBalance: 0, currentBalance: 0, totalBalance: 0 };
    }
    const monthlyFee = customerDetails.monthlyFee || 0;
    const allocs = monthlySummary || [];
    const previousBalance = allocs
      .filter((a) => compareMonths(a.month, selectedMonth) < 0 && !a.isPaid)
      .reduce((sum, a) => sum + a.remaining, 0);
    const selectedAlloc = allocs.find((a) => a.month === selectedMonth);
    const currentBalance = selectedAlloc ? selectedAlloc.remaining : monthlyFee;
    return {
      previousBalance,
      currentBalance,
      totalBalance: previousBalance + currentBalance,
    };
  };
  const { previousBalance, currentBalance, totalBalance } = getCurrentMonthBalance();
  const receivedAmount = parseFloat(receiveAmount) || 0;
  const remainingBalance = Math.max(0, totalBalance - receivedAmount);
  const selectedAllocation = (monthlySummary || []).find(
    (a) => a.month === selectedMonth
  );
  const isDuplicateMonth = !!selectedAllocation?.isPaid;
  const alreadyPaidThisMonth = selectedAllocation?.applied || 0;
  const handleSubmit = async () => {
    if (showIspFilter && !selectedIsp) return toast.error('Please select an ISP first');
    if (!selectedPartner) return toast.error('Please select a partner');
    if (!selectedArea) return toast.error('Please select an area');
    if (!selectedCustomerId) return toast.error('Please select a user');
    if (!selectedMonth) return toast.error('Please select a billing month');
    if (!receiveAmount || parseFloat(receiveAmount) <= 0)
      return toast.error('Please enter a valid amount');
    if (isDuplicateMonth) {
      toast.error(
        `${customerDetails?.name} has already fully paid for ${selectedMonth}. Duplicate entries are not allowed.`
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const customerObj = customers.find(
        (c) => String(c._id) === String(selectedCustomerId)
      );
      if (!customerObj) {
        toast.error('Partner not found');
        setIsSubmitting(false);
        return;
      }
const payload = {
  partner: String(customerObj._id),
  month: selectedMonth,
  amount: receivedAmount,
  paymentMethod: paymentMethod,
  paymentDate: paymentDate,
  remarks: notes,
};
      const response = await api.post('/partner-payments', payload);
      if (response.data.success) {
        toast.success(
          `Payment of Rs. ${receivedAmount.toLocaleString()} recorded for ${customerObj.name}`
        );
        fetchData();
        onSuccess?.();
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to record payment');
      }
    } catch (error: any) {
      console.error('❌ Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleNoPayment = async () => {
    if (showIspFilter && !selectedIsp) return toast.error('Please select an ISP first');
    if (!selectedPartner) return toast.error('Please select a partner');
    if (!selectedArea) return toast.error('Please select an area');
    if (!selectedCustomerId) return toast.error('Please select a user');
    if (!selectedMonth) return toast.error('Please select a billing month');
    setIsSubmittingNoPayment(true);
    try {
      const customerObj = customers.find(
        (c) => String(c._id) === String(selectedCustomerId)
      );
      if (!customerObj) {
        toast.error('Partner not found');
        setIsSubmittingNoPayment(false);
        return;
      }
const payload = {
  partner: String(customerObj._id),
  month: selectedMonth,
  amount: 0,
  paymentMethod: 'None',
  paymentDate: paymentDate,
  remarks: notes || 'No payment received',
  isNoPayment: true,
};
      const response = await api.post('/partner-payments', payload);
      if (response.data.success) {
        toast.success(`No payment recorded for ${customerObj.name} - ${selectedMonth}`);
        fetchData();
        onSuccess?.();
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to record');
      }
    } catch (error: any) {
      console.error('❌ Error recording no-payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record');
    } finally {
      setIsSubmittingNoPayment(false);
    }
  };
  if (!isOpen) return null;
  const ispMissing = showIspFilter && !selectedIsp;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Receive Partner Payment
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {showIspFilter
                ? 'Select ISP, then partner, then area, then user to record payment'
                : 'Select partner, then area, then user to record payment'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {isDuplicateMonth && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
              <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Already fully paid for {selectedMonth}</p>
                <p className="text-xs mt-0.5">
                  {customerDetails?.name} has already fully paid Rs.{' '}
                  {alreadyPaidThisMonth.toLocaleString()} for {selectedMonth}.
                  Duplicate entries are not allowed.
                </p>
              </div>
            </div>
          )}
          {!isDuplicateMonth && alreadyPaidThisMonth > 0 && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-sm flex items-start gap-2">
              <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Partial payment already recorded</p>
                <p className="text-xs mt-0.5">
                  {customerDetails?.name} has paid Rs.{' '}
                  {alreadyPaidThisMonth.toLocaleString()} for {selectedMonth}. You
                  can record the remaining Rs.{' '}
                  {(selectedAllocation?.remaining || 0).toLocaleString()}.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              {/* 1. ISP (only if ISPs exist) */}
              {showIspFilter && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Wifi className="h-4 w-4 inline mr-1" />
                    ISP *
                  </label>
                  <SearchableSelect
                    options={ispOptions}
                    value={selectedIsp}
                    onChange={changeIsp}
                    placeholder="Search & Select ISP"
                    label="ISP"
                  />
                </div>
              )}
              {/* 2. PARTNER (filtered by ISP) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <UserIcon className="h-4 w-4 inline mr-1" />
                  Partner *
                </label>
                <SearchableSelect
                  options={partnerOptions}
                  value={selectedPartner}
                  onChange={changePartner}
                  placeholder={
                    ispMissing
                      ? 'Select ISP first'
                      : partnerOptions.length > 0
                        ? 'Search & Select Partner'
                        : 'No partners found'
                  }
                  label="Partner"
                  disabled={ispMissing || partnerOptions.length === 0}
                />
              </div>
              {/* 3. AREA (filtered by ISP + partner) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Area *
                </label>
                <SearchableSelect
                  options={partnerAreaOptions}
                  value={selectedArea}
                  onChange={changeArea}
                  placeholder={
                    ispMissing
                      ? 'Select ISP first'
                      : selectedPartner
                        ? partnerAreaOptions.length > 0
                          ? 'Search & Select Area'
                          : 'No areas found for this partner'
                        : 'Select partner first'
                  }
                  label="Area"
                  disabled={
                    ispMissing ||
                    !selectedPartner ||
                    partnerAreaOptions.length === 0
                  }
                />
              </div>
              {/* 4. USER (filtered by ISP + partner + area) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <UserIcon className="h-4 w-4 inline mr-1" />
                  User ID *
                </label>
                <SearchableSelect
                  options={userOptions}
                  value={selectedCustomerId}
                  onChange={setSelectedCustomerId}
                  placeholder={
                    ispMissing
                      ? 'Select ISP first'
                      : !selectedPartner
                        ? 'Select partner first'
                        : !selectedArea
                          ? 'Select area first'
                          : userOptions.length > 0
                            ? 'Select User ID'
                            : 'No users found'
                  }
                  label="User ID"
                  disabled={
                    ispMissing ||
                    !selectedPartner ||
                    !selectedArea ||
                    userOptions.length === 0
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  User Name
                </label>
                <input
                  type="text"
                  value={customerDetails?.name || ''}
                  readOnly
                  placeholder="Auto-filled from User ID"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-white cursor-not-allowed font-semibold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <PackageIcon className="h-4 w-4 inline mr-1" />
                  Package
                </label>
                <input
                  type="text"
                  value={getPackageName()}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed font-semibold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Billing Month *
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Package Price (Rs.)
                </label>
                <input
                  type="text"
                  value={customerDetails?.monthlyFee?.toLocaleString() || '0'}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed font-semibold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Previous Balance (Rs.)
                </label>
                {previousBalance > 0 ? (
                  <input
                    type="text"
                    value={previousBalance.toLocaleString()}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 cursor-not-allowed font-semibold"
                  />
                ) : (
                  <input
                    type="text"
                    value="Rs. 0 (No outstanding balance)"
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-900 dark:text-white"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Balance (Rs.)
                </label>
                <input
                  type="text"
                  value={totalBalance.toLocaleString()}
                  readOnly
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800 cursor-not-allowed font-bold text-lg',
                    totalBalance > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  )}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-1">
                  {previousBalance > 0 && (
                    <span>Previous: Rs. {previousBalance.toLocaleString()}</span>
                  )}
                  <span>Current: Rs. {currentBalance.toLocaleString()}</span>
                  {previousBalance > 0 && (
                    <span>= Rs. {totalBalance.toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Receive Amount (Rs.) *
                </label>
                <input
                  type="number"
                  value={receiveAmount}
                  onChange={(e) => setReceiveAmount(e.target.value)}
                  placeholder="0"
                  disabled={isDuplicateMonth}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none font-semibold',
                    isDuplicateMonth
                      ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed'
                      : 'border-green-500 dark:border-green-600'
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Remaining Balance (Rs.)
                </label>
                <input
                  type="text"
                  value={remainingBalance.toLocaleString()}
                  readOnly
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800 cursor-not-allowed font-bold text-lg',
                    remainingBalance === 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                />
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleNoPayment}
              disabled={
                isSubmittingNoPayment ||
                !selectedCustomerId ||
                !selectedArea ||
                !selectedPartner ||
                ispMissing
              }
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/25"
            >
              {isSubmittingNoPayment ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  No Payment
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !selectedCustomerId ||
                !selectedArea ||
                !selectedPartner ||
                ispMissing ||
                !receiveAmount ||
                isDuplicateMonth
              }
              className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:from-blue-700 hover:to-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Record
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function PartnersPageContent() {
  const searchParams = useSearchParams();
  const [modal, setModal] = useState(false);
const [receivePaymentOpen, setReceivePaymentOpen] = useState(false);
  const [selectedPaymentPartnerId, setSelectedPaymentPartnerId] = useState('');
  const [view, setView] = useState(false);
  const [viewingUser, setViewingUser] =
    useState<any>(null);
  const [editingUser, setEditingUser] =
    useState<any>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [areaFilter, setAreaFilter] =
    useState<string>('');
  const [partnerFilter, setPartnerFilter] =
    useState<string>('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [partnerList, setPartnerList] = useState<any[]>([]);
  const [isps, setIsps] = useState<any[]>([]);
  /* ==========================================================
     URL FILTERS
  ========================================================== */
  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setFilter(status.toLowerCase());
    const area = searchParams.get('area');
    if (area) setAreaFilter(area);
    const partner = searchParams.get('partner');
    if (partner) setPartnerFilter(partner);
  }, [searchParams]);
  /* ==========================================================
     SYNC PARTNER FILTER TO URL
  ========================================================== */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (partnerFilter) {
      url.searchParams.set('partner', partnerFilter);
    } else {
      url.searchParams.delete('partner');
    }
    window.history.replaceState({}, '', url.toString());
  }, [partnerFilter]);
  /* ==========================================================
     FETCH ISPS
  ========================================================== */
  const fetchISPs = async () => {
    try {
      if (!sessionStorage.getItem('token')) return [];
      const { data } = await api.get('/isps');
      const list =
        data.success && Array.isArray(data.isps)
          ? data.isps
          : [];
      setIsps(list);
      return list;
    } catch (e) {
      console.error('Error fetching ISPs:', e);
      return [];
    }
  };
  /* ==========================================================
     FETCH PARTNER AREAS
  ========================================================== */
  const fetchAreas = async () => {
    try {
      if (!sessionStorage.getItem('token')) return [];
      const { data } = await api.get('/partner-areas');
      const list = data.success ? data.areas || [] : [];
      setAreas(list);
      return list;
    } catch (e) {
      console.error(e);
      return [];
    }
  };
  /* ==========================================================
     FETCH PACKAGES
  ========================================================== */
  const fetchPackages = async () => {
    try {
      if (!sessionStorage.getItem('token')) return;
      const { data } = await api.get('/packages');
      if (data.success) setPackages(data.packages || []);
    } catch (e) {
      console.error(e);
    }
  };
  /* ==========================================================
     FETCH MASTER PARTNER LIST
  ========================================================== */
  const fetchPartnerList = async () => {
    try {
      if (!sessionStorage.getItem('token')) return [];
      const { data } = await api.get('/partners-list');
      const list = data.success ? data.partners || [] : [];
      setPartnerList(list);
      return list;
    } catch (e) {
      console.error('Error fetching partner list:', e);
      return [];
    }
  };
const resolveIspName = (
  raw: any,
  ispList: any[]
): string => {
  if (!raw) return '';
  if (Array.isArray(raw)) {
    return raw
      .map((item) =>
        resolveIspName(
          item,
          ispList
        )
      )
      .filter(Boolean)
      .join(', ');
  }
  if (
    typeof raw === 'object'
  ) {
    return (
      raw.name ||
      raw.ispName ||
      ''
    );
  }
  const rawStr =
    String(raw);
  const match =
    ispList.find(
      (i) =>
        String(i._id) ===
          rawStr ||
        String(i.id) ===
          rawStr ||
        String(
          i.name
        ).toLowerCase() ===
          rawStr.toLowerCase()
    );
  return (
    match?.name ||
    rawStr
  );
};
  /* ==========================================================
     FETCH PARTNERS + PAYMENTS
  ========================================================== */
  const fetchUsers = async (
    areaList = areas,
    ispList = isps
  ) => {
    try {
      if (!sessionStorage.getItem('token')) {
        setLoading(false);
        return;
      }
      const [partnersRes, paymentsRes] = await Promise.all([
        api.get('/partners?limit=10000'),
        api.get('/partner-payments'),
      ]);
      const partners = partnersRes.data.partners || [];
      const paymentList = paymentsRes.data.payments || [];
      if (!partnersRes.data.success) return;
      setPayments(paymentList);
      const mappedUsers = partners.map((c: any) => {
        const activation = dateInput(c.activationDate);
        const expiry = c.expiryDate
          ? dateInput(c.expiryDate)
          : expiryDate(activation);
        const user = {
          id: c._id,
          customerId: c.partnerId || 'N/A',
          name: c.name || '',
          phone: c.phone || '',
          address: c.address || '',
          area: areaName(c.area, areaList),
          isp: resolveIspName(c.isp, ispList),
          package: c.package || '',
          packagePrice: Number(c.packagePrice || 0),
          discount: Number(c.discount || 0),
          discountRaw: Number(c.discount || 0),
          monthlyFeeRaw: Number(c.monthlyFee || 0),
          monthlyFee: `Rs. ${Number(c.monthlyFee || 0).toLocaleString()}`,
          activationDate: activation,
          expiryDate: expiry,
          statusRaw: c.status || 'active',
          partner: c.partner || '',
        };
        return {
          ...user,
          status: computeEffectiveStatus(user, paymentList),
        };
      });
      setUsers(mappedUsers);
    } catch (e) {
      console.error('Error fetching partners:', e);
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };
  /* ==========================================================
     INITIAL LOAD
  ========================================================== */
  useEffect(() => {
    (async () => {
      const areaList = await fetchAreas();
      const ispList = await fetchISPs();
      await fetchPackages();
      await fetchPartnerList();
      await fetchUsers(areaList, ispList);
    })();
  }, []);
  /* ==========================================================
     UNIQUE PARTNERS (for filter dropdown)
  ========================================================== */
  const uniquePartners = React.useMemo(() => {
    return Array.from(
      new Set(
        users
          .map((u) => String(u.partner || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [users]);
  /* ==========================================================
     STATS
  ========================================================== */
  const statsUsers = areaFilter
    ? users.filter((u) => u.area === areaFilter)
    : users;
  const stats = [
    [
      'all',
      'TOTAL PARTNERS',
      statsUsers.length,
      Users,
      'blue',
    ],
    [
      'active',
      'ACTIVE',
      statsUsers.filter((u) => u.status === 'Active').length,
      UserCheck,
      'green',
    ],
    [
      'inactive',
      'INACTIVE',
      statsUsers.filter((u) => u.status === 'Inactive').length,
      UserX,
      'gray',
    ],
    [
      'upcoming-expiry',
      'UPCOMING EXPIRIES',
      statsUsers.filter((u) =>
        isPaymentAwareUpcomingExpiry(u, payments)
      ).length,
      Clock,
      'orange',
      'Within 7 days',
    ],
    [
      'expired',
      'EXPIRED',
      statsUsers.filter((u) => u.status === 'Expired').length,
      UserMinus,
      'red',
    ],
  ] as const;
  /* ==========================================================
     USER FORM FIELDS
     --------------------------------------------------------
     Field order:
       1. customerId
       2. name
       3. phone
       4. address
       5. ISP         (only if isps have loaded)
       6. Area        (disabled until ISP is chosen,
                       options filtered by selected ISP)
       7. partner
       8. package
       ...rest
  ========================================================== */
  const userFields: Field[] = [
    {
      name: 'customerId',
      label: 'User ID',
      type: 'text',
      required: true,
      readOnly: !!editingUser,
    },
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Enter full name',
      readOnly: !!editingUser,
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'text',
      required: true,
      placeholder: '0300-1234567',
    },
    {
      name: 'address',
      label: 'Address',
      type: 'text',
      required: true,
      placeholder: 'House #, Street',
    },
    ...(isps.length > 0
      ? [
          {
            name: 'isp',
            label: 'ISP',
            type: 'select' as const,
            required: true,
            searchable: true,
            options: isps.map((isp) => ({
              label: isp.name,
              value: isp.name,
            })),
          },
        ]
      : []),
    {
      name: 'area',
      label: 'Area',
      type: 'select',
      required: true,
      searchable: true,
      placeholder:
        isps.length > 0 ? 'Select ISP first' : 'Select Area',
      disabledUntil: isps.length > 0 ? 'isp' : undefined,
      options: areas.map((a) => ({
        label: a.name,
        value: a.name,
      })),
    },
    {
      name: 'partner',
      label: 'Partner',
      type: 'select',
      required: true,
      searchable: true,
      placeholder:
        partnerList.length > 0
          ? 'Select Partner'
          : 'No partners available',
      options:
        partnerList.length > 0
          ? partnerList.map((p: any) => ({
              label: `${p.partnerId} - ${p.name}`,
              value: p.name,
            }))
          : [
              {
                label: 'No partners available - add one first',
                value: '',
              },
            ],
    },

{
  name: 'package',
  label: 'Package',
  type: 'select',
  required: true,
  searchable: true,
  placeholder:
    isps.length > 0
      ? 'Select ISP first'
      : 'Select Package',
  disabledUntil:
    isps.length > 0 ? 'isp' : undefined,
  options:
    isps.length > 0
      ? []
      : packages.map((p: any) => ({
          label: `${p.name} - Rs. ${Number(
            p.sellingPrice || 0
          ).toLocaleString()}`,
          value: p.name,
        })),
},

    {
      name: 'activationDate',
      label: 'Activation Date',
      type: 'date',
      required: true,
      placeholder: 'Select activation date',
    },
    {
      name: 'expiryDate',
      label: 'Expiry Date',
      type: 'date',
      readOnly: true,
      dependsOn: 'activationDate',
      updateOnChange: expiryDate,
    },
    {
      name: 'discount',
      label: 'Discount (Rs.)',
      type: 'number',
      placeholder: '0',
      defaultValue: '0',
      min: 0,
      max: (data, context) =>
        Number(
          findPackage(
            context?.packages || [],
            data?.package
          )?.sellingPrice || 0
        ),
    },
    {
      name: 'monthlyFee',
      label: 'Monthly Fee (Rs.)',
      type: 'text',
      required: true,
      placeholder: 'Auto-filled',
      dependsOn: 'package',
      updateOnChange: (_, data, context) => {
        const price = Number(
          findPackage(
            context?.packages || [],
            data?.package
          )?.sellingPrice || 0
        );
        return Math.max(
          0,
          price - Number(data?.discount || 0)
        );
      },
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Expired', value: 'expired' },
      ],
    },
  ];
  /* ==========================================================
     DYNAMIC AREA OPTIONS — filtered by selected ISP
  ========================================================== */
const resolveDynamicOptions = (
  fieldName: string,
  formData: Record<string, any>
) => {
  
  // Filter packages according to the selected ISP.
  if (fieldName === 'package') {
    const allOptions = packages.map((p: any) => ({
      label: `${p.name} - Rs. ${Number(
        p.sellingPrice || 0
      ).toLocaleString()}`,
      value: p.name,
    }));

    // No ISPs configured: preserve existing behavior.
    if (isps.length === 0) {
      return allOptions;
    }

    const selectedIsp = String(formData.isp || '')
      .trim()
      .toLowerCase();

    if (!selectedIsp) {
      return [];
    }

    return packages
      .filter((pkg: any) => {
        const packageIsp = resolveIspName(pkg.isp, isps)
          .trim()
          .toLowerCase();

        return packageIsp === selectedIsp;
      })
      .map((pkg: any) => ({
        label: `${pkg.name} - Rs. ${Number(
          pkg.sellingPrice || 0
        ).toLocaleString()}`,
        value: pkg.name,
      }));
  }

  if (fieldName !== 'area') {
    return [];
  }
  /* ----------------------------------------------------------
     No ISPs configured
  ---------------------------------------------------------- */
  if (isps.length === 0) {
    return areas.map(
      (area) => ({
        label: area.name,
        value: area.name,
      })
    );
  }
  /* ----------------------------------------------------------
     ISP not selected yet
  ---------------------------------------------------------- */
  const selectedIsp =
    String(
      formData.isp || ''
    )
      .trim()
      .toLowerCase();
  if (!selectedIsp) {
    return [];
  }
  /* ----------------------------------------------------------
     FILTER AREAS
     Area may contain:
     isp: ["SFA Net", "StormFiber"]
     Customer/Partner contains:
     isp: "SFA Net"
     Therefore use SOME().
  ---------------------------------------------------------- */
  return areas
    .filter((area) => {
      let areaIsps: any[] =
        [];
      if (
        Array.isArray(
          area.isp
        )
      ) {
        areaIsps =
          area.isp;
      } else if (
        area.isp !==
          undefined &&
        area.isp !==
          null &&
        area.isp !== ''
      ) {
        // Legacy database record
        areaIsps = [
          area.isp,
        ];
      }
      return areaIsps.some(
        (areaIsp) => {
          const resolved =
            resolveIspName(
              areaIsp,
              isps
            )
              .trim()
              .toLowerCase();
          return (
            resolved ===
            selectedIsp
          );
        }
      );
    })
    .map(
      (area) => ({
        label:
          area.name,
        value:
          area.name,
      })
    );
};
  /* ==========================================================
     TRANSFORM FORM DATA
  ========================================================== */
  const transformUserData = (data: any) => {
    const pkg = findPackage(packages, data.package);
    const price = Number(pkg?.sellingPrice || 0);
    const discount = Number(data.discount || 0);
    if (discount < 0) {
      throw new Error('Discount cannot be negative.');
    }
    if (price > 0 && discount > price) {
      throw new Error(
        `Discount (Rs. ${discount.toLocaleString()}) cannot exceed the package price (Rs. ${price.toLocaleString()}).`
      );
    }
    const activation = dateInput(data.activationDate);
    if (!activation) {
      throw new Error('Activation Date is required.');
    }
    return {
      partnerId: data.customerId,
      name: data.name,
      phone: data.phone,
      address: data.address,
      area: areaName(data.area, areas),
      isp: data.isp || '',
      partner: data.partner,
      package: data.package,
      activationDate: activation,
      expiryDate: expiryDate(activation),
      discount,
      monthlyFee: Math.max(0, price - discount),
      status: data.status || 'active',
    };
  };
  /* ==========================================================
     SUCCESS
  ========================================================== */
  const handleSuccess = (data: any) => {
    toast.success(
      editingUser
        ? `${data.name} updated successfully!`
        : `${data.name} added successfully!`
    );
    setEditingUser(null);
    setModal(false);
    fetchUsers(areas, isps);
  };
  /* ==========================================================
     DELETE
  ========================================================== */
  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${name}?\n\nThis will also permanently delete all of their partner-payment records.`
      )
    ) {
      return;
    }
    try {
      const { data } = await api.delete(`/partners/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      const extra =
        data?.deletedPayments > 0
          ? ` (${data.deletedPayments} payment${data.deletedPayments === 1 ? '' : 's'} also removed)`
          : '';
      toast.success(`${name} deleted${extra}`);
      if (editingUser?.id === id) {
        setEditingUser(null);
      }
      if (viewingUser?.id === id) {
        setView(false);
        setViewingUser(null);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete partner');
    }
  };
  /* ==========================================================
     FILTERED USERS
  ========================================================== */
  const filteredUsers = users.filter((u) => {
    const status = u.status;
    const q = search.toLowerCase();
    const matchesStatus =
      filter === 'all' ||
      (filter === 'active' && status === 'Active') ||
      (filter === 'inactive' && status === 'Inactive') ||
      (filter === 'expired' && status === 'Expired') ||
      (filter === 'suspended' && status === 'Suspended') ||
      (filter === 'upcoming-expiry' &&
        isPaymentAwareUpcomingExpiry(u, payments));
    const matchesSearch =
      u.name?.toLowerCase().includes(q) ||
      u.customerId?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.partner?.toLowerCase().includes(q);
    const matchesArea =
      !areaFilter || u.area === areaFilter;
    const matchesPartner =
      !partnerFilter ||
      String(u.partner || '').trim().toLowerCase() ===
        String(partnerFilter).trim().toLowerCase();
    return (
      matchesStatus &&
      matchesSearch &&
      matchesArea &&
      matchesPartner
    );
  });
  /* ==========================================================
     TABLE COLUMNS
  ========================================================== */
  const columns = [
    { key: 'customerId', header: 'User ID' },
    {
      key: 'name',
      header: 'User Name',
      render: (u: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white">
            {u.name}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <CalendarDays className="h-3 w-3 text-blue-500" />
            Activated: {displayDate(u.activationDate)}
          </span>
          {u.isp && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <Wifi className="h-3 w-3 text-blue-500" />
              ISP: {u.isp}
            </span>
          )}
        </div>
      ),
    },
    { key: 'phone', header: 'Phone' },
    { key: 'area', header: 'Area' },
    { key: 'partner', header: 'Partner' },
    { key: 'monthlyFee', header: 'Monthly Fee' },
    {
      key: 'status',
      header: 'Status',
      render: (u: any) => (
        <span
          className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            statusStyles[u.status] ||
              (u.status === 'Upcoming Expiry'
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300')
          )}
        >
          {u.status}
        </span>
      ),
    },
  ];
  /* ==========================================================
     LOADING
  ========================================================== */
  if (loading) return spinner;
  /* ==========================================================
     RENDER
  ========================================================== */
  return (
    <Layout>
      <div className="space-y-5">
        {/* ==================================================
            HEADER
        ================================================== */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Handshake className="h-6 w-6 text-blue-600" />
              Partner Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage partners and their service connections.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingUser(null);
              setModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#d6b138] hover:bg-[#f7ce48] text-white-900 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Partner
          </button>
        </header>
        {/* ==================================================
            STATS
        ================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(([key, label, value, Icon, color, sub]) => {
            const active = filter === key;
            const c = colorClasses[color];
            const parts = c.split(' ');
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 text-left transition-all hover:shadow-md hover:scale-[1.02]',
                  active
                    ? `${parts.slice(-3).join(' ')} ring-2`
                    : 'border-gray-200 dark:border-gray-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {label}
                    </p>
                    <p
                      className={cn(
                        'text-2xl font-bold mt-1',
                        parts[0]
                      )}
                    >
                      {value}
                    </p>
                    <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                      {sub || (active ? 'Filtered' : '')}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center',
                      parts.slice(1, 3).join(' ')
                    )}
                  >
                    <Icon className={cn('h-6 w-6', parts[0])} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {/* ==================================================
            SEARCH + PARTNER FILTER
        ================================================== */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              placeholder="Search by name, Partner ID, phone or partner..."
              value={search}
              onChange={setSearch}
            />
          </div>
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[200px]"
          >
            <option value="">All Partners</option>
            {uniquePartners.map((partnerName) => (
              <option key={partnerName} value={partnerName}>
                {partnerName}
              </option>
            ))}
          </select>
        </div>
        {/* ==================================================
            USER LIST
        ================================================== */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                Partner List
              </h2>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {statusLabels[filter] || 'All'}
                  <X className="h-3 w-3" />
                </button>
              )}
              {areaFilter && (
                <button
                  onClick={() => {
                    setAreaFilter('');
                    if (typeof window !== 'undefined') {
                      const url = new URL(window.location.href);
                      url.searchParams.delete('area');
                      window.history.replaceState(
                        {},
                        '',
                        url.toString()
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                >
                  Partner Area: {areaFilter}
                  <X className="h-3 w-3" />
                </button>
              )}
              {partnerFilter && (
                <button
                  onClick={() => setPartnerFilter('')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                >
                  Partner: {partnerFilter}
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredUsers.length} partners found
            </span>
          </div>
          <div className="p-2">
            <DataTable
              data={filteredUsers}
              columns={columns}
              actions={[
                {
                  value: 'payment',
                  icon: <DollarSign className="h-3 w-3" />,
                },
                {
                  value: 'edit',
                  icon: <Edit className="h-3 w-3" />,
                },
                {
                  value: 'view',
                  icon: <Eye className="h-3 w-3" />,
                },
                {
                  value: 'delete',
                  icon: <Trash2 className="h-3 w-3" />,
                },
              ]}
              onAction={(item, action) => {
                if (action === 'payment') {
                  setSelectedPaymentPartnerId(String(item.id));
                  setReceivePaymentOpen(true);
                  return;
                }
                if (action === 'delete') {
                  handleDelete(item.id, item.name);
                }
                if (action === 'edit') {
                  setEditingUser(item);
                  setModal(true);
                }
                if (action === 'view') {
                  setViewingUser(item);
                  setView(true);
                }
              }}
              accordionTitle="name"
              accordionSubtitle="customerId"
              emptyMessage="No partners found matching your search"
            />
          </div>
        </section>
        {/* ==================================================
            ADD / EDIT USER MODAL
        ================================================== */}
        <ReceivePartnerPaymentModal
isOpen={receivePaymentOpen}
initialPartnerId={selectedPaymentPartnerId}
onClose={() => { setReceivePaymentOpen(false); setSelectedPaymentPartnerId(''); }}
onSuccess={() => fetchUsers(areas, isps)}
customers={users.map(u => ({...u, _id: u.id, partnerId: u.customerId, monthlyFee: u.monthlyFeeRaw}))}
payments={payments}
packages={packages}
areas={areas}
isps={isps}
areaLookup={Object.fromEntries(areas.flatMap((a: any) => [[String(a._id), a.name], [a.name, a.name]]))}
fetchData={() => { void fetchUsers(areas, isps); }}
/>
<AddUserModal
          isOpen={modal}
          onClose={() => {
            setModal(false);
            setEditingUser(null);
          }}
          onSuccess={handleSuccess}
          title={editingUser ? 'Edit Partner' : 'Add New User'}
          subtitle={
            editingUser
              ? 'Update the partner details below'
              : 'Create a new partner connection'
          }
          fields={userFields}
          submitLabel={editingUser ? 'Update User' : 'Add Partner'}
          color="blue"
          endpoint={
            editingUser
              ? `/partners/${editingUser.id}`
              : '/partners'
          }
          method={editingUser ? 'PUT' : 'POST'}
          initialData={
            editingUser
              ? {
                  customerId: editingUser.customerId,
                  name: editingUser.name,
                  phone: editingUser.phone,
                  address: editingUser.address,
                  area: areaName(editingUser.area, areas),
                  isp: editingUser.isp || '',
                  partner: editingUser.partner || '',
                  package: editingUser.package,
                  activationDate: dateInput(
                    editingUser.activationDate
                  ),
                  expiryDate: dateInput(editingUser.expiryDate),
                  discount: editingUser.discountRaw || 0,
                  monthlyFee: editingUser.monthlyFeeRaw,
                  status: editingUser.statusRaw,
                }
              : undefined
          }
          transformData={transformUserData}
          context={{ packages, areas, partnerList }}
          dynamicOptions={resolveDynamicOptions}
        />
        {/* ==================================================
            VIEW USER MODAL
        ================================================== */}
        {view && viewingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setView(false)}
            />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {viewingUser.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Partner ID: {viewingUser.customerId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setView(false)}
                  className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-4">
                {(() => {
                  const status = viewingUser.status;
                  const StatusIcon =
                    status === 'Active'
                      ? CheckCircle
                      : status === 'Expired'
                        ? Clock
                        : status === 'Upcoming Expiry'
                          ? Clock
                          : XCircle;
                  return (
                    <div className="flex justify-center">
                      <span
                        className={cn(
                          'px-4 py-1.5 rounded-full text-sm font-semibold inline-flex items-center gap-1.5',
                          statusStyles[status] ||
                            (status === 'Upcoming Expiry'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300')
                        )}
                      >
                        <StatusIcon className="h-4 w-4" />
                        {status}
                      </span>
                    </div>
                  );
                })()}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ViewField
                    icon={<Hash className="h-4 w-4" />}
                    label="Partner ID"
                    value={viewingUser.customerId}
                  />
                  <ViewField
                    icon={<UserIcon className="h-4 w-4" />}
                    label="Full Name"
                    value={viewingUser.name}
                  />
                  <ViewField
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={viewingUser.phone}
                  />
                  <ViewField
                    icon={<MapPin className="h-4 w-4" />}
                    label="Area"
                    value={areaName(viewingUser.area, areas)}
                  />
                  {viewingUser.isp && (
                    <ViewField
                      icon={<Wifi className="h-4 w-4" />}
                      label="ISP"
                      value={viewingUser.isp}
                    />
                  )}
                  <ViewField
                    icon={<Handshake className="h-4 w-4" />}
                    label="Partner"
                    value={viewingUser.partner || 'N/A'}
                  />
                  <ViewField
                    icon={<PackageIcon className="h-4 w-4" />}
                    label="Package"
                    value={
                      viewingUser.package || 'No package assigned'
                    }
                  />
                  <ViewField
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Activation Date"
                    value={displayDate(viewingUser.activationDate)}
                  />
                  <ViewField
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Expiry Date"
                    value={displayDate(viewingUser.expiryDate)}
                    highlight={
                      viewingUser.status === 'Expired' ||
                      viewingUser.status === 'Upcoming Expiry'
                    }
                  />
                  <ViewField
                    icon={<Percent className="h-4 w-4" />}
                    label="Discount"
                    value={`Rs. ${Number(
                      viewingUser.discount || 0
                    ).toLocaleString()}`}
                  />
                  <ViewField
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Monthly Fee"
                    value={`Rs. ${Number(
                      viewingUser.monthlyFeeRaw || 0
                    ).toLocaleString()}`}
                    highlight
                  />
                  <ViewField
                    icon={<Home className="h-4 w-4" />}
                    label="Address"
                    value={viewingUser.address || 'N/A'}
                    fullWidth
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  onClick={() => setView(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setView(false);
                    setEditingUser(viewingUser);
                    setModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
/* ============================================================
   EXPORT
\============================================================ */
export default function PartnersPage() {
  return (
    <Suspense fallback={spinner}>
      <PartnersPageContent />
    </Suspense>
  );
}
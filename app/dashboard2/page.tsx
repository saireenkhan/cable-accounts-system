'use client';

import React, { useEffect, useState } from 'react';
import api from '@/app/lib/api';
import toast from 'react-hot-toast';
import Layout from '@/app/components/ui/Layout';
import { 
  Users, 
  DollarSign, 
  CreditCard, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  MapPin,
  Wallet,
  ArrowUp
} from 'lucide-react';
import { cn } from '@/app/lib/utils';

// Shared billing rules used by User Management:
// activation-day renewals, payment matching by ID first,
// and oldest unpaid renewal remaining outstanding.
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type Customer = Record<string, any>;
type Payment = Record<string, any>;

const normalize = (value: unknown) =>
  String(value ?? '').trim().toLowerCase();

function safeDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const date = new Date(year, month, day);
      return date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day ? date : null;
    }
  }
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime())
    ? null
    : new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function renewalDate(activation: Date, offset: number): Date {
  const first = new Date(
    activation.getFullYear(), activation.getMonth() + offset, 1
  );
  const lastDay = new Date(
    first.getFullYear(), first.getMonth() + 1, 0
  ).getDate();
  return new Date(first.getFullYear(), first.getMonth(),
    Math.min(activation.getDate(), lastDay));
}

function getPaymentAmount(payment: Payment): number {
  for (const candidate of [
    payment.amount, payment.paidAmount, payment.amountPaid,
    payment.receivedAmount, payment.amountReceived, payment.paid,
  ]) {
    if (candidate !== undefined && candidate !== null && candidate !== '') {
      const n = Number(candidate);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function paymentsFor(customer: Customer, payments: Payment[]): Payment[] {
  const mongoId = normalize(customer._id ?? customer.id);
  const code = normalize(customer.customerId);
  const name = normalize(customer.name);

  return payments.filter((p) => {
    if (p.isNoPayment) return false;
    const linked = p.customer && typeof p.customer === 'object'
      ? p.customer : null;

    const ids = [
      linked?._id, linked?.id, linked?.customerId,
      typeof p.customer === 'string' ? p.customer : null,
      p.customerId,
    ].map(normalize).filter(Boolean);

    if (ids.length) {
      // Never assign a payment to the wrong customer because names match.
      return ids.some((id) =>
        (mongoId && id === mongoId) || (code && id === code)
      );
    }

    const paymentName = normalize(linked?.name ?? p.customerName ?? p.name);
    return Boolean(name && paymentName === name);
  });
}

function monthlyExpiry(
  customer: Customer,
  customerPayments: Payment[],
  today: Date
): Date | null {
  const activation = safeDate(customer.activationDate);
  const storedExpiry = safeDate(customer.expiryDate);
  if (!activation) return storedExpiry;

  const fee = Number(customer.monthlyFee || 0);
  if (!Number.isFinite(fee) || fee <= 0) {
    return storedExpiry ?? renewalDate(activation, 1);
  }

  const monthOffset = (year: number, month: number) =>
    (year - activation.getFullYear()) * 12 + month - activation.getMonth();

  const byMonth = new Map<number, number>();
  for (const payment of customerPayments) {
    const match = String(payment.month ?? '')
      .trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (!match) continue;
    const monthIndex = MONTHS.findIndex(
      (name) => name.toLowerCase() === match[1].toLowerCase()
    );
    if (monthIndex < 0) continue;
    const offset = monthOffset(Number(match[2]), monthIndex);
    // Activation-month payments are not an extra renewal.
    if (offset < 1) continue;
    const amount = getPaymentAmount(payment);
    if (amount > 0) {
      byMonth.set(offset, (byMonth.get(offset) || 0) + amount);
    }
  }

  const currentOffset = monthOffset(today.getFullYear(), today.getMonth());
  const lastPaymentOffset = Math.max(0, ...Array.from(byMonth.keys()));
  const lastOffset = Math.max(1, currentOffset + 2, lastPaymentOffset + 1);
  if (lastOffset > 600) {
    return storedExpiry ?? renewalDate(activation, 1);
  }

  const balances = new Map<number, number>();
  let advanceCredit = 0;
  for (let offset = 1; offset <= lastOffset; offset++) {
    const paid = byMonth.get(offset) || 0;
    const creditUsed = Math.min(fee, advanceCredit);
    advanceCredit -= creditUsed;
    const charge = fee - creditUsed;
    const applied = Math.min(charge, paid);
    balances.set(offset, charge - applied);
    let excess = Math.max(0, paid - applied);

    // Overpayments settle earlier arrears oldest-first.
    for (let prior = 1; prior < offset && excess > 0; prior++) {
      const outstanding = balances.get(prior) || 0;
      const settled = Math.min(outstanding, excess);
      balances.set(prior, outstanding - settled);
      excess -= settled;
    }
    advanceCredit += excess;
  }

  for (let offset = 1; offset <= lastOffset; offset++) {
    if ((balances.get(offset) || 0) > 0.00001) {
      return renewalDate(activation, offset);
    }
  }
  return renewalDate(activation, lastOffset + 1);
}

type EffectiveStatus =
  'Active' | 'Inactive' | 'Suspended' | 'Upcoming Expiry' | 'Expired';

function effectiveCustomerStatus(
  customer: Customer,
  customerPayments: Payment[],
  today: Date
): EffectiveStatus {
  const raw = normalize(customer.status);
  if (raw === 'inactive') return 'Inactive';
  if (raw === 'suspended') return 'Suspended';

  const expiry = monthlyExpiry(customer, customerPayments, today);
  if (!expiry) {
    if (raw === 'expired') return 'Expired';
    return 'Active';
  }
  if (expiry <= today) return 'Expired';
  const remainingDays = Math.round(
    (Date.UTC(expiry.getFullYear(), expiry.getMonth(), expiry.getDate()) -
     Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
    86400000
  );
  return remainingDays <= 7 ? 'Upcoming Expiry' : 'Active';
}

function monthPaymentStatus(
  customer: Customer,
  customerPayments: Payment[],
  today: Date
): 'paid' | 'partial' | 'notpaid' | 'exclude' {
  const monthlyFee = Number(customer.monthlyFee) || 0;
  if (monthlyFee <= 0) return 'exclude';

  const thisMonth = `${MONTHS[today.getMonth()]} ${today.getFullYear()}`;
  const paid = customerPayments
    .filter((payment) => normalize(payment.month) === normalize(thisMonth))
    .reduce((sum, payment) => sum + Math.max(0, getPaymentAmount(payment)), 0);
  if (paid >= monthlyFee) return 'paid';
  if (paid > 0) return 'partial';
  return 'notpaid';
}



export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalCustomers: 0, active: 0, expired: 0, upcoming: 0,
    defaulters: 0, billing: 0, collection: 0, outstanding: 0,
    collectionChange: null as number | null,
  });
  const [areaCollections, setAreaCollections] = useState<{ name: string; amount: number }[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<{
    collection: number;
    expenses: number | null;
    netIncome: number | null;
  }>({ collection: 0, expenses: null, netIncome: null });

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        const [customersRes, paymentsRes, areasRes, expensesRes] = await Promise.all([
          api.get('/customers?limit=10000'),
          api.get('/payments'),
          api.get('/areas'),
          // The expense request is optional. An unavailable expense response
          // must never be misrepresented as zero expenses/net income.
          api.get('/expenses').catch(() => null),
        ]);

        if (customersRes.data?.success === false || paymentsRes.data?.success === false) {
          throw new Error('Customer or payment API returned an unsuccessful response');
        }
        const customers: Customer[] = customersRes.data?.customers || [];
        const payments: Payment[] = paymentsRes.data?.payments || [];
        if (!Array.isArray(customers) || !Array.isArray(payments)) {
          throw new Error('Invalid customer or payment API response');
        }
        const areas: any[] = Array.isArray(areasRes.data?.areas) ? areasRes.data.areas : [];
        const todayNow = new Date();
        const today = new Date(todayNow.getFullYear(), todayNow.getMonth(), todayNow.getDate());
        const currentMonth = `${MONTHS[today.getMonth()]} ${today.getFullYear()}`;
        const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const previousMonth = `${MONTHS[previousMonthDate.getMonth()]} ${previousMonthDate.getFullYear()}`;
        const normalizeArea = (area: unknown): string => {
          if (area && typeof area === 'object') {
            const item = area as { _id?: string; name?: string };
            return String(item.name || item._id || 'Unassigned');
          }
          const value = String(area || '').trim();
          if (!value) return 'Unassigned';
          const match = areas.find((item: any) =>
            normalize(item._id) === normalize(value) || normalize(item.name) === normalize(value)
          );
          return match?.name || value;
        };

        let active = 0;
        let expired = 0;
        let upcoming = 0;
        let defaulters = 0;
        let billing = 0;
        let outstanding = 0;
        const paymentAreaMap = new Map<string, number>();

        for (const customer of customers) {
          const linked = paymentsFor(customer, payments);
          const status = effectiveCustomerStatus(customer, linked, today);
          if (status === 'Active') active++;
          if (status === 'Expired') expired++;
          if (status === 'Upcoming Expiry') upcoming++;

          const fee = Math.max(0, Number(customer.monthlyFee) || 0);
          billing += fee;
          const received = linked
            .filter((p) => normalize(p.month) === normalize(currentMonth))
            .reduce((sum, p) => sum + Math.max(0, getPaymentAmount(p)), 0);
          const unpaid = Math.max(0, fee - received);
          outstanding += unpaid;
          // Defaulters: a renewal is due/overdue, regardless of whether they
          // paid something this month. Inactive/suspended aren't counted.
          const expiry = monthlyExpiry(customer, linked, today);
          if (fee > 0 && expiry && expiry <= today &&
              status !== 'Inactive' && status !== 'Suspended') {
            defaulters++;
          }
          const areaName = normalizeArea(customer.area);
          const areaReceipts = linked
            .filter((p) => normalize(p.month) === normalize(currentMonth))
            .reduce((sum, p) => sum + Math.max(0, getPaymentAmount(p)), 0);
          paymentAreaMap.set(areaName, (paymentAreaMap.get(areaName) || 0) + areaReceipts);
        }

        const amountForMonth = (month: string) => payments
          .filter((p) => !p.isNoPayment && normalize(p.month) === normalize(month))
          .reduce((sum, p) => sum + Math.max(0, getPaymentAmount(p)), 0);
        const collection = amountForMonth(currentMonth);
        const lastMonthCollection = amountForMonth(previousMonth);
        const collectionChange = lastMonthCollection > 0
          ? ((collection - lastMonthCollection) / lastMonthCollection) * 100
          : null;

        let expenses: number | null = null;
        const expenseResponse = expensesRes?.data;
        const expenseRows = Array.isArray(expenseResponse?.expenses)
          ? expenseResponse.expenses
          : Array.isArray(expenseResponse?.data)
            ? expenseResponse.data
            : Array.isArray(expenseResponse)
              ? expenseResponse
              : null;
        if (expenseRows) {
          // Only include dated expense records with an explicit numeric amount.
          // Missing dates/amounts are excluded rather than guessed.
          expenses = expenseRows.reduce((sum: number, item: any) => {
            const expenseDate = safeDate(item.date ?? item.expenseDate ?? item.createdAt);
            const amount = Number(item.amount ?? item.totalAmount);
            if (!expenseDate || !Number.isFinite(amount)) return sum;
            if (expenseDate.getFullYear() !== today.getFullYear() ||
                expenseDate.getMonth() !== today.getMonth()) return sum;
            return sum + amount;
          }, 0);
        }

        if (cancelled) return;
        setStatsData({
          totalCustomers: customers.length,
          active, expired, upcoming, defaulters, billing,
          collection, outstanding, collectionChange,
        });
        setAreaCollections(Array.from(paymentAreaMap, ([name, amount]) => ({ name, amount }))
          .sort((a, b) => b.amount - a.amount));
        setMonthlySummary({
          collection,
          expenses,
          netIncome: expenses === null ? null : collection - expenses,
        });
      } catch (error) {
        console.error('Dashboard overview fetch failed:', error);
        if (!cancelled) toast.error('Unable to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  const rupees = (value: number) => `Rs. ${value.toLocaleString()}`;
  const stats: Array<{
    title: string;
    value: string;
    icon: React.ReactNode;
    subtitle: string;
    color: string;
    change?: number;
  }> = [
    {
      title: 'TOTAL CUSTOMERS',
      value: statsData.totalCustomers.toLocaleString(),
      icon: <Users className="h-6 w-6" />,
      subtitle: `${statsData.active.toLocaleString()} active connections`,
      color: 'slate',
    },
    {
      title: 'EXPIRED USERS',
      value: statsData.expired.toLocaleString(),
      icon: <XCircle className="h-6 w-6" />,
      subtitle: 'Service already expired',
      color: 'rose',
    },
    {
      title: 'THIS MONTH BILLING',
      value: rupees(statsData.billing),
      icon: <DollarSign className="h-6 w-6" />,
      subtitle: 'Current monthly package charges',
      color: 'emerald',
    },
    {
      title: 'UPCOMING EXPIRE USERS',
      value: statsData.upcoming.toLocaleString(),
      icon: <Clock className="h-6 w-6" />,
      subtitle: 'Expiring in next 7 days',
      color: 'amber',
    },
    {
      title: 'TOTAL COLLECTION',
      value: rupees(statsData.collection),
      icon: <CreditCard className="h-6 w-6" />,
      subtitle: `${statsData.billing > 0 ? (statsData.collection / statsData.billing * 100).toFixed(1) : '0.0'}% recovered this month`,
      color: 'teal',
    },
    {
      title: 'DEFAULTER USERS',
      value: statsData.defaulters.toLocaleString(),
      icon: <AlertCircle className="h-6 w-6" />,
      subtitle: 'Payment overdue',
      color: 'rose',
    },
    {
      title: 'OUTSTANDING',
      value: rupees(statsData.outstanding),
      icon: <Wallet className="h-6 w-6" />,
      subtitle: `${statsData.defaulters.toLocaleString()} overdue customers`,
      color: 'orange',
    },
    {
      title: 'ACTIVE USERS',
      value: statsData.active.toLocaleString(),
      icon: <CheckCircle className="h-6 w-6" />,
      subtitle: 'Current active connections',
      color: 'emerald',
    },
  ];

  // 🎨 Muted/Dull color palette
  const colorClasses = {
    slate: 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400',
    rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-[#d6b138] dark:text-[#f7ce48]',
    teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  };

  const iconBgClasses = {
    slate: 'bg-slate-100 dark:bg-slate-800/50',
    rose: 'bg-rose-100 dark:bg-rose-900/30',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30',
    amber: 'bg-amber-100 dark:bg-amber-900/30',
    teal: 'bg-teal-100 dark:bg-teal-900/30',
    orange: 'bg-orange-100 dark:bg-orange-900/30',
    purple: 'bg-purple-100 dark:bg-purple-900/30',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30',
  };

  // Progress bar colors (dull)
  const progressColors = [
    'bg-[#d6b138]',
    'bg-teal-500',
    'bg-purple-500',
    'bg-amber-500',
  ];

  const progressTextColors = [
    'text-[#d6b138] dark:text-[#f7ce48]',
    'text-teal-600 dark:text-teal-400',
    'text-purple-600 dark:text-purple-400',
    'text-amber-600 dark:text-amber-400',
  ];

  if (loading) {
    return <Layout><div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Welcome back. Here is your cable business overview.
          </p>
        </div>

        {/* Stats Grid - 8 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {stat.subtitle}
                  </p>
                  {stat.change && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
                        <ArrowUp className="h-3 w-3" />
                        {stat.change}%
                      </span>
                      <span className="text-xs text-gray-400">from last month</span>
                    </div>
                  )}
                </div>
                <div className={cn(
                  'flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center',
                  iconBgClasses[stat.color as keyof typeof iconBgClasses]
                )}>
                  <span className={colorClasses[stat.color as keyof typeof colorClasses]}>
                    {stat.icon}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Two Column Layout: Area-wise Collection + Monthly Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Area-wise Collection */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-[#d6b138]" />
              Area-wise Collection
            </h2>
            <div className="space-y-3">
              {areaCollections.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No area collection data available.</p>
              )}
              {areaCollections.map((area, index) => {
                const maxAmount = Math.max(...areaCollections.map(a => a.amount));
                const percentage = (area.amount / maxAmount) * 100;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {area.name}
                      </span>
                      <span className={cn(
                        'text-sm font-semibold',
                        progressTextColors[index % progressTextColors.length]
                      )}>
                        Rs. {area.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          progressColors[index % progressColors.length]
                        )}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Monthly Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-[#d6b138]" />
              Monthly Summary
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Collection
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Rs. {monthlySummary.collection.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Expenses
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {monthlySummary.expenses === null ? 'Unavailable' : rupees(monthlySummary.expenses)}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 -mx-1 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-[#d6b138] flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Net Income
                  </span>
                </div>
                <span className="text-lg font-bold text-[#d6b138] dark:text-[#f7ce48]">
                  {monthlySummary.netIncome === null ? 'Unavailable' : rupees(monthlySummary.netIncome)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
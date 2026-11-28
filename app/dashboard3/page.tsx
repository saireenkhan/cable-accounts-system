'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/app/components/ui/Layout';
import api from '@/app/lib/api';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  UserPlus,
  Receipt,
  TrendingUp,
  Package,
  MapPin,
  Zap,
  MoreHorizontal,
  BarChart2,
  Handshake,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Partner billing status helpers. These mirror the Partner Management page's
// activation-date renewal rules and use partner IDs before names.
const PARTNER_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type PartnerStatus = 'Active' | 'Upcoming Expiry' | 'Expired' | 'Inactive' | 'Suspended';

const partnerNormalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

function partnerBillingDate(value: unknown): Date | null {
  if (!value) return null;
  const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = iso
    ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : new Date(value as string | number | Date);
  return Number.isNaN(date.getTime())
    ? null
    : new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function partnerBillingDeadline(activation: Date, offset: number): Date {
  const first = new Date(activation.getFullYear(), activation.getMonth() + offset, 1);
  const end = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(activation.getDate(), end));
}

function partnerPaymentMatches(payment: any, partner: any): boolean {
  if (payment.isNoPayment) return false;
  const mongoId = partnerNormalize(partner._id || partner.id);
  const code = partnerNormalize(partner.partnerId || partner.customerId);
  const object = payment.partner && typeof payment.partner === 'object'
    ? payment.partner : null;
  const ids = [
    object?._id, object?.id, object?.partnerId,
    typeof payment.partner === 'string' ? payment.partner : null,
    payment.partnerId, payment.customerId,
  ].map(partnerNormalize).filter(Boolean);
  if (ids.length) {
    return ids.some((id) => (mongoId && id === mongoId) || (code && id === code));
  }
  const name = partnerNormalize(object?.name || payment.partnerName || payment.name);
  return Boolean(name && name === partnerNormalize(partner.name));
}

function partnerPaymentAmount(payment: any): number {
  for (const value of [
    payment.amount, payment.paidAmount, payment.amountPaid,
    payment.receivedAmount, payment.amountReceived, payment.paid,
  ]) {
    if (value !== undefined && value !== null && value !== '') {
      const amount = Number(value);
      if (Number.isFinite(amount)) return Math.max(0, amount);
    }
  }
  return 0;
}

// Same overdue-vs-next-renewal convention as Partner Management.
function partnerMonthlyExpiry(partner: any, related: any[], today: Date): Date | null {
  const activation = partnerBillingDate(partner.activationDate);
  if (!activation) return partnerBillingDate(partner.expiryDate);
  const fee = Number(partner.monthlyFeeRaw ?? partner.monthlyFee ?? 0);
  if (!Number.isFinite(fee) || fee <= 0) return partnerBillingDate(partner.expiryDate);

  const first = partnerBillingDeadline(activation, 1);
  if (today < first) return first;
  const count = Math.max(1,
    (today.getFullYear() - activation.getFullYear()) * 12 +
    today.getMonth() - activation.getMonth() + 1);
  if (count > 600) return partnerBillingDate(partner.expiryDate) ?? first;

  let owed = 0;
  let paid = 0;
  let next = first;
  for (let offset = 1; offset <= count; offset++) {
    const deadline = partnerBillingDeadline(activation, offset);
    if (deadline > today) { next = deadline; break; }
    owed += fee;
    const month = `${PARTNER_MONTHS[deadline.getMonth()]} ${deadline.getFullYear()}`;
    paid += related
      .filter((payment) => partnerNormalize(payment.month) === partnerNormalize(month))
      .reduce((sum: number, payment: any) => sum + partnerPaymentAmount(payment), 0);
    next = partnerBillingDeadline(activation, offset + 1);
  }
  return owed > paid + 0.001 ? today : next;
}

function partnerEffectiveStatus(partner: any, related: any[], today: Date): PartnerStatus {
  const raw = partnerNormalize(partner.status);
  if (raw === 'inactive') return 'Inactive';
  if (raw === 'suspended') return 'Suspended';
  const expiry = partnerMonthlyExpiry(partner, related, today);
  if (!expiry) return raw === 'expired' ? 'Expired' : 'Active';
  if (expiry <= today) return 'Expired';
  const days = Math.round((Date.UTC(expiry.getFullYear(), expiry.getMonth(), expiry.getDate()) -
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
  return days >= 1 && days <= 7 ? 'Upcoming Expiry' : 'Active';
}

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      // Fetch partners, partner payments, packages, partner areas
      const [partnersRes, paymentsRes, packagesRes, areasRes] =
        await Promise.all([
          api.get('/partners?limit=10000'),
          api.get('/partner-payments?limit=10000'),
          api.get('/packages'),
          api.get('/partner-areas'),
        ]);

      const partners = partnersRes.data.partners || [];
      const payments = paymentsRes.data.payments || [];
      const packages = packagesRes.data.packages || [];
      const areas = areasRes.data.areas || [];

      console.log('📊 Partners:', partners.length);
      console.log('💰 Partner Payments:', payments.length);
      console.log('📦 Packages:', packages.length);
      console.log('📍 Partner Areas:', areas.length);

      // PARTNER STATUS COUNTS - match Partner Management effective status.
      const totalCustomers = partners.length;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentMonth = `${PARTNER_MONTHS[today.getMonth()]} ${today.getFullYear()}`;

      const partnerStatuses: PartnerStatus[] = partners.map((partner: any) => {
        const related = payments.filter((payment: any) =>
          partnerPaymentMatches(payment, partner)
        );
        return partnerEffectiveStatus(partner, related, today);
      });

      const activeCustomers = partnerStatuses.filter(
        (status: PartnerStatus) => status === 'Active'
      ).length;
      const inactiveCustomers = partnerStatuses.filter(
        (status: PartnerStatus) => status === 'Inactive'
      ).length;
      const expiredCustomers = partnerStatuses.filter(
        (status: PartnerStatus) => status === 'Expired'
      ).length;
      const suspendedCustomers = partnerStatuses.filter(
        (status: PartnerStatus) => status === 'Suspended'
      ).length;
      const upcomingExpiry = partnerStatuses.filter(
        (status: PartnerStatus) => status === 'Upcoming Expiry'
      ).length;

      // Retain the original dashboard's financial reporting period/formulas.
      // Fix ONLY the identity matching so similarly named partners do not mix.
      const totalBilling = partners.reduce((sum: number, partner: any) => {
        const monthlyFee = Number(partner.monthlyFee) || 0;
        if (monthlyFee === 0) return sum;
        const related = payments.filter((payment: any) =>
          partnerPaymentMatches(payment, partner)
        );
        const activeMonths = new Set<string>();
        related.forEach((payment: any) => {
          if (payment.month) activeMonths.add(payment.month);
        });
        const monthCount = activeMonths.size > 0 ? activeMonths.size : 1;
        return sum + monthlyFee * monthCount;
      }, 0);

      const totalRecovered = payments
        .filter((payment: any) => !payment.isNoPayment)
        .reduce((sum: number, payment: any) =>
          sum + partnerPaymentAmount(payment), 0);
      const totalOutstanding = Math.max(0, totalBilling - totalRecovered);
      const recoveryRate = totalBilling > 0
        ? Math.min(100, (totalRecovered / totalBilling) * 100)
        : 0;

      // Each partner is counted ONCE based on the current billing month's
      // receipts; old receipts cannot make the current month appear paid.
      const monthStatusCounts = { paid: 0, partial: 0, notpaid: 0 };
      partners.forEach((partner: any) => {
        const fee = Number(partner.monthlyFee) || 0;
        if (fee <= 0) return;
        const paidThisMonth = payments
          .filter((payment: any) =>
            partnerPaymentMatches(payment, partner) &&
            partnerNormalize(payment.month) === partnerNormalize(currentMonth)
          )
          .reduce((sum: number, payment: any) =>
            sum + partnerPaymentAmount(payment), 0);
        if (paidThisMonth >= fee) monthStatusCounts.paid++;
        else if (paidThisMonth > 0) monthStatusCounts.partial++;
        else monthStatusCounts.notpaid++;
      });
      const paidCustomers = monthStatusCounts.paid;
      const partialCustomers = monthStatusCounts.partial;
      const notPaidCustomers = monthStatusCounts.notpaid;

      setStats({
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        expiredCustomers,
        suspendedCustomers,
        totalBilling,
        totalRecovered,
        totalOutstanding,
        recoveryRate:
          Math.round(recoveryRate),
        upcomingExpiry,
        paidCustomers,
        partialCustomers,
        notPaidCustomers,
        totalPackages:
          packages.length,
        totalAreas:
          areas.length,
      });
    } catch (error: any) {
      console.error(
        'Error fetching partner dashboard:',
        error
      );

      if (
        error.code === 'ERR_NETWORK' ||
        error.message === 'Network Error'
      ) {
        toast.error(
          'Cannot connect to server. Please check if backend is running.'
        );
      } else {
        toast.error(
          'Failed to load dashboard data'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      </Layout>
    );
  }

  const recoveryPercentage =
    stats?.totalBilling > 0
      ? Math.min(
          100,
          Math.round(
            (stats.totalRecovered /
              stats.totalBilling) *
              100
          )
        )
      : 0;

  const outstandingPercentage =
    stats?.totalBilling > 0
      ? Math.min(
          100,
          Math.round(
            (stats.totalOutstanding /
              stats.totalBilling) *
              100
          )
        )
      : 0;

  return (
    <Layout>
      <div className="space-y-6">

        {/* ========== PAGE HEADER ========== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Partner Management Dashboard
            </h1>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Quick overview of partner accounts, billing and payment activity.
            </p>
          </div>
        </div>

        {/* ========== STATS CARDS ========== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* TOTAL PARTNERS */}

          <div className="bg-[#0f172a] rounded-xl shadow-lg p-5 text-white flex flex-col justify-between">

            <div className="flex justify-between items-start">

              <p className="text-xs font-medium text-slate-300 uppercase tracking-wider">
                TOTAL USER
              </p>

              <BarChart2 className="h-4 w-4 text-slate-400" />

            </div>

            <p className="text-3xl font-bold text-white mt-2">
              {(
                stats?.totalCustomers || 0
              ).toLocaleString()}
            </p>

            <p className="text-xs text-slate-300 mt-2">
              {stats?.activeCustomers || 0}{' '}
              active partners
            </p>

          </div>

          {/* PAID PARTNERS */}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col justify-between">

            <div className="flex justify-between items-start">

              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                PAID USER
              </p>

            </div>

            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              {(
                stats?.paidCustomers || 0
              ).toLocaleString()}
            </p>

            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
              Fully paid months
            </p>

          </div>

          {/* PARTIAL PARTNERS */}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col justify-between">

            <div className="flex justify-between items-start">

              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                PARTIAL USER
              </p>

            </div>

            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {(
                stats?.partialCustomers || 0
              ).toLocaleString()}
            </p>

            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Current month partial
            </p>

          </div>

          {/* NOT PAID PARTNERS */}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col justify-between">

            <div className="flex justify-between items-start">

              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                NOT PAID USER
              </p>

            </div>

            <p className="text-3xl font-bold text-rose-600 dark:text-rose-400 mt-2">
              {(
                stats?.notPaidCustomers || 0
              ).toLocaleString()}
            </p>

            <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
              Past due or no payment
            </p>

          </div>

        </div>

        {/* ========== COLLECTION + QUICK ACTIONS ========== */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* COLLECTION SUMMARY */}

          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">

            <div className="flex items-center justify-between mb-6">

              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">

                <span className="text-amber-500">
                  📊
                </span>

                Partner Collection Summary

              </h2>

              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">

                <MoreHorizontal className="h-5 w-5" />

              </button>

            </div>

            <div className="space-y-6">

              {/* TOTAL BILLING */}

              <div className="flex items-center justify-between">

                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Total Billing
                </span>

                <span className="text-base font-semibold text-gray-900 dark:text-white">
                  Rs.{' '}
                  {(
                    stats?.totalBilling || 0
                  ).toLocaleString()}
                </span>

              </div>

              {/* RECOVERED */}

              <div className="space-y-2">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Recovered
                  </span>

                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    Rs.{' '}
                    {(
                      stats?.totalRecovered ||
                      0
                    ).toLocaleString()}
                  </span>

                </div>

                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">

                  <div
                    className="h-full bg-gray-400 dark:bg-gray-500 rounded-full transition-all duration-700"
                    style={{
                      width: `${recoveryPercentage}%`,
                    }}
                  />

                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  {recoveryPercentage}%
                  recovered
                </p>

              </div>

              {/* OUTSTANDING */}

              <div className="space-y-2">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Outstanding
                  </span>

                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    Rs.{' '}
                    {(
                      stats?.totalOutstanding ||
                      0
                    ).toLocaleString()}
                  </span>

                </div>

                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">

                  <div
                    className="h-full bg-gray-400 dark:bg-gray-500 rounded-full transition-all duration-700"
                    style={{
                      width: `${outstandingPercentage}%`,
                    }}
                  />

                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  {outstandingPercentage}%
                  outstanding
                </p>

              </div>

            </div>

          </div>

          {/* QUICK ACTIONS */}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between">

            <div>

              <div className="flex items-center justify-between mb-6">

                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">

                  <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />

                  Quick Actions

                </h2>

                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">

                  <MoreHorizontal className="h-5 w-5" />

                </button>

              </div>

              <div className="flex flex-col gap-3">

                <button
                  onClick={() =>
                    router.push('/partners')
                  }
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#d6b138] hover:bg-[#f7ce48] text-gray-900 rounded-xl text-sm font-bold transition-colors shadow-sm"
                >
                  <UserPlus className="h-4 w-4" />
                  Add User
                </button>

                <button
                  onClick={() =>
                    router.push(
                      '/partners/receive-payments'
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
                >
                  <Receipt className="h-4 w-4" />
                  Receive Payment
                </button>

              </div>

            </div>

          </div>

        </div>

        {/* ========== ADDITIONAL INFO CARDS ========== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* ACTIVE */}

          <button
            onClick={() =>
              router.push(
                '/partners?status=active'
              )
            }
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 text-left hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 hover:scale-[1.02] transition-all cursor-pointer"
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  ACTIVE USER
                </p>

                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats?.activeCustomers || 0}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Click to view →
                </p>

              </div>

              <div className="h-11 w-11 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">

                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />

              </div>

            </div>

          </button>

          {/* INACTIVE */}

          <button
            onClick={() =>
              router.push(
                '/partners?status=inactive'
              )
            }
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 text-left hover:shadow-md hover:border-gray-400 dark:hover:border-gray-600 hover:scale-[1.02] transition-all cursor-pointer"
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  INACTIVE User
                </p>

                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                  {stats?.inactiveCustomers || 0}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Click to view →
                </p>

              </div>

              <div className="h-11 w-11 bg-gray-50 dark:bg-gray-900/30 rounded-xl flex items-center justify-center">

                <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />

              </div>

            </div>

          </button>

          {/* EXPIRED */}

          <button
            onClick={() =>
              router.push(
                '/partners?status=expired'
              )
            }
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 text-left hover:shadow-md hover:border-rose-300 dark:hover:border-rose-700 hover:scale-[1.02] transition-all cursor-pointer"
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  EXPIRED USER
                </p>

                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {stats?.expiredCustomers || 0}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Click to view →
                </p>

              </div>

              <div className="h-11 w-11 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center">

                <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />

              </div>

            </div>

          </button>

          {/* SUSPENDED */}

          <button
            onClick={() =>
              router.push(
                '/partners?status=suspended'
              )
            }
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 text-left hover:shadow-md hover:border-yellow-300 dark:hover:border-yellow-700 hover:scale-[1.02] transition-all cursor-pointer"
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  SUSPENDED
                </p>

                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {stats?.suspendedCustomers || 0}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Click to view →
                </p>

              </div>

              <div className="h-11 w-11 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center">

                <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />

              </div>

            </div>

          </button>

          {/* RECOVERY RATE */}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  RECOVERY RATE
                </p>

                <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                  {stats?.recoveryRate || 0}%
                </p>

              </div>

              <div className="h-11 w-11 bg-cyan-50 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center">

                <TrendingUp className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />

              </div>

            </div>

          </div>

          {/* COLLECTED */}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  COLLECTED
                </p>

                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  Rs.{' '}
                  {(
                    stats?.totalRecovered || 0
                  ).toLocaleString()}
                </p>

              </div>

              <div className="h-11 w-11 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">

                <DollarSign className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />

              </div>

            </div>

          </div>

          {/* PACKAGES */}

          <button
            onClick={() =>
              router.push('/packages')
            }
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 text-left hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 hover:scale-[1.02] transition-all cursor-pointer"
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  TOTAL PACKAGES
                </p>

                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {stats?.totalPackages || 0}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Click to manage →
                </p>

              </div>

              <div className="h-11 w-11 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">

                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />

              </div>

            </div>

          </button>

          {/* PARTNER AREAS */}

          <button
            onClick={() =>
              router.push(
                '/partner-areas'
              )
            }
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 text-left hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700 hover:scale-[1.02] transition-all cursor-pointer"
          >

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  TOTAL PARTNER AREAS
                </p>

                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-1">
                  {stats?.totalAreas || 0}
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Click to manage →
                </p>

              </div>

              <div className="h-11 w-11 bg-violet-50 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">

                <MapPin className="h-5 w-5 text-violet-600 dark:text-violet-400" />

              </div>

            </div>

          </button>

        </div>

      </div>
    </Layout>
  );
}
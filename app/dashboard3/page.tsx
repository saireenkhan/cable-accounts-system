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

      // PARTNER STATUS COUNTS
      const totalCustomers = partners.length;
      const _now = new Date();

      const expiredCustomers = partners.filter((c: any) => {
        const rawStatus = (c.status || '').toLowerCase();

        if (rawStatus === 'expired') return true;

        if (!c.expiryDate) return false;

        const expiry = new Date(c.expiryDate);

        if (isNaN(expiry.getTime())) return false;

        return (
          expiry < _now &&
          rawStatus !== 'inactive' &&
          rawStatus !== 'suspended'
        );
      }).length;

      const activeCustomers = partners.filter(
        (c: any) => c.status?.toLowerCase() === 'active'
      ).length;

      const inactiveCustomers = partners.filter(
        (c: any) => c.status?.toLowerCase() === 'inactive'
      ).length;

      const suspendedCustomers = partners.filter(
        (c: any) => c.status?.toLowerCase() === 'suspended'
      ).length;

      // BILLING & COLLECTION STATS
      const totalBilling = partners.reduce(
        (sum: number, partner: any) => {
          const monthlyFee =
            parseFloat(String(partner.monthlyFee)) || 0;

          if (monthlyFee === 0) return sum;

          const partnerPayments = payments.filter(
            (p: any) =>
              p.partner?.name === partner.name &&
              !p.isNoPayment
          );

          const activeMonths = new Set<string>();

          partnerPayments.forEach((p: any) => {
            if (p.month) activeMonths.add(p.month);
          });

          const monthCount =
            activeMonths.size > 0
              ? activeMonths.size
              : 1;

          return sum + monthlyFee * monthCount;
        },
        0
      );

      const totalRecovered = payments
        .filter((p: any) => !p.isNoPayment)
        .reduce(
          (sum: number, p: any) =>
            sum +
            (parseFloat(String(p.amount)) || 0),
          0
        );

      const totalOutstanding = Math.max(
        0,
        totalBilling - totalRecovered
      );

      const recoveryRate =
        totalBilling > 0
          ? Math.min(
              100,
              (totalRecovered / totalBilling) * 100
            )
          : 0;

      // UPCOMING EXPIRY
      const today = new Date();
      const sevenDaysLater = new Date(today);

      sevenDaysLater.setDate(
        today.getDate() + 7
      );

      const upcomingExpiry = partners.filter(
        (c: any) => {
          if (!c.expiryDate) return false;

          const expiryDate = new Date(
            c.expiryDate
          );

          return (
            expiryDate >= today &&
            expiryDate <= sevenDaysLater
          );
        }
      ).length;

      // PER-MONTH STATUS COUNTS
      const now = new Date();

      const monthsList = [
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

      const currentMonthIndex =
        now.getMonth();

      const currentYear =
        now.getFullYear();

      const currentMonth =
        `${monthsList[currentMonthIndex]} ${currentYear}`;

      const isPastOrCurrentMonth = (
        monthStr: string
      ) => {
        const [monthName, yearStr] =
          monthStr.split(' ');

        const year = parseInt(yearStr);

        const monthIndex =
          monthsList.indexOf(monthName);

        if (
          isNaN(year) ||
          monthIndex === -1
        ) {
          return false;
        }

        if (year < currentYear) {
          return true;
        }

        if (
          year === currentYear &&
          monthIndex <= currentMonthIndex
        ) {
          return true;
        }

        return false;
      };

      const monthStatusCounts = {
        paid: 0,
        partial: 0,
        notpaid: 0,
      };

      partners.forEach((partner: any) => {
        const monthlyFee =
          parseFloat(
            String(partner.monthlyFee)
          ) || 0;

        if (monthlyFee === 0) return;

        const partnerPayments =
          payments.filter(
            (p: any) =>
              p.partner?.name ===
                partner.name &&
              !p.isNoPayment
          );

        if (partnerPayments.length === 0) {
          monthStatusCounts.notpaid += 1;
          return;
        }

        const monthPaidMap: Record<
          string,
          number
        > = {};

        partnerPayments.forEach(
          (p: any) => {
            if (!monthPaidMap[p.month]) {
              monthPaidMap[p.month] = 0;
            }

            monthPaidMap[p.month] +=
              parseFloat(
                String(p.amount)
              ) || 0;
          }
        );

        const activeMonths =
          Object.keys(monthPaidMap);

        const totalPaid =
          activeMonths.reduce(
            (sum, m) =>
              sum + monthPaidMap[m],
            0
          );

        const totalExpected =
          monthlyFee *
          activeMonths.length;

        if (totalPaid >= totalExpected) {
          monthStatusCounts.paid += 1;
          return;
        }

        activeMonths.forEach(
          (month) => {
            const paid =
              monthPaidMap[month];

            const remaining =
              monthlyFee - paid;

            if (remaining <= 0) {
              monthStatusCounts.paid += 1;
            } else if (
              month === currentMonth
            ) {
              monthStatusCounts.partial += 1;
            } else if (
              isPastOrCurrentMonth(month)
            ) {
              monthStatusCounts.notpaid += 1;
            }
          }
        );
      });

      const paidCustomers =
        monthStatusCounts.paid;

      const partialCustomers =
        monthStatusCounts.partial;

      const notPaidCustomers =
        monthStatusCounts.notpaid;

      console.log(
        '✅ Paid:',
        paidCustomers
      );

      console.log(
        '🟡 Partial:',
        partialCustomers
      );

      console.log(
        '❌ Not Paid:',
        notPaidCustomers
      );

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
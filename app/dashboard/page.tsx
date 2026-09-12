'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/app/components/ui/Layout';
import api from '@/app/lib/api';
import {
  Users,
  DollarSign,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  UserPlus,
  Receipt,
  FileText,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      // ✅ Fetch only customers and payments (no bills)
      const [customersRes, paymentsRes] = await Promise.all([
        api.get('/customers?limit=10000'),
        api.get('/payments?limit=10000'),
      ]);

      const customers = customersRes.data.customers || [];
      const payments = paymentsRes.data.payments || [];

      console.log('📊 Customers:', customers.length);
      console.log('💰 Payments:', payments.length);

      // ✅ ========== CUSTOMER STATS ==========
      const totalCustomers = customers.length;
      const activeCustomers = customers.filter((c: any) => c.status?.toLowerCase() === 'active').length;
      const expiredCustomers = customers.filter((c: any) => c.status?.toLowerCase() === 'expired').length;
      const suspendedCustomers = customers.filter((c: any) => c.status?.toLowerCase() === 'suspended').length;

      // ✅ ========== BILLING & COLLECTION STATS ==========
      // ✅ Total Billing = sum of (monthlyFee × active months) per customer
      // This matches the "total expected" logic used in the Receive Payments page,
      // so totalRecovered can never exceed totalBilling.
      const totalBilling = customers.reduce((sum: number, customer: any) => {
        const monthlyFee = parseFloat(String(customer.monthlyFee)) || 0;
        if (monthlyFee === 0) return sum;

        // Count distinct months this customer has payment activity in
        const customerPayments = payments.filter(
          (p: any) => p.customer?.name === customer.name && !p.isNoPayment
        );
        const activeMonths = new Set<string>();
        customerPayments.forEach((p: any) => {
          if (p.month) activeMonths.add(p.month);
        });

        // If no payments yet, expect 1 month (current month)
        const monthCount = activeMonths.size > 0 ? activeMonths.size : 1;

        return sum + monthlyFee * monthCount;
      }, 0);

      // Total Recovered = sum of all payment amounts (excluding no-payments)
      const totalRecovered = payments
        .filter((p: any) => !p.isNoPayment)
        .reduce((sum: number, p: any) => sum + (parseFloat(String(p.amount)) || 0), 0);

      // Outstanding = Total Billing - Total Recovered (but not negative)
      const totalOutstanding = Math.max(0, totalBilling - totalRecovered);

      // ✅ Recovery Rate (clamped to 100%)
      const recoveryRate = totalBilling > 0
        ? Math.min(100, (totalRecovered / totalBilling) * 100)
        : 0;

      // ✅ ========== UPCOMING EXPIRY (next 7 days) ==========
      const today = new Date();
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(today.getDate() + 7);

      const upcomingExpiry = customers.filter((c: any) => {
        if (!c.expiryDate) return false;
        const expiryDate = new Date(c.expiryDate);
        return expiryDate >= today && expiryDate <= sevenDaysLater;
      }).length;

      // ============================================================
      // ✅ ========== PER-MONTH STATUS COUNTS (same as Receive Payments) ==========
      // ============================================================
      const now = new Date();
      const monthsList = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const currentMonthIndex = now.getMonth();
      const currentYear = now.getFullYear();
      const currentMonth = `${monthsList[currentMonthIndex]} ${currentYear}`;

      // Helper: Check if a month string is past or current
      const isPastOrCurrentMonth = (monthStr: string) => {
        const [monthName, yearStr] = monthStr.split(' ');
        const year = parseInt(yearStr);
        const monthIndex = monthsList.indexOf(monthName);

        if (isNaN(year) || monthIndex === -1) return false;

        if (year < currentYear) return true;
        if (year === currentYear && monthIndex <= currentMonthIndex) return true;

        return false;
      };

      // ✅ Count per-MONTH statuses (customer can appear in multiple categories)
      const monthStatusCounts = {
        paid: 0,
        partial: 0,
        notpaid: 0,
      };

      customers.forEach((customer: any) => {
        const monthlyFee = parseFloat(String(customer.monthlyFee)) || 0;
        if (monthlyFee === 0) return;

        const customerPayments = payments.filter(
          (p: any) => p.customer?.name === customer.name && !p.isNoPayment
        );

        // ✅ No payments at all → Not Paid
        if (customerPayments.length === 0) {
          monthStatusCounts.notpaid += 1;
          return;
        }

        // Group total paid per month
        const monthPaidMap: Record<string, number> = {};
        customerPayments.forEach((p: any) => {
          if (!monthPaidMap[p.month]) {
            monthPaidMap[p.month] = 0;
          }
          monthPaidMap[p.month] += parseFloat(String(p.amount)) || 0;
        });

        const activeMonths = Object.keys(monthPaidMap);
        const totalPaid = activeMonths.reduce((sum, m) => sum + monthPaidMap[m], 0);
        const totalExpected = monthlyFee * activeMonths.length;

        // ✅ If fully paid across ALL months → count as 1 Paid
        if (totalPaid >= totalExpected) {
          monthStatusCounts.paid += 1;
          return;
        }

        // ✅ Otherwise, check each month individually
        activeMonths.forEach((month) => {
          const paid = monthPaidMap[month];
          const remaining = monthlyFee - paid;

          if (remaining <= 0) {
            monthStatusCounts.paid += 1;
          } else if (month === currentMonth) {
            monthStatusCounts.partial += 1;
          } else if (isPastOrCurrentMonth(month)) {
            monthStatusCounts.notpaid += 1;
          }
        });
      });

      const paidCustomers = monthStatusCounts.paid;
      const partialCustomers = monthStatusCounts.partial;
      const notPaidCustomers = monthStatusCounts.notpaid;

      console.log('✅ Paid:', paidCustomers);
      console.log('🟡 Partial:', partialCustomers);
      console.log('❌ Not Paid:', notPaidCustomers);

      // ✅ Save stats
      setStats({
        totalCustomers,
        activeCustomers,
        expiredCustomers,
        suspendedCustomers,
        totalBilling,
        totalRecovered,
        totalOutstanding,
        recoveryRate: Math.round(recoveryRate),
        upcomingExpiry,
        // ✅ Per-month status counts
        paidCustomers,
        partialCustomers,
        notPaidCustomers,
        // Legacy: keep defaultUsers for backward compat (same as notPaidCustomers)
        defaultUsers: notPaidCustomers,
      });

    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        toast.error('Cannot connect to server. Please check if backend is running.');
      } else {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  // ✅ Clamped percentages (never exceed 100%)
  const recoveryPercentage = stats?.totalBilling > 0
    ? Math.min(100, Math.round((stats.totalRecovered / stats.totalBilling) * 100))
    : 0;

  const outstandingPercentage = stats?.totalBilling > 0
    ? Math.min(100, Math.round((stats.totalOutstanding / stats.totalBilling) * 100))
    : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* ========== PAGE HEADER ========== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              User Management Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Quick overview of customer accounts, billing and payment activity.
            </p>
          </div>
          <button
            onClick={() => router.push('/users')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-500/25"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        </div>

        {/* ========== STATS CARDS - TOP ROW (4 cards) ========== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Users - Dark Card */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl shadow-lg p-5">
            <p className="text-xs font-medium text-slate-300 uppercase tracking-wider">
              TOTAL USERS
            </p>
            <p className="text-3xl font-bold text-white mt-2">
              {(stats?.totalCustomers || 0).toLocaleString()}
            </p>
            <p className="text-xs text-slate-300 mt-2">
              {stats?.activeCustomers || 0} active connections
            </p>
          </div>

          {/* ✅ Paid Users */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              PAID USERS
            </p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              {(stats?.paidCustomers || 0).toLocaleString()}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
              Fully paid months
            </p>
          </div>

          {/* ✅ Partial Users */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              PARTIAL USERS
            </p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {(stats?.partialCustomers || 0).toLocaleString()}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Current month partial
            </p>
          </div>

          {/* ✅ Not Paid Users */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              NOT PAID USERS
            </p>
            <p className="text-3xl font-bold text-rose-600 dark:text-rose-400 mt-2">
              {(stats?.notPaidCustomers || 0).toLocaleString()}
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
              Past due or no payment
            </p>
          </div>
        </div>

        {/* ========== BOTTOM ROW - 2 Sections ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ========== USER COLLECTION SUMMARY (2/3 width) ========== */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              User Collection Summary
            </h2>

            <div className="space-y-6">
              {/* Total Billing */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Total Billing
                </span>
                <span className="text-base font-semibold text-gray-900 dark:text-white">
                  Rs. {(stats?.totalBilling || 0).toLocaleString()}
                </span>
              </div>

              {/* Recovered with Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Recovered
                  </span>
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    Rs. {(stats?.totalRecovered || 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all duration-700"
                    style={{ width: `${recoveryPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  {recoveryPercentage}% recovered
                </p>
              </div>

              {/* Outstanding with Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Outstanding
                  </span>
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    Rs. {(stats?.totalOutstanding || 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${outstandingPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  {outstandingPercentage}% outstanding
                </p>
              </div>
            </div>
          </div>

          {/* ========== QUICK ACTIONS (1/3 width) ========== */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Quick Actions
            </h2>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/users')}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Add User
              </button>
              <button
                onClick={() => router.push('/billing')}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Receive Payment
              </button>
            </div>
          </div>
        </div>

        {/* ========== ADDITIONAL INFO CARDS ========== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Connections */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  ACTIVE USERS
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats?.activeCustomers || 0}
                </p>
              </div>
              <div className="h-11 w-11 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Recovery Rate */}
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

          {/* Total Collection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  COLLECTED
                </p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  Rs. {(stats?.totalRecovered || 0).toLocaleString()}
                </p>
              </div>
              <div className="h-11 w-11 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>

          {/* Suspended */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  SUSPENDED
                </p>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {stats?.suspendedCustomers || 0}
                </p>
              </div>
              <div className="h-11 w-11 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center">
                <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
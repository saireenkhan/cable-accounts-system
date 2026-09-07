'use client';

import React from 'react';
import Link from 'next/link';
import Layout from '@/app/components/ui/Layout';
import { StatCard } from '@/app/components/ui/StatCard';
import { DataTable } from '@/app/components/ui/DataTable';
import { cn } from '@/app/lib/utils';
import { 
  Users, 
  DollarSign, 
  CreditCard, 
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  UserPlus,
  FileText,
  PlusCircle
} from 'lucide-react';
import { formatCurrency } from '@/app/lib/utils';

export default function DashboardPage() {
  // Main stats
  const stats = [
    {
      title: 'Total Users',
      value: '1,248',
      icon: <Users className="h-5 w-5" />,
      subtitle: '1,192 active connections',
      color: 'blue' as const,
    },
    {
      title: 'Expired Users',
      value: '38',
      icon: <XCircle className="h-5 w-5" />,
      subtitle: 'Service expired',
      color: 'red' as const,
    },
    {
      title: 'Upcoming Expiry',
      value: '64',
      icon: <Clock className="h-5 w-5" />,
      subtitle: 'Within next 7 days',
      color: 'yellow' as const,
    },
    {
      title: 'Default Users',
      value: '287',
      icon: <AlertCircle className="h-5 w-5" />,
      subtitle: 'Payment overdue',
      color: 'red' as const,
    },
  ];

  // Quick action buttons
  const quickActions = [
    { label: 'Add User', icon: <UserPlus className="h-5 w-5" />, href: '/users/add', color: 'blue' },
    { label: 'Receive Payment', icon: <CreditCard className="h-5 w-5" />, href: '/payments', color: 'green' },
    { label: 'Monthly Billing', icon: <FileText className="h-5 w-5" />, href: '/billing', color: 'purple' },
  ];

  // Recent payments data
  const recentPayments = [
    {
      id: 1,
      receipt: 'RC-260903-001',
      customer: 'Ahmed Khan',
      month: 'September 2026',
      date: '03 Sep 2026',
      method: 'Cash',
      amount: 'Rs. 1,500',
      status: 'Paid',
    },
    {
      id: 2,
      receipt: 'RC-260903-002',
      customer: 'Ali Raza',
      month: 'September 2026',
      date: '03 Sep 2026',
      method: 'JazzCash',
      amount: 'Rs. 1,000',
      status: 'Partial',
    },
    {
      id: 3,
      receipt: 'RC-260903-003',
      customer: 'Usman Shah',
      month: 'September 2026',
      date: '03 Sep 2026',
      method: 'Bank Transfer',
      amount: 'Rs. 2,500',
      status: 'Paid',
    },
  ];

  const paymentColumns = [
    { key: 'receipt', header: 'Receipt' },
    { key: 'customer', header: 'Customer' },
    { key: 'month', header: 'Month' },
    { key: 'date', header: 'Date' },
    { key: 'method', header: 'Method' },
    { key: 'amount', header: 'Amount' },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: any) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          item.status === 'Paid' 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
        }`}>
          {item.status}
        </span>
      )
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Management Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Quick overview of customer accounts, billing and payment activity.
          </p>
        </div>

        {/* Stats Grid - 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* User Collection Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            User Collection Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Billing</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                Rs. 1,872,000
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Recovered</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                Rs. 1,435,500
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                Rs. 436,500
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className={cn(
                  'flex items-center justify-center gap-3 px-4 py-3 rounded-lg transition-all',
                  'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                  'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700',
                  'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400',
                  'font-medium text-sm'
                )}
              >
                <span className={cn(
                  'p-2 rounded-lg',
                  action.color === 'blue' && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                  action.color === 'green' && 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                  action.color === 'purple' && 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                )}>
                  {action.icon}
                </span>
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Payments Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Recent Payments
            </h2>
            <Link 
              href="/payments"
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700"
            >
              View All
            </Link>
          </div>
          <div className="p-4">
            <DataTable
              data={recentPayments}
              columns={paymentColumns}
              accordionTitle="customer"
              accordionSubtitle="receipt"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
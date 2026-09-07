'use client';

import React from 'react';
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

export default function DashboardPage() {
  // Main stats with muted colors
  const stats = [
    {
      title: 'TOTAL CUSTOMERS',
      value: '1,248',
      icon: <Users className="h-6 w-6" />,
      subtitle: '1,192 active connections',
      color: 'slate',
    },
    {
      title: 'EXPIRED USERS',
      value: '38',
      icon: <XCircle className="h-6 w-6" />,
      subtitle: 'Service already expired',
      color: 'rose',
    },
    {
      title: 'THIS MONTH BILLING',
      value: 'Rs. 1,872,000',
      icon: <DollarSign className="h-6 w-6" />,
      subtitle: '1.64% from last month',
      color: 'emerald',
      change: 1.64,
    },
    {
      title: 'UPCOMING EXPIRE USERS',
      value: '64',
      icon: <Clock className="h-6 w-6" />,
      subtitle: 'Expiring in next 7 days',
      color: 'amber',
    },
    {
      title: 'TOTAL COLLECTION',
      value: 'Rs. 1,435,500',
      icon: <CreditCard className="h-6 w-6" />,
      subtitle: '76.7% recovered',
      color: 'teal',
    },
    {
      title: 'DEFAULTER USERS',
      value: '287',
      icon: <AlertCircle className="h-6 w-6" />,
      subtitle: 'Payment overdue',
      color: 'rose',
    },
    {
      title: 'OUTSTANDING',
      value: 'Rs. 436,500',
      icon: <Wallet className="h-6 w-6" />,
      subtitle: '287 unpaid customers',
      color: 'orange',
    },
    {
      title: 'ACTIVE USERS',
      value: '1,192',
      icon: <CheckCircle className="h-6 w-6" />,
      subtitle: 'Current active connections',
      color: 'emerald',
    },
  ];

  // Area-wise collection data
  const areaCollections = [
    { name: 'Gulshan Block 1', amount: 410000 },
    { name: 'Model Colony', amount: 325500 },
    { name: 'Green Town', amount: 270000 },
    { name: 'New Market', amount: 205000 },
  ];

  // Monthly summary
  const monthlySummary = {
    collection: 1435500,
    expenses: 382000,
    netIncome: 1053500,
  };

  // 🎨 Muted/Dull color palette
  const colorClasses = {
    slate: 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400',
    rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
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
    'bg-slate-500',
    'bg-teal-500',
    'bg-purple-500',
    'bg-amber-500',
  ];

  const progressTextColors = [
    'text-slate-600 dark:text-slate-400',
    'text-teal-600 dark:text-teal-400',
    'text-purple-600 dark:text-purple-400',
    'text-amber-600 dark:text-amber-400',
  ];

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
              <MapPin className="h-4 w-4 text-slate-500" />
              Area-wise Collection
            </h2>
            <div className="space-y-3">
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
              <TrendingUp className="h-4 w-4 text-slate-500" />
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
                  Rs. {monthlySummary.expenses.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 -mx-1 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-slate-600 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Net Income
                  </span>
                </div>
                <span className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  Rs. {monthlySummary.netIncome.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
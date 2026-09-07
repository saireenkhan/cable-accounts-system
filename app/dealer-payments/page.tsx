'use client';

import React, { useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  PlusCircle,
  Receipt,
  Calendar,
  Printer
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function DealerPaymentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('September 2026');

  // Dealer payment data
  const [payments] = useState([
    {
      id: 1,
      dealer: 'City Cable Dealer',
      area: 'Gulshan',
      opening: 20000,
      currentBill: 150000,
      received: 140000,
      balance: 30000,
      recovery: 82.4,
    },
    {
      id: 2,
      dealer: 'Star Network',
      area: 'Model Colony',
      opening: 15000,
      currentBill: 125000,
      received: 95000,
      balance: 45000,
      recovery: 67.9,
    },
    {
      id: 3,
      dealer: 'Pak Vision Cable',
      area: 'Green Town',
      opening: 5000,
      currentBill: 110000,
      received: 102000,
      balance: 13000,
      recovery: 88.7,
    },
  ]);

  // Calculate totals
  const totalDealers = payments.length;
  const activeDealers = payments.length;
  const totalOpening = payments.reduce((sum, p) => sum + p.opening, 0);
  const totalCurrentBill = payments.reduce((sum, p) => sum + p.currentBill, 0);
  const totalReceived = payments.reduce((sum, p) => sum + p.received, 0);
  const totalBalance = payments.reduce((sum, p) => sum + p.balance, 0);
  const avgRecovery = totalCurrentBill > 0 ? ((totalReceived / totalCurrentBill) * 100).toFixed(1) : 0;

  // Stats data
  const stats = [
    {
      title: 'TOTAL DEALERS',
      value: totalDealers,
      subtitle: `${activeDealers} active dealers`,
      icon: <Users className="h-6 w-6" />,
      color: 'purple',
    },
    {
      title: 'MONTHLY DEALER BILLING',
      value: `Rs. ${totalCurrentBill.toLocaleString()}`,
      icon: <DollarSign className="h-6 w-6" />,
      color: 'blue',
    },
    {
      title: 'DEALER RECOVERY',
      value: `Rs. ${totalReceived.toLocaleString()}`,
      subtitle: `${avgRecovery}% recovered`,
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'green',
    },
    {
      title: 'DEALER OUTSTANDING',
      value: `Rs. ${totalBalance.toLocaleString()}`,
      subtitle: 'Amount receivable',
      icon: <AlertCircle className="h-6 w-6" />,
      color: 'red',
    },
  ];

  // Dealer payment fields for modal
  const paymentFields: Field[] = [
    { 
      name: 'dealer', 
      label: 'Dealer', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'City Cable Dealer', value: 'City Cable Dealer' },
        { label: 'Star Network', value: 'Star Network' },
        { label: 'Pak Vision Cable', value: 'Pak Vision Cable' },
      ]
    },
    { name: 'amount', label: 'Amount (Rs.)', type: 'text', required: true, placeholder: '50,000' },
    { 
      name: 'method', 
      label: 'Payment Method', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'Cash', value: 'Cash' },
        { label: 'Bank Transfer', value: 'Bank Transfer' },
        { label: 'JazzCash', value: 'JazzCash' },
        { label: 'EasyPaisa', value: 'EasyPaisa' },
      ]
    },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Additional notes...' },
  ];

  const handlePaymentAdded = (data: any) => {
    toast.success(`Payment of Rs. ${data.amount} recorded for ${data.dealer}!`);
  };

  const filteredPayments = payments.filter(payment => {
    const query = searchQuery.toLowerCase();
    return (
      payment.dealer.toLowerCase().includes(query) ||
      payment.area.toLowerCase().includes(query)
    );
  });

  const handlePrint = (payment: any) => {
    toast.success(`Printing receipt for ${payment.dealer}`);
  };

  const months = [
    'September 2026',
    'August 2026',
    'July 2026',
    'June 2026',
  ];

  // Color mapping
  const colorMap = {
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  };

  const iconBgMap = {
    purple: 'bg-purple-100 dark:bg-purple-900/30',
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    green: 'bg-green-100 dark:bg-green-900/30',
    red: 'bg-red-100 dark:bg-red-900/30',
  };

  // DataTable columns
  const columns = [
    { key: 'dealer', header: 'Dealer' },
    { key: 'area', header: 'Area' },
    { 
      key: 'opening', 
      header: 'Opening',
      render: (item: any) => `Rs. ${item.opening.toLocaleString()}`
    },
    { 
      key: 'currentBill', 
      header: 'Current Bill',
      render: (item: any) => `Rs. ${item.currentBill.toLocaleString()}`
    },
    { 
      key: 'received', 
      header: 'Received',
      render: (item: any) => (
        <span className="text-green-600 dark:text-green-400">
          Rs. {item.received.toLocaleString()}
        </span>
      )
    },
    { 
      key: 'balance', 
      header: 'Balance',
      render: (item: any) => (
        <span className="text-red-600 dark:text-red-400">
          Rs. {item.balance.toLocaleString()}
        </span>
      )
    },
    { 
      key: 'recovery', 
      header: 'Recovery',
      render: (item: any) => (
        <span className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          item.recovery >= 80 && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          item.recovery >= 60 && item.recovery < 80 && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          item.recovery < 60 && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        )}>
          {item.recovery}%
        </span>
      )
    },
  ];

  // Add total row as footer
  const totalRow = {
    dealer: 'Total',
    area: '',
    opening: `Rs. ${totalOpening.toLocaleString()}`,
    currentBill: `Rs. ${totalCurrentBill.toLocaleString()}`,
    received: `Rs. ${totalReceived.toLocaleString()}`,
    balance: `Rs. ${totalBalance.toLocaleString()}`,
    recovery: `${avgRecovery}%`,
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-6 w-6 text-purple-600" />
              Dealer Payment
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Separate dealer ledger, receivables and recovery report.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-500/25"
          >
            <PlusCircle className="h-4 w-4" />
            Record Payment
          </button>
        </div>

        {/* Stats - 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                  {stat.subtitle && (
                    <p className={cn(
                      'text-xs mt-1',
                      stat.color === 'green' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                    )}>
                      {stat.subtitle}
                    </p>
                  )}
                </div>
                <div className={cn(
                  'h-12 w-12 rounded-full flex items-center justify-center',
                  iconBgMap[stat.color as keyof typeof iconBgMap]
                )}>
                  <span className={colorMap[stat.color as keyof typeof colorMap]}>
                    {stat.icon}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Month Selector and Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            >
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <SearchBar
              placeholder="Search dealer..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
        </div>

        {/* Dealer Payments Table - Using DataTable */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Dealer Payment History
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredPayments.length} dealers found
            </span>
          </div>
          <div className="p-4">
            <DataTable
              data={filteredPayments}
              columns={columns}
              actions={[
                { label: 'Print', value: 'print', icon: <Printer className="h-4 w-4" /> },
              ]}
              onAction={(item, action) => {
                if (action === 'print') {
                  handlePrint(item);
                }
              }}
              accordionTitle="dealer"
              accordionSubtitle="area"
              emptyMessage="No dealers found matching your search"
            />


          </div>
        </div>

        {/* Add Payment Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handlePaymentAdded}
          title="Record Dealer Payment"
          subtitle="Record payment received from dealer"
          fields={paymentFields}
          submitLabel="Record Payment"
          color="purple"
        />
      </div>
    </Layout>
  );
}
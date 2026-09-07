'use client';

import React, { useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { 
  Truck, 
  PlusCircle, 
  Users, 
  DollarSign, 
  CreditCard, 
  AlertCircle,
  TrendingUp,
  UserPlus,
  Receipt,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function DealerDashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dealers] = useState([
    {
      id: 1,
      name: 'City Cable Dealer',
      area: 'Gulshan',
      recovery: 82.4,
      billing: 150000,
      received: 140000,
      outstanding: 30000,
      status: 'active',
    },
    {
      id: 2,
      name: 'Star Network',
      area: 'Model Colony',
      recovery: 67.9,
      billing: 125000,
      received: 95000,
      outstanding: 45000,
      status: 'active',
    },
    {
      id: 3,
      name: 'Pak Vision Cable',
      area: 'Green Town',
      recovery: 88.7,
      billing: 110000,
      received: 102000,
      outstanding: 13000,
      status: 'active',
    },
  ]);

  // Calculate stats
  const totalDealers = dealers.length;
  const activeDealers = dealers.filter(d => d.status === 'active').length;
  const monthlyBilling = dealers.reduce((sum, d) => sum + d.billing, 0);
  const totalRecovery = dealers.reduce((sum, d) => sum + d.received, 0);
  const totalOutstanding = dealers.reduce((sum, d) => sum + d.outstanding, 0);
  const avgRecovery = monthlyBilling > 0 ? ((totalRecovery / monthlyBilling) * 100).toFixed(1) : 0;

  // Dealer fields for modal
  const dealerFields: Field[] = [
    { name: 'name', label: 'Dealer Name', type: 'text', required: true, placeholder: 'Enter dealer name' },
    { name: 'cellNo', label: 'Cell No.', type: 'text', required: true, placeholder: '0330-1234567' },
    { 
      name: 'area', 
      label: 'Area', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'Gulshan', value: 'Gulshan' },
        { label: 'Model Colony', value: 'Model Colony' },
        { label: 'Green Town', value: 'Green Town' },
      ]
    },
    { name: 'address', label: 'Address', type: 'text', placeholder: 'Dealer address' },
    { name: 'openingBalance', label: 'Opening Balance (Rs.)', type: 'text', placeholder: '0' },
    { name: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Additional notes...' },
  ];

  const handleDealerAdded = (data: any) => {
    toast.success(`${data.name} added successfully!`);
  };

  // Get color based on recovery percentage
  const getRecoveryColor = (recovery: number) => {
    if (recovery >= 80) return 'bg-blue-500';
    if (recovery >= 60) return 'bg-purple-500';
    return 'bg-red-500';
  };

  const getRecoveryBgColor = (recovery: number) => {
    if (recovery >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (recovery >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const getRecoveryTextColor = (recovery: number) => {
    if (recovery >= 80) return 'text-blue-600 dark:text-blue-400';
    if (recovery >= 60) return 'text-purple-600 dark:text-purple-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck className="h-6 w-6 text-purple-600" />
              Dealer Management Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Dealer balances, recovery and payment overview.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-500/25"
          >
            <UserPlus className="h-4 w-4" />
            Add Dealer
          </button>
        </div>

        {/* Stats - 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL DEALERS</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalDealers}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {activeDealers} active dealers
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">MONTHLY BILLING</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  Rs. {monthlyBilling.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Current dealer billing
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">RECOVERY</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  Rs. {totalRecovery.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {avgRecovery}% recovered
                </p>
              </div>
              <div className="h-12 w-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">OUTSTANDING</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  Rs. {totalOutstanding.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Amount receivable
                </p>
              </div>
              <div className="h-12 w-12 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <SearchBar
          placeholder="Search dealer..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Two Column Layout: Recovery Position + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Dealer Recovery Position */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
              Dealer Recovery Position
            </h2>
            <div className="space-y-4">
              {dealers.map((dealer) => (
                <div key={dealer.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {dealer.name}
                    </span>
                    <span className={cn(
                      'text-sm font-bold',
                      getRecoveryTextColor(dealer.recovery)
                    )}>
                      {dealer.recovery}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        getRecoveryColor(dealer.recovery)
                      )}
                      style={{ width: `${Math.min(dealer.recovery, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors group"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-grey-600 ">
                  <UserPlus className="h-4 w-4" />
                  Add Dealer
                </span>
                <ChevronRight className="h-4 w-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => toast.success('Opening payment form...')}
                className="w-full flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors group"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-grey-600 ">
                  <CreditCard className="h-4 w-4" />
                  Receive Payment
                </span>
                <ChevronRight className="h-4 w-4 text-green-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => toast.success('Opening add payment form...')}
                className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors group"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-grey-600 ">
                  <PlusCircle className="h-4 w-4" />
                  Add Payment
                </span>
                <ChevronRight className="h-4 w-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Add Dealer Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleDealerAdded}
          title="Add New Dealer"
          subtitle="Add a new dealer to the system"
          fields={dealerFields}
          submitLabel="Add Dealer"
          color="purple"
        />
      </div>
    </Layout>
  );
}
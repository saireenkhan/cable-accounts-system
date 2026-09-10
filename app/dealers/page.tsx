'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
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
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function DealerDashboardPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dealers, setDealers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const [dealersRes, paymentsRes, areasRes] = await Promise.all([
        api.get('/dealers?limit=1000'),
        api.get('/dealer-payments'),
        api.get('/dealer-areas').catch(() => api.get('/areas')),
      ]);

      if (dealersRes.data.success) {
        setDealers(dealersRes.data.dealers || []);
      }

      if (paymentsRes.data.success) {
        setPayments(paymentsRes.data.payments || []);
      }

      if (areasRes?.data?.success) {
        setAreas(areasRes.data.areas || []);
      }
    } catch (error) {
      console.error('Error fetching dealer dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // COMPUTE PER-DEALER STATS
  // ============================================================
  const dealerStats = dealers.map((dealer: any) => {
    const dealerPayments = payments.filter(
      (p: any) =>
        (p.dealer?.name === dealer.name) ||
        (p.dealer?._id === dealer._id) ||
        (typeof p.dealer === 'string' && p.dealer === dealer.name)
    );

    const billing = dealerPayments
      .filter((p: any) => p.paymentType === 'add_payment')
      .reduce((s: number, p: any) => s + (p.amount || 0), 0);

    const received = dealerPayments
      .filter((p: any) => p.paymentType === 'receive_payment')
      .reduce((s: number, p: any) => s + (p.amount || 0), 0);

    const commission = dealerPayments
      .filter((p: any) => p.paymentType === 'receive_payment')
      .reduce((s: number, p: any) => s + (p.commission || 0), 0);

    const outstanding = Math.max(0, billing - received);
    const recovery = billing > 0 ? (received / billing) * 100 : 0;

    return {
      id: dealer._id,
      name: dealer.name,
      dealerId: dealer.dealerId,
      area: dealer.area?.name || dealer.area || 'N/A',
      commission: dealer.commission || '0%',
      status: dealer.status || 'active',
      billing,
      received,
      outstanding,
      commissionEarned: commission,
      recovery: Math.round(recovery * 10) / 10,
    };
  });

  // ============================================================
  // AGGREGATE STATS
  // ============================================================
  const totalDealers = dealers.length;
  const activeDealers = dealers.filter((d: any) => d.status === 'active').length;

  const totalBilling = dealerStats.reduce((s, d) => s + d.billing, 0);
  const totalReceived = dealerStats.reduce((s, d) => s + d.received, 0);
  const totalOutstanding = dealerStats.reduce((s, d) => s + d.outstanding, 0);
  const totalCommission = dealerStats.reduce(
    (s, d) => s + d.commissionEarned,
    0
  );
  const avgRecovery =
    totalBilling > 0 ? ((totalReceived / totalBilling) * 100).toFixed(1) : '0';

  // ============================================================
  // FILTER for search
  // ============================================================
  const filteredStats = dealerStats.filter((d) => {
    const q = searchQuery.toLowerCase();
    return (
      d.name?.toLowerCase().includes(q) ||
      d.dealerId?.toLowerCase().includes(q) ||
      d.area?.toLowerCase().includes(q)
    );
  });

  // ============================================================
  // DEALER FIELDS
  // ============================================================
  const dealerFields: Field[] = [
    {
      name: 'dealerId',
      label: 'Dealer ID',
      type: 'text',
      required: true,
      placeholder: 'e.g., DLR-001',
    },
    {
      name: 'name',
      label: 'Dealer Name',
      type: 'text',
      required: true,
      placeholder: 'Enter dealer name',
    },
    {
      name: 'cellNo',
      label: 'Cell No.',
      type: 'text',
      required: true,
      placeholder: '0330-1234567',
    },
    {
      name: 'area',
      label: 'Area',
      type: 'select',
      required: true,
      searchable: true,
      options: areas.map((a: any) => ({ label: a.name, value: a.name })),
    },
    {
      name: 'commission',
      label: 'Commission',
      type: 'select',
      required: true,
      options: [
        { label: '5%', value: '5%' },
        { label: '10%', value: '10%' },
        { label: '15%', value: '15%' },
        { label: '20%', value: '20%' },
        { label: '25%', value: '25%' },
        { label: '30%', value: '30%' },
      ],
    },
    {
      name: 'address',
      label: 'Address',
      type: 'text',
      placeholder: 'Dealer address',
    },
    {
      name: 'openingBalance',
      label: 'Opening Balance (Rs.)',
      type: 'text',
      placeholder: '0',
    },
    {
      name: 'remarks',
      label: 'Remarks',
      type: 'textarea',
      placeholder: 'Additional notes...',
    },
  ];

  const transformDealerData = (data: any) => ({
    dealerId: data.dealerId,
    name: data.name,
    cellNo: data.cellNo,
    area: data.area,
    commission: data.commission || '10%',
    address: data.address || data.area,
    openingBalance: parseFloat(data.openingBalance) || 0,
    remarks: data.remarks || '',
  });

  const handleDealerAdded = (data: any) => {
    toast.success(`${data.name} added successfully!`);
    fetchAllData();
  };

  // ============================================================
  // COLOR HELPERS
  // ============================================================
  const getRecoveryColor = (recovery: number) => {
    if (recovery >= 80) return 'bg-green-500';
    if (recovery >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRecoveryTextColor = (recovery: number) => {
    if (recovery >= 80) return 'text-green-600 dark:text-green-400';
    if (recovery >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    );
  }

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
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/dealer-payments')}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Dealer Payments
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-500/25"
            >
              <UserPlus className="h-4 w-4" />
              Add Dealer
            </button>
          </div>
        </div>

        {/* Stats - 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Dealers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  TOTAL DEALERS
                </p>
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

          {/* Total Billing */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  TOTAL PAID (BILLING)
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  Rs. {totalBilling.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Paid to dealers
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Received */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  TOTAL RECEIVED
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  Rs. {totalReceived.toLocaleString()}
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

          {/* Outstanding */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  OUTSTANDING
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  Rs. {totalOutstanding.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Commission: Rs. {totalCommission.toLocaleString()}
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
          placeholder="Search dealer by name, ID or area..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Dealer Recovery Position */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
              Dealer Recovery Position
            </h2>

            {filteredStats.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                No dealers found
              </p>
            ) : (
              <div className="space-y-4">
                {filteredStats.map((dealer) => (
                  <div key={dealer.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {dealer.name}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          ({dealer.area})
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            'text-sm font-bold',
                            getRecoveryTextColor(dealer.recovery)
                          )}
                        >
                          {dealer.recovery}%
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Rs. {dealer.received.toLocaleString()} / Rs.{' '}
                          {dealer.billing.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          getRecoveryColor(dealer.recovery)
                        )}
                        style={{
                          width: `${Math.min(dealer.recovery, 100)}%`,
                        }}
                      />
                    </div>
                    {dealer.outstanding > 0 && (
                      <p className="text-xs text-red-500 text-right">
                        Outstanding: Rs. {dealer.outstanding.toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
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
                <span className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                  <UserPlus className="h-4 w-4" />
                  Add Dealer
                </span>
                <ChevronRight className="h-4 w-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => router.push('/dealer-payments')}
                className="w-full flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors group"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                  <CreditCard className="h-4 w-4" />
                  Receive Payment
                </span>
                <ChevronRight className="h-4 w-4 text-green-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => router.push('/dealer-payments')}
                className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors group"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                  <PlusCircle className="h-4 w-4" />
                  Add Payment
                </span>
                <ChevronRight className="h-4 w-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => router.push('/area2')}
                className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors group"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                  <Truck className="h-4 w-4" />
                  Manage Areas
                </span>
                <ChevronRight className="h-4 w-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
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
          endpoint="/dealers"
          transformData={transformDealerData}
          context={{ areas }}
        />
      </div>
    </Layout>
  );
}
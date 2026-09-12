'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  Receipt,
  Printer,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function DealerPaymentsPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);

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

      const [paymentsRes, dealersRes] = await Promise.all([
        api.get('/dealer-payments'),
        api.get('/dealers?limit=1000'),
      ]);

      if (paymentsRes.data.success) {
        const formattedPayments = paymentsRes.data.payments.map((payment: any) => ({
          id: payment._id,
          receipt: payment.receiptNo || 'N/A',
          dealer: payment.dealer?.name || 'Unknown',
          dealerId: payment.dealer?.dealerId || '',
          dealerCommission: payment.dealer?.commission || '0%',
          area: payment.dealer?.area?.name || 'N/A',
          month: payment.month || 'N/A',
          date: payment.paymentDate
            ? new Date(payment.paymentDate).toLocaleDateString('en-PK', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : 'N/A',
          method: payment.paymentMethod
            ? payment.paymentMethod
                .replace('_', ' ')
                .replace(/\b\w/g, (l: string) => l.toUpperCase())
            : 'N/A',
          amount: payment.amount || 0,
          paymentType: payment.paymentType || 'receive_payment',
          paymentFor: payment.paymentFor || '',
          commission: payment.commission || 0,
          commissionRate: payment.commissionRate || '',
          rawDate: payment.paymentDate,
        }));
        setPayments(formattedPayments);
      }

      if (dealersRes.data.success) {
        setDealers(dealersRes.data.dealers || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // ============ COMMON ============
  const uniqueAreas: string[] = Array.from(
    new Set<string>(
      dealers
        .map((d: any) => d.area?.name || d.area)
        .filter((a: any): a is string => Boolean(a))
    )
  ).sort();

  const monthOptions = [
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
  ].map((m) => ({
    label: `${m} ${new Date().getFullYear()}`,
    value: `${m} ${new Date().getFullYear()}`,
  }));

  // ✅ Unique receipt generator for Receive Payment
  const generateReceiveReceiptNo = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}`;

    const todayReceipts = payments.filter(
      (p) =>
        p.paymentType === 'receive_payment' &&
        p.receipt &&
        p.receipt.startsWith(`DR-${dateStr}`)
    ).length;

    const sequence = todayReceipts + 1;
    const seqStr = String(sequence).padStart(3, '0');

    return `DR-${dateStr}-${seqStr}`;
  };

  // ============================================================
  // ADD PAYMENT FIELDS
  // ============================================================
  const addPaymentFields: Field[] = [
    {
      name: 'area',
      label: 'Area',
      type: 'select',
      required: true,
      searchable: true,
      options: uniqueAreas.map((a: any) => ({ label: a, value: a })),
    },
    {
      name: 'dealerId',
      label: 'Dealer ID',
      type: 'select',
      required: true,
      searchable: true,
      options: dealers.map((d: any) => ({
        label: `${d.dealerId} - ${d.name}`,
        value: d.dealerId,
      })),
    },
    {
      name: 'dealerName',
      label: 'Dealer Name',
      type: 'text',
      readOnly: true,
      placeholder: 'Auto-filled from Dealer ID',
      dependsOn: 'dealerId',
      updateOnChange: (dealerId: string, _fd: any, context: any) => {
        const list = context?.dealers || dealers;
        const dealer = list.find((d: any) => d.dealerId === dealerId);
        return dealer?.name || '';
      },
    },
    {
      name: 'month',
      label: 'Billing Month',
      type: 'select',
      required: true,
      options: monthOptions,
    },
    {
      name: 'amount',
      label: 'Payment Amount (Rs.)',
      type: 'number',
      required: true,
      placeholder: '10000',
    },
    {
      name: 'receiptNo',
      label: 'Billing Portal Receipt No.',
      type: 'text',
      required: true,
      placeholder: 'Enter receipt no.',
    },
    {
      name: 'paymentDate',
      label: 'Payment Date',
      type: 'date',
    },
    {
      name: 'paymentMethod',
      label: 'Payment Method',
      type: 'select',
      required: true,
      options: [
        { label: 'Cash', value: 'Cash' },
        { label: 'Bank Transfer', value: 'Bank Transfer' },
        { label: 'JazzCash', value: 'JazzCash' },
        { label: 'EasyPaisa', value: 'EasyPaisa' },
      ],
    },
    {
      name: 'remarks',
      label: 'Notes',
      type: 'textarea',
      placeholder: 'Reason or payment details',
    },
  ];

  // ============================================================
  // RECEIVE PAYMENT FIELDS
  // ============================================================
  const receivePaymentFields: Field[] = [
    {
      name: 'area',
      label: 'Area',
      type: 'select',
      required: true,
      searchable: true,
      options: uniqueAreas.map((a: any) => ({ label: a, value: a })),
    },
    {
      name: 'dealerId',
      label: 'Dealer ID',
      type: 'select',
      required: true,
      searchable: true,
      options: dealers.map((d: any) => ({
        label: `${d.dealerId} - ${d.name}`,
        value: d.dealerId,
      })),
    },
    {
      name: 'dealerName',
      label: 'Dealer Name',
      type: 'text',
      readOnly: true,
      placeholder: 'Auto-filled from Dealer ID',
      dependsOn: 'dealerId',
      updateOnChange: (dealerId: string, _fd: any, context: any) => {
        const list = context?.dealers || dealers;
        const dealer = list.find((d: any) => d.dealerId === dealerId);
        return dealer?.name || '';
      },
    },
    {
      name: 'month',
      label: 'Billing Month',
      type: 'select',
      required: true,
      options: monthOptions,
    },
    // ✅ Billing = (Add Payment total for month) − (already received for month)
    {
      name: 'billingAmount',
      label: 'Billing Amount (Rs.)',
      type: 'text',
      readOnly: true,
      placeholder: 'Auto-calculated',
      dependsOn: 'month',
      updateOnChange: (_month: string, formData: any, context: any) => {
        const dealerName = formData?.dealerName;
        const month = formData?.month;
        if (!dealerName || !month) return '0';

        const allPayments = context?.payments || [];

        const billing = allPayments
          .filter(
            (p: any) =>
              p.dealer === dealerName &&
              p.month === month &&
              p.paymentType === 'add_payment'
          )
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        const received = allPayments
          .filter(
            (p: any) =>
              p.dealer === dealerName &&
              p.month === month &&
              p.paymentType === 'receive_payment'
          )
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        return Math.max(0, billing - received).toLocaleString();
      },
    },
    // ✅ Previous Balance = unpaid from OTHER months (excludes the currently selected month)
    {
      name: 'previousBalance',
      label: 'Previous Balance (Rs.)',
      type: 'text',
      readOnly: true,
      placeholder: 'Auto-calculated',
      dependsOn: 'month', // ✅ changed from 'dealerName'
      updateOnChange: (_v: any, formData: any, context: any) => {
        const dealerName = formData?.dealerName;
        const month = formData?.month;
        if (!dealerName || !month) return '0';

        const allPayments = context?.payments || [];
        const dealerPayments = allPayments.filter(
          (p: any) => p.dealer === dealerName
        );

        const allMonths: string[] = Array.from(
          new Set<string>(dealerPayments.map((p: any) => p.month))
        );

        let prevBalance = 0;
        allMonths.forEach((m: string) => {
          // ✅ Skip the currently selected month — its balance goes in "Billing Amount"
          if (m === month) return;

          const billing = dealerPayments
            .filter(
              (p: any) => p.month === m && p.paymentType === 'add_payment'
            )
            .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

          const received = dealerPayments
            .filter(
              (p: any) => p.month === m && p.paymentType === 'receive_payment'
            )
            .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

          prevBalance += Math.max(0, billing - received);
        });

        return prevBalance.toLocaleString();
      },
    },
    {
      name: 'totalBalance',
      label: 'Total Balance (Rs.)',
      type: 'text',
      readOnly: true,
      placeholder: 'Auto-calculated',
      dependsOn: 'billingAmount',
      updateOnChange: (_v: any, formData: any) => {
        const prev =
          parseFloat(
            String(formData?.previousBalance || '0').replace(/,/g, '')
          ) || 0;
        const bill =
          parseFloat(
            String(formData?.billingAmount || '0').replace(/,/g, '')
          ) || 0;
        return (prev + bill).toLocaleString();
      },
    },
    {
      name: 'receiveAmount',
      label: 'Receive Amount (Rs.)',
      type: 'number',
      required: true,
      placeholder: '0',
    },
    {
      name: 'remainingBalance',
      label: 'Remaining Balance (Rs.)',
      type: 'text',
      readOnly: true,
      placeholder: 'Auto-calculated',
      dependsOn: 'receiveAmount',
      updateOnChange: (_v: any, formData: any) => {
        const total =
          parseFloat(
            String(formData?.totalBalance || '0').replace(/,/g, '')
          ) || 0;
        const received =
          parseFloat(String(formData?.receiveAmount || '0')) || 0;
        return Math.max(0, total - received).toLocaleString();
      },
    },
    {
      name: 'receiptNo',
      label: 'Dealer Receipt No.',
      type: 'text',
      required: true,
      readOnly: true,
      placeholder: 'Auto-generated',
      updateOnChange: () => generateReceiveReceiptNo(),
    },
    {
      name: 'paymentDate',
      label: 'Payment Date',
      type: 'date',
    },
    {
      name: 'paymentMethod',
      label: 'Payment Method',
      type: 'select',
      required: true,
      options: [
        { label: 'Cash', value: 'Cash' },
        { label: 'Bank Transfer', value: 'Bank Transfer' },
        { label: 'JazzCash', value: 'JazzCash' },
        { label: 'EasyPaisa', value: 'EasyPaisa' },
      ],
    },
    {
      name: 'collectedBy',
      label: 'Collector',
      type: 'select',
      options: [
        { label: 'Recovery Operator', value: 'Recovery Operator' },
        { label: 'System Admin', value: 'System Admin' },
        { label: 'Accountant', value: 'Accountant' },
      ],
    },
    {
      name: 'remarks',
      label: 'Notes',
      type: 'textarea',
      placeholder: 'Dealer payment details',
    },
  ];

  // ============ TRANSFORMERS ============
  const transformAddPayment = (data: any) => ({
    dealerId: data.dealerName,
    amount: parseFloat(data.amount) || 0,
    month: data.month,
    paymentMethod: data.paymentMethod,
    paymentType: 'add_payment',
    paymentDate: data.paymentDate,
    receiptNo: data.receiptNo,
    remarks: data.remarks || '',
  });

  const transformReceivePayment = (data: any) => ({
    dealerId: data.dealerName,
    amount: parseFloat(data.receiveAmount) || 0,
    month: data.month,
    paymentMethod: data.paymentMethod,
    paymentType: 'receive_payment',
    paymentDate: data.paymentDate,
    receiptNo: data.receiptNo,
    collectedBy: data.collectedBy,
    remarks: data.remarks || '',
  });

  const handlePaymentAdded = () => {
    toast.success('Payment recorded successfully!');
    fetchAllData();
  };

  // ============ COMPUTE STATUS ============
  const computedPayments = payments.map((p) => {
    if (p.paymentType === 'add_payment') {
      return { ...p, status: '—', billing: 0, received: 0, balance: 0 };
    }

    const billing = payments
      .filter(
        (x) =>
          x.dealer === p.dealer &&
          x.month === p.month &&
          x.paymentType === 'add_payment'
      )
      .reduce((sum, x) => sum + (x.amount || 0), 0);

    const received = payments
      .filter(
        (x) =>
          x.dealer === p.dealer &&
          x.month === p.month &&
          x.paymentType === 'receive_payment'
      )
      .reduce((sum, x) => sum + (x.amount || 0), 0);

    const balance = Math.max(0, billing - received);

    let status = 'pending';
    if (billing === 0) status = 'pending';
    else if (received >= billing) status = 'paid';
    else if (received > 0) status = 'partial';

    return { ...p, status, billing, received, balance };
  });

  const filteredPayments = computedPayments.filter((payment) => {
    const q = searchQuery.toLowerCase();
    return (
      payment.dealer?.toLowerCase().includes(q) ||
      payment.area?.toLowerCase().includes(q) ||
      payment.receipt?.toLowerCase().includes(q)
    );
  });

  const addPayments = filteredPayments.filter(
    (p) => p.paymentType === 'add_payment'
  );
  const receivePayments = filteredPayments.filter(
    (p) => p.paymentType === 'receive_payment'
  );

  // ============ STATS ============
  const totalDealers = dealers.length;
  const activeDealers = dealers.filter((d: any) => d.status === 'active').length;
  const totalReceived = payments
    .filter((p) => p.paymentType === 'receive_payment')
    .reduce((s, p) => s + (p.amount || 0), 0);
  const totalPaid = payments
    .filter((p) => p.paymentType === 'add_payment')
    .reduce((s, p) => s + (p.amount || 0), 0);
  const totalCommission = payments
    .filter((p) => p.paymentType === 'receive_payment')
    .reduce((s, p) => s + (p.commission || 0), 0);

  const stats = [
    {
      title: 'TOTAL DEALERS',
      value: totalDealers,
      subtitle: `${activeDealers} active`,
      icon: <Users className="h-6 w-6" />,
      color: 'purple',
    },
    {
      title: 'TOTAL PAID',
      value: `Rs. ${totalPaid.toLocaleString()}`,
      subtitle: 'To dealers',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'blue',
    },
    {
      title: 'TOTAL RECEIVED',
      value: `Rs. ${totalReceived.toLocaleString()}`,
      subtitle: 'From dealers',
      icon: <DollarSign className="h-6 w-6" />,
      color: 'green',
    },
    {
      title: 'COMMISSION EARNED',
      value: `Rs. ${totalCommission.toLocaleString()}`,
      subtitle: 'On received amount',
      icon: <AlertCircle className="h-6 w-6" />,
      color: 'red',
    },
  ];

  const handlePrint = (payment: any) => {
    toast.success(`Printing receipt ${payment.receipt}`);
  };

  // ============ TABLE COLUMNS ============
  const addColumns = [
    { key: 'receipt', header: 'Receipt' },
    {
      key: 'dealer',
      header: 'Dealer',
      render: (item: any) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {item.dealer}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {item.dealerId}
          </div>
        </div>
      ),
    },
    { key: 'area', header: 'Area' },
    { key: 'month', header: 'Month' },
    { key: 'date', header: 'Date' },
    { key: 'method', header: 'Method' },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: any) => (
        <span className="font-semibold text-purple-600">
          Rs. {(item.amount || 0).toLocaleString()}
        </span>
      ),
    },
  ];

  // ✅ Receive columns: "Received" shows THIS ROW's amount
  const receiveColumns = [
    { key: 'receipt', header: 'Receipt' },
    {
      key: 'dealer',
      header: 'Dealer',
      render: (item: any) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {item.dealer}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {item.dealerId}
          </div>
        </div>
      ),
    },
    { key: 'area', header: 'Area' },
    { key: 'month', header: 'Month' },
    {
      key: 'billing',
      header: 'Billing',
      render: (item: any) => `Rs. ${(item.billing || 0).toLocaleString()}`,
    },
    // ✅ Show THIS row's own received amount
    {
      key: 'amount',
      header: 'Received',
      render: (item: any) => (
        <span className="font-semibold text-green-600">
          Rs. {(item.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'commission',
      header: 'Commission',
      render: (item: any) => (
        <div>
          <span className="font-semibold text-blue-600">
            Rs. {(item.commission || 0).toLocaleString()}
          </span>
          {item.commissionRate && (
            <div className="text-xs text-gray-500">{item.commissionRate}</div>
          )}
        </div>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (item: any) => (
        <span
          className={cn(
            'font-semibold',
            item.balance === 0 ? 'text-green-600' : 'text-red-600'
          )}
        >
          Rs. {(item.balance || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => {
        const s = item.status;
        return (
          <span
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1',
              s === 'paid' &&
                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              s === 'partial' &&
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
              s === 'pending' &&
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}
          >
            {s === 'paid' && (
              <>
                <CheckCircle className="h-3 w-3" />
                Paid
              </>
            )}
            {s === 'partial' && (
              <>
                <Clock className="h-3 w-3" />
                Partial
              </>
            )}
            {s === 'pending' && (
              <>
                <XCircle className="h-3 w-3" />
                Pending
              </>
            )}
          </span>
        );
      },
    },
  ];

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
              <Receipt className="h-6 w-6 text-purple-600" />
              Dealer Accounts
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Separate dealer ledger, receivables and recovery report.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Add Payment
            </button>
            <button
              onClick={() => setIsReceiveModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-500/25"
            >
              <PlusCircle className="h-4 w-4" />
              Receive Payment from Dealer
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className={cn(
                'rounded-xl shadow-sm border p-5',
                i === 0
                  ? 'bg-gradient-to-br from-purple-700 to-purple-900 border-purple-800 text-white'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={cn(
                      'text-sm',
                      i === 0
                        ? 'text-purple-200'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {stat.title}
                  </p>
                  <p
                    className={cn(
                      'text-2xl font-bold mt-1',
                      i === 0 ? 'text-white' : 'text-gray-900 dark:text-white'
                    )}
                  >
                    {stat.value}
                  </p>
                  {stat.subtitle && (
                    <p
                      className={cn(
                        'text-xs mt-1',
                        i === 0
                          ? 'text-purple-200'
                          : stat.color === 'green'
                          ? 'text-green-600 dark:text-green-400'
                          : stat.color === 'red'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-400'
                      )}
                    >
                      {stat.subtitle}
                    </p>
                  )}
                </div>
                {i !== 0 && (
                  <div
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center',
                      iconBgMap[stat.color as keyof typeof iconBgMap]
                    )}
                  >
                    <span className={colorMap[stat.color as keyof typeof colorMap]}>
                      {stat.icon}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <SearchBar
          placeholder="Search dealer, area or receipt..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* ADD PAYMENT REPORT */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Add Payment Report (Paid to Dealers)
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {addPayments.length} records
            </span>
          </div>
          <div className="p-4">
            <DataTable
              data={addPayments}
              columns={addColumns}
              actions={[
                {
                  label: 'Print',
                  value: 'print',
                  icon: <Printer className="h-4 w-4" />,
                },
              ]}
              onAction={(item, action) => {
                if (action === 'print') handlePrint(item);
              }}
              accordionTitle="dealer"
              accordionSubtitle="receipt"
              emptyMessage="No add payments found"
            />
          </div>
        </div>

        {/* RECEIVE PAYMENT REPORT */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Receive Payment Report (From Dealers)
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {receivePayments.length} records
            </span>
          </div>
          <div className="p-4">
            <DataTable
              data={receivePayments}
              columns={receiveColumns}
              actions={[
                {
                  label: 'Print',
                  value: 'print',
                  icon: <Printer className="h-4 w-4" />,
                },
              ]}
              onAction={(item, action) => {
                if (action === 'print') handlePrint(item);
              }}
              accordionTitle="dealer"
              accordionSubtitle="receipt"
              emptyMessage="No receive payments found"
            />
          </div>
        </div>

        {/* ADD PAYMENT MODAL */}
        <AddUserModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handlePaymentAdded}
          title="Add Payment to Dealer"
          subtitle="Record payment made to dealer"
          fields={addPaymentFields}
          submitLabel="Save Record"
          color="purple"
          endpoint="/dealer-payments"
          transformData={transformAddPayment}
          context={{ dealers }}
        />

        {/* RECEIVE PAYMENT MODAL */}
        <AddUserModal
          isOpen={isReceiveModalOpen}
          onClose={() => setIsReceiveModalOpen(false)}
          onSuccess={handlePaymentAdded}
          title="Receive Payment from Dealer"
          subtitle="Record payment received from dealer"
          fields={receivePaymentFields}
          submitLabel="Save Record"
          color="green"
          endpoint="/dealer-payments"
          transformData={transformReceivePayment}
          context={{ dealers, payments }}
        />
      </div>
    </Layout>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/app/components/ui/Layout';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { DataTable } from '@/app/components/ui/DataTable';
import api from '@/app/lib/api';
import {
  PieChart,
  Printer,
  Eye,
  Filter,
  RefreshCw,
  FileText,
  DollarSign,
  Users,
  AlertCircle,
  TrendingUp,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState('All Reports');
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [toDate, setToDate] = useState(() => {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  });
  const [selectedArea, setSelectedArea] = useState('All Areas');
  const [areas, setAreas] = useState<string[]>(['All Areas']);

  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [modalType, setModalType] = useState<string>('');

  useEffect(() => {
    loadAreas();
    loadSummary();
  }, []);

  const loadAreas = async () => {
    try {
      const res = await api.get('/areas');
      if (res.data.success) {
        const names = (res.data.areas || []).map((a: any) => a.name);
        setAreas(['All Areas', ...names]);
      }
    } catch (e) {
      console.error('Areas fetch failed', e);
    }
  };

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await api.get('/reports/dashboard-summary');
      if (res.data.success) setSummary(res.data.summary);
    } catch (e) {
      console.error('Summary fetch failed', e);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchReport = async (type: string) => {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    if (selectedArea && selectedArea !== 'All Areas')
      params.append('area', selectedArea);

    const urls: Record<string, string> = {
      customer: `/reports/customers?${params.toString()}`,
      balance: `/reports/balance?${params.toString()}`,
      collection: `/reports/collection?${params.toString()}`,
      outstanding: `/reports/outstanding?${params.toString()}`,
      area: `/reports/areas`,
      package: `/reports/packages`,
      expense: `/reports/expenses?${params.toString()}`,
      profitLoss: `/reports/profit-loss?${params.toString()}`,
    };

    const url = urls[type];
    if (!url) {
      toast.error('Report coming soon');
      return null;
    }

    const res = await api.get(url);
    return res.data.report;
  };

  const handleViewReport = async (type: string, label: string) => {
    const deferred = [
      'dealerAccount',
      'dealerPayment',
      'opticalFiber',
      'userActivity',
    ];
    if (deferred.includes(type)) {
      toast('This report is coming soon', { icon: '🚧' });
      return;
    }

    setModalType(type);
    setModalTitle(label);
    setModalOpen(true);
    setModalLoading(true);
    setModalData(null);

    try {
      const data = await fetchReport(type);
      if (data) setModalData(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load report');
    } finally {
      setModalLoading(false);
    }
  };

  const reportCards = [
    {
      title: 'Customer Report',
      value: loadingSummary ? '—' : String(summary?.totalCustomers || 0),
      subtitle: loadingSummary
        ? 'Loading...'
        : `${summary?.activeCustomers || 0} active / ${summary?.inactiveCustomers || 0} inactive`,
      icon: <Users className="h-6 w-6" />,
      action: 'Live',
      color: 'blue',
    },
    {
      title: 'Collection Report',
      value: loadingSummary
        ? '—'
        : `Rs. ${(summary?.totalCollected || 0).toLocaleString()}`,
      subtitle: loadingSummary
        ? 'Loading...'
        : `Recovery ${summary?.recoveryRate || 0}%`,
      icon: <DollarSign className="h-6 w-6" />,
      action: summary?.monthLabel || 'This month',
      color: 'green',
    },
    {
      title: 'Outstanding Report',
      value: loadingSummary
        ? '—'
        : `Rs. ${(summary?.totalOutstanding || 0).toLocaleString()}`,
      subtitle: loadingSummary
        ? 'Loading...'
        : `${summary?.defaulterCount || 0} defaulters`,
      icon: <AlertCircle className="h-6 w-6" />,
      action: 'All-time',
      color: 'red',
    },
    {
      title: 'Profit / Loss',
      value: loadingSummary
        ? '—'
        : `Rs. ${(summary?.netProfit || 0).toLocaleString()}`,
      subtitle: loadingSummary
        ? 'Loading...'
        : summary?.isProfit
        ? 'Profit this month'
        : 'Loss this month',
      icon: <TrendingUp className="h-6 w-6" />,
      action: summary?.monthLabel || 'This month',
      color: summary?.isProfit === false ? 'red' : 'purple',
    },
  ];

  const availableReports = [
    {
      id: 1,
      type: 'customer',
      report: 'Customer Report',
      description: 'All customers with area, package, fee and status',
      filter: 'Area / Status',
    },
    {
      id: 2,
      type: 'balance',
      report: 'Balance Report',
      description: 'User previous balance, current bill and total outstanding',
      filter: 'Area / Status',
    },
    {
      id: 3,
      type: 'collection',
      report: 'Receive Payment Report',
      description: 'Customer payment collections, receipts and methods',
      filter: 'Date / Area',
    },
    {
      id: 4,
      type: 'area',
      report: 'Area Report',
      description: 'Area-wise users, billing, collection and outstanding',
      filter: 'Area',
    },
    {
      id: 5,
      type: 'package',
      report: 'Package Report',
      description: 'Package pricing, profit and customer count',
      filter: 'Package',
    },
    {
      id: 6,
      type: 'dealerAccount',
      report: 'Dealer Account Report',
      description: 'Dealer ledger, recovery and balance (coming soon)',
      filter: 'Dealer / Date',
    },
    {
      id: 7,
      type: 'dealerPayment',
      report: 'Dealer Payment Report',
      description: 'Paid to and received from dealers (coming soon)',
      filter: 'Dealer / Date',
    },
    {
      id: 8,
      type: 'expense',
      report: 'Expense Report',
      description: 'Purchases, expenses and category breakdown',
      filter: 'Category / Date',
    },
    {
      id: 9,
      type: 'opticalFiber',
      report: 'Optical Fiber Report',
      description: 'NOC feeds, routes and core allocation (coming soon)',
      filter: 'Area / Route',
    },
    {
      id: 10,
      type: 'userActivity',
      report: 'User Activity Report',
      description: 'Portal users, roles and access (coming soon)',
      filter: 'Role / Status',
    },
    {
      id: 11,
      type: 'profitLoss',
      report: 'Profit & Loss Report',
      description: 'Package profit + dealer commission − costs',
      filter: 'Date',
    },
  ];

  const reportTypes = [
    'All Reports',
    'Customer',
    'Collection',
    'Outstanding',
    'Expense',
    'Area',
    'Package',
    'P&L',
  ];

  const filteredReports = availableReports.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      r.report.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q);
    const matchType =
      selectedReport === 'All Reports' ||
      r.report.toLowerCase().includes(selectedReport.toLowerCase());
    return matchSearch && matchType;
  });

  const reportColumns = [
    { key: 'report', header: 'Report' },
    { key: 'description', header: 'Description' },
    { key: 'filter', header: 'Filter' },
  ];

  const handleApplyFilter = () => {
    toast.success('Filters applied');
    loadSummary();
  };

  const handleResetFilter = () => {
    setSelectedReport('All Reports');
    setSelectedArea('All Areas');
    setSearchQuery('');
    toast.success('Filters reset');
  };

  const renderReportBody = () => {
    if (modalLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      );
    }

    if (!modalData) {
      return (
        <div className="text-center py-8 text-gray-500">No data available</div>
      );
    }

    // -------- Customer --------
    if (modalType === 'customer') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total" value={modalData.total} />
            <Stat label="Active" value={modalData.active} tone="green" />
            <Stat label="Inactive" value={modalData.inactive} tone="red" />
          </div>
          <SimpleTable
            head={['ID', 'Name', 'Area', 'Package', 'Fee', 'Status']}
            rows={modalData.customers?.map((c: any) => [
              c.customerId || c.code || 'N/A',
              c.name,
              c.area?.name || 'N/A',
              c.package || 'N/A',
              `Rs. ${(c.monthlyFee || 0).toLocaleString()}`,
              c.status,
            ]) || []}
          />
        </div>
      );
    }

    // -------- Balance --------
    if (modalType === 'balance') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="Expected"
              value={`Rs. ${(modalData.totals?.totalExpected || 0).toLocaleString()}`}
            />
            <Stat
              label="Received"
              value={`Rs. ${(modalData.totals?.totalPaid || 0).toLocaleString()}`}
              tone="green"
            />
            <Stat
              label="Outstanding"
              value={`Rs. ${(modalData.totals?.outstanding || 0).toLocaleString()}`}
              tone="red"
            />
          </div>
          <SimpleTable
            head={[
              'ID',
              'Name',
              'Area',
              'Monthly',
              'Months',
              'Expected',
              'Paid',
              'Balance',
            ]}
            rows={
              modalData.rows?.map((r: any) => [
                r.customerId,
                r.name,
                r.area,
                `Rs. ${r.monthlyFee.toLocaleString()}`,
                r.activeMonths,
                `Rs. ${r.totalExpected.toLocaleString()}`,
                `Rs. ${r.totalPaid.toLocaleString()}`,
                `Rs. ${r.outstanding.toLocaleString()}`,
              ]) || []
            }
          />
        </div>
      );
    }

    // -------- Collection --------
    if (modalType === 'collection') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Total"
              value={`Rs. ${(modalData.total || 0).toLocaleString()}`}
            />
            <Stat label="Payments" value={modalData.count || 0} />
          </div>
          <SimpleTable
            head={['Receipt', 'Customer', 'Area', 'Month', 'Method', 'Amount']}
            rows={
              modalData.payments?.map((p: any) => [
                p.receiptNo,
                p.customer?.name || 'N/A',
                p.customer?.area?.name || 'N/A',
                p.month,
                p.paymentMethod,
                `Rs. ${(p.amount || 0).toLocaleString()}`,
              ]) || []
            }
          />
        </div>
      );
    }

    // -------- Outstanding --------
    if (modalType === 'outstanding') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Total Outstanding"
              value={`Rs. ${(modalData.totalOutstanding || 0).toLocaleString()}`}
              tone="red"
            />
            <Stat label="Defaulters" value={modalData.totalCustomers || 0} />
          </div>
          <SimpleTable
            head={['ID', 'Name', 'Area', 'Monthly', 'Outstanding']}
            rows={
              modalData.customers?.map((c: any) => [
                c.customerId,
                c.name,
                c.area,
                `Rs. ${c.monthlyFee.toLocaleString()}`,
                `Rs. ${c.outstanding.toLocaleString()}`,
              ]) || []
            }
          />
        </div>
      );
    }

    // -------- Area --------
    if (modalType === 'area') {
      return (
        <SimpleTable
          head={[
            'Area',
            'Customers',
            'Total Bill',
            'Recovered',
            'Outstanding',
            'Recovery %',
          ]}
          rows={
            modalData.rows?.map((r: any) => [
              r.area,
              r.customers,
              `Rs. ${r.totalBill.toLocaleString()}`,
              `Rs. ${r.recovered.toLocaleString()}`,
              `Rs. ${r.outstanding.toLocaleString()}`,
              `${r.recovery}%`,
            ]) || []
          }
        />
      );
    }

    // -------- Package --------
    if (modalType === 'package') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="Total Revenue"
              value={`Rs. ${(modalData.totals?.totalRevenue || 0).toLocaleString()}`}
              tone="green"
            />
            <Stat
              label="Total Cost"
              value={`Rs. ${(modalData.totals?.totalCost || 0).toLocaleString()}`}
            />
            <Stat
              label="Total Profit"
              value={`Rs. ${(modalData.totals?.totalProfit || 0).toLocaleString()}`}
              tone="green"
            />
          </div>
          <SimpleTable
            head={[
              'Package',
              'Bandwidth',
              'Sell',
              'Cost',
              'Customers',
              'Revenue',
              'Profit',
            ]}
            rows={
              modalData.rows?.map((r: any) => [
                r.name,
                r.bandwidth,
                `Rs. ${r.sellingPrice.toLocaleString()}`,
                `Rs. ${r.purchasePrice.toLocaleString()}`,
                r.customerCount,
                `Rs. ${r.totalRevenue.toLocaleString()}`,
                `Rs. ${r.totalProfit.toLocaleString()}`,
              ]) || []
            }
          />
        </div>
      );
    }

    // -------- Expense --------
    if (modalType === 'expense') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="Total"
              value={`Rs. ${(modalData.total || 0).toLocaleString()}`}
            />
            <Stat
              label="Purchases"
              value={`Rs. ${(modalData.totalPurchases || 0).toLocaleString()}`}
            />
            <Stat
              label="Expenses"
              value={`Rs. ${(modalData.totalExpenses || 0).toLocaleString()}`}
            />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-2">
              Expenses
            </h4>
            <SimpleTable
              head={['No', 'Category', 'Description', 'Amount', 'Date']}
              rows={
                modalData.expenses?.map((e: any) => [
                  e.expenseNo,
                  e.category,
                  e.description || '',
                  `Rs. ${(e.amount || 0).toLocaleString()}`,
                  new Date(e.date).toLocaleDateString(),
                ]) || []
              }
            />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-2">
              Purchases
            </h4>
            <SimpleTable
              head={['No', 'Vendor', 'Item', 'Qty', 'Amount', 'Date']}
              rows={
                modalData.purchases?.map((p: any) => [
                  p.purchaseNo,
                  p.vendor,
                  p.item,
                  p.quantity,
                  `Rs. ${(p.amount || 0).toLocaleString()}`,
                  new Date(p.purchaseDate).toLocaleDateString(),
                ]) || []
              }
            />
          </div>
        </div>
      );
    }

    // -------- Profit & Loss --------
    if (modalType === 'profitLoss') {
      const d = modalData;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat
              label="Package Profit"
              value={`Rs. ${(d.totalPackageProfit || 0).toLocaleString()}`}
              tone="green"
            />
            <Stat
              label="Commission Profit"
              value={`Rs. ${(d.totalCommissionProfit || 0).toLocaleString()}`}
              tone="green"
            />
            <Stat
              label="Total Costs"
              value={`Rs. ${(d.totalCosts || 0).toLocaleString()}`}
              tone="red"
            />
            <Stat
              label={d.isProfit ? 'Net Profit' : 'Net Loss'}
              value={`Rs. ${Math.abs(d.netProfit || 0).toLocaleString()}`}
              tone={d.isProfit ? 'green' : 'red'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20">
              <h4 className="text-xs uppercase text-green-700 dark:text-green-400 font-semibold mb-3">
                Profit Sources
              </h4>
              <Line label="Package Profit" value={d.totalPackageProfit} />
              <Line
                label="Dealer Commission"
                value={d.totalCommissionProfit}
              />
              <div className="border-t border-green-200 dark:border-green-800 mt-2 pt-2">
                <Line label="Gross Profit" value={d.grossProfit} bold />
              </div>
            </div>

            <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20">
              <h4 className="text-xs uppercase text-red-700 dark:text-red-400 font-semibold mb-3">
                Costs
              </h4>
              <Line label="Expenses" value={d.totalExpenses} />
              <Line label="Purchases" value={d.totalPurchases} />
              <div className="border-t border-red-200 dark:border-red-800 mt-2 pt-2">
                <Line label="Total Costs" value={d.totalCosts} bold />
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-2">
              Monthly Trend
            </h4>
            <SimpleTable
              head={[
                'Month',
                'Package Profit',
                'Commission',
                'Expenses',
                'Purchases',
                'Net Profit',
              ]}
              rows={
                d.monthlyBreakdown?.map((m: any) => [
                  m.month,
                  `Rs. ${m.packageProfit.toLocaleString()}`,
                  `Rs. ${m.commissionProfit.toLocaleString()}`,
                  `Rs. ${m.expenses.toLocaleString()}`,
                  `Rs. ${m.purchases.toLocaleString()}`,
                  `Rs. ${m.netProfit.toLocaleString()}`,
                ]) || []
              }
            />
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-2">
              Package Profit Breakdown ({d.paymentDetails?.length || 0} payments)
            </h4>
            <SimpleTable
              head={[
                'Receipt',
                'Customer',
                'Package',
                'Month',
                'Amount',
                'Profit',
              ]}
              rows={
                d.paymentDetails?.map((p: any) => [
                  p.receiptNo,
                  p.customer,
                  p.package,
                  p.month,
                  `Rs. ${p.amount.toLocaleString()}`,
                  `Rs. ${p.profit.toLocaleString()}`,
                ]) || []
              }
            />
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-2">
              Dealer Commission Breakdown ({d.commissionDetails?.length || 0} payments)
            </h4>
            <SimpleTable
              head={['Receipt', 'Dealer', 'Rate', 'Amount', 'Commission']}
              rows={
                d.commissionDetails?.map((c: any) => [
                  c.receiptNo,
                  c.dealer,
                  c.rate,
                  `Rs. ${c.amount.toLocaleString()}`,
                  `Rs. ${c.commission.toLocaleString()}`,
                ]) || []
              }
            />
          </div>
        </div>
      );
    }

    return (
      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
        {JSON.stringify(modalData, null, 2)}
      </pre>
    );
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PieChart className="h-6 w-6 text-blue-600" />
              Reports Center
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View, print and export complete business reports.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadSummary}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw
                className={cn('h-4 w-4', loadingSummary && 'animate-spin')}
              />
              Refresh
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Report Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Report Type
              </label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {reportTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Area
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleApplyFilter}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Apply Filter
            </button>
            <button
              onClick={handleResetFilter}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportCards.map((card, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={cn(
                    'p-2 rounded-lg',
                    card.color === 'blue' && 'bg-blue-50 text-blue-600',
                    card.color === 'green' && 'bg-green-50 text-green-600',
                    card.color === 'red' && 'bg-red-50 text-red-600',
                    card.color === 'purple' && 'bg-purple-50 text-purple-600'
                  )}
                >
                  {card.icon}
                </span>
                <span className="text-xs text-gray-400">{card.action}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {card.title}
              </h3>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {card.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {card.subtitle}
              </p>
            </div>
          ))}
        </div>

        {/* Available Reports */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Available Reports
            </h2>
            <div className="max-w-xs w-full">
              <SearchBar
                placeholder="Search reports..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
          </div>
          <div className="p-4">
            <DataTable
              data={filteredReports}
              columns={reportColumns}
              actions={[
                {
                  label: 'View',
                  value: 'view',
                  icon: <Eye className="h-4 w-4" />,
                },
              ]}
              onAction={(item, action) => {
                if (action === 'view') {
                  handleViewReport(item.type, item.report);
                }
              }}
              accordionTitle="report"
              accordionSubtitle="description"
              emptyMessage="No reports found"
            />
          </div>
        </div>

        {/* Report Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-950/30">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    {modalTitle}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {fromDate} → {toDate}
                    {selectedArea !== 'All Areas' && ` • ${selectedArea}`}
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                {renderReportBody()}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ============ LOCAL COMPONENTS ============

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: any;
  tone?: 'green' | 'red';
}) {
  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
        {label}
      </p>
      <p
        className={cn(
          'text-lg font-bold mt-1',
          tone === 'green' && 'text-green-600',
          tone === 'red' && 'text-red-600',
          !tone && 'text-gray-900 dark:text-white'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Line({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-600 dark:text-gray-300">{label}</span>
      <span className={cn('font-medium', bold && 'font-bold')}>
        Rs. {(value || 0).toLocaleString()}
      </span>
    </div>
  );
}

function SimpleTable({
  head,
  rows,
}: {
  head: string[];
  rows: any[][];
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
        No records
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {head.map((h) => (
              <th
                key={h}
                className="py-2 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="py-2 px-3 text-gray-800 dark:text-gray-200 whitespace-nowrap"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { DataTable } from '@/app/components/ui/DataTable';
import { 
  PieChart, 
  Download, 
  Printer, 
  Eye,
  Filter,
  Calendar,
  RefreshCw,
  FileText,
  DollarSign,
  Users,
  AlertCircle,
  TrendingUp,
  Package,
  Truck,
  CreditCard,
  Wifi,
  UserCheck
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState('All Reports');
  const [fromDate, setFromDate] = useState('2026-09-01');
  const [toDate, setToDate] = useState('2026-09-30');
  const [selectedArea, setSelectedArea] = useState('All Areas');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  // Report cards data
  const reportCards = [
    {
      title: 'Customer Report',
      value: '1,248',
      subtitle: 'Active / inactive customer list',
      icon: <Users className="h-6 w-6" />,
      action: 'CSV / Print',
      color: 'blue',
    },
    {
      title: 'Collection Report',
      value: 'Rs. 1,435,500',
      subtitle: 'Daily and monthly receipts',
      icon: <DollarSign className="h-6 w-6" />,
      action: 'Recovery 76.7%',
      color: 'green',
    },
    {
      title: 'Outstanding Report',
      value: 'Rs. 436,500',
      subtitle: '287 unpaid customers',
      icon: <AlertCircle className="h-6 w-6" />,
      action: 'Status Due',
      color: 'red',
    },
    {
      title: 'Expense Report',
      value: 'Rs. 382,000',
      subtitle: 'Monthly business expenses',
      icon: <FileText className="h-6 w-6" />,
      action: 'Month Sep 2026',
      color: 'purple',
    },
  ];

  // Available reports table data
  const availableReports = [
    {
      id: 1,
      report: 'Customer Report',
      description: 'All customers with area, package, fee and status',
      filter: 'Area / Status',
    },
    {
      id: 2,
      report: 'Balance Report',
      description: 'User previous balance, current bill and total outstanding balance',
      filter: 'Date / Area / Balance',
    },
    {
      id: 3,
      report: 'Receive Payment Report',
      description: 'Customer payment collections, receipt numbers and payment methods',
      filter: 'Date / Area / Staff',
    },
    {
      id: 4,
      report: 'Area Report',
      description: 'Area-wise users, billing, collection and outstanding balances',
      filter: 'Date / Area',
    },
    {
      id: 5,
      report: 'Package Report',
      description: 'Package bandwidth, purchase price, selling price and profit',
      filter: 'Package / Date',
    },
    {
      id: 6,
      report: 'Dealer Account Report',
      description: 'Dealer opening, billing, received, balance and recovery',
      filter: 'Dealer / Date',
    },
    {
      id: 7,
      report: 'Dealer Payment Report',
      description: 'Payments made to and received from dealers',
      filter: 'Dealer / Date',
    },
    {
      id: 8,
      report: 'Expense Report',
      description: 'Feed charges, salary, maintenance and other expenses',
      filter: 'Category / Date',
    },
    {
      id: 9,
      report: 'Optical Fiber Report',
      description: 'NOC feeds, area routes, dealer links and core allocation',
      filter: 'Area / Route',
    },
    {
      id: 10,
      report: 'User Activity Report',
      description: 'Portal users, roles and access status',
      filter: 'Role / Status',
    },
  ];

  // Area-wise recovery data
  const areaRecovery = [
    { area: 'Gulshan Block 1', customers: 340, totalBill: 510000, recovered: 410000, outstanding: 100000, recovery: 80.4 },
    { area: 'Model Colony', customers: 285, totalBill: 427500, recovered: 325500, outstanding: 102000, recovery: 76.1 },
    { area: 'Green Town', customers: 229, totalBill: 343500, recovered: 270000, outstanding: 73500, recovery: 78.6 },
    { area: 'New Market', customers: 194, totalBill: 291000, recovered: 205000, outstanding: 86000, recovery: 70.4 },
  ];

  // Calculate totals
  const totalBilling = areaRecovery.reduce((sum, a) => sum + a.totalBill, 0);
  const totalRecovered = areaRecovery.reduce((sum, a) => sum + a.recovered, 0);
  const totalOutstanding = areaRecovery.reduce((sum, a) => sum + a.outstanding, 0);
  const avgRecovery = totalBilling > 0 ? ((totalRecovered / totalBilling) * 100).toFixed(1) : 0;

  const reportTypes = ['All Reports', 'Customer', 'Collection', 'Outstanding', 'Expense', 'Area', 'Dealer'];
  const areas = ['All Areas', 'Gulshan Block 1', 'Model Colony', 'Green Town', 'New Market'];
  const statuses = ['All Status', 'Active', 'Inactive', 'Expired', 'Default'];

  const filteredReports = availableReports.filter(report => {
    const query = searchQuery.toLowerCase();
    return (
      report.report.toLowerCase().includes(query) ||
      report.description.toLowerCase().includes(query)
    );
  });

  const reportColumns = [
    { key: 'report', header: 'Report' },
    { key: 'description', header: 'Description' },
    { key: 'filter', header: 'Filter' },
  ];

  const areaColumns = [
    { key: 'area', header: 'Area' },
    { key: 'customers', header: 'Customers' },
    { 
      key: 'totalBill', 
      header: 'Total Bill',
      render: (item: any) => `Rs. ${item.totalBill.toLocaleString()}`
    },
    { 
      key: 'recovered', 
      header: 'Recovered',
      render: (item: any) => `Rs. ${item.recovered.toLocaleString()}`
    },
    { 
      key: 'outstanding', 
      header: 'Outstanding',
      render: (item: any) => `Rs. ${item.outstanding.toLocaleString()}`
    },
    { 
      key: 'recovery', 
      header: 'Recovery %',
      render: (item: any) => (
        <span className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          item.recovery >= 80 ? 'bg-green-100 text-green-700' : 
          item.recovery >= 70 ? 'bg-yellow-100 text-yellow-700' : 
          'bg-red-100 text-red-700'
        )}>
          {item.recovery}%
        </span>
      )
    },
  ];

  const handleViewReport = (report: string) => {
    toast.success(`Loading ${report}...`);
  };

  const handleApplyFilter = () => {
    toast.success('Filters applied successfully!');
  };

  const handleResetFilter = () => {
    setSelectedReport('All Reports');
    setSelectedArea('All Areas');
    setSelectedStatus('All Status');
    toast.success('Filters reset');
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
              onClick={() => toast.success('Exporting all reports...')}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/25"
            >
              <Download className="h-4 w-4" />
              Export All
            </button>
            <button
              onClick={() => toast.success('Printing reports...')}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>

        {/* Report Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Report Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Report Type</label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {reportTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Area</label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {areas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleApplyFilter}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Apply Filter
            </button>
            <button
              onClick={handleResetFilter}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
              Showing all reports for {new Date(fromDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })} to {new Date(toDate).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportCards.map((card, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className={cn(
                  'p-2 rounded-lg',
                  card.color === 'blue' && 'bg-blue-50 text-blue-600',
                  card.color === 'green' && 'bg-green-50 text-green-600',
                  card.color === 'red' && 'bg-red-50 text-red-600',
                  card.color === 'purple' && 'bg-purple-50 text-purple-600',
                )}>
                  {card.icon}
                </span>
                <span className="text-xs text-gray-400">{card.action}</span>
              </div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</h3>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Area-wise Recovery Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Area-wise Recovery Summary
            </h2>
          </div>
          <div className="p-4">
            <DataTable
              data={areaRecovery}
              columns={areaColumns}
              emptyMessage="No data found"
            />
          </div>
        </div>

        {/* Available Reports Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Available Reports
            </h2>
            <SearchBar
              placeholder="Search reports..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="max-w-xs"
            />
          </div>
          <div className="p-4">
            <DataTable
              data={filteredReports}
              columns={reportColumns}
              actions={[
                { label: 'View', value: 'view', icon: <Eye className="h-4 w-4" /> },
              ]}
              onAction={(item, action) => {
                if (action === 'view') {
                  handleViewReport(item.report);
                }
              }}
              accordionTitle="report"
              accordionSubtitle="description"
              emptyMessage="No reports found matching your search"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
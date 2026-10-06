'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import api from '@/app/lib/api';

import {
  PieChart,
  Printer,
  Filter,
  RefreshCw,
  DollarSign,
  Users,
  AlertCircle,
  TrendingUp,
  Loader2,
  Search,
  User,
  Building2,
  Download,
  FileText,
} from 'lucide-react';

import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = '' | 'userPayment' | 'dealerPayment';

export default function ReportsPage() {
  // ============================================================
  // FILTER STATES
  // ============================================================

  const [selectedReport, setSelectedReport] =
    useState<ReportType>('');

  const [selectedId, setSelectedId] = useState('');

  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-01`;
  });

  const [toDate, setToDate] = useState(() => {
    const now = new Date();

    const last = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    );

    return `${last.getFullYear()}-${String(
      last.getMonth() + 1
    ).padStart(2, '0')}-${String(
      last.getDate()
    ).padStart(2, '0')}`;
  });

  // ============================================================
  // DASHBOARD STATES
  // ============================================================

  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // ============================================================
  // USER / DEALER STATES
  // ============================================================

  const [customers, setCustomers] = useState<any[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);

  // ============================================================
  // REPORT STATES
  // ============================================================

  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadSummary();
    loadCustomers();
    loadDealers();
  }, []);

  // ============================================================
  // LOAD DASHBOARD SUMMARY
  // ============================================================

  const loadSummary = async () => {
    setLoadingSummary(true);

    try {
      const res = await api.get('/reports/dashboard-summary');

      if (res.data?.success) {
        setSummary(res.data.summary);
      }
    } catch (error) {
      console.error('Summary fetch failed:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  // ============================================================
  // LOAD CUSTOMERS
  // ============================================================

  const loadCustomers = async () => {
    try {
      const res = await api.get('/customers?limit=10000');

      if (res.data?.success) {
        const list =
          res.data.customers ||
          res.data.data ||
          res.data.users ||
          res.data.results ||
          [];

        setCustomers(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error('Customers fetch failed:', error);
    }
  };

  // ============================================================
  // LOAD DEALERS
  // ============================================================

  const loadDealers = async () => {
    try {
      const res = await api.get('/dealers?limit=10000');

      if (res.data?.success) {
        const list =
          res.data.dealers ||
          res.data.data ||
          res.data.results ||
          [];

        setDealers(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error('Dealers fetch failed:', error);
    }
  };

  // ============================================================
  // REPORT TYPE CHANGE
  // ============================================================

  const handleReportTypeChange = (value: ReportType) => {
    setSelectedReport(value);

    // Reset selected user/dealer when report changes
    setSelectedId('');

    // Remove old generated report
    setReportData(null);
  };

  // ============================================================
  // GENERATE REPORT
  // ============================================================

  const generateReport = async () => {
    if (!selectedReport) {
      toast.error('Please select report type');
      return;
    }

    if (!selectedId) {
      toast.error(
        selectedReport === 'userPayment'
          ? 'Please select User ID'
          : 'Please select Dealer ID'
      );

      return;
    }

    if (!fromDate || !toDate) {
      toast.error('Please select From Date and To Date');
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      toast.error('From Date cannot be after To Date');
      return;
    }

    setReportLoading(true);
    setReportData(null);

    try {
      const params = new URLSearchParams({
        fromDate,
        toDate,
      });

      let url = '';

      if (selectedReport === 'userPayment') {
        url = `/reports/user-payment/${selectedId}?${params.toString()}`;
      }

      if (selectedReport === 'dealerPayment') {
        url = `/reports/dealer-payment/${selectedId}?${params.toString()}`;
      }

      const res = await api.get(url);

      if (res.data?.success) {
        setReportData(res.data.report);

        toast.success('Report generated successfully');
      } else {
        toast.error(res.data?.message || 'Failed to generate report');
      }
    } catch (error: any) {
      console.error('Generate report error:', error);

      toast.error(
        error?.response?.data?.message ||
          'Failed to generate report'
      );
    } finally {
      setReportLoading(false);
    }
  };

  // ============================================================
  // RESET FILTER
  // ============================================================

  const handleResetFilter = () => {
    setSelectedReport('');
    setSelectedId('');
    setReportData(null);

    const now = new Date();

    setFromDate(
      `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}-01`
    );

    const last = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    );

    setToDate(
      `${last.getFullYear()}-${String(
        last.getMonth() + 1
      ).padStart(2, '0')}-${String(
        last.getDate()
      ).padStart(2, '0')}`
    );

    toast.success('Filters reset');
  };

  // ============================================================
  // EXPORT PDF
  // ============================================================

  const exportPDF = () => {
    if (!reportData || !selectedReport) {
      toast.error('Generate report first');
      return;
    }

    const isUser = selectedReport === 'userPayment';

    const owner = isUser
      ? reportData.customer
      : reportData.dealer;

    const doc = new jsPDF('l', 'pt', 'a4');

    const pageWidth = doc.internal.pageSize.getWidth();

    // HEADER
    doc.setFillColor(214, 177, 56);

    doc.rect(0, 0, pageWidth, 75, 'F');

    doc.setTextColor(255, 255, 255);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);

    doc.text(
      isUser
        ? 'User Payment Report'
        : 'Dealer Payment Report',
      40,
      35
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    doc.text(
      `Period: ${fromDate} to ${toDate}`,
      40,
      55
    );

    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      pageWidth - 40,
      35,
      {
        align: 'right',
      }
    );

    doc.setTextColor(0, 0, 0);

    // ACCOUNT DETAILS
    if (isUser) {
      autoTable(doc, {
        startY: 95,

        head: [
          [
            'User ID',
            'Name',
            'Phone',
            'Area',
            'Package',
            'Status',
          ],
        ],

        body: [
          [
            owner?.customerId || '—',
            owner?.name || '—',
            owner?.phone || '—',
            owner?.area || '—',
            owner?.package || '—',
            owner?.status || '—',
          ],
        ],

        theme: 'grid',

        headStyles: {
          fillColor: [30, 41, 59],
        },

        styles: {
          fontSize: 9,
        },
      });
    } else {
      autoTable(doc, {
        startY: 95,

        head: [
          [
            'Dealer ID',
            'Name',
            'Cell No',
            'ISP',
            'Area',
            'Commission',
            'Status',
          ],
        ],

        body: [
          [
            owner?.dealerId || '—',
            owner?.name || '—',
            owner?.cellNo || '—',
            owner?.isp || '—',
            owner?.area || '—',
            owner?.commission || '—',
            owner?.status || '—',
          ],
        ],

        theme: 'grid',

        headStyles: {
          fillColor: [30, 41, 59],
        },

        styles: {
          fontSize: 9,
        },
      });
    }

    const nextY =
      (doc as any).lastAutoTable.finalY + 25;

    // PAYMENT TABLE
    if (isUser) {
      autoTable(doc, {
        startY: nextY,

        head: [
          [
            '#',
            'Receipt',
            'Month',
            'Date',
            'Method',
            'Amount',
            'Received By',
            'Remarks',
          ],
        ],

        body: (reportData.payments || []).map(
          (payment: any, index: number) => [
            index + 1,

            payment.receiptNo || '—',

            payment.month || '—',

            payment.paymentDate
              ? new Date(
                  payment.paymentDate
                ).toLocaleDateString()
              : '—',

            payment.method || '—',

            `Rs. ${Number(
              payment.amount || 0
            ).toLocaleString()}`,

            payment.receivedBy || '—',

            payment.remarks || '—',
          ]
        ),

        theme: 'striped',

        headStyles: {
          fillColor: [214, 177, 56],
        },

        styles: {
          fontSize: 8,
        },
      });
    } else {
      autoTable(doc, {
        startY: nextY,

        head: [
          [
            '#',
            'Receipt',
            'Month',
            'Date',
            'Type',
            'Method',
            'Amount',
            'Commission',
            'Collected / Paid By',
            'Remarks',
          ],
        ],

        body: (reportData.payments || []).map(
          (payment: any, index: number) => [
            index + 1,

            payment.receiptNo || '—',

            payment.month || '—',

            payment.paymentDate
              ? new Date(
                  payment.paymentDate
                ).toLocaleDateString()
              : '—',

            payment.paymentType === 'receive_payment'
              ? 'Received'
              : 'Added / Paid',

            String(
              payment.paymentMethod || '—'
            ).replace(/_/g, ' '),

            `Rs. ${Number(
              payment.amount || 0
            ).toLocaleString()}`,

            `Rs. ${Number(
              payment.commission || 0
            ).toLocaleString()}`,

            payment.collectedBy ||
              payment.paidBy ||
              payment.receivedBy ||
              '—',

            payment.remarks || '—',
          ]
        ),

        theme: 'striped',

        headStyles: {
          fillColor: [214, 177, 56],
        },

        styles: {
          fontSize: 8,
        },
      });
    }

    const fileId = isUser
      ? owner?.customerId
      : owner?.dealerId;

    doc.save(
      `${
        isUser
          ? 'User-Payment-Report'
          : 'Dealer-Payment-Report'
      }-${fileId || 'report'}.pdf`
    );

    toast.success('PDF downloaded');
  };

  // ============================================================
  // ORIGINAL STAT GRID
  // DO NOT CHANGE
  // ============================================================

  const reportCards = [
    {
      title: 'Customer Report',

      value: loadingSummary
        ? '—'
        : String(summary?.totalCustomers || 0),

      subtitle: loadingSummary
        ? 'Loading...'
        : `${summary?.activeCustomers || 0} active / ${
            summary?.inactiveCustomers || 0
          } inactive`,

      icon: <Users className="h-6 w-6" />,

      action: 'Live',

      color: 'blue',
    },

    {
      title: 'Collection Report',

      value: loadingSummary
        ? '—'
        : `Rs. ${(
            summary?.totalCollected || 0
          ).toLocaleString()}`,

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
        : `Rs. ${(
            summary?.totalOutstanding || 0
          ).toLocaleString()}`,

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
        : `Rs. ${(
            summary?.netProfit || 0
          ).toLocaleString()}`,

      subtitle: loadingSummary
        ? 'Loading...'
        : summary?.isProfit
        ? 'Profit this month'
        : 'Loss this month',

      icon: <TrendingUp className="h-6 w-6" />,

      action: summary?.monthLabel || 'This month',

      color:
        summary?.isProfit === false
          ? 'red'
          : 'amber',
    },
  ];

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <Layout>
      <div className="space-y-5">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PieChart className="h-6 w-6 text-[#d6b138]" />

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
                className={cn(
                  'h-4 w-4',
                  loadingSummary && 'animate-spin'
                )}
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

        {/* =====================================================
            REPORT FILTERS
        ===================================================== */}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">

          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-400" />

            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Report Filters
            </h2>
          </div>

          <div
            className={cn(
              'grid grid-cols-1 sm:grid-cols-2 gap-3',
              selectedReport
                ? 'lg:grid-cols-4'
                : 'lg:grid-cols-3'
            )}
          >

            {/* REPORT TYPE */}

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Report Type
              </label>

              <select
                value={selectedReport}
                onChange={(e) =>
                  handleReportTypeChange(
                    e.target.value as ReportType
                  )
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">
                  Select Report
                </option>

                <option value="userPayment">
                  User Payment Report
                </option>

                <option value="dealerPayment">
                  Dealer Payment Report
                </option>
              </select>
            </div>

            {/* =================================================
                USER ID
                ONLY APPEARS FOR USER PAYMENT
            ================================================= */}

            {selectedReport === 'userPayment' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  User ID
                </label>

                <SearchableAccountSelect
                  items={customers}
                  value={selectedId}
                  onChange={setSelectedId}
                  mode="user"
                />
              </div>
            )}

            {/* =================================================
                DEALER ID
                ONLY APPEARS FOR DEALER PAYMENT
            ================================================= */}

            {selectedReport === 'dealerPayment' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Dealer ID
                </label>

                <SearchableAccountSelect
                  items={dealers}
                  value={selectedId}
                  onChange={setSelectedId}
                  mode="dealer"
                />
              </div>
            )}

            {/* FROM DATE */}

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                From Date
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(e) =>
                  setFromDate(e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            {/* TO DATE */}

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                To Date
              </label>

              <input
                type="date"
                value={toDate}
                onChange={(e) =>
                  setToDate(e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* BUTTONS */}

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">

            <button
              onClick={generateReport}
              disabled={reportLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#d6b138] hover:bg-[#f7ce48] text-white rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {reportLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate Report
                </>
              )}
            </button>

            <button
              onClick={handleResetFilter}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Reset
            </button>
          </div>
        </div>

        {/* =====================================================
            ORIGINAL SUMMARY / STAT GRID
            UNCHANGED
        ===================================================== */}

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

                    card.color === 'blue' &&
                      'bg-blue-50 text-blue-600',

                    card.color === 'green' &&
                      'bg-green-50 text-green-600',

                    card.color === 'red' &&
                      'bg-red-50 text-red-600',

                    card.color === 'amber' &&
                      'bg-amber-50 text-[#d6b138]'
                  )}
                >
                  {card.icon}
                </span>

                <span className="text-xs text-gray-400">
                  {card.action}
                </span>
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

        {/* =====================================================
            REPORT LOADING
        ===================================================== */}

        {reportLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#d6b138] mx-auto" />

              <p className="text-sm text-gray-500 mt-3">
                Generating report...
              </p>
            </div>
          </div>
        )}

        {/* =====================================================
            GENERATED REPORT
        ===================================================== */}

        {!reportLoading &&
          reportData &&
          selectedReport && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

              {/* REPORT HEADER */}

              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {selectedReport === 'userPayment' ? (
                      <User className="h-5 w-5 text-[#d6b138]" />
                    ) : (
                      <Building2 className="h-5 w-5 text-[#d6b138]" />
                    )}

                    {selectedReport === 'userPayment'
                      ? 'User Payment Report'
                      : 'Dealer Payment Report'}
                  </h2>

                  <p className="text-xs text-gray-500 mt-1">
                    {fromDate} → {toDate}
                  </p>
                </div>

                <button
                  onClick={exportPDF}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#d6b138] hover:bg-[#f7ce48] text-white rounded-lg text-sm"
                >
                  <Download className="h-4 w-4" />

                  Export PDF
                </button>
              </div>

              {/* REPORT BODY */}

              <div className="p-5 space-y-4">
                <PaymentSummary
                  data={reportData}
                  isUser={
                    selectedReport === 'userPayment'
                  }
                />

                <PaymentTable
                  data={reportData}
                  isUser={
                    selectedReport === 'userPayment'
                  }
                />
              </div>
            </div>
          )}
      </div>
    </Layout>
  );
}

// ============================================================
// SEARCHABLE USER / DEALER SELECT
// ============================================================

function SearchableAccountSelect({
  items,
  value,
  onChange,
  mode,
}: {
  items: any[];
  value: string;
  onChange: (id: string) => void;
  mode: 'user' | 'dealer';
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = items.find(
    (item) => item._id === value
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items
      .filter((item) => {
        if (!q) {
          return true;
        }

        const accountId =
          mode === 'user'
            ? item.customerId || item.code || ''
            : item.dealerId || '';

        const phone =
          mode === 'user'
            ? item.phone || item.cellNo || ''
            : item.cellNo || '';

        const name = item.name || '';

        return (
          String(accountId)
            .toLowerCase()
            .includes(q) ||
          String(name)
            .toLowerCase()
            .includes(q) ||
          String(phone)
            .toLowerCase()
            .includes(q)
        );
      })
      .slice(0, 100);
  }, [items, query, mode]);

  const getId = (item: any) => {
    if (mode === 'user') {
      return (
        item.customerId ||
        item.code ||
        '—'
      );
    }

    return item.dealerId || '—';
  };

  const getPhone = (item: any) => {
    if (mode === 'user') {
      return (
        item.phone ||
        item.cellNo ||
        ''
      );
    }

    return item.cellNo || '';
  };

  return (
    <div className="relative">

      {/* SELECT BUTTON */}

      <button
        type="button"
        onClick={() =>
          setOpen((previous) => !previous)
        }
        className={cn(
          'w-full px-3 py-2 rounded-lg border text-left flex items-center justify-between',
          'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700',
          'text-gray-900 dark:text-white text-sm'
        )}
      >
        <span className="flex items-center gap-2 truncate">

          {mode === 'user' ? (
            <User className="h-4 w-4 text-gray-400 shrink-0" />
          ) : (
            <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
          )}

          <span className="truncate">
            {selected
              ? `${getId(selected)} — ${
                  selected.name || 'N/A'
                }`
              : mode === 'user'
              ? 'Select User ID'
              : 'Select Dealer ID'}
          </span>
        </span>

        <span className="text-xs text-gray-400 ml-2">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* DROPDOWN */}

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">

          {/* SEARCH */}

          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-md px-2">

              <Search className="h-4 w-4 text-gray-400 shrink-0" />

              <input
                autoFocus
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                placeholder={
                  mode === 'user'
                    ? 'Search User ID, name or phone...'
                    : 'Search Dealer ID, name or cell...'
                }
                className="w-full py-2 bg-transparent outline-none text-xs text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* LIST */}

          <div className="max-h-60 overflow-y-auto">

            {filtered.length === 0 ? (
              <div className="p-4 text-xs text-gray-500 text-center">
                No records found
              </div>
            ) : (
              filtered.map((item) => (
                <button
                  type="button"
                  key={item._id}
                  onClick={() => {
                    onChange(item._id);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'w-full px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0',

                    value === item._id &&
                      'bg-amber-50 dark:bg-amber-950/20'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-900 dark:text-white">
                        {getId(item)}
                      </div>

                      <div className="text-[11px] text-gray-500 truncate">
                        {item.name || 'N/A'}

                        {getPhone(item)
                          ? ` • ${getPhone(item)}`
                          : ''}
                      </div>
                    </div>

                    {value === item._id && (
                      <span className="text-[10px] font-medium text-[#d6b138]">
                        Selected
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAYMENT SUMMARY
// ============================================================

function PaymentSummary({
  data,
  isUser,
}: {
  data: any;
  isUser: boolean;
}) {
  const owner = isUser
    ? data.customer
    : data.dealer;

  const summary = data.summary || {};

  return (
    <>
      {/* =====================================================
          USER / DEALER INFORMATION
      ===================================================== */}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {isUser
              ? 'User Information'
              : 'Dealer Information'}
          </h3>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            <Info
              label={
                isUser
                  ? 'User ID'
                  : 'Dealer ID'
              }
              value={
                isUser
                  ? owner?.customerId
                  : owner?.dealerId
              }
            />

            <Info
              label="Name"
              value={owner?.name}
            />

            <Info
              label={
                isUser
                  ? 'Phone'
                  : 'Cell No'
              }
              value={
                isUser
                  ? owner?.phone
                  : owner?.cellNo
              }
            />

            <Info
              label="Area"
              value={owner?.area}
            />

            {isUser && (
              <>
                <Info
                  label="Package"
                  value={owner?.package}
                />

                <Info
                  label="Status"
                  value={owner?.status}
                />

                <Info
                  label="Address"
                  value={owner?.address}
                />
              </>
            )}

            {!isUser && (
              <>
                <Info
                  label="ISP"
                  value={owner?.isp}
                />

                <Info
                  label="Commission"
                  value={owner?.commission}
                />

                <Info
                  label="Status"
                  value={owner?.status}
                />

                <Info
                  label="Address"
                  value={owner?.address}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          PAYMENT SUMMARY CARDS
      ===================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

        {isUser ? (
          <>
            <Stat
              label="Monthly Fee"
              value={`Rs. ${Number(
                summary.monthlyFee || 0
              ).toLocaleString()}`}
            />

            <Stat
              label="Total Paid"
              value={`Rs. ${Number(
                summary.totalPaid || 0
              ).toLocaleString()}`}
              tone="green"
            />

            <Stat
              label="Outstanding"
              value={`Rs. ${Number(
                summary.outstanding || 0
              ).toLocaleString()}`}
              tone="red"
            />

            <Stat
              label="Payments"
              value={summary.paymentCount || 0}
            />
          </>
        ) : (
          <>
            <Stat
              label="Total Received"
              value={`Rs. ${Number(
                summary.totalReceived || 0
              ).toLocaleString()}`}
              tone="green"
            />

            <Stat
              label="Added / Paid"
              value={`Rs. ${Number(
                summary.totalAdded || 0
              ).toLocaleString()}`}
            />

            <Stat
              label="Commission"
              value={`Rs. ${Number(
                summary.totalCommission || 0
              ).toLocaleString()}`}
            />

            <Stat
              label="Transactions"
              value={summary.paymentCount || 0}
            />
          </>
        )}
      </div>
    </>
  );
}

// ============================================================
// PAYMENT TABLE
// ============================================================

function PaymentTable({
  data,
  isUser,
}: {
  data: any;
  isUser: boolean;
}) {
  const payments = data.payments || [];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Payment History
        </h3>

        <p className="text-xs text-gray-500 mt-0.5">
          {payments.length} transaction
          {payments.length !== 1 ? 's' : ''} found
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-sm">

          <thead>
            <tr className="bg-gray-50/70 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700">

              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                #
              </th>

              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                Receipt
              </th>

              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                Month
              </th>

              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                Date
              </th>

              {!isUser && (
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Type
                </th>
              )}

              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                Method
              </th>

              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                Amount
              </th>

              {!isUser && (
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Commission
                </th>
              )}

              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                {isUser
                  ? 'Received By'
                  : 'Collected / Paid By'}
              </th>

              <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                Remarks
              </th>
            </tr>
          </thead>

          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="py-10 px-3 text-center text-gray-500 dark:text-gray-400"
                >
                  No payment records found for selected date range.
                </td>
              </tr>
            ) : (
              payments.map(
                (payment: any, index: number) => (
                  <tr
                    key={payment._id || index}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                      {index + 1}
                    </td>

                    <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">
                      {payment.receiptNo || '—'}
                    </td>

                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                      {payment.month || '—'}
                    </td>

                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                      {payment.paymentDate
                        ? new Date(
                            payment.paymentDate
                          ).toLocaleDateString()
                        : '—'}
                    </td>

                    {!isUser && (
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            'inline-flex px-2 py-1 rounded-full text-[11px] font-medium',

                            payment.paymentType ===
                              'receive_payment'
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          )}
                        >
                          {payment.paymentType ===
                          'receive_payment'
                            ? 'Received'
                            : 'Added / Paid'}
                        </span>
                      </td>
                    )}

                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300 capitalize">
                      {String(
                        isUser
                          ? payment.method || '—'
                          : payment.paymentMethod || '—'
                      ).replace(/_/g, ' ')}
                    </td>

                    <td className="py-3 px-3 font-semibold text-gray-900 dark:text-white">
                      Rs.{' '}
                      {Number(
                        payment.amount || 0
                      ).toLocaleString()}
                    </td>

                    {!isUser && (
                      <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                        Rs.{' '}
                        {Number(
                          payment.commission || 0
                        ).toLocaleString()}
                      </td>
                    )}

                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                      {isUser
                        ? payment.receivedBy || '—'
                        : payment.collectedBy ||
                          payment.paidBy ||
                          payment.receivedBy ||
                          '—'}
                    </td>

                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400">
                      {payment.remarks || '—'}
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// INFO COMPONENT
// ============================================================

function Info({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
        {label}
      </p>

      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 break-words">
        {value || '—'}
      </p>
    </div>
  );
}

// ============================================================
// STAT COMPONENT
// ============================================================

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
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, User, Search, Download, Loader2 } from 'lucide-react';
import api from '@/app/lib/api';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Customer = {
  _id: string;
  name?: string;
  customerId?: string;
  phone?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
};

// ======================================================
// USER SEARCHABLE SELECT
// ======================================================
function UserSearchableSelect({
  customers,
  value,
  onChange,
  disabled = false,
}: {
  customers: Customer[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = customers.find((c) => c._id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 100);
    return customers
      .filter((c: any) => {
        const id = c.customerId || c.code || '';
        return (
          String(id).toLowerCase().includes(q) ||
          String(c.name || '').toLowerCase().includes(q) ||
          String(c.phone || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 100);
  }, [customers, query]);

  return (
    <div className="relative">
      <div
        aria-disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'w-full px-2.5 py-1.5 text-sm rounded-md border flex items-center justify-between',
          disabled
            ? 'cursor-not-allowed opacity-60 bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600'
            : 'cursor-pointer bg-white dark:bg-gray-800',
          !disabled &&
            (open
              ? 'border-blue-500 ring-2 ring-blue-500/50'
              : 'border-gray-300 dark:border-gray-600'),
          'text-gray-900 dark:text-white'
        )}
      >
        <span className="flex items-center gap-1.5 truncate">
          <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <span
            className={cn(
              'truncate',
              selected ? 'text-gray-900 dark:text-white' : 'text-gray-400'
            )}
          >
            {selected
              ? `${selected.customerId || (selected as any).code || '—'} — ${selected.name}`
              : 'Select User'}
          </span>
        </span>
        <span className="text-gray-400 ml-2 text-xs">
          {open ? '▲' : '▼'}
        </span>
      </div>

      {open && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-lg max-h-52 overflow-hidden">
          <div className="p-1.5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded-md">
              <Search className="h-3.5 w-3.5 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ID, name or phone..."
                className="flex-1 bg-transparent outline-none text-xs text-gray-900 dark:text-white placeholder-gray-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-40">
            {filtered.length === 0 ? (
              <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                No users found
              </div>
            ) : (
              filtered.map((c: any) => (
                <div
                  key={c._id}
                  className={cn(
                    'px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                    c._id === value &&
                      'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  )}
                  onClick={() => {
                    onChange(c._id);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <div className="font-medium">
                    {c.customerId || c.code || '—'}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {c.name} • {c.phone}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================================
// USER REPORT MODAL
// ======================================================
export default function UserReportModal({
  isOpen,
  onClose,
  customers,
}: Props) {
  const [customerId, setCustomerId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCustomerId('');
      setFromDate('');
      setToDate('');
      setData(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Load report whenever customer or date range changes
  useEffect(() => {
    if (!customerId) {
      setData(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);

        const qs = params.toString();
        const url = `/reports/user/${customerId}${qs ? `?${qs}` : ''}`;

        const res = await api.get(url);
        if (res.data.success) setData(res.data.report);
      } catch (e: any) {
        console.error(e);
        toast.error(
          e?.response?.data?.message || 'Failed to load user report'
        );
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [customerId, fromDate, toDate]);

  // -------- Quick date range helpers --------
  const setThisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFromDate(first.toISOString().slice(0, 10));
    setToDate(last.toISOString().slice(0, 10));
  };

  const setLast30Days = () => {
    const now = new Date();
    const past = new Date(now);
    past.setDate(past.getDate() - 30);
    setFromDate(past.toISOString().slice(0, 10));
    setToDate(now.toISOString().slice(0, 10));
  };

  const setThisYear = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), 0, 1);
    const last = new Date(now.getFullYear(), 11, 31);
    setFromDate(first.toISOString().slice(0, 10));
    setToDate(last.toISOString().slice(0, 10));
  };

  const clearRange = () => {
    setFromDate('');
    setToDate('');
  };

  // ======================================================
  // PDF EXPORT
  // ======================================================
  const exportPDF = () => {
    if (!data) return;

    const doc = new jsPDF('p', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    const c = data.customer;
    const s = data.summary;

    // HEADER
    doc.setFillColor(214, 177, 56);
    doc.rect(0, 0, pageWidth, 70, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('User Payment Report', 40, 40);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      pageWidth - 40,
      40,
      { align: 'right' }
    );

    if (fromDate || toDate) {
      const rangeText = `Period: ${fromDate || 'Beginning'} → ${toDate || 'Today'}`;
      doc.setFontSize(10);
      doc.text(rangeText, 40, 58);
    }

    // CUSTOMER INFO
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Information', 40, 100);

    autoTable(doc, {
      startY: 110,
      theme: 'grid',
      head: [['Field', 'Value', 'Field', 'Value']],
      body: [
        ['Customer ID', c.customerId, 'Name', c.name],
        ['Phone', c.phone || '—', 'CNIC', c.cnic || '—'],
        ['Area', c.area, 'Package', c.package],
        [
          'Monthly Fee',
          `Rs. ${c.monthlyFee.toLocaleString()}`,
          'Status',
          (c.status || '').toUpperCase(),
        ],
      ],
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: {
        fillColor: [214, 177, 56],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 180 },
        2: { fontStyle: 'bold', cellWidth: 80 },
        3: { cellWidth: 180 },
      },
    });

    // SUMMARY
    let y = (doc as any).lastAutoTable.finalY + 20;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Summary', 40, y);

    autoTable(doc, {
      startY: y + 10,
      theme: 'grid',
      head: [
        [
          'Monthly Fee',
          'Months Paid',
          'Total Expected',
          'Total Paid',
          'Outstanding',
        ],
      ],
      body: [
        [
          `Rs. ${s.monthlyFee.toLocaleString()}`,
          s.monthsPaid,
          `Rs. ${s.totalExpected.toLocaleString()}`,
          `Rs. ${s.totalPaid.toLocaleString()}`,
          `Rs. ${s.outstanding.toLocaleString()}`,
        ],
      ],
      styles: { fontSize: 10, cellPadding: 6, halign: 'center' },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
    });

    // PAYMENT HISTORY
    y = (doc as any).lastAutoTable.finalY + 20;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Payment History (${data.payments.length} records)`, 40, y);

    autoTable(doc, {
      startY: y + 10,
      theme: 'striped',
      head: [
        [
          '#',
          'Receipt',
          'Month',
          'Date',
          'Method',
          'Amount (Rs.)',
          'Received By',
        ],
      ],
      body: data.payments.map((p: any, i: number) => [
        i + 1,
        p.receiptNo || '—',
        p.month || '—',
        p.paymentDate
          ? new Date(p.paymentDate).toLocaleDateString()
          : '—',
        p.method || 'Cash',
        (p.amount || 0).toLocaleString(),
        p.receivedBy || '—',
      ]),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: {
        fillColor: [214, 177, 56],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        5: { halign: 'right', fontStyle: 'bold' },
      },
      foot: [['', '', '', '', 'TOTAL', s.totalPaid.toLocaleString(), '']],
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'right',
      },
    });

    // MONTHLY BREAKDOWN
    const months = Object.entries(data.byMonth || {});
    if (months.length > 0) {
      y = (doc as any).lastAutoTable.finalY + 20;

      if (y > doc.internal.pageSize.getHeight() - 120) {
        doc.addPage();
        y = 40;
      }

      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Monthly Payment Breakdown', 40, y);

      autoTable(doc, {
        startY: y + 10,
        theme: 'grid',
        head: [['Month', 'Amount Paid (Rs.)']],
        body: months.map(([m, amt]: any) => [
          m,
          Number(amt).toLocaleString(),
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: {
          fillColor: [214, 177, 56],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          1: { halign: 'right', fontStyle: 'bold' },
        },
      });
    }

    // FOOTER
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - 40,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'right' }
      );
      doc.text(
        'Powered by ISP Management System',
        40,
        doc.internal.pageSize.getHeight() - 20
      );
    }

    const safeName = (c.name || 'user').replace(/[^a-z0-9]/gi, '_');
    doc.save(`UserReport_${c.customerId}_${safeName}.pdf`);
    toast.success('PDF downloaded');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* HEADER */}
        <div
          className={cn(
            'flex items-center justify-between px-4 py-2.5 border-b',
            'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
            'border-gray-200 dark:border-gray-700'
          )}
        >
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <User className="h-4 w-4" />
              User Payment Report
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select a user and optional date range to view/export payments.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* BODY */}
        <div className="px-4 py-3 overflow-y-auto max-h-[calc(85vh-7rem)] space-y-3">
          {/* USER SELECT */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Select User
            </label>
            <UserSearchableSelect
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
            />
          </div>

          {/* DATE RANGE */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Date Range (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={setThisMonth}
                className="px-2 py-0.5 text-[11px] rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={setLast30Days}
                className="px-2 py-0.5 text-[11px] rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={setThisYear}
                className="px-2 py-0.5 text-[11px] rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                This Year
              </button>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={clearRange}
                  className="px-2 py-0.5 text-[11px] rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#d6b138]" />
            </div>
          )}

          {!loading && !data && customerId === '' && (
            <div className="text-center py-10 text-xs text-gray-500">
              Select a user to view their report.
            </div>
          )}

          {!loading && data && (
            <>
              {/* PROFILE */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <Info label="Customer ID" value={data.customer.customerId} />
                <Info label="Name" value={data.customer.name} />
                <Info label="Phone" value={data.customer.phone || '—'} />
                <Info label="Area" value={data.customer.area} />
                <Info label="Package" value={data.customer.package} />
                <Info
                  label="Monthly Fee"
                  value={`Rs. ${data.customer.monthlyFee.toLocaleString()}`}
                />
              </div>

              {/* SUMMARY */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <SummaryStat
                  label="Monthly"
                  value={`Rs. ${data.summary.monthlyFee.toLocaleString()}`}
                />
                <SummaryStat
                  label="Months Paid"
                  value={data.summary.monthsPaid}
                />
                <SummaryStat
                  label="Expected"
                  value={`Rs. ${data.summary.totalExpected.toLocaleString()}`}
                />
                <SummaryStat
                  label="Paid"
                  value={`Rs. ${data.summary.totalPaid.toLocaleString()}`}
                  tone="green"
                />
                <SummaryStat
                  label="Outstanding"
                  value={`Rs. ${data.summary.outstanding.toLocaleString()}`}
                  tone="red"
                />
              </div>

              {/* PAYMENTS TABLE */}
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white text-xs mb-1.5">
                  Payment History ({data.payments.length})
                </h4>
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md max-h-64">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="py-1.5 px-2 text-left font-medium text-gray-600 dark:text-gray-300 uppercase">
                          #
                        </th>
                        <th className="py-1.5 px-2 text-left font-medium text-gray-600 dark:text-gray-300 uppercase">
                          Receipt
                        </th>
                        <th className="py-1.5 px-2 text-left font-medium text-gray-600 dark:text-gray-300 uppercase">
                          Month
                        </th>
                        <th className="py-1.5 px-2 text-left font-medium text-gray-600 dark:text-gray-300 uppercase">
                          Date
                        </th>
                        <th className="py-1.5 px-2 text-left font-medium text-gray-600 dark:text-gray-300 uppercase">
                          Method
                        </th>
                        <th className="py-1.5 px-2 text-right font-medium text-gray-600 dark:text-gray-300 uppercase">
                          Amount
                        </th>
                        <th className="py-1.5 px-2 text-left font-medium text-gray-600 dark:text-gray-300 uppercase">
                          By
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-4 px-2 text-center text-gray-500"
                          >
                            No payments in this range
                          </td>
                        </tr>
                      ) : (
                        data.payments.map((p: any, i: number) => (
                          <tr
                            key={i}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <td className="py-1.5 px-2 text-gray-800 dark:text-gray-200">
                              {i + 1}
                            </td>
                            <td className="py-1.5 px-2 text-gray-800 dark:text-gray-200">
                              {p.receiptNo}
                            </td>
                            <td className="py-1.5 px-2 text-gray-800 dark:text-gray-200">
                              {p.month}
                            </td>
                            <td className="py-1.5 px-2 text-gray-800 dark:text-gray-200">
                              {p.paymentDate
                                ? new Date(
                                    p.paymentDate
                                  ).toLocaleDateString()
                                : '—'}
                            </td>
                            <td className="py-1.5 px-2 text-gray-800 dark:text-gray-200">
                              {p.method}
                            </td>
                            <td className="py-1.5 px-2 text-right font-medium text-gray-800 dark:text-gray-200">
                              Rs. {p.amount.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-2 text-gray-800 dark:text-gray-200">
                              {p.receivedBy}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={exportPDF}
            disabled={!data || loading || data.payments?.length === 0}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 text-sm text-white rounded-md font-medium transition-colors disabled:opacity-70',
              'bg-blue-600 hover:bg-blue-700'
            )}
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// SMALL HELPERS
// ======================================================
function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
        {value}
      </p>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: any;
  tone?: 'green' | 'red';
}) {
  return (
    <div className="p-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p
        className={cn(
          'text-sm font-bold mt-0.5',
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
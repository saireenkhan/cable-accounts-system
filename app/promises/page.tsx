'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import {
  Handshake,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  X,
  User as UserIcon,
  Hash,
  Phone,
  MapPin,
  Package as PackageIcon,
  CalendarDays,
  DollarSign,
  CreditCard,
  UserCheck,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  CalendarClock,
  CalendarCheck,
  CalendarX,
  Sun,
} from 'lucide-react';
import Layout from '@/app/components/ui/Layout';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';
import AddPaymentPromiseModal from './add/AddPaymentPromiseModal';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function displayDate(input: any): string {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')} ${
    MONTHS[d.getMonth()]
  } ${d.getFullYear()}`;
}

function resolveName(val: any, fallback = '—'): string {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'object') return val.name || fallback;
  return String(val);
}

/* ============================================================
   STATUS STYLES
============================================================ */
const statusStyles: Record<string, string> = {
  Today:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Upcoming:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Kept:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Broken:
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

/* ============================================================
   STATS COLORS
============================================================ */
const colorClasses: Record<string, string> = {
  blue:
    'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-blue-500/30',
  amber:
    'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-500 ring-amber-500/30',
  sky:
    'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 border-sky-500 ring-sky-500/30',
  green:
    'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-500 ring-green-500/30',
  red:
    'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-500 ring-red-500/30',
};

/* ============================================================
   VIEW FIELD
============================================================ */
function ViewField({
  icon,
  label,
  value,
  highlight,
  fullWidth,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
  highlight?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        fullWidth && 'sm:col-span-2',
        highlight
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      )}
    >
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
        {icon}
        {label}
      </div>

      <p
        className={cn(
          'font-semibold',
          highlight
            ? 'text-blue-700 dark:text-blue-400 text-lg'
            : 'text-gray-900 dark:text-white'
        )}
      >
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   PAGE
============================================================ */
function PromisesPageContent() {
  const [loading, setLoading] = useState(true);
  const [promises, setPromises] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromise, setEditingPromise] = useState<any>(null);

  const [view, setView] = useState(false);
  const [viewingPromise, setViewingPromise] = useState<any>(null);

  /* ----------------------------------------------------------
     FETCH
  ---------------------------------------------------------- */
  const fetchAll = async () => {
    setLoading(true);
    try {
      if (!sessionStorage.getItem('token')) {
        setLoading(false);
        return;
      }

      const [promisesRes, customersRes, areasRes] = await Promise.all([
        api.get('/promises'),
        api.get('/customers?limit=10000'),
        api.get('/areas'),
      ]);

      if (promisesRes.data.success) {
        setPromises(promisesRes.data.promises || []);
      }
      if (customersRes.data.success) {
        setCustomers(customersRes.data.customers || []);
      }
      if (areasRes.data.success) {
        setAreas(areasRes.data.areas || []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load promises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  /* ----------------------------------------------------------
     AREA LOOKUP
  ---------------------------------------------------------- */
  const areaLookup: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    areas.forEach((a: any) => {
      map[String(a._id)] = a.name || '';
    });
    return map;
  }, [areas]);

  /* ----------------------------------------------------------
     FILTER
  ---------------------------------------------------------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return promises.filter((p) => {
      const c = p.customer || {};

      const matchesSearch =
        !q ||
        String(c.name || '').toLowerCase().includes(q) ||
        String(c.customerId || '').toLowerCase().includes(q) ||
        String(c.phone || '').toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' || p.status === statusFilter;

      const matchesDate =
        !dateFilter ||
        new Date(p.promiseDate).toISOString().slice(0, 10) === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [promises, search, statusFilter, dateFilter]);

  /* ----------------------------------------------------------
     STATS
     - Total = sum of promised amounts
     - Status buckets = sum of money actually received
  ---------------------------------------------------------- */
  const sumPromised = (arr: any[]) =>
    arr.reduce((s, p) => s + Number(p.promiseAmount || 0), 0);

  const sumPaid = (arr: any[]) =>
    arr.reduce((s, p) => s + Number(p.totalPaid || 0), 0);

  const stats = [
    {
      key: 'all',
      label: 'TOTAL PROMISES',
      value: promises.length,
      amount: sumPromised(promises),
      Icon: Handshake,
      color: 'blue',
      dark: true,
    },
    {
      key: 'Today',
      label: 'DUE TODAY',
      value: promises.filter((p) => p.status === 'Today').length,
      amount: sumPaid(promises.filter((p) => p.status === 'Today')),
      Icon: Sun,
      color: 'amber',
      dark: false,
    },
    {
      key: 'Upcoming',
      label: 'UPCOMING',
      value: promises.filter((p) => p.status === 'Upcoming').length,
      amount: sumPaid(promises.filter((p) => p.status === 'Upcoming')),
      Icon: CalendarClock,
      color: 'sky',
      dark: false,
    },
    {
      key: 'Kept',
      label: 'PROMISE KEPT',
      value: promises.filter((p) => p.status === 'Kept').length,
      amount: sumPaid(promises.filter((p) => p.status === 'Kept')),
      Icon: CalendarCheck,
      color: 'green',
      dark: false,
    },
    {
      key: 'Broken',
      label: 'BROKEN PROMISE',
      value: promises.filter((p) => p.status === 'Broken').length,
      amount: sumPaid(promises.filter((p) => p.status === 'Broken')),
      Icon: CalendarX,
      color: 'red',
      dark: false,
    },
  ];

  /* ----------------------------------------------------------
     DELETE
  ---------------------------------------------------------- */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promise?')) return;

    try {
      await api.delete(`/promises/${id}`);
      toast.success('Promise deleted');
      fetchAll();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete promise');
    }
  };

  /* ----------------------------------------------------------
     TABLE COLUMNS
  ---------------------------------------------------------- */
  const columns = [
    {
      key: 'customer',
      header: 'Customer',
      render: (item: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white">
            {item.customerName || item.customer?.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {item.customerId || item.customer?.customerId}
          </span>
        </div>
      ),
    },
    {
      key: 'promiseAmount',
      header: 'Promise Amount',
      render: (item: any) => {
        const promised = Number(item.promiseAmount || 0);
        const paid = Number(item.totalPaid || 0);
        const showProgress =
          paid > 0 && paid < promised && item.status !== 'Kept';

        return (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900 dark:text-white">
              Rs. {promised.toLocaleString()}
            </span>

            {showProgress && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Rs. {paid.toLocaleString()} received
              </span>
            )}

            {item.status === 'Kept' && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Fully paid
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'promiseDate',
      header: 'Promise Date',
      render: (item: any) => displayDate(item.promiseDate),
    },
    {
      key: 'recoveryOfficer',
      header: 'Officer',
      render: (item: any) => item.recoveryOfficer || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium',
            statusStyles[item.status] ||
              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          )}
        >
          {item.status}
        </span>
      ),
    },
  ];

  /* ----------------------------------------------------------
     LOADING
  ---------------------------------------------------------- */
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */
  return (
    <Layout>
      <div className="space-y-5">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Handshake className="h-6 w-6 text-blue-600" />
              Promise Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track customer payment promises, commitments and follow-ups.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingPromise(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#d6b138] hover:bg-[#f7ce48] text-white-900 rounded-lg text-sm font-medium"
          >
            <PlusCircle className="h-4 w-4" />
            Add New Promise
          </button>
        </header>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((s) => {
            const active = statusFilter === s.key;
            const c = colorClasses[s.color] || '';
            const parts = c.split(' ');

            if (s.dark) {
              return (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={cn(
                    'rounded-xl shadow-sm border p-5 text-left transition-all hover:shadow-md hover:scale-[1.02] bg-gray-900 dark:bg-gray-950 text-white',
                    active
                      ? 'border-blue-500 ring-2 ring-blue-500/30'
                      : 'border-gray-800 dark:border-gray-800'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase text-gray-300">
                        {s.label}
                      </p>
                      <p className="text-2xl font-bold mt-1">{s.value}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Rs. {s.amount.toLocaleString()}
                      </p>
                    </div>

                    <div className="h-12 w-12 rounded-full flex items-center justify-center bg-white/10">
                      <s.Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className={cn(
                  'bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 text-left transition-all hover:shadow-md hover:scale-[1.02]',
                  active
                    ? `${parts.slice(-3).join(' ')} ring-2`
                    : 'border-gray-200 dark:border-gray-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                      {s.label}
                    </p>
                    <p className={cn('text-2xl font-bold mt-1', parts[0])}>
                      {s.value}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Rs. {s.amount.toLocaleString()}
                    </p>
                  </div>

                  <div
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center',
                      parts.slice(1, 3).join(' ')
                    )}
                  >
                    <s.Icon className={cn('h-6 w-6', parts[0])} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* FILTERS */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex-1 min-w-0">
            <SearchBar
              placeholder="Search customer, mobile or customer ID..."
              value={search}
              onChange={setSearch}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">All Status</option>
            <option value="Today">Today</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Kept">Kept</option>
            <option value="Broken">Broken</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          />

          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setDateFilter('');
            }}
            className="px-4 py-2.5 rounded-lg bg-[#d6b138] hover:bg-[#f7ce48] text-white text-sm font-medium"
          >
            Reset
          </button>
        </div>

        {/* TABLE */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                Customer Promises
              </h2>

              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {statusFilter}
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filtered.length} Records
            </span>
          </div>

          <div className="p-4">
            <DataTable
              data={filtered}
              columns={columns}
              actions={[
                { value: 'edit', icon: <Edit className="h-3 w-3" /> },
                { value: 'view', icon: <Eye className="h-3 w-3" /> },
                { value: 'delete', icon: <Trash2 className="h-3 w-3" /> },
              ]}
              onAction={(item, action) => {
                if (action === 'edit') {
                  setEditingPromise(item);
                  setIsModalOpen(true);
                  return;
                }
                if (action === 'view') {
                  setViewingPromise(item);
                  setView(true);
                  return;
                }
                if (action === 'delete') {
                  handleDelete(item._id);
                }
              }}
              accordionTitle="customerName"
              accordionSubtitle="customerId"
              emptyMessage="No promises found"
            />
          </div>
        </section>

        {/* ADD / EDIT MODAL */}
        <AddPaymentPromiseModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPromise(null);
          }}
          onSuccess={() => {
            fetchAll();
            setIsModalOpen(false);
            setEditingPromise(null);
          }}
          customers={customers}
          editingPromise={editingPromise}
        />

        {/* VIEW MODAL */}
        {view && viewingPromise && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setView(false)}
            />

            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {viewingPromise.customerName ||
                        viewingPromise.customer?.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      User ID:{' '}
                      {viewingPromise.customerId ||
                        viewingPromise.customer?.customerId}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setView(false)}
                  className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-4">
                <div className="flex justify-center">
                  {(() => {
                    const status = viewingPromise.status;

                    const StatusIcon =
                      status === 'Kept'
                        ? CheckCircle
                        : status === 'Broken'
                          ? XCircle
                          : Clock;

                    return (
                      <span
                        className={cn(
                          'px-4 py-1.5 rounded-full text-sm font-semibold inline-flex items-center gap-1.5',
                          statusStyles[status] ||
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        )}
                      >
                        <StatusIcon className="h-4 w-4" />
                        {status}
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ViewField
                    icon={<Hash className="h-4 w-4" />}
                    label="User ID"
                    value={
                      viewingPromise.customerId ||
                      viewingPromise.customer?.customerId
                    }
                  />

                  <ViewField
                    icon={<UserIcon className="h-4 w-4" />}
                    label="Full Name"
                    value={
                      viewingPromise.customerName ||
                      viewingPromise.customer?.name
                    }
                  />

                  <ViewField
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={viewingPromise.customer?.phone || '—'}
                  />

                  <ViewField
                    icon={<MapPin className="h-4 w-4" />}
                    label="Area"
                    value={
                      areaLookup[String(viewingPromise.customer?.area)] ||
                      (typeof viewingPromise.customer?.area === 'object'
                        ? viewingPromise.customer?.area?.name
                        : viewingPromise.customer?.area) ||
                      '—'
                    }
                  />

                  <ViewField
                    icon={<PackageIcon className="h-4 w-4" />}
                    label="Package"
                    value={resolveName(viewingPromise.customer?.package)}
                  />

                  <ViewField
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Promise Amount"
                    value={(() => {
                      const promised = Number(
                        viewingPromise.promiseAmount || 0
                      );
                      const paid = Number(viewingPromise.totalPaid || 0);

                      if (paid <= 0)
                        return `Rs. ${promised.toLocaleString()}`;
                      if (paid >= promised)
                        return `Rs. ${promised.toLocaleString()} (fully paid)`;
                      return `Rs. ${promised.toLocaleString()} — Rs. ${paid.toLocaleString()} received`;
                    })()}
                    highlight
                  />

                  <ViewField
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Promise Date"
                    value={displayDate(viewingPromise.promiseDate)}
                  />

                  <ViewField
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Payment Method"
                    value={viewingPromise.paymentMethod || '—'}
                  />

                  <ViewField
                    icon={<UserCheck className="h-4 w-4" />}
                    label="Recovery Officer"
                    value={viewingPromise.recoveryOfficer || '—'}
                  />

                  <ViewField
                    icon={<MessageSquare className="h-4 w-4" />}
                    label="Promise Source"
                    value={viewingPromise.promiseSource || '—'}
                  />

                  <ViewField
                    icon={<Clock className="h-4 w-4" />}
                    label="Created On"
                    value={displayDate(viewingPromise.createdAt)}
                  />

                  <ViewField
                    icon={<MessageSquare className="h-4 w-4" />}
                    label="Remarks"
                    value={viewingPromise.remarks || '—'}
                    fullWidth
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  onClick={() => setView(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium"
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    setView(false);
                    setEditingPromise(viewingPromise);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

/* ============================================================
   EXPORT
============================================================ */
export default function PromisesPage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </Layout>
      }
    >
      <PromisesPageContent />
    </Suspense>
  );
}
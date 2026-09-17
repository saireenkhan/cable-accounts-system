'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users, UserPlus, Edit, Trash2, Eye, UserCheck, UserX, UserMinus,
  X, Phone, MapPin, Package as PackageIcon, DollarSign, Hash, Home,
  CheckCircle, XCircle, Clock, User as UserIcon, Percent, CalendarDays,
  Handshake,
} from 'lucide-react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';
import {
  areaName,
  findPackage,
  dateInput,
  displayDate,
  expiryDate,
  effectiveStatus,
  upcomingExpiry,
  statusStyles,
} from '@/app/lib/userUtils';

const spinner = (
  <Layout>
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  </Layout>
);

const colorClasses: Record<string, string> = {
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-blue-500/30',
  green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-500 ring-green-500/30',
  gray: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 border-gray-500 ring-gray-500/30',
  orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-500 ring-orange-500/30',
  red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-500 ring-red-500/30',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  'upcoming-expiry': 'Upcoming Expiries',
  expired: 'Expired',
  suspended: 'Suspended',
};

// ============================================================
// ✅ Allocation helpers — determine REAL expired status
// ============================================================
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const parseMonthKey = (monthStr: string) => {
  const parts = (monthStr || '').split(' ');
  return {
    name: parts[0] || '',
    year: parseInt(parts[1] || '0'),
    idx: MONTHS.indexOf(parts[0]),
  };
};

const compareMonths = (a: string, b: string) => {
  const pa = parseMonthKey(a);
  const pb = parseMonthKey(b);
  if (isNaN(pa.year) || isNaN(pb.year) || pa.idx === -1 || pb.idx === -1) return 0;
  if (pa.year !== pb.year) return pa.year - pb.year;
  return pa.idx - pb.idx;
};

interface MonthAllocation {
  month: string;
  expected: number;
  applied: number;
  remaining: number;
  isPaid: boolean;
}

function allocatePayments(
  monthlyFee: number,
  payments: { month: string; amount: number }[]
): MonthAllocation[] {
  if (!monthlyFee || monthlyFee <= 0) return [];

  const byMonth: Record<string, number> = {};
  payments.forEach((p) => {
    if (!p.month) return;
    byMonth[p.month] =
      (byMonth[p.month] || 0) + (parseFloat(String(p.amount)) || 0);
  });

  const months = Object.keys(byMonth).sort(compareMonths);
  if (months.length === 0) return [];

  const totalPool = months.reduce((sum, m) => sum + byMonth[m], 0);

  let pool = totalPool;
  const result: MonthAllocation[] = [];

  for (const month of months) {
    const applied = Math.min(pool, monthlyFee);
    const remaining = Math.max(0, monthlyFee - applied);
    pool -= applied;

    result.push({
      month,
      expected: monthlyFee,
      applied,
      remaining,
      isPaid: remaining === 0,
    });
  }

  return result;
}

const toDateSafe = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// ✅ Compute real effective status — Expired only if expiry month is UNPAID
function computeEffectiveStatus(user: any, payments: any[]): string {
  const baseStatus = effectiveStatus(user);

  if (baseStatus !== 'Expired') return baseStatus;

  const monthlyFee = Number(user.monthlyFeeRaw || 0);
  if (!monthlyFee) return baseStatus;

  const userPayments = payments.filter(
    (p) => (p.partner?.name || p.partner) === user.name && !p.isNoPayment
  );

  const allocs = allocatePayments(
    monthlyFee,
    userPayments.map((p: any) => ({ month: p.month, amount: p.amount }))
  );

  const expDate = toDateSafe(user.expiryDate);
  if (!expDate) return baseStatus;

  const expiryMonth = `${MONTHS[expDate.getMonth()]} ${expDate.getFullYear()}`;
  const expiryAlloc = allocs.find((a) => a.month === expiryMonth);

  // ✅ If the expiry month is fully paid → not Expired
  if (expiryAlloc?.isPaid) return 'Inactive';

  return 'Expired';
}

function ViewField({
  icon, label, value, highlight, fullWidth,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
  highlight?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn(
      'p-3 rounded-lg border',
      fullWidth && 'sm:col-span-2',
      highlight
        ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
    )}>
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
        {icon}{label}
      </div>
      <p className={cn(
        'font-semibold',
        highlight
          ? 'text-blue-700 dark:text-blue-400 text-lg'
          : 'text-gray-900 dark:text-white'
      )}>
        {value}
      </p>
    </div>
  );
}

function PartnersPageContent() {
  const searchParams = useSearchParams();

  const [modal, setModal] = useState(false);
  const [view, setView] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [partnerList, setPartnerList] = useState<any[]>([]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setFilter(status.toLowerCase());
  }, [searchParams]);

  // ✅ Fetch partner areas
  const fetchAreas = async () => {
    try {
      if (!localStorage.getItem('token')) return [];
      const { data } = await api.get('/partner-areas');
      const list = data.success ? data.areas || [] : [];
      setAreas(list);
      return list;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const fetchPackages = async () => {
    try {
      if (!localStorage.getItem('token')) return;
      const { data } = await api.get('/packages');
      if (data.success) setPackages(data.packages || []);
    } catch (e) {
      console.error(e);
    }
  };

  // ✅ Fetch master partner list
  const fetchPartnerList = async () => {
    try {
      if (!localStorage.getItem('token')) return [];
      const { data } = await api.get('/partners-list');
      const list = data.success ? data.partners || [] : [];
      setPartnerList(list);
      return list;
    } catch (e) {
      console.error('Error fetching partner list:', e);
      return [];
    }
  };

  // ✅ Fetch partners + partner payments
  const fetchUsers = async (areaList = areas) => {
    try {
      if (!localStorage.getItem('token')) return setLoading(false);

      // ✅ Fetch partners AND partner-payments together
      const [partnersRes, paymentsRes] = await Promise.all([
        api.get('/partners?limit=10000'),
        api.get('/partner-payments'),
      ]);

      const partners = partnersRes.data.partners || [];
      const payments = paymentsRes.data.payments || [];

      if (!partnersRes.data.success) return;

      setUsers(
        partners.map((c: any) => {
          const activation = dateInput(c.activationDate);
          const expiry = c.expiryDate
            ? dateInput(c.expiryDate)
            : expiryDate(activation);

          const user = {
            id: c._id,
            customerId: c.partnerId || 'N/A',
            name: c.name || '',
            phone: c.phone || '',
            address: c.address || '',
            area: areaName(c.area, areaList),
            package: c.package || '',
            packagePrice: Number(c.packagePrice || 0),
            discount: Number(c.discount || 0),
            discountRaw: Number(c.discount || 0),
            monthlyFeeRaw: Number(c.monthlyFee || 0),
            monthlyFee: `Rs. ${Number(c.monthlyFee || 0).toLocaleString()}`,
            activationDate: activation,
            expiryDate: expiry,
            statusRaw: c.status || 'active',
            partner: c.partner || '',
          };

          // ✅ Use allocation-aware status
          return { ...user, status: computeEffectiveStatus(user, payments) };
        })
      );
    } catch (e) {
      console.error('Error fetching User:', e);
      toast.error('Failed to load User');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const list = await fetchAreas();
      await fetchPackages();
      await fetchPartnerList();
      await fetchUsers(list);
    })();
  }, []);

  const stats = [
    ['all', 'TOTAL USERS', users.length, Users, 'blue'],
    ['active', 'ACTIVE', users.filter(u => u.status === 'Active').length, UserCheck, 'green'],
    ['inactive', 'INACTIVE', users.filter(u => u.status === 'Inactive').length, UserX, 'gray'],
    ['upcoming-expiry', 'UPCOMING EXPIRIES', users.filter(upcomingExpiry).length, Clock, 'orange', 'Within 7 days'],
    ['expired', 'EXPIRED', users.filter(u => u.status === 'Expired').length, UserMinus, 'red'],
  ] as const;

  const userFields: Field[] = [
    { name: 'customerId', label: 'User ID', type: 'text', required: true, readOnly: !!editingUser },
    { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter full name', readOnly: !!editingUser },
    { name: 'phone', label: 'Phone', type: 'text', required: true, placeholder: '0300-1234567' },
    { name: 'address', label: 'Address', type: 'text', required: true, placeholder: 'House #, Street' },
    {
      name: 'area',
      label: ' Area',
      type: 'select',
      required: true,
      searchable: true,
      options: areas.map(a => ({ label: a.name, value: a.name })),
    },
    {
      name: 'partner',
      label: 'Partner',
      type: 'select',
      required: true,
      searchable: true,
      placeholder: partnerList.length > 0 ? 'Select Partner' : 'No partners available',
      options:
        partnerList.length > 0
          ? partnerList.map((p: any) => ({
              label: `${p.partnerId} - ${p.name}`,
              value: p.name,
            }))
          : [{ label: 'No partners available - add one first', value: '' }],
    },
    {
      name: 'package',
      label: 'Package',
      type: 'select',
      required: true,
      searchable: true,
      options: packages.map(p => ({
        label: `${p.name} - Rs. ${Number(p.sellingPrice || 0).toLocaleString()}`,
        value: p.name,
      })),
    },
    {
      name: 'activationDate',
      label: 'Activation Date',
      type: 'date',
      required: true,
      placeholder: 'Select activation date',
    },
    {
      name: 'expiryDate',
      label: 'Expiry Date',
      type: 'date',
      readOnly: true,
      dependsOn: 'activationDate',
      updateOnChange: expiryDate,
    },
    {
      name: 'discount',
      label: 'Discount (Rs.)',
      type: 'number',
      placeholder: '0',
      defaultValue: '0',
      min: 0,
      max: (data, context) =>
        Number(findPackage(context?.packages || [], data?.package)?.sellingPrice || 0),
    },
    {
      name: 'monthlyFee',
      label: 'Monthly Fee (Rs.)',
      type: 'text',
      required: true,
      placeholder: 'Auto-filled',
      dependsOn: 'package',
      updateOnChange: (_, data, context) => {
        const price = Number(
          findPackage(context?.packages || [], data?.package)?.sellingPrice || 0
        );
        return Math.max(0, price - Number(data?.discount || 0));
      },
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Expired', value: 'expired' },
      ],
    },
  ];

  const transformUserData = (data: any) => {
    const pkg = findPackage(packages, data.package);
    const price = Number(pkg?.sellingPrice || 0);
    const discount = Number(data.discount || 0);

    if (discount < 0) throw new Error('Discount cannot be negative.');
    if (price > 0 && discount > price) {
      throw new Error(
        `Discount (Rs. ${discount.toLocaleString()}) cannot exceed the package price (Rs. ${price.toLocaleString()}).`
      );
    }

    const activation = dateInput(data.activationDate);
    if (!activation) throw new Error('Activation Date is required.');

    return {
      partnerId: data.customerId,
      name: data.name,
      phone: data.phone,
      address: data.address,
      area: areaName(data.area, areas),
      partner: data.partner,
      package: data.package,
      activationDate: activation,
      expiryDate: expiryDate(activation),
      discount,
      monthlyFee: Math.max(0, price - discount),
      status: data.status || 'active',
    };
  };

  const handleSuccess = (data: any) => {
    toast.success(
      editingUser
        ? `${data.name} updated successfully!`
        : `${data.name} added successfully!`
    );
    setEditingUser(null);
    setModal(false);
    fetchUsers(areas);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await api.delete(`/partners/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      toast.success(`${name} deleted`);
      if (editingUser?.id === id) setEditingUser(null);
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete User');
    }
  };

  const filteredUsers = users.filter(u => {
    const status = u.status;
    const q = search.toLowerCase();

    const matchesStatus =
      filter === 'all' ||
      (filter === 'active' && status === 'Active') ||
      (filter === 'inactive' && status === 'Inactive') ||
      (filter === 'expired' && status === 'Expired') ||
      (filter === 'suspended' && status === 'Suspended') ||
      (filter === 'upcoming-expiry' && upcomingExpiry(u));

    const matchesSearch =
      u.name?.toLowerCase().includes(q) ||
      u.customerId?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.partner?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const columns = [
    { key: 'customerId', header: 'User ID' },
    {
      key: 'name',
      header: 'User Name',
      render: (u: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white">
            {u.name}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <CalendarDays className="h-3 w-3 text-blue-500" />
            Activated: {displayDate(u.activationDate)}
          </span>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone' },
    { key: 'area', header: ' Area' },
    { key: 'partner', header: 'Partner' },
    { key: 'monthlyFee', header: 'Monthly Fee' },
    {
      key: 'status',
      header: 'Status',
      render: (u: any) => (
        <span className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          statusStyles[u.status]
        )}>
          {u.status}
        </span>
      ),
    },
  ];

  if (loading) return spinner;

  return (
    <Layout>
      <div className="space-y-5">

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Handshake className="h-6 w-6 text-blue-600" />
              Partner User Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage User connections and details.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingUser(null);
              setModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/25"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(([key, label, value, Icon, color, sub]) => {
            const active = filter === key;
            const c = colorClasses[color];
            const parts = c.split(' ');

            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 text-left transition-all hover:shadow-md hover:scale-[1.02]',
                  active
                    ? `${parts.slice(-3).join(' ')} ring-2`
                    : 'border-gray-200 dark:border-gray-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    <p className={cn('text-2xl font-bold mt-1', parts[0])}>{value}</p>
                    <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                      {sub || (active ? 'Filtered' : '')}
                    </p>
                  </div>

                  <div className={cn(
                    'h-12 w-12 rounded-full flex items-center justify-center',
                    parts.slice(1, 3).join(' ')
                  )}>
                    <Icon className={cn('h-6 w-6', parts[0])} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <SearchBar
          placeholder="Search by name, User ID, phone or partner..."
          value={search}
          onChange={setSearch}
        />

        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                User List
              </h2>

              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {statusLabels[filter] || 'All'}
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredUsers.length} User found
            </span>
          </div>

          <div className="p-4">
            <DataTable
              data={filteredUsers}
              columns={columns}
              actions={[
                { value: 'edit', icon: <Edit className="h-4 w-4" /> },
                { value: 'view', icon: <Eye className="h-4 w-4" /> },
                { value: 'delete', icon: <Trash2 className="h-4 w-4" /> },
              ]}
              onAction={(item, action) => {
                if (action === 'delete') handleDelete(item.id, item.name);
                if (action === 'edit') {
                  setEditingUser(item);
                  setModal(true);
                }
                if (action === 'view') {
                  setViewingUser(item);
                  setView(true);
                }
              }}
              accordionTitle="name"
              accordionSubtitle="customerId"
              emptyMessage="No User found matching your search"
            />
          </div>
        </section>

        <AddUserModal
          isOpen={modal}
          onClose={() => {
            setModal(false);
            setEditingUser(null);
          }}
          onSuccess={handleSuccess}
          title={editingUser ? 'Edit User' : 'Add New User'}
          subtitle={editingUser
            ? 'Update the User details below'
            : 'Create a new User connection'}
          fields={userFields}
          submitLabel={editingUser ? 'Update User' : 'Add User'}
          color="blue"
          endpoint={editingUser ? `/partners/${editingUser.id}` : '/partners'}
          method={editingUser ? 'PUT' : 'POST'}
          initialData={editingUser ? {
            customerId: editingUser.customerId,
            name: editingUser.name,
            phone: editingUser.phone,
            address: editingUser.address,
            area: areaName(editingUser.area, areas),
            partner: editingUser.partner || '',
            package: editingUser.package,
            activationDate: dateInput(editingUser.activationDate),
            expiryDate: dateInput(editingUser.expiryDate),
            discount: editingUser.discountRaw || 0,
            monthlyFee: editingUser.monthlyFeeRaw,
            status: editingUser.statusRaw,
          } : undefined}
          transformData={transformUserData}
          context={{ packages, areas, partnerList }}
        />

        {view && viewingUser && (
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
                      {viewingUser.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      User ID: {viewingUser.customerId}
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
                {(() => {
                  const status = viewingUser.status;
                  const StatusIcon =
                    status === 'Active'
                      ? CheckCircle
                      : status === 'Expired'
                        ? Clock
                        : XCircle;

                  return (
                    <div className="flex justify-center">
                      <span className={cn(
                        'px-4 py-1.5 rounded-full text-sm font-semibold inline-flex items-center gap-1.5',
                        statusStyles[status]
                      )}>
                        <StatusIcon className="h-4 w-4" />
                        {status}
                      </span>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ViewField icon={<Hash className="h-4 w-4" />} label="User ID" value={viewingUser.customerId} />
                  <ViewField icon={<UserIcon className="h-4 w-4" />} label="Full Name" value={viewingUser.name} />
                  <ViewField icon={<Phone className="h-4 w-4" />} label="Phone" value={viewingUser.phone} />
                  <ViewField icon={<MapPin className="h-4 w-4" />} label="Area" value={areaName(viewingUser.area, areas)} />
                  <ViewField icon={<Handshake className="h-4 w-4" />} label="Partner" value={viewingUser.partner || 'N/A'} />
                  <ViewField icon={<PackageIcon className="h-4 w-4" />} label="Package" value={viewingUser.package || 'No package assigned'} />
                  <ViewField icon={<CalendarDays className="h-4 w-4" />} label="Activation Date" value={displayDate(viewingUser.activationDate)} />
                  <ViewField
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Expiry Date"
                    value={displayDate(viewingUser.expiryDate)}
                    highlight={viewingUser.status === 'Expired'}
                  />
                  <ViewField
                    icon={<Percent className="h-4 w-4" />}
                    label="Discount"
                    value={`Rs. ${Number(viewingUser.discount || 0).toLocaleString()}`}
                  />
                  <ViewField
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Monthly Fee"
                    value={`Rs. ${Number(viewingUser.monthlyFeeRaw || 0).toLocaleString()}`}
                    highlight
                  />
                  <ViewField
                    icon={<Home className="h-4 w-4" />}
                    label="Address"
                    value={viewingUser.address || 'N/A'}
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
                    setEditingUser(viewingUser);
                    setModal(true);
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

export default function PartnersPage() {
  return <Suspense fallback={spinner}>{<PartnersPageContent />}</Suspense>;
}
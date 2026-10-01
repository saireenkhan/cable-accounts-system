'use client';

import React, { Suspense, useEffect, useState } from 'react';
import {
  Truck,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  X,
  Phone,
  MapPin,
  Hash,
  Home,
  CheckCircle,
  XCircle,
  Building2,
  CreditCard,
  Percent,
} from 'lucide-react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

const spinner = (
  <Layout>
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  </Layout>
);

const colorClasses: Record<string, string> = {
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-blue-500/30',
  green:
    'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-500 ring-green-500/30',
  gray: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 border-gray-500 ring-gray-500/30',
  orange:
    'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-500 ring-orange-500/30',
  red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-500 ring-red-500/30',
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

function DealersPageContent() {
  const [modal, setModal] = useState(false);
  const [view, setView] = useState(false);
  const [viewingDealerId, setViewingDealerId] = useState<string | null>(null);
  const [editingDealer, setEditingDealer] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [loading, setLoading] = useState(true);
  const [dealers, setDealers] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

  const viewingDealer = viewingDealerId
    ? dealers.find((d) => d.id === viewingDealerId) || null
    : null;

  /* ==========================================================
     FETCH AREAS
  ========================================================== */

  const fetchAreas = async () => {
    try {
      if (!sessionStorage.getItem('token')) return [];

      let list: any[] = [];

      try {
        const res = await api.get('/dealer-areas');
        if (res.data.success && res.data.areas) {
          list = res.data.areas;
        }
      } catch {
        const res = await api.get('/areas');
        if (res.data.success && res.data.areas) {
          list = res.data.areas;
        }
      }

      setAreas(list);
      return list;
    } catch (e) {
      console.error('Error fetching dealer areas:', e);
      return [];
    }
  };

  /* ==========================================================
     FETCH DEALERS
  ========================================================== */

  const fetchDealers = async () => {
    try {
      if (!sessionStorage.getItem('token')) {
        setLoading(false);
        return;
      }

      const response = await api.get('/dealers');

      if (response.data.success) {
        const mapped = (response.data.dealers || []).map((dealer: any) => ({
          id: dealer._id,
          dealerId: dealer.dealerId || 'N/A',
          name: dealer.name || 'Unknown',
          cellNo: dealer.cellNo || '',
          area:
            dealer.area && typeof dealer.area === 'object'
              ? dealer.area.name || ''
              : dealer.area || '',
          address: dealer.address || '',
          remarks: dealer.remarks || '',
          commission: dealer.commission || '10%',
          openingBalanceRaw: Number(dealer.openingBalance || 0),
          openingBalance: `Rs. ${Number(
            dealer.openingBalance || 0
          ).toLocaleString()}`,
          statusRaw: dealer.status || 'active',
          isActive:
            (dealer.status || 'active').toLowerCase() === 'active',
          status:
            (dealer.status || 'active').toLowerCase() === 'active'
              ? 'Active'
              : 'Inactive',
        }));

        setDealers(mapped);
      }
    } catch (error) {
      console.error('Error fetching dealers:', error);
      toast.error('Failed to load dealers');
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    (async () => {
      await fetchAreas();
      await fetchDealers();
    })();
  }, []);

  /* ==========================================================
     STATS
  ========================================================== */

  const stats = [
    ['all', 'TOTAL DEALERS', dealers.length, Truck, 'blue'],
    [
      'active',
      'ACTIVE',
      dealers.filter((d) => d.isActive).length,
      CheckCircle,
      'green',
    ],
    [
      'inactive',
      'INACTIVE',
      dealers.filter((d) => !d.isActive).length,
      XCircle,
      'gray',
    ],
  ] as const;

  /* ==========================================================
     DEALER FORM FIELDS
  ========================================================== */

  const dealerFields: Field[] = [
    {
      name: 'dealerId',
      label: 'Dealer ID',
      type: 'text',
      required: true,
      placeholder: 'e.g., DLR-001',
      readOnly: !!editingDealer,
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
      options:
        areas.length > 0
          ? areas.map((area: any) => ({
              label: area.name,
              value: area.name,
            }))
          : [{ label: 'No areas available - add one first', value: '' }],
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
        { label: '35%', value: '35%' },
        { label: '40%', value: '40%' },
        { label: '50%', value: '50%' },
      ],
      defaultValue: '10%',
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
      type: 'number',
      placeholder: '0',
      defaultValue: '0',
      min: 0,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
      defaultValue: 'active',
    },
    {
      name: 'remarks',
      label: 'Remarks',
      type: 'textarea',
      placeholder: 'Additional notes...',
    },
  ];

  /* ==========================================================
     TRANSFORM FORM DATA
  ========================================================== */

  const transformDealerData = (data: any) => {
    return {
      dealerId: data.dealerId?.trim(),
      name: data.name?.trim(),
      cellNo: data.cellNo?.trim(),
      area: data.area,
      address: data.address?.trim() || data.area,
      openingBalance: parseFloat(data.openingBalance) || 0,
      remarks: data.remarks || '',
      commission: data.commission || '10%',
      status: data.status || 'active',
    };
  };

  /* ==========================================================
     SUCCESS
  ========================================================== */

  const handleSuccess = () => {
    setEditingDealer(null);
    setModal(false);
    fetchDealers();
  };

  /* ==========================================================
     DELETE
  ========================================================== */

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await api.delete(`/dealers/${id}`);
      setDealers((prev) => prev.filter((d) => d.id !== id));
      toast.success(`${name} deleted`);
      if (editingDealer?.id === id) setEditingDealer(null);
      if (viewingDealerId === id) {
        setView(false);
        setViewingDealerId(null);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete dealer');
    }
  };

  /* ==========================================================
     FILTERED DEALERS
  ========================================================== */

  const filteredDealers = dealers.filter((d) => {
    const q = search.toLowerCase();

    const matchesStatus =
      filter === 'all' ||
      (filter === 'active' && d.isActive) ||
      (filter === 'inactive' && !d.isActive);

    const matchesSearch =
      d.name?.toLowerCase().includes(q) ||
      d.dealerId?.toLowerCase().includes(q) ||
      d.cellNo?.includes(q);

    return matchesStatus && matchesSearch;
  });

  /* ==========================================================
     TABLE COLUMNS
  ========================================================== */

  const columns = [
    { key: 'dealerId', header: 'Dealer ID' },
    {
      key: 'name',
      header: 'Dealer',
      render: (d: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white">
            {d.name}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <Phone className="h-3 w-3 text-blue-500" />
            {d.cellNo}
          </span>
        </div>
      ),
    },
    { key: 'cellNo', header: 'Cell No.' },
    {
      key: 'area',
      header: 'Area',
      render: (d: any) => d.area || '—',
    },
    {
      key: 'commission',
      header: 'Commission',
      render: (d: any) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-[#f7ce48]">
          {d.commission}
        </span>
      ),
    },
    {
      key: 'openingBalance',
      header: 'Opening Balance',
    },
    {
      key: 'status',
      header: 'Status',
      render: (d: any) => (
        <span
          className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            d.isActive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          )}
        >
          {d.status}
        </span>
      ),
    },
  ];

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return spinner;
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <Layout>
      <div className="space-y-5">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck className="h-6 w-6 text-[#d6b138]" />
              Dealers
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage dealer information and contact details.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingDealer(null);
              setModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#d6b138] hover:bg-[#f7ce48] text-gray-900 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Dealer
          </button>
        </header>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(([key, label, value, Icon, color]) => {
            const active = filter === key;
            const c = colorClasses[color];
            const parts = c.split(' ');

            return (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={cn(
                  'bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 text-left transition-all hover:shadow-md hover:scale-[1.02]',
                  active
                    ? `${parts.slice(-3).join(' ')} ring-2`
                    : 'border-gray-200 dark:border-gray-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {label}
                    </p>
                    <p className={cn('text-2xl font-bold mt-1', parts[0])}>
                      {value}
                    </p>
                    <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                      {active ? 'Filtered' : ''}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center',
                      parts.slice(1, 3).join(' ')
                    )}
                  >
                    <Icon className={cn('h-6 w-6', parts[0])} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* SEARCH */}
        <SearchBar
          placeholder="Search dealer name, ID or cell no..."
          value={search}
          onChange={setSearch}
        />

        {/* DEALER LIST */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                Dealer List
              </h2>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {filter === 'active' ? 'Active' : 'Inactive'}
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredDealers.length} dealers found
            </span>
          </div>

          <div className="p-2">
            <DataTable
              data={filteredDealers}
              columns={columns}
              actions={[
                { value: 'edit', icon: <Edit className="h-3 w-3" /> },
                { value: 'view', icon: <Eye className="h-3 w-3" /> },
                { value: 'delete', icon: <Trash2 className="h-3 w-3" /> },
              ]}
              onAction={(item, action) => {
                if (action === 'delete') {
                  handleDelete(item.id, item.name);
                  return;
                }
                if (action === 'edit') {
                  setEditingDealer(item);
                  setModal(true);
                  return;
                }
                if (action === 'view') {
                  setViewingDealerId(item.id);
                  setView(true);
                  return;
                }
              }}
              accordionTitle="name"
              accordionSubtitle="dealerId"
              emptyMessage="No dealers found matching your search"
            />
          </div>
        </section>

        {/* ADD / EDIT DEALER MODAL */}
        <AddUserModal
          isOpen={modal}
          onClose={() => {
            setModal(false);
            setEditingDealer(null);
          }}
          onSuccess={handleSuccess}
          title={editingDealer ? 'Edit Dealer' : 'Add New Dealer'}
          subtitle={
            editingDealer
              ? 'Update the dealer details below'
              : 'Add a new dealer to the system'
          }
          fields={dealerFields}
          submitLabel={editingDealer ? 'Update Dealer' : 'Add Dealer'}
          color="blue"
          endpoint={
            editingDealer ? `/dealers/${editingDealer.id}` : '/dealers'
          }
          method={editingDealer ? 'PUT' : 'POST'}
          initialData={
            editingDealer
              ? {
                  dealerId: editingDealer.dealerId,
                  name: editingDealer.name,
                  cellNo: editingDealer.cellNo,
                  area: editingDealer.area,
                  commission: editingDealer.commission,
                  address: editingDealer.address,
                  openingBalance: editingDealer.openingBalanceRaw,
                  status: editingDealer.statusRaw,
                  remarks: editingDealer.remarks,
                }
              : undefined
          }
          transformData={transformDealerData}
          context={{ areas }}
        />

        {/* VIEW DEALER MODAL */}
        {view && viewingDealer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setView(false);
                setViewingDealerId(null);
              }}
            />

            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center">
                    <Truck className="h-6 w-6 text-[#d6b138] dark:text-[#f7ce48]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {viewingDealer.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Dealer ID: {viewingDealer.dealerId}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setView(false);
                    setViewingDealerId(null);
                  }}
                  className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-4">
                <div className="flex justify-center">
                  <span
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm font-semibold inline-flex items-center gap-1.5',
                      viewingDealer.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    )}
                  >
                    {viewingDealer.isActive ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {viewingDealer.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ViewField
                    icon={<Hash className="h-4 w-4" />}
                    label="Dealer ID"
                    value={viewingDealer.dealerId}
                  />
                  <ViewField
                    icon={<Truck className="h-4 w-4" />}
                    label="Dealer Name"
                    value={viewingDealer.name}
                  />
                  <ViewField
                    icon={<Phone className="h-4 w-4" />}
                    label="Cell No."
                    value={viewingDealer.cellNo || '—'}
                  />
                  <ViewField
                    icon={<MapPin className="h-4 w-4" />}
                    label="Area"
                    value={viewingDealer.area || '—'}
                  />
                  <ViewField
                    icon={<Percent className="h-4 w-4" />}
                    label="Commission"
                    value={viewingDealer.commission}
                    highlight
                  />
                  <ViewField
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Opening Balance"
                    value={viewingDealer.openingBalance}
                  />
                  <ViewField
                    icon={<Home className="h-4 w-4" />}
                    label="Address"
                    value={viewingDealer.address || 'N/A'}
                    fullWidth
                  />
                  {viewingDealer.remarks && (
                    <ViewField
                      icon={<Hash className="h-4 w-4" />}
                      label="Remarks"
                      value={viewingDealer.remarks}
                      fullWidth
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  onClick={() => {
                    setView(false);
                    setViewingDealerId(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setView(false);
                    setViewingDealerId(null);
                    setEditingDealer(viewingDealer);
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

export default function DealersPage() {
  return (
    <Suspense fallback={spinner}>
      <DealersPageContent />
    </Suspense>
  );
}
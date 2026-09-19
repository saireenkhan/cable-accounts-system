'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import {
  MapPin,
  PlusCircle,
  Users,
  Edit2,
  Trash2,
  Building2,
  Home,
  Store,
  DollarSign,
  TrendingUp,
  CalendarDays,
  Clock,
  Eye,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Check,
  SlidersHorizontal,
  UserRound,
  Grid2X2,
  Wrench,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

const MONTHS = [
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
];

type AreaColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';

type Area = {
  id: string;
  name: string;
  code?: string;
  description?: string;

  // Optional fields are supported when the API provides them.
  region?: string;
  totalStreets: number;
  assignedDealer?: string;
  assignedTechnician?: string;

  customers: number;
  active: number;
  inactive: number;
  pending: number;
  collected: number;
  expected: number;
  recoveryRate: number;
  color: AreaColor;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type AreaFilter = 'all' | 'active' | 'inactive';

function currentMonthKey() {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

export default function AreasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AreaFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState<Area[]>([]);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const [areasRes, customersRes, paymentsRes] = await Promise.all([
        api.get('/areas'),
        api.get('/customers?limit=10000'),
        api.get('/payments'),
      ]);

      const customers = customersRes.data.success ? customersRes.data.customers : [];
      const payments = paymentsRes.data.success ? paymentsRes.data.payments : [];
      const thisMonth = currentMonthKey();

      const customerById: Record<string, { area: string; monthlyFee: number }> = {};
      const areaStats: Record<
        string,
        {
          customers: number;
          expected: number;
          active: number;
          inactive: number;
          pending: number;
        }
      > = {};

      customers.forEach((customer: any) => {
        const areaName =
          typeof customer.area === 'object'
            ? customer.area?.name
            : customer.area;

        if (!areaName) return;

        const fee = Number(customer.monthlyFee || 0);

        if (customer._id) {
          customerById[String(customer._id)] = {
            area: String(areaName),
            monthlyFee: fee,
          };
        }

        if (!areaStats[areaName]) {
          areaStats[areaName] = {
            customers: 0,
            expected: 0,
            active: 0,
            inactive: 0,
            pending: 0,
          };
        }

        areaStats[areaName].customers += 1;
        areaStats[areaName].expected += fee;

        const status = String(customer.status || '').toLowerCase();

        if (status === 'active') areaStats[areaName].active += 1;
        else if (status === 'inactive') areaStats[areaName].inactive += 1;
        else if (status === 'pending') areaStats[areaName].pending += 1;
      });

      const areaCollected: Record<string, number> = {};

      payments.forEach((payment: any) => {
        if (payment.isNoPayment) return;
        if (payment.month !== thisMonth) return;

        const customerId =
          typeof payment.customer === 'object'
            ? payment.customer?._id
            : payment.customer;

        if (!customerId) return;

        const customer = customerById[String(customerId)];
        if (!customer) return;

        areaCollected[customer.area] =
          (areaCollected[customer.area] || 0) + Number(payment.amount || 0);
      });

      if (areasRes.data.success && Array.isArray(areasRes.data.areas)) {
        const formattedAreas: Area[] = areasRes.data.areas.map(
          (area: any, index: number) => {
            const stats = areaStats[area.name] || {
              customers: 0,
              expected: 0,
              active: 0,
              inactive: 0,
              pending: 0,
            };

            const collected = areaCollected[area.name] || 0;

            const recoveryRate =
              stats.expected > 0
                ? Math.min(
                    100,
                    Math.round((collected / stats.expected) * 100)
                  )
                : 0;

            return {
              id: String(area._id),
              name: area.name || 'Unnamed Area',
              code: area.code || '',
              description: area.description || '',
              region: area.region || area.regionName || '',
              totalStreets: Number(
                area.totalStreets ?? area.streetCount ?? area.streetsCount ?? 0
              ),
              assignedDealer:
                area.assignedDealer?.name ||
                area.assignedDealerName ||
                area.dealer?.name ||
                area.dealerName ||
                '',
              assignedTechnician:
                area.assignedTechnician?.name ||
                area.assignedTechnicianName ||
                area.technician?.name ||
                area.technicianName ||
                '',
              customers: stats.customers,
              active: stats.active,
              inactive: stats.inactive,
              pending: stats.pending,
              collected,
              expected: stats.expected,
              recoveryRate,
              color: (['blue', 'green', 'purple', 'orange', 'red', 'indigo'][
                index % 6
              ] || 'blue') as AreaColor,
              createdAt: area.createdAt,
              updatedAt: area.updatedAt,
            };
          }
        );

        setAreas(formattedAreas);

        // Match the reference UI: the first card starts expanded.
        // setExpandedId((previous) => previous ?? formattedAreas[0]?.id ?? null);
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
      toast.error('Failed to load areas');
    } finally {
      setLoading(false);
    }
  };

  const handleAreaAdded = (data: any) => {
    toast.success(
      editingArea
        ? `Area "${data.name}" updated successfully!`
        : `Area "${data.name}" added successfully!`
    );

    setEditingArea(null);
    setIsModalOpen(false);
    fetchAreas();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.delete(`/areas/${id}`);

      setAreas((previous) =>
        previous.filter((area) => area.id !== id)
      );

      setExpandedId((previous) => (previous === id ? null : previous));

      if (editingArea?.id === id) {
        setEditingArea(null);
        setIsModalOpen(false);
      }

      toast.success(`Area "${name}" deleted`);
    } catch (error) {
      console.error('Error deleting area:', error);
      toast.error('Failed to delete area');
    }
  };

  const handleEdit = (area: Area, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setEditingArea(area);
    setIsModalOpen(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((previous) => (previous === id ? null : id));
  };

  const filteredAreas = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return areas.filter((area) => {
      const matchesSearch =
        !query ||
        area.name.toLowerCase().includes(query) ||
        area.code?.toLowerCase().includes(query) ||
        area.region?.toLowerCase().includes(query);

      const isActive = area.customers > 0;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [areas, searchQuery, statusFilter]);

  const colorMap: Record<
    AreaColor,
    {
      border: string;
      bg: string;
      icon: string;
      text: string;
      button: string;
    }
  > = {
    blue: {
      border: 'border-blue-50 dark:border-blue-800',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      icon: 'text-blue-600 dark:text-blue-400',
      text: 'text-sky-500 dark:text-blue-400',
      button: 'bg-sky-500 hover:bg-blue-700',
    },
    green: {
      border: 'border-blue-50 dark:border-blue-800',
      bg: 'bg-green-50 dark:bg-green-950/30',
      icon: 'text-green-600 dark:text-green-400',
      text: 'text-sky-500 dark:text-blue-400',
      button: 'bg-sky-500 hover:bg-blue-700',
    },
    purple: {
      border: 'border-blue-50 dark:border-blue-800',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      icon: 'text-purple-600 dark:text-purple-400',
      text: 'text-sky-500 dark:text-blue-400',
      button: 'bg-sky-500 hover:bg-blue-700',
    },
    orange: {
      border: 'border-blue-50 dark:border-blue-800',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      icon: 'text-orange-600 dark:text-orange-400',
      text: 'text-sky-500 dark:text-blue-400',
      button: 'bg-sky-500 hover:bg-blue-700',
    },
    red: {
      border: 'border-blue-50 dark:border-blue-800',
      bg: 'bg-red-50 dark:bg-red-950/30',
      icon: 'text-red-600 dark:text-red-400',
      text: 'text-sky-500 dark:text-blue-400',
      button: 'bg-sky-500 hover:bg-blue-700',
    },
    indigo: {
      border: 'border-blue-50 dark:border-blue-800',
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      icon: 'text-indigo-600 dark:text-indigo-400',
      text: 'text-sky-500 dark:text-blue-400',
      button: 'bg-sky-500 hover:bg-blue-700',
    },
  };

  const getAreaIcon = (name: string) => {
    const lower = name.toLowerCase();

    if (lower.includes('gulshan') || lower.includes('garden')) {
      return <Home className="h-5 w-5" />;
    }

    if (lower.includes('market') || lower.includes('mall')) {
      return <Store className="h-5 w-5" />;
    }

    if (lower.includes('colony') || lower.includes('town')) {
      return <Building2 className="h-5 w-5" />;
    }

    return <MapPin className="h-5 w-5" />;
  };

  const formatDate = (value?: string | Date) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return `${date.getDate()} ${
      MONTHS[date.getMonth()]
    } ${date.getFullYear()}`;
  };

  const areaFields: Field[] = [
    {
      name: 'name',
      label: 'Area Name',
      type: 'text',
      required: true,
      placeholder: 'Enter area name',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Optional description',
    },
  ];

  const transformAreaData = (data: any) => ({
    name: data.name,
    code: data.code || '',
    description: data.description || '',
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        {/* Search + filter row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <SearchBar
              placeholder="Search areas..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          <div className="relative w-full md:w-64">
            <button
              type="button"
              onClick={() => setIsFilterOpen((previous) => !previous)}
              className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              aria-expanded={isFilterOpen}
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                {statusFilter === 'all'
                  ? 'All Areas'
                  : statusFilter === 'active'
                  ? 'Active Areas'
                  : 'Inactive Areas'}
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-gray-400 transition-transform',
                  isFilterOpen && 'rotate-180'
                )}
              />
            </button>

            {isFilterOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 h-full w-full cursor-default"
                  aria-label="Close filter"
                  onClick={() => setIsFilterOpen(false)}
                />

                <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                  {[
                    { value: 'all' as AreaFilter, label: 'All Areas' },
                    { value: 'active' as AreaFilter, label: 'Active Areas' },
                    { value: 'inactive' as AreaFilter, label: 'Inactive Areas' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(option.value);
                        setIsFilterOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      {option.label}
                      {statusFilter === option.value && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Area cards */}
        {filteredAreas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              No areas found
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Try changing your search or filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredAreas.map((area) => {
              const colors = colorMap[area.color];
              const isExpanded = expandedId === area.id;
              const isActive = area.customers > 0;

              return (
                <article
                  key={area.id}
                  className={cn(
                    'relative w-full overflow-hidden rounded-xl border bg-white shadow-sm transition-all dark:bg-gray-800',
                    colors.border,
                    isExpanded && 'shadow-lg'
                  )}
                >
                  {/* Colored top border */}
                  <div className={cn('h-1.5 w-full',)} />

                  <div className="p-4">
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div
                          className={cn(
                            'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl',
                            colors.bg
                          )}
                        >
                          <span className={colors.icon}>
                            {getAreaIcon(area.name)}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold uppercase leading-tight text-gray-900 dark:text-white">
                            {area.name}
                          </h3>

                          {area.code && (
                            <p className="mt-1 truncate text-sm font-medium text-gray-600 dark:text-gray-300">
                              {area.code}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-semibold',
                            isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          )}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleExpand(area.id)}
                          className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          aria-label={
                            isExpanded
                              ? `Collapse ${area.name}`
                              : `Expand ${area.name}`
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Customer count */}
                    <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                      <Users className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {area.customers.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Customers
                      </span>
                    </div>

                    {/* Mini stats visible only when expanded */}
                    {isExpanded && (
                      <>
                        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                          <MiniStat
                            icon={<Users className="h-4 w-4 text-blue-500" />}
                            value={area.customers}
                            label="Customers"
                          />
                          <MiniStat
                            icon={
                              <UserCheck className="h-4 w-4 text-green-500" />
                            }
                            value={area.active}
                            label="Active"
                          />
                          <MiniStat
                            icon={
                              <UserX className="h-4 w-4 text-red-500" />
                            }
                            value={area.inactive}
                            label="Inactive"
                          />
                          <MiniStat
                            icon={<Clock className="h-4 w-4 text-orange-500" />}
                            value={area.pending}
                            label="Pending"
                          />
                        </div>

                        {/* Area information */}
                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                          {area.region && (
                            <InfoBlock
                              icon={
                                <MapPin className="h-4 w-4 text-gray-500" />
                              }
                              label="Region"
                              value={area.region}
                            />
                          )}

                          {area.totalStreets > 0 && (
                            <InfoBlock
                              icon={
                                <Grid2X2 className="h-4 w-4 text-gray-500" />
                              }
                              label="Total Streets"
                              value={area.totalStreets}
                            />
                          )}

                          {area.assignedDealer && (
                            <InfoBlock
                              icon={
                                <UserRound className="h-4 w-4 text-gray-500" />
                              }
                              label="Assigned Dealer"
                              value={area.assignedDealer}
                            />
                          )}

                          {area.assignedTechnician && (
                            <InfoBlock
                              icon={
                                <Wrench className="h-4 w-4 text-gray-500" />
                              }
                              label="Assigned Technician"
                              value={area.assignedTechnician}
                            />
                          )}

                          <InfoBlock
                            icon={
                              <DollarSign className="h-4 w-4 text-gray-500" />
                            }
                            label="Expected Amount"
                            value={`Rs. ${area.expected.toLocaleString()}`}
                          />

                          <InfoBlock
                            icon={
                              <DollarSign className="h-4 w-4 text-emerald-500" />
                            }
                            label="Total Collected"
                            value={`Rs. ${area.collected.toLocaleString()}`}
                          />

                          <InfoBlock
                            icon={
                              <TrendingUp className="h-4 w-4 text-orange-500" />
                            }
                            label="Recovery Rate"
                            value={`${area.recoveryRate}%`}
                            valueColor={
                              area.recoveryRate >= 80
                                ? 'text-green-600 dark:text-green-400'
                                : area.recoveryRate >= 50
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-red-600 dark:text-red-400'
                            }
                          />

                          <InfoBlock
                            icon={
                              <CalendarDays className="h-4 w-4 text-gray-400" />
                            }
                            label="Created On"
                            value={formatDate(area.createdAt)}
                          />

                          <InfoBlock
                            icon={
                              <Clock className="h-4 w-4 text-gray-400" />
                            }
                            label="Last Updated"
                            value={formatDate(area.updatedAt)}
                          />
                        </div>

                        {/* Recovery progress */}
                        <div className="mt-4">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-medium uppercase text-gray-500 dark:text-gray-400">
                              Monthly Recovery
                            </span>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                              {area.recoveryRate}%
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                area.recoveryRate >= 80
                                  ? 'bg-green-500'
                                  : area.recoveryRate >= 50
                                  ? 'bg-orange-500'
                                  : 'bg-red-500'
                              )}
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(0, area.recoveryRate)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={() => toggleExpand(area.id)}
                            className={cn(
                              'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition',
                              colors.button
                            )}
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </button>

                          <button
                            type="button"
                            onClick={(event) => handleEdit(area, event)}
                            className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-900/40"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit Area
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(area.id, area.name)}
                            className="flex items-center justify-center rounded-lg bg-red-50 px-3 py-2.5 text-red-600 transition hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
                            title={`Delete ${area.name}`}
                            aria-label={`Delete ${area.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}

                    {/* Collapsed footer */}
                    {!isExpanded && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(area.id)}
                        className={cn(
                          'mt-4 flex w-full items-center gap-1 border-t border-gray-100 pt-3 text-sm font-semibold transition-all hover:gap-2 dark:border-gray-700',
                          colors.text
                        )}
                      >
                        View Details
                        <span aria-hidden="true">→</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Add / Edit Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingArea(null);
          }}
          onSuccess={handleAreaAdded}
          title={editingArea ? 'Edit Area' : 'Add New Area'}
          subtitle={
            editingArea
              ? 'Update the area details below'
              : 'Create a new service area for customers'
          }
          fields={areaFields}
          submitLabel={editingArea ? 'Update Area' : 'Add Area'}
          color="blue"
          endpoint={editingArea ? `/areas/${editingArea.id}` : '/areas'}
          method={editingArea ? 'PUT' : 'POST'}
          initialData={
            editingArea
              ? {
                  name: editingArea.name,
                  code: editingArea.code || '',
                  description: editingArea.description || '',
                }
              : undefined
          }
          transformData={transformAreaData}
        />

        {/* Add Area button kept floating at the bottom-right so the card grid
            remains visually close to the reference design. */}
        <button
          type="button"
          onClick={() => {
            setEditingArea(null);
            setIsModalOpen(true);
          }}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-700"
        >
          <PlusCircle className="h-5 w-5" />
          Add Area
        </button>
      </div>
    </Layout>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="flex-shrink-0">{icon}</span>
        <span className="truncate text-base font-bold text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[9px] font-medium uppercase text-gray-500 dark:text-gray-400">
        {label}
      </p>
    </div>
  );
}

function InfoBlock({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-medium uppercase leading-tight text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p
          className={cn(
            'truncate text-xs font-semibold leading-tight sm:text-sm',
            valueColor || 'text-gray-900 dark:text-white'
          )}
          title={String(value)}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

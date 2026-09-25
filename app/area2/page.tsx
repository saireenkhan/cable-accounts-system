'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import {
  MapPin,
  PlusCircle,
  Truck,
  Edit2,
  Trash2,
  Building2,
  Home,
  Store,
  ChevronDown,
  ChevronUp,
  Check,
  SlidersHorizontal,
  MoreHorizontal,
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

type AreaColor =
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange'
  | 'red'
  | 'indigo';

type AreaFilter = 'all' | 'active' | 'inactive';

export default function DealerAreasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<AreaFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState<any[]>([]);
  const [editingArea, setEditingArea] =
    useState<any>(null);
  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const token = sessionStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return;
      }

      const [areasRes, dealersRes] =
        await Promise.all([
          api.get('/dealer-areas'),
          api.get('/dealers?limit=10000'),
        ]);

      const dealerCounts: Record<string, number> =
        {};

      if (dealersRes.data.success) {
        dealersRes.data.dealers.forEach(
          (dealer: any) => {
            const areaName =
              typeof dealer.area === 'object'
                ? dealer.area?.name
                : dealer.area;

            if (areaName) {
              dealerCounts[areaName] =
                (dealerCounts[areaName] || 0) + 1;
            }
          }
        );
      }

      if (
        areasRes.data.success &&
        Array.isArray(areasRes.data.areas)
      ) {
        const formattedAreas =
          areasRes.data.areas.map(
            (area: any, index: number) => ({
              id: String(area._id),
              name:
                area.name || 'Unnamed Area',
              code: area.code || '',
              description:
                area.description || '',
              dealers:
                dealerCounts[area.name] || 0,
              color:
                ([
                  'blue',
                  'green',
                  'purple',
                  'orange',
                  'red',
                  'indigo',
                ][index % 6] ||
                  'blue') as AreaColor,
              createdAt: area.createdAt,
              updatedAt: area.updatedAt,
            })
          );

        setAreas(formattedAreas);
      }
    } catch (error) {
      console.error(
        'Error fetching dealer areas:',
        error
      );

      toast.error(
        'Failed to load dealer areas'
      );
    } finally {
      setLoading(false);
    }
  };

  const totalAreas = areas.length;

  const totalDealers = areas.reduce(
    (sum, area) =>
      sum + (area.dealers || 0),
    0
  );

  const areaFields: Field[] = [
    {
      name: 'name',
      label: 'Dealer Area Name',
      type: 'text',
      required: true,
      placeholder:
        'Enter dealer area name',
    },
    {
      name: 'code',
      label: 'Area Code',
      type: 'text',
      placeholder: 'e.g., DLR-001',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder:
        'Optional description',
    },
  ];

  const transformAreaData = (data: any) => ({
    name: data.name?.trim() || '',
    code: data.code?.trim() || '',
    description:
      data.description?.trim() || '',
  });

  const handleAreaAdded = (data: any) => {
    toast.success(
      editingArea
        ? `Dealer area "${data.name}" updated successfully!`
        : `Dealer area "${data.name}" added successfully!`
    );

    setEditingArea(null);
    setIsModalOpen(false);
    fetchAreas();
  };

  const handleDelete = async (
    id: string,
    name: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete dealer area "${name}"?`
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/dealer-areas/${id}`
      );

      setAreas((previous) =>
        previous.filter(
          (area) => area.id !== id
        )
      );

      setExpandedId((previous) =>
        previous === id ? null : previous
      );

      if (editingArea?.id === id) {
        setEditingArea(null);
        setIsModalOpen(false);
      }

      toast.success(
        `Dealer area "${name}" deleted`
      );
    } catch {
      toast.error(
        'Failed to delete dealer area'
      );
    }
  };

  const handleEdit = (
    area: any,
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();
    setEditingArea(area);
    setIsModalOpen(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((previous) =>
      previous === id ? null : id
    );
  };

  const filteredAreas = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    return areas.filter((area) => {
      const matchesSearch =
        !query ||
        area.name
          .toLowerCase()
          .includes(query) ||
        area.code
          ?.toLowerCase()
          .includes(query);

      const isActive =
        area.dealers > 0;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' &&
          isActive) ||
        (statusFilter === 'inactive' &&
          !isActive);

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    areas,
    searchQuery,
    statusFilter,
  ]);

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
      border:
        'border-blue-200 dark:border-blue-800',
      bg:
        'bg-blue-50 dark:bg-blue-950/30',
      icon:
        'text-blue-600 dark:text-blue-400',
      text:
        'text-blue-600 dark:text-blue-400',
      button:
        'bg-blue-600 hover:bg-blue-700',
    },

    green: {
      border:
        'border-green-200 dark:border-green-800',
      bg:
        'bg-green-50 dark:bg-green-950/30',
      icon:
        'text-green-600 dark:text-green-400',
      text:
        'text-green-600 dark:text-green-400',
      button:
        'bg-green-600 hover:bg-green-700',
    },

    purple: {
      border:
        'border-purple-200 dark:border-purple-800',
      bg:
        'bg-purple-50 dark:bg-purple-950/30',
      icon:
        'text-purple-600 dark:text-purple-400',
      text:
        'text-purple-600 dark:text-purple-400',
      button:
        'bg-purple-600 hover:bg-purple-700',
    },

    orange: {
      border:
        'border-orange-200 dark:border-orange-800',
      bg:
        'bg-orange-50 dark:bg-orange-950/30',
      icon:
        'text-orange-600 dark:text-orange-400',
      text:
        'text-orange-600 dark:text-orange-400',
      button:
        'bg-orange-600 hover:bg-orange-700',
    },

    red: {
      border:
        'border-red-200 dark:border-red-800',
      bg:
        'bg-red-50 dark:bg-red-950/30',
      icon:
        'text-red-600 dark:text-red-400',
      text:
        'text-red-600 dark:text-red-400',
      button:
        'bg-red-600 hover:bg-red-700',
    },

    indigo: {
      border:
        'border-indigo-200 dark:border-indigo-800',
      bg:
        'bg-indigo-50 dark:bg-indigo-950/30',
      icon:
        'text-indigo-600 dark:text-indigo-400',
      text:
        'text-indigo-600 dark:text-indigo-400',
      button:
        'bg-indigo-600 hover:bg-indigo-700',
    },
  };

  const getAreaIcon = (
    name: string
  ) => {
    const lower =
      name?.toLowerCase() || '';

    if (
      lower.includes('gulshan') ||
      lower.includes('garden')
    ) {
      return (
        <Home className="h-5 w-5" />
      );
    }

    if (
      lower.includes('market') ||
      lower.includes('mall')
    ) {
      return (
        <Store className="h-5 w-5" />
      );
    }

    if (
      lower.includes('colony') ||
      lower.includes('town')
    ) {
      return (
        <Building2 className="h-5 w-5" />
      );
    }

    return (
      <Truck className="h-5 w-5" />
    );
  };

  const formatDate = (
    value?: string | Date
  ) => {
    if (!value) return '—';

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return '—';
    }

    return `${date.getDate()} ${
      MONTHS[date.getMonth()]
    } ${date.getFullYear()}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Truck className="h-8 w-8 text-amber-500" />

              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Dealer Areas / Streets
                </h1>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Organize dealers by service area.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingArea(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-[#d6b138] px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-[#f7ce48]"
          >
            <PlusCircle className="h-4 w-4" />
            Add Dealer Area
          </button>
        </div>

        {/* SEARCH + FILTER */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <SearchBar
              placeholder="Search dealer areas..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          <div className="relative w-full md:w-64">
            <button
              type="button"
              onClick={() =>
                setIsFilterOpen(
                  (previous) =>
                    !previous
                )
              }
              className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
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
                  isFilterOpen &&
                    'rotate-180'
                )}
              />
            </button>

            {isFilterOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 h-full w-full cursor-default"
                  onClick={() =>
                    setIsFilterOpen(
                      false
                    )
                  }
                  aria-label="Close filter"
                />

                <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                  {[
                    {
                      value:
                        'all' as AreaFilter,
                      label:
                        'All Areas',
                    },
                    {
                      value:
                        'active' as AreaFilter,
                      label:
                        'Active Areas',
                    },
                    {
                      value:
                        'inactive' as AreaFilter,
                      label:
                        'Inactive Areas',
                    },
                  ].map(
                    (option) => (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        onClick={() => {
                          setStatusFilter(
                            option.value
                          );
                          setIsFilterOpen(
                            false
                          );
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        {
                          option.label
                        }

                        {statusFilter ===
                          option.value && (
                          <Check className="h-4 w-4 text-amber-500" />
                        )}
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* CARDS */}
        {filteredAreas.length ===
        0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />

            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              No dealer areas found
            </p>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Try changing your
              search or filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredAreas.map(
              (area) => {
                const colors =
                  colorMap[
                    area.color as AreaColor
                  ];

                const isExpanded =
                  expandedId ===
                  area.id;

                const isActive =
                  area.dealers > 0;

                return (
                  <article
                    key={area.id}
                    className={cn(
                      'relative w-full overflow-hidden rounded-xl border bg-white shadow-sm transition-all dark:bg-gray-800',
                      colors.border,
                      isExpanded &&
                        'shadow-lg'
                    )}
                  >
                    <div className="p-5">

                      {/* CARD HEADER */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className={cn(
                              'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl',
                              colors.bg
                            )}
                          >
                            <span
                              className={
                                colors.icon
                              }
                            >
                              {getAreaIcon(
                                area.name
                              )}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-base font-bold uppercase leading-tight text-gray-900 dark:text-white">
                              {
                                area.name
                              }
                            </h3>

                            {area.code && (
                              <p className="mt-1 truncate text-sm font-medium text-gray-500 dark:text-gray-400">
                                {
                                  area.code
                                }
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
                            {isActive
                              ? 'Active'
                              : 'Inactive'}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              toggleExpand(
                                area.id
                              )
                            }
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                            aria-label={
                              isExpanded
                                ? 'Collapse'
                                : 'Expand'
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

                      {/* DEALER COUNT */}
                      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-400" />

                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Total Dealers
                          </span>
                        </div>

                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {(
                            area.dealers ||
                            0
                          ).toLocaleString()}
                        </span>
                      </div>

                      {/* EXPANDED CONTENT */}
                      {isExpanded && (
                        <>
                          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                            <InfoBlock
                              icon={
                                <Truck className="h-4 w-4 text-amber-500" />
                              }
                              label="Total Dealers"
                              value={
                                area.dealers ||
                                0
                              }
                            />

                            <InfoBlock
                              icon={
                                <MapPin className="h-4 w-4 text-gray-500" />
                              }
                              label="Area Code"
                              value={
                                area.code ||
                                '—'
                              }
                            />

                            <InfoBlock
                              icon={
                                <Home className="h-4 w-4 text-gray-400" />
                              }
                              label="Created On"
                              value={formatDate(
                                area.createdAt
                              )}
                            />

                            <InfoBlock
                              icon={
                                <Home className="h-4 w-4 text-gray-400" />
                              }
                              label="Last Updated"
                              value={formatDate(
                                area.updatedAt
                              )}
                            />
                          </div>

                          {/* ACTIONS */}
                          <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                            <button
                              type="button"
                              onClick={() =>
                                toggleExpand(
                                  area.id
                                )
                              }
                              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-3 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-slate-800"
                            >
                              View Details
                            </button>

                            <button
                              type="button"
                              onClick={(
                                event
                              ) =>
                                handleEdit(
                                  area,
                                  event
                                )
                              }
                              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/40"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit Area
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  area.id,
                                  area.name
                                )
                              }
                              className="flex items-center justify-center rounded-xl bg-red-50 px-3 py-2.5 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
                              aria-label={`Delete ${area.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      )}

                      {/* COLLAPSED FOOTER */}
                      {!isExpanded && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleExpand(
                              area.id
                            )
                          }
                          className={cn(
                            'mt-4 flex w-full items-center gap-1 border-t border-gray-100 pt-3 text-sm font-semibold transition-all hover:gap-2 dark:border-gray-700',
                            colors.text
                          )}
                        >
                          View Details
                          <span aria-hidden="true">
                            →
                          </span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}

        {/* MODAL */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingArea(null);
          }}
          onSuccess={
            handleAreaAdded
          }
          title={
            editingArea
              ? 'Edit Dealer Area'
              : 'Add New Dealer Area'
          }
          subtitle={
            editingArea
              ? 'Update the dealer area details below'
              : 'Create a new dealer service area'
          }
          fields={areaFields}
          submitLabel={
            editingArea
              ? 'Update Dealer Area'
              : 'Add Dealer Area'
          }
          color="blue"
          endpoint={
            editingArea
              ? `/dealer-areas/${editingArea.id}`
              : '/dealer-areas'
          }
          method={
            editingArea
              ? 'PUT'
              : 'POST'
          }
          initialData={
            editingArea
              ? {
                  name:
                    editingArea.name,
                  code:
                    editingArea.code ||
                    '',
                  description:
                    editingArea.description ||
                    '',
                }
              : undefined
          }
          transformData={
            transformAreaData
          }
        />
      </div>
    </Layout>
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
      <span className="mt-0.5 flex-shrink-0">
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-medium uppercase leading-tight text-gray-500 dark:text-gray-400">
          {label}
        </p>

        <p
          className={cn(
            'truncate text-xs font-semibold leading-tight sm:text-sm',
            valueColor ||
              'text-gray-900 dark:text-white'
          )}
          title={String(value)}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
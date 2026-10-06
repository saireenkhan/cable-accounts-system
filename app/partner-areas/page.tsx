'use client';

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Layout from '@/app/components/ui/Layout';

import {
  AddUserModal,
  Field,
} from '@/app/components/modals/AddUserModal';

import { SearchBar } from '@/app/components/ui/SearchBar';

import api from '@/app/lib/api';

import { useRouter } from 'next/navigation';

import {
  MapPin,
  PlusCircle,
  Users,
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
  Edit2,
  Trash2,
  Wifi,
} from 'lucide-react';

import { cn } from '@/app/lib/utils';

import toast from 'react-hot-toast';

/* ============================================================
   CONSTANTS
============================================================ */

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

/* ============================================================
   TYPES
============================================================ */

type PartnerArea = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  region?: string;

  totalStreets: number;

  assignedDealer?: string;
  assignedTechnician?: string;

  partners: number;
  active: number;
  inactive: number;
  pending: number;

  collected: number;
  expected: number;
  recoveryRate: number;

  /*
   * IMPORTANT:
   * Partner area can belong to MULTIPLE ISPs.
   */
  isp: string[];

  /*
   * IMPORTANT:
   * This fixes the TypeScript error:
   * colorMap[area.color]
   */
  color: AreaColor;

  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type AreaFilter =
  | 'all'
  | 'active'
  | 'inactive';

/* ============================================================
   HELPERS
============================================================ */

function currentMonthKey() {
  const now = new Date();

  return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

/* ============================================================
   PAGE
============================================================ */

export default function PartnerAreasPage() {
  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<AreaFilter>('all');

  const [isFilterOpen, setIsFilterOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [areas, setAreas] =
    useState<PartnerArea[]>([]);

  const [editingArea, setEditingArea] =
    useState<PartnerArea | null>(null);

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const [isps, setIsps] =
    useState<any[]>([]);

  const router = useRouter();

  /* ============================================================
     NAVIGATION
  ============================================================ */

  const goToAreaPartners = (
    areaName: string
  ) => {
    router.push(
      `/partners?area=${encodeURIComponent(
        areaName
      )}`
    );
  };

  /* ============================================================
     INITIAL LOAD
  ============================================================ */

  useEffect(() => {
    fetchAreas();
    fetchIsps();
  }, []);

  /* ============================================================
     FETCH ISPS
  ============================================================ */

  const fetchIsps = async () => {
    try {
      const { data } =
        await api.get('/isps');

      const list =
        data.success &&
        Array.isArray(data.isps)
          ? data.isps
          : [];

      setIsps(list);
    } catch (error) {
      console.error(
        'Error fetching ISPs:',
        error
      );

      setIsps([]);
    }
  };

  /* ============================================================
     NORMALIZE ISP ARRAY
  ============================================================ */

  const normalizeIspArray = (
    value: any
  ): string[] => {
    if (!value) {
      return [];
    }

    const values = Array.isArray(value)
      ? value
      : [value];

    return [
      ...new Set(
        values
          .map((item: any) => {
            if (
              item &&
              typeof item === 'object'
            ) {
              return String(
                item.name ||
                  item.ispName ||
                  ''
              ).trim();
            }

            return String(item).trim();
          })
          .filter(Boolean)
      ),
    ];
  };

  /* ============================================================
     RESOLVE ISP NAME
  ============================================================ */

  const resolveIspName = (
    raw: any
  ): string => {
    if (!raw) {
      return '';
    }

    /*
     * If an array somehow reaches here,
     * resolve all ISP names.
     */
    if (Array.isArray(raw)) {
      return raw
        .map((item) =>
          resolveIspName(item)
        )
        .filter(Boolean)
        .join(', ');
    }

    if (
      typeof raw === 'object'
    ) {
      return String(
        raw.name ||
          raw.ispName ||
          ''
      ).trim();
    }

    const rawString =
      String(raw).trim();

    const match =
      isps.find(
        (isp) =>
          String(isp._id) ===
            rawString ||
          String(isp.id) ===
            rawString ||
          String(
            isp.name
          ).toLowerCase() ===
            rawString.toLowerCase()
      );

    return (
      match?.name ||
      rawString
    );
  };

  /* ============================================================
     FETCH AREAS
  ============================================================ */

  const fetchAreas = async () => {
    try {
      const [
        areasRes,
        partnersRes,
        paymentsRes,
      ] = await Promise.all([
        api.get('/partner-areas'),
        api.get(
          '/partners?limit=10000'
        ),
        api.get(
          '/partner-payments'
        ),
      ]);

      const partners =
        partnersRes.data.success
          ? partnersRes.data
              .partners
          : [];

      const payments =
        paymentsRes.data.success
          ? paymentsRes.data
              .payments
          : [];

      const thisMonth =
        currentMonthKey();

      const areaLookup: Record<
        string,
        string
      > = {};

      const areaList: any[] =
        areasRes.data.success &&
        Array.isArray(
          areasRes.data.areas
        )
          ? areasRes.data.areas
          : [];

      /* --------------------------------------------------------
         AREA LOOKUP
      -------------------------------------------------------- */

      areaList.forEach(
        (area: any) => {
          const id = String(
            area._id
          );

          const name = String(
            area.name ||
              area.areaName ||
              id
          );

          areaLookup[id] =
            name;

          areaLookup[name] =
            name;
        }
      );

      /* --------------------------------------------------------
         RESOLVE PARTNER AREA
      -------------------------------------------------------- */

      const resolvePartnerArea = (
        raw: any
      ): string => {
        if (!raw) {
          return '';
        }

        if (
          typeof raw ===
            'object' &&
          raw.name
        ) {
          return String(
            raw.name
          );
        }

        const value =
          String(raw).trim();

        return (
          areaLookup[value] ||
          value
        );
      };

      /* --------------------------------------------------------
         PARTNER LOOKUP
      -------------------------------------------------------- */

      const partnerById: Record<
        string,
        {
          area: string;
          monthlyFee: number;
        }
      > = {};

      const areaStats: Record<
        string,
        {
          partners: number;
          expected: number;
          active: number;
          inactive: number;
          pending: number;
        }
      > = {};

      /* --------------------------------------------------------
         PROCESS PARTNERS
      -------------------------------------------------------- */

      partners.forEach(
        (partner: any) => {
          const areaName =
            resolvePartnerArea(
              partner.area ??
                partner.partnerAreaName ??
                partner.areaId
            );

          if (!areaName) {
            return;
          }

          const fee = Number(
            partner.monthlyFee ||
              0
          );

          if (partner._id) {
            partnerById[
              String(
                partner._id
              )
            ] = {
              area: areaName,
              monthlyFee: fee,
            };
          }

          if (
            !areaStats[
              areaName
            ]
          ) {
            areaStats[
              areaName
            ] = {
              partners: 0,
              expected: 0,
              active: 0,
              inactive: 0,
              pending: 0,
            };
          }

          areaStats[
            areaName
          ].partners += 1;

          areaStats[
            areaName
          ].expected += fee;

          const status =
            String(
              partner.status ||
                ''
            ).toLowerCase();

          if (
            status ===
            'active'
          ) {
            areaStats[
              areaName
            ].active += 1;
          } else if (
            status ===
            'inactive'
          ) {
            areaStats[
              areaName
            ].inactive += 1;
          } else if (
            status ===
            'pending'
          ) {
            areaStats[
              areaName
            ].pending += 1;
          }
        }
      );

      /* --------------------------------------------------------
         PAYMENTS
      -------------------------------------------------------- */

      const areaCollected: Record<
        string,
        number
      > = {};

      payments.forEach(
        (payment: any) => {
          if (
            payment.isNoPayment
          ) {
            return;
          }

          if (
            payment.month !==
            thisMonth
          ) {
            return;
          }

          const partnerId =
            typeof payment.partner ===
            'object'
              ? payment.partner?._id
              : payment.partner;

          if (!partnerId) {
            return;
          }

          const partner =
            partnerById[
              String(
                partnerId
              )
            ];

          if (!partner) {
            return;
          }

          areaCollected[
            partner.area
          ] =
            (areaCollected[
              partner.area
            ] || 0) +
            Number(
              payment.amount ||
                0
            );
        }
      );

      /* --------------------------------------------------------
         FORMAT AREAS
      -------------------------------------------------------- */

      if (
        areaList.length > 0
      ) {
        const formattedAreas: PartnerArea[] =
          areaList.map(
            (
              area: any,
              index: number
            ) => {
              const stats =
                areaStats[
                  area.name
                ] || {
                  partners: 0,
                  expected: 0,
                  active: 0,
                  inactive: 0,
                  pending: 0,
                };

              const collected =
                areaCollected[
                  area.name
                ] || 0;

              const recoveryRate =
                stats.expected >
                0
                  ? Math.min(
                      100,
                      Math.round(
                        (collected /
                          stats.expected) *
                          100
                      )
                    )
                  : 0;

              const colors: AreaColor[] =
                [
                  'blue',
                  'green',
                  'purple',
                  'orange',
                  'red',
                  'indigo',
                ];

              const color =
                colors[
                  index %
                    colors.length
                ];

              return {
                id: String(
                  area._id
                ),

                name:
                  area.name ||
                  'Unnamed Area',

                code:
                  area.code ||
                  '',

                description:
                  area.description ||
                  '',

                region:
                  area.region ||
                  area.regionName ||
                  '',

                totalStreets:
                  Number(
                    area.totalStreets ??
                      area.streetCount ??
                      area.streetsCount ??
                      0
                  ),

                assignedDealer:
                  area.assignedDealer
                    ?.name ||
                  area.assignedDealerName ||
                  area.dealer
                    ?.name ||
                  area.dealerName ||
                  '',

                assignedTechnician:
                  area.assignedTechnician
                    ?.name ||
                  area.assignedTechnicianName ||
                  area.technician
                    ?.name ||
                  area.technicianName ||
                  '',

                partners:
                  stats.partners,

                active:
                  stats.active,

                inactive:
                  stats.inactive,

                pending:
                  stats.pending,

                collected,

                expected:
                  stats.expected,

                recoveryRate,

                /*
                 * IMPORTANT:
                 * Always convert old string ISP
                 * into an array.
                 */
                isp:
                  normalizeIspArray(
                    area.isp
                  ),

                /*
                 * IMPORTANT:
                 * Explicitly typed as AreaColor.
                 */
                color,

                createdAt:
                  area.createdAt,

                updatedAt:
                  area.updatedAt,
              };
            }
          );

        setAreas(
          formattedAreas
        );
      } else {
        setAreas([]);
      }
    } catch (error) {
      console.error(
        'Error fetching areas:',
        error
      );

      toast.error(
        'Failed to load areas'
      );
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     SUCCESS
  ============================================================ */

  const handleAreaAdded = (
    data: any
  ) => {
    toast.success(
      editingArea
        ? `Area "${data.name}" updated successfully!`
        : `Area "${data.name}" added successfully!`
    );

    setEditingArea(null);
    setIsModalOpen(false);

    fetchAreas();
  };

  /* ============================================================
     DELETE
  ============================================================ */

  const handleDelete = async (
    id: string,
    name: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"?`
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/partner-areas/${id}`
      );

      setAreas(
        (previous) =>
          previous.filter(
            (area) =>
              area.id !== id
          )
      );

      setExpandedId(
        (previous) =>
          previous === id
            ? null
            : previous
      );

      if (
        editingArea?.id === id
      ) {
        setEditingArea(null);
        setIsModalOpen(false);
      }

      toast.success(
        `Area "${name}" deleted`
      );
    } catch (error) {
      console.error(
        'Error deleting area:',
        error
      );

      toast.error(
        'Failed to delete area'
      );
    }
  };

  /* ============================================================
     EDIT
  ============================================================ */

  const handleEdit = (
    area: PartnerArea,
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();

    setEditingArea(area);
    setIsModalOpen(true);
  };

  /* ============================================================
     EXPAND
  ============================================================ */

  const toggleExpand = (
    id: string
  ) => {
    setExpandedId(
      (previous) =>
        previous === id
          ? null
          : id
    );
  };

  /* ============================================================
     FILTER AREAS
  ============================================================ */

  const filteredAreas =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      return areas.filter(
        (area) => {
          const ispText =
            Array.isArray(
              area.isp
            )
              ? area.isp.join(
                  ' '
                )
              : '';

          const matchesSearch =
            !query ||
            area.name
              .toLowerCase()
              .includes(query) ||
            area.code
              ?.toLowerCase()
              .includes(query) ||
            area.region
              ?.toLowerCase()
              .includes(query) ||
            ispText
              .toLowerCase()
              .includes(
                query
              );

          const isActive =
            area.partners > 0;

          const matchesStatus =
            statusFilter ===
              'all' ||
            (statusFilter ===
              'active' &&
              isActive) ||
            (statusFilter ===
              'inactive' &&
              !isActive);

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      areas,
      searchQuery,
      statusFilter,
    ]);

  /* ============================================================
     COLORS
  ============================================================ */

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
        'border-blue-50 dark:border-blue-800',
      bg:
        'bg-blue-50 dark:bg-blue-950/30',
      icon:
        'text-blue-600 dark:text-blue-400',
      text:
        'text-sky-500 dark:text-blue-400',
      button:
        'bg-[#d6b138] hover:bg-[#f7ce48]',
    },

    green: {
      border:
        'border-blue-50 dark:border-blue-800',
      bg:
        'bg-green-50 dark:bg-green-950/30',
      icon:
        'text-green-600 dark:text-green-400',
      text:
        'text-sky-500 dark:text-blue-400',
      button:
        'bg-[#d6b138] hover:bg-[#f7ce48]',
    },

    purple: {
      border:
        'border-blue-50 dark:border-blue-800',
      bg:
        'bg-purple-50 dark:bg-purple-950/30',
      icon:
        'text-purple-600 dark:text-purple-400',
      text:
        'text-sky-500 dark:text-blue-400',
      button:
        'bg-[#d6b138] hover:bg-[#f7ce48]',
    },

    orange: {
      border:
        'border-blue-50 dark:border-blue-800',
      bg:
        'bg-orange-50 dark:bg-orange-950/30',
      icon:
        'text-orange-600 dark:text-orange-400',
      text:
        'text-sky-500 dark:text-blue-400',
      button:
        'bg-[#d6b138] hover:bg-[#f7ce48]',
    },

    red: {
      border:
        'border-blue-50 dark:border-blue-800',
      bg:
        'bg-red-50 dark:bg-red-950/30',
      icon:
        'text-red-600 dark:text-red-400',
      text:
        'text-sky-500 dark:text-blue-400',
      button:
        'bg-[#d6b138] hover:bg-[#f7ce48]',
    },

    indigo: {
      border:
        'border-blue-50 dark:border-blue-800',
      bg:
        'bg-indigo-50 dark:bg-indigo-950/30',
      icon:
        'text-indigo-600 dark:text-indigo-400',
      text:
        'text-sky-500 dark:text-blue-400',
      button:
        'bg-[#d6b138] hover:bg-[#f7ce48]',
    },
  };

  /* ============================================================
     AREA ICON
  ============================================================ */

  const getAreaIcon = (
    name: string
  ) => {
    const lower =
      name.toLowerCase();

    if (
      lower.includes(
        'gulshan'
      ) ||
      lower.includes(
        'garden'
      )
    ) {
      return (
        <Home className="h-5 w-5" />
      );
    }

    if (
      lower.includes(
        'market'
      ) ||
      lower.includes(
        'mall'
      )
    ) {
      return (
        <Store className="h-5 w-5" />
      );
    }

    if (
      lower.includes(
        'colony'
      ) ||
      lower.includes(
        'town'
      )
    ) {
      return (
        <Building2 className="h-5 w-5" />
      );
    }

    return (
      <MapPin className="h-5 w-5" />
    );
  };

  /* ============================================================
     FORMAT DATE
  ============================================================ */

  const formatDate = (
    value?: string | Date
  ) => {
    if (!value) {
      return '—';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '—';
    }

    return `${date.getDate()} ${
      MONTHS[
        date.getMonth()
      ]
    } ${date.getFullYear()}`;
  };

  /* ============================================================
     AREA FORM
  ============================================================ */

  const areaFields: Field[] = [
    {
      name: 'name',
      label: 'Area Name',
      type: 'text',
      required: true,
      placeholder:
        'Enter area name',
    },
    ...(isps.length > 0
      ? [
          {
            name: 'isp',
            label: 'ISP',
            type: 'select' as const,
            required: true,
            searchable: true,

            /*
             * IMPORTANT:
             * Partner Area supports
             * MULTIPLE ISPs.
             */
            multiple: true,

            placeholder:
              'Select ISP(s)',

            options:
              isps.map(
                (isp: any) => ({
                  label:
                    isp.name,
                  value:
                    isp.name,
                })
              ),
          },
        ]
      : []),
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder:
        'Optional description',
    },
  ];

  /* ============================================================
     TRANSFORM AREA DATA
  ============================================================ */

  const transformAreaData = (
    data: any
  ) => {
    const normalizedIsps =
      normalizeIspArray(
        data.isp
      );

    if (
      normalizedIsps.length ===
      0
    ) {
      throw new Error(
        'At least one ISP is required.'
      );
    }

    return {
      name:
        data.name,

      code:
        data.code || '',

      description:
        data.description ||
        '',

      /*
       * ALWAYS SEND ARRAY
       */
      isp: normalizedIsps,
    };
  };

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <Layout>
      <div className="space-y-4">

        {/* ==================================================
            TOP ACTIONS
        ================================================== */}

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              setEditingArea(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-[#D9A82E] px-4 py-3 text-sm text-white"
          >
            <PlusCircle className="h-5 w-5 text-white-900" />

            Add Area
          </button>
        </div>

        {/* ==================================================
            SEARCH + FILTER
        ================================================== */}

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <SearchBar
              placeholder="Search partner areas..."
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
              className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              aria-expanded={
                isFilterOpen
              }
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-gray-400" />

                {statusFilter ===
                'all'
                  ? 'All Partner Areas'
                  : statusFilter ===
                    'active'
                  ? 'Active Partner Areas'
                  : 'Inactive Partner Areas'}
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
                  aria-label="Close filter"
                  onClick={() =>
                    setIsFilterOpen(
                      false
                    )
                  }
                />

                <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                  {[
                    {
                      value:
                        'all' as AreaFilter,
                      label:
                        'All Partner Areas',
                    },
                    {
                      value:
                        'active' as AreaFilter,
                      label:
                        'Active Partner Areas',
                    },
                    {
                      value:
                        'inactive' as AreaFilter,
                      label:
                        'Inactive Partner Areas',
                    },
                  ].map(
                    (
                      option
                    ) => (
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
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        {
                          option.label
                        }

                        {statusFilter ===
                          option.value && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ==================================================
            AREA CARDS
        ================================================== */}

        {filteredAreas.length ===
        0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-gray-300" />

            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              No partner areas found
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
                /*
                 * FIX:
                 * area.color is now AreaColor,
                 * therefore this is type-safe.
                 */
                const colors =
                  colorMap[
                    area.color
                  ];

                const isExpanded =
                  expandedId ===
                  area.id;

                const isActive =
                  area.partners >
                  0;

                return (
                  <article
                    key={
                      area.id
                    }
                    className={cn(
                      'relative w-full overflow-hidden rounded-xl border bg-white shadow-sm transition-all dark:bg-gray-800',
                      colors.border,
                      isExpanded &&
                        'shadow-lg'
                    )}
                  >
                    <div className="h-1.5 w-full" />

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div
                            className={cn(
                              'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl',
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
                              <p className="mt-1 truncate text-sm font-medium text-gray-600 dark:text-gray-300">
                                {
                                  area.code
                                }
                              </p>
                            )}

                            {/* MULTIPLE ISP DISPLAY */}

                            {area.isp.length >
                              0 && (
                              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                                <Wifi className="h-3 w-3 flex-shrink-0 text-blue-600 dark:text-blue-400" />

                                {area.isp.map(
                                  (
                                    ispName
                                  ) => (
                                    <span
                                      key={
                                        ispName
                                      }
                                      className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                    >
                                      {
                                        ispName
                                      }
                                    </span>
                                  )
                                )}
                              </div>
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

                      {/* USER COUNT ROW */}

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />

                          <span className="text-xl font-bold text-gray-900 dark:text-white">
                            {area.partners.toLocaleString()}
                          </span>

                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Users
                          </span>
                        </div>

                        {!isExpanded && (
                          <div className="flex flex-shrink-0 items-center gap-1.5">
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
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400"
                              aria-label={`Edit ${area.name}`}
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  area.id,
                                  area.name
                                )
                              }
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                              aria-label={`Delete ${area.name}`}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* EXPANDED CONTENT */}

                      {isExpanded && (
                        <>
                          <div className="mt-4 grid grid-cols-4 gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                            <MiniStat
                              icon={
                                <Users className="h-4 w-4 text-blue-500" />
                              }
                              value={
                                area.partners
                              }
                              label="Users"
                            />

                            <MiniStat
                              icon={
                                <UserCheck className="h-4 w-4 text-green-500" />
                              }
                              value={
                                area.active
                              }
                              label="Active"
                            />

                            <MiniStat
                              icon={
                                <UserX className="h-4 w-4 text-red-500" />
                              }
                              value={
                                area.inactive
                              }
                              label="Inactive"
                            />

                            <MiniStat
                              icon={
                                <Clock className="h-4 w-4 text-orange-500" />
                              }
                              value={
                                area.pending
                              }
                              label="Pending"
                            />
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-3 dark:border-gray-700">

                            {/* MULTIPLE ISP INFO */}

                            {area.isp.length >
                              0 && (
                              <InfoBlock
                                icon={
                                  <Wifi className="h-4 w-4 text-blue-500" />
                                }
                                label="ISP"
                                value={
                                  <div className="flex flex-wrap gap-1">
                                    {area.isp.map(
                                      (
                                        ispName
                                      ) => (
                                        <span
                                          key={
                                            ispName
                                          }
                                          className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                        >
                                          {
                                            ispName
                                          }
                                        </span>
                                      )
                                    )}
                                  </div>
                                }
                              />
                            )}

                            {area.region && (
                              <InfoBlock
                                icon={
                                  <MapPin className="h-4 w-4 text-gray-500" />
                                }
                                label="Region"
                                value={
                                  area.region
                                }
                              />
                            )}

                            {area.totalStreets >
                              0 && (
                              <InfoBlock
                                icon={
                                  <Grid2X2 className="h-4 w-4 text-gray-500" />
                                }
                                label="Total Streets"
                                value={
                                  area.totalStreets
                                }
                              />
                            )}

                            {area.assignedDealer && (
                              <InfoBlock
                                icon={
                                  <UserRound className="h-4 w-4 text-gray-500" />
                                }
                                label="Assigned Dealer"
                                value={
                                  area.assignedDealer
                                }
                              />
                            )}

                            {area.assignedTechnician && (
                              <InfoBlock
                                icon={
                                  <Wrench className="h-4 w-4 text-gray-500" />
                                }
                                label="Assigned Technician"
                                value={
                                  area.assignedTechnician
                                }
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
                                area.recoveryRate >=
                                80
                                  ? 'text-green-600 dark:text-green-400'
                                  : area.recoveryRate >=
                                    50
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-red-600 dark:text-red-400'
                              }
                            />

                            <InfoBlock
                              icon={
                                <CalendarDays className="h-4 w-4 text-gray-400" />
                              }
                              label="Created On"
                              value={formatDate(
                                area.createdAt
                              )}
                            />

                            <InfoBlock
                              icon={
                                <Clock className="h-4 w-4 text-gray-400" />
                              }
                              label="Last Updated"
                              value={formatDate(
                                area.updatedAt
                              )}
                            />
                          </div>

                          {/* RECOVERY */}

                          <div className="mt-4">
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-[10px] font-medium uppercase text-gray-500 dark:text-gray-400">
                                Monthly Recovery
                              </span>

                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                {
                                  area.recoveryRate
                                }
                                %
                              </span>
                            </div>

                            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  area.recoveryRate >=
                                    80
                                    ? 'bg-green-500'
                                    : area.recoveryRate >=
                                      50
                                    ? 'bg-orange-500'
                                    : 'bg-red-500'
                                )}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      area.recoveryRate
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* ACTIONS */}

                          <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                            <button
                              type="button"
                              onClick={() =>
                                goToAreaPartners(
                                  area.name
                                )
                              }
                              className={cn(
                                'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition',
                                colors.button
                              )}
                            >
                              <Users className="h-4 w-4" />

                              View Customers
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleExpand(
                                  area.id
                                )
                              }
                              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                            >
                              <Eye className="h-4 w-4" />

                              View Details
                            </button>
                          </div>
                        </>
                      )}

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

        {/* ==================================================
            ADD / EDIT MODAL
        ================================================== */}

        <AddUserModal
          isOpen={
            isModalOpen
          }
          onClose={() => {
            setIsModalOpen(
              false
            );

            setEditingArea(
              null
            );
          }}
          onSuccess={
            handleAreaAdded
          }
          title={
            editingArea
              ? 'Edit Partner Area'
              : 'Add New Area'
          }
          subtitle={
            editingArea
              ? 'Update the partner area details below'
              : 'Create a new service area for partners'
          }
          fields={
            areaFields
          }
          submitLabel={
            editingArea
              ? 'Update Area'
              : 'Add Partner Area'
          }
          color="blue"
          endpoint={
            editingArea
              ? `/partner-areas/${editingArea.id}`
              : '/partner-areas'
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

                  /*
                   * IMPORTANT:
                   * Multi-select MUST receive
                   * an array.
                   */
                  isp:
                    Array.isArray(
                      editingArea.isp
                    )
                      ? editingArea.isp
                      : editingArea.isp
                      ? [
                          editingArea.isp,
                        ]
                      : [],
                }
              : {
                  name: '',
                  code: '',
                  description: '',
                  isp: [],
                }
          }
          transformData={
            transformAreaData
          }
        />
      </div>
    </Layout>
  );
}

/* ============================================================
   MINI STAT
============================================================ */

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
        <span className="flex-shrink-0">
          {icon}
        </span>

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

/* ============================================================
   INFO BLOCK
============================================================ */

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
          title={
            typeof value ===
            'string'
              ? value
              : undefined
          }
        >
          {value}
        </p>
      </div>
    </div>
  );
}
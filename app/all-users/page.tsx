
'use client';

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/app/components/ui/Layout';
import api from '@/app/lib/api';

import {
  ArrowLeft,
  Search,
  Users,
  RefreshCw,
  X,
  Server,
  UserCheck,
  UserRound,
  Handshake,
} from 'lucide-react';

import toast from 'react-hot-toast';

type NamedReference = {
  _id?: string;
  name?: string;
};

type NamedValue = string | NamedReference | null;

type RecordType = 'customer' | 'partner';

type UserRecord = {
  _id: string;
  customerId?: string;
  partnerId?: string;
  name?: string;
  phone?: string;
  area?: NamedValue;
  isp?: NamedValue;
  package?: NamedValue;
  monthlyFee?: number;
  status?: string;
  recordType: RecordType;
};

type ApiPayload = {
  success?: boolean;
  users?: UserRecord[];
  customers?: UserRecord[];
  partners?: UserRecord[];
  data?:
    | UserRecord[]
    | {
        users?: UserRecord[];
        customers?: UserRecord[];
        partners?: UserRecord[];
      };
};

type StatFilter = 'all' | 'active' | 'customer' | 'partner';

function displayName(value: NamedValue | undefined): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value && typeof value === 'object') {
    return String(value.name || value._id || '').trim();
  }

  return '';
}

function extractRecords(
  payload: ApiPayload | UserRecord[],
  type: RecordType
): UserRecord[] {
  let records: UserRecord[] | undefined;

  if (Array.isArray(payload)) {
    records = payload;
  } else {
    const data = payload.data;

    records =
      type === 'customer'
        ? payload.customers
        : payload.partners;

    if (!Array.isArray(records)) {
      records = payload.users;
    }

    if (!Array.isArray(records) && Array.isArray(data)) {
      records = data;
    }

    if (
      !Array.isArray(records) &&
      data &&
      !Array.isArray(data)
    ) {
      records =
        type === 'customer'
          ? data.customers
          : data.partners;

      if (!Array.isArray(records)) {
        records = data.users;
      }
    }
  }

  if (!Array.isArray(records)) {
    throw new Error(
      `Unexpected ${type} API response format.`
    );
  }

  return records.map((record) => ({
    ...record,
    recordType: type,
  }));
}

function getStatus(record: UserRecord): string {
  return String(record.status || '').trim().toLowerCase();
}

function UsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedISP = searchParams.get('isp')?.trim() || '';

  const [customers, setCustomers] = useState<UserRecord[]>([]);
  const [partners, setPartners] = useState<UserRecord[]>([]);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const [statFilter, setStatFilter] =
    useState<StatFilter>('all');

  const pageSize = 20;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const results = await Promise.allSettled([
        api.get<ApiPayload | UserRecord[]>('/customers'),
        api.get<ApiPayload | UserRecord[]>('/partners'),
      ]);

      const customerResult = results[0];
      const partnerResult = results[1];

      const errors: string[] = [];

      if (customerResult.status === 'fulfilled') {
        try {
          setCustomers(
            extractRecords(customerResult.value.data, 'customer')
          );
        } catch (err) {
          setCustomers([]);
          errors.push(
            err instanceof Error
              ? err.message
              : 'Invalid customer response'
          );
        }
      } else {
        console.error(
          'Customer API error:',
          customerResult.reason
        );
        setCustomers([]);
        errors.push('Failed to load customers');
      }

      if (partnerResult.status === 'fulfilled') {
        try {
          setPartners(
            extractRecords(partnerResult.value.data, 'partner')
          );
        } catch (err) {
          setPartners([]);
          errors.push(
            err instanceof Error
              ? err.message
              : 'Invalid partner response'
          );
        }
      } else {
        console.error(
          'Partner API error:',
          partnerResult.reason
        );
        setPartners([]);
        errors.push('Failed to load partners');
      }

      if (errors.length > 0) {
        const message = errors.join('. ');
        setError(message);
        toast.error(message);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users.');
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setPage(1);
  }, [selectedISP, search, statFilter]);

  // Merge both MongoDB collections.
  const allUsers = useMemo(() => {
    return [...customers, ...partners];
  }, [customers, partners]);

  // Apply ISP filtering before calculating statistics.
  const ispUsers = useMemo(() => {
    const isp = selectedISP.toLowerCase();

    if (!isp) return allUsers;

    return allUsers.filter(
      (record) =>
        displayName(record.isp).toLowerCase() === isp
    );
  }, [allUsers, selectedISP]);

  // Statistics based on records belonging to selected ISP.
  const stats = useMemo(() => {
    return {
      total: ispUsers.length,

      active: ispUsers.filter(
        (record) => getStatus(record) === 'active'
      ).length,

      customer: ispUsers.filter(
        (record) => record.recordType === 'customer'
      ).length,

      partner: ispUsers.filter(
        (record) => record.recordType === 'partner'
      ).length,
    };
  }, [ispUsers]);

  // Apply clickable card filter and search.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return ispUsers.filter((record) => {
      if (
        statFilter === 'active' &&
        getStatus(record) !== 'active'
      ) {
        return false;
      }

      if (
        statFilter === 'customer' &&
        record.recordType !== 'customer'
      ) {
        return false;
      }

      if (
        statFilter === 'partner' &&
        record.recordType !== 'partner'
      ) {
        return false;
      }

      if (!term) return true;

      return [
        record.customerId,
        record.partnerId,
        record.name,
        record.phone,
        displayName(record.isp),
        displayName(record.area),
        displayName(record.package),
        record.status,
        record.recordType,
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(term)
      );
    });
  }, [ispUsers, statFilter, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / pageSize)
  );

  const visible = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const statCards = [
    {
      id: 'all' as const,
      title: 'Total Users',
      value: stats.total,
      icon: Users,
      color: 'text-blue-600',
      background: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      id: 'active' as const,
      title: 'Active Users',
      value: stats.active,
      icon: UserCheck,
      color: 'text-green-600',
      background: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      id: 'customer' as const,
      title: 'Customer Users',
      value: stats.customer,
      icon: UserRound,
      color: 'text-purple-600',
      background: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      id: 'partner' as const,
      title: 'Partner Users',
      value: stats.partner,
      icon: Handshake,
      color: 'text-cyan-600',
      background: 'bg-cyan-50 dark:bg-cyan-950/30',
    },
  ];

  return (
    <Layout>
      <div className="space-y-5 pb-8">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
              <Users className="h-6 w-6 text-blue-600" />
              All Users
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {selectedISP
                ? `Users connected to ${selectedISP}`
                : 'View customer and partner records'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push('/ISP')}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />
              ISPs
            </button>

            <button
              type="button"
              onClick={() => void loadUsers()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* ISP FILTER */}
        {selectedISP && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Showing users for ISP:
              <strong>{selectedISP}</strong>
            </div>

            <button
              type="button"
              onClick={() => router.push('/all-users')}
              className="flex items-center gap-1 font-semibold hover:underline"
            >
              <X className="h-4 w-4" />
              Clear ISP Filter
            </button>
          </div>
        )}

        {/* STATISTICS GRID */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            const selected = statFilter === card.id;

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setStatFilter(card.id)}
                aria-pressed={selected}
                className={`rounded-xl border bg-white p-5 text-left shadow-sm transition hover:shadow-md dark:bg-gray-800 ${
                  selected
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div
                  className={`inline-flex rounded-xl p-3 ${card.background}`}
                >
                  <Icon
                    className={`h-6 w-6 ${card.color}`}
                  />
                </div>

                <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {card.title}
                </p>

                <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {loading
                    ? '...'
                    : card.value.toLocaleString()}
                </h3>
              </button>
            );
          })}
        </div>

        {/* TABLE */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search ID, name, phone, ISP, area..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-3">
              {statFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setStatFilter('all')}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                >
                  <X className="h-4 w-4" />
                  Clear Filter
                </button>
              )}

              <span className="text-sm text-gray-500 dark:text-gray-400">
                {loading
                  ? 'Loading...'
                  : `${filtered.length} user${
                      filtered.length === 1 ? '' : 's'
                    }`}
              </span>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">User ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">ISP</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">Package</th>
                  <th className="px-4 py-3">Monthly Fee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Type</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      No users found
                      {selectedISP
                        ? ` for ${selectedISP}`
                        : ''}
                      .
                    </td>
                  </tr>
                ) : (
                  visible.map((record) => (
                    <tr
                      key={`${record.recordType}-${record._id}`}
                      className="text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-4 py-3 font-semibold">
                        {record.recordType === 'partner'
                          ? record.partnerId || '—'
                          : record.customerId || '—'}
                      </td>

                      <td className="px-4 py-3">
                        {record.name || '—'}
                      </td>

                      <td className="px-4 py-3">
                        {record.phone || '—'}
                      </td>

                      <td className="px-4 py-3">
                        {displayName(record.isp) || '—'}
                      </td>

                      <td className="px-4 py-3">
                        {displayName(record.area) || '—'}
                      </td>

                      <td className="px-4 py-3">
                        {displayName(record.package) || '—'}
                      </td>

                      <td className="px-4 py-3">
                        {typeof record.monthlyFee === 'number'
                          ? `PKR ${record.monthlyFee.toLocaleString()}`
                          : '—'}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            getStatus(record) === 'active'
                              ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {record.status || '—'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            record.recordType === 'partner'
                              ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400'
                              : 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400'
                          }`}
                        >
                          {record.recordType === 'partner'
                            ? 'Partner'
                            : 'Customer'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-end gap-3 text-sm text-gray-700 dark:text-gray-200">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() =>
                  setPage((previous) => previous - 1)
                }
                className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-gray-600"
              >
                Previous
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((previous) => previous + 1)
                }
                className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-gray-600"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Next.js 16 production build fix:
// useSearchParams must be inside a Suspense boundary.
export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <div className="flex min-h-[400px] items-center justify-center">
            <RefreshCw className="mr-3 h-6 w-6 animate-spin text-blue-600" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Loading users...
            </span>
          </div>
        </Layout>
      }
    >
      <UsersPageContent />
    </Suspense>
  );
}

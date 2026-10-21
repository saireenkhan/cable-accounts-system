'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/app/components/ui/Layout';
import api from '@/app/lib/api';
import { ArrowLeft, Search, Users, RefreshCw, X, Server, UserCheck, UserRound, Handshake } from 'lucide-react';
import toast from 'react-hot-toast';

type Ref = string | { _id?: string; name?: string } | null;
type Kind = 'customer' | 'partner';
type RecordItem = {
  _id: string;
  customerId?: string;
  partnerId?: string;
  name?: string;
  phone?: string;
  area?: Ref;
  isp?: Ref;
  package?: Ref;
  monthlyFee?: number;
  status?: string;
  kind: Kind;
};
type Filter = 'all' | 'active' | 'customer' | 'partner';

function label(value: Ref | undefined): string {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') return String(value.name || value._id || '').trim();
  return '';
}

function unpack(payload: unknown, kind: Kind): RecordItem[] {
  if (!payload || typeof payload !== 'object') throw new Error(`Unexpected ${kind} API response`);
  const p = payload as Record<string, unknown>;
  const nested = p.data && typeof p.data === 'object' && !Array.isArray(p.data)
    ? p.data as Record<string, unknown> : {};
  const list = [payload, p.customers, p.partners, p.users, p.data,
    nested.customers, nested.partners, nested.users].find(Array.isArray);
  if (!Array.isArray(list)) throw new Error(`No ${kind} array in API response`);
  return list.map((item: Omit<RecordItem, 'kind'>) => ({ ...item, kind }));
}

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedISP = searchParams.get('isp')?.trim() || '';
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageSize = 20;

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Both prefixes are registered in your Express app.js.
      // Each router must implement GET / and return its records.
      const [customerResponse, partnerResponse] = await Promise.all([
        api.get('/customers'),
        api.get('/partners'),
      ]);
      setRecords([
        ...unpack(customerResponse.data, 'customer'),
        ...unpack(partnerResponse.data, 'partner'),
      ]);
    } catch (err: unknown) {
      console.error('Failed to load users:', err);
      const e = err as { response?: { status?: number; config?: { url?: string } }; message?: string };
      const message = e.response?.status === 404
        ? 'Customer or Partner list endpoint not found. Verify GET / in customerRoutes.js and partnerRoutes.js.'
        : e.message || 'Failed to load users';
      setError(message);
      setRecords([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRecords(); }, [loadRecords]);
  useEffect(() => { setPage(1); }, [selectedISP, search, filter]);

  const ispRecords = useMemo(() => {
    if (!selectedISP) return records;
    const isp = selectedISP.toLowerCase();
    return records.filter((item) => label(item.isp).toLowerCase() === isp);
  }, [records, selectedISP]);

  const stats = useMemo(() => ({
    all: ispRecords.length,
    active: ispRecords.filter((item) => item.status?.toLowerCase() === 'active').length,
    customer: ispRecords.filter((item) => item.kind === 'customer').length,
    partner: ispRecords.filter((item) => item.kind === 'partner').length,
  }), [ispRecords]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ispRecords.filter((item) => {
      if (filter === 'active' && item.status?.toLowerCase() !== 'active') return false;
      if ((filter === 'customer' || filter === 'partner') && item.kind !== filter) return false;
      if (!term) return true;
      return [item.customerId, item.partnerId, item.name, item.phone, label(item.isp),
        label(item.area), label(item.package), item.status, item.kind]
        .some((v) => String(v ?? '').toLowerCase().includes(term));
    });
  }, [ispRecords, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const cards = [
    { id: 'all' as const, title: 'Total Users', count: stats.all, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { id: 'active' as const, title: 'Active Users', count: stats.active, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
    { id: 'customer' as const, title: 'Customer Users', count: stats.customer, icon: UserRound, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
    { id: 'partner' as const, title: 'Partner Users', count: stats.partner, icon: Handshake, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
  ];

  return (
    <Layout>
      <div className="space-y-5 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white"><Users className="h-6 w-6 text-blue-600" />All Users</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{selectedISP ? `Users connected to ${selectedISP}` : 'View customer and partner records'}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => router.push('/ISP')} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"><ArrowLeft className="h-4 w-4" /> ISPs</button>
            <button type="button" onClick={() => void loadRecords()} disabled={loading} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          </div>
        </div>

        {selectedISP && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          <div className="flex items-center gap-2"><Server className="h-5 w-5" />Showing users for ISP: <strong>{selectedISP}</strong></div>
          <button type="button" onClick={() => router.push('/all-users')} className="flex items-center gap-1 font-semibold hover:underline"><X className="h-4 w-4" /> Clear ISP Filter</button>
        </div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return <button key={card.id} type="button" aria-pressed={filter === card.id} onClick={() => setFilter(card.id)} className={`rounded-xl border bg-white p-5 text-left shadow-sm transition hover:shadow-md dark:bg-gray-800 ${filter === card.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700'}`}>
              <div className={`inline-flex rounded-xl p-3 ${card.bg}`}><Icon className={`h-6 w-6 ${card.color}`} /></div>
              <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : card.count.toLocaleString()}</h3>
            </button>;
          })}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID, name, phone, ISP, area..." className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white" /></div>
            <div className="flex items-center gap-3">{filter !== 'all' && <button type="button" onClick={() => setFilter('all')} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"><X className="h-4 w-4" /> Clear Type Filter</button>}<span className="text-sm text-gray-500 dark:text-gray-400">{loading ? 'Loading...' : `${filtered.length} users`}</span></div>
          </div>
          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400"><tr>{['User ID', 'Name', 'Phone', 'ISP', 'Area', 'Package', 'Monthly Fee', 'Status', 'Type'].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">Loading users...</td></tr>
                  : visible.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">No users found{selectedISP ? ` for ${selectedISP}` : ''}.</td></tr>
                  : visible.map((item) => <tr key={`${item.kind}-${item._id}`} className="text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-semibold">{item.kind === 'partner' ? item.partnerId || '—' : item.customerId || '—'}</td>
                    <td className="px-4 py-3">{item.name || '—'}</td>
                    <td className="px-4 py-3">{item.phone || '—'}</td>
                    <td className="px-4 py-3">{label(item.isp) || '—'}</td>
                    <td className="px-4 py-3">{label(item.area) || '—'}</td>
                    <td className="px-4 py-3">{label(item.package) || '—'}</td>
                    <td className="px-4 py-3">{typeof item.monthlyFee === 'number' ? `PKR ${item.monthlyFee.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3">{item.status || '—'}</td>
                    <td className="px-4 py-3 capitalize">{item.kind}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="mt-4 flex items-center justify-end gap-3 text-sm text-gray-700 dark:text-gray-200"><button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-gray-600">Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40 dark:border-gray-600">Next</button></div>}
        </div>
      </div>
    </Layout>
  );
}

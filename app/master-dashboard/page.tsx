
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import {
  Building2,
  Users,
  UserPlus,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  RefreshCw,
  AlertCircle,
  Crown,
} from 'lucide-react';

import MasterShell from '@/app/components/ui/MasterShell';

const API =
  process.env.NEXT_PUBLIC_API_URL || '/api';

type Stats = {
  companies: number;
  activeCompanies: number;
  admins: number;
};

type Company = {
  _id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  isActive: boolean;
  plan: string;
  createdAt: string;
  admins?: {
    _id: string;
    name: string;
    email: string;
    isActive: boolean;
  }[];
};

export default function MasterDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const token =
        localStorage.getItem('sr_master_token');

      if (!token) {
        throw new Error('Missing master login');
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [statsResponse, companiesResponse] =
        await Promise.all([
          fetch(`${API}/master/dashboard`, {
            headers,
            cache: 'no-store',
          }),
          fetch(`${API}/master/companies`, {
            headers,
            cache: 'no-store',
          }),
        ]);

      if (
        !statsResponse.ok ||
        !companiesResponse.ok
      ) {
        throw new Error(
          'Unable to load master dashboard'
        );
      }

      const [statsData, companiesData] =
        await Promise.all([
          statsResponse.json(),
          companiesResponse.json(),
        ]);

      setStats(statsData.stats);

      setCompanies(
        Array.isArray(companiesData.companies)
          ? companiesData.companies
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Dashboard error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const cards = [
    {
      title: 'TOTAL COMPANIES',
      value: stats?.companies,
      icon: Building2,
      description: 'Registered tenants',
      dark: true,
    },
    {
      title: 'ACTIVE COMPANIES',
      value: stats?.activeCompanies,
      icon: ShieldCheck,
      description: 'Enabled company accounts',
      dark: false,
    },
    {
      title: 'COMPANY ADMINS',
      value: stats?.admins,
      icon: Users,
      description: 'Tenant administrators',
      dark: false,
    },
    {
      title: 'INACTIVE COMPANIES',
      value: stats
        ? stats.companies - stats.activeCompanies
        : undefined,
      icon: Activity,
      description: 'Currently disabled',
      dark: false,
    },
  ];

  return (
    <MasterShell>
      <div className="mx-auto max-w-[1500px] space-y-6">

        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-amber-600 dark:text-amber-300">
              <Crown size={14} />
              Platform Administration
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight">
              Master Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage companies and administrators across
              Smart Recovery.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <Link
              href="/master/admins/new"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D6B138] px-4 py-2.5 text-sm font-bold text-[#102A43] hover:bg-[#F4D477]"
            >
              <Plus size={17} />
              Create Admin
            </Link>
          </div>
        </header>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* STATISTICS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className={`
                  rounded-2xl border p-5 shadow-sm
                  ${
                    card.dark
                      ? 'border-[#102A43] bg-[#102A43] text-white'
                      : 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <p className={`text-xs font-bold tracking-wider ${
                    card.dark
                      ? 'text-slate-300'
                      : 'text-slate-500 dark:text-slate-300'
                  }`}>
                    {card.title}
                  </p>

                  <Icon
                    size={19}
                    className={
                      card.dark
                        ? 'text-[#F4D477]'
                        : 'text-amber-600'
                    }
                  />
                </div>

                <p className="mt-5 text-3xl font-extrabold tabular-nums">
                  {loading
                    ? '...'
                    : (card.value ?? 0).toLocaleString()}
                </p>

                <p className={`mt-2 text-xs ${
                  card.dark
                    ? 'text-slate-300'
                    : 'text-slate-500 dark:text-slate-300'
                }`}>
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* CONTENT */}
        <div className="grid gap-5 xl:grid-cols-3">

          {/* RECENT COMPANIES */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 xl:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold">
                  Recently Created Companies
                </h2>
                <p className="text-xs text-slate-500">
                  Latest tenant accounts
                </p>
              </div>

              <Link
                href="/master/companies"
                className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700"
              >
                View all
                <ArrowUpRight size={15} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-5 py-3">
                      Company
                    </th>
                    <th className="px-5 py-3">
                      Plan
                    </th>
                    <th className="px-5 py-3">
                      Admins
                    </th>
                    <th className="px-5 py-3">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {!loading &&
                    companies.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No companies found.
                        </td>
                      </tr>
                    )}

                  {companies.slice(0, 7).map(
                    (company) => (
                      <tr key={company._id}>
                        <td className="px-5 py-4">
                          <div className="font-semibold">
                            {company.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {company.ownerEmail}
                          </div>
                        </td>

                        <td className="px-5 py-4 capitalize">
                          {company.plan || 'standard'}
                        </td>

                        <td className="px-5 py-4">
                          {company.admins?.length ?? 0}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`
                              rounded-full px-2.5 py-1
                              text-xs font-semibold
                              ${
                                company.isActive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }
                            `}
                          >
                            {company.isActive
                              ? 'Active'
                              : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* QUICK ACTIONS */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-lg font-bold">
              Quick Actions
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Frequently used master controls
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href="/master/admins/new"
                className="flex items-center gap-3 rounded-xl bg-[#D6B138] px-4 py-3 font-bold text-[#102A43] hover:bg-[#F4D477]"
              >
                <UserPlus size={19} />
                Create Company & Admin
                <ArrowUpRight
                  size={16}
                  className="ml-auto"
                />
              </Link>

              <Link
                href="/master/companies"
                className="flex items-center gap-3 rounded-xl bg-[#102A43] px-4 py-3 font-bold text-white hover:bg-[#1D3B59]"
              >
                <Building2 size={19} />
                View All Companies
                <ArrowUpRight
                  size={16}
                  className="ml-auto"
                />
              </Link>
            </div>

            <div className="mt-7 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900/40">
              <p className="font-bold">
                Master Access
              </p>

              <p className="mt-1 text-xs leading-5">
                Only authorized master accounts
                should access this dashboard.
                Company data remains separated
                by tenant.
              </p>
            </div>
          </section>
        </div>
      </div>
    </MasterShell>
  );
}

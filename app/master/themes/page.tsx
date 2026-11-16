'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import MasterShell from '@/app/components/ui/MasterShell';
import CompanyThemePicker from '@/app/components/ui/CompanyThemePicker';
import { companyThemeName, resolveCompanyTheme, type CompanyTheme } from '@/app/lib/companyThemes';
import { Palette, Search, RefreshCw, Save, Building2 } from 'lucide-react';

const API = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '');

type Company = { _id: string; name: string; ownerEmail?: string; theme?: CompanyTheme; isActive?: boolean; };

/** A separate Master page for reassigning a company's theme after creation. */
export default function CompanyThemesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [theme, setTheme] = useState<CompanyTheme>('original');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const request = useCallback(async (path = '', options: RequestInit = {}) => {
    const token = localStorage.getItem('sr_master_token');
    if (!token) throw new Error('Master login required');
    const res = await fetch(`${API}/master/company-themes${path}`, {
      ...options,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    });
    if (res.status === 401 || res.status === 403) throw new Error('Master permission required');
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Request failed');
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request();
      const list: Company[] = Array.isArray(data.companies) ? data.companies : [];
      setCompanies(list);
      setSelectedId(prev => {
        const id = list.some(c => c._id === prev) ? prev : (list[0]?._id || '');
        return id;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load companies');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { void load(); }, [load]);
  const selected = companies.find(c => c._id === selectedId) || null;
  useEffect(() => { setTheme(resolveCompanyTheme(selected?.theme)); }, [selected?.theme, selectedId]);
  const filtered = useMemo(() => companies.filter(c =>
    `${c.name} ${c.ownerEmail || ''}`.toLowerCase().includes(search.toLowerCase())), [companies, search]);

  const save = async () => {
    if (!selectedId || !selected || saving) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const result = await request(`/${selectedId}`, {
        method: 'PATCH', body: JSON.stringify({ theme }),
      });
      setCompanies(old => old.map(c => c._id === selectedId
        ? { ...c, theme: resolveCompanyTheme(result.company?.theme ?? theme) } : c));
      setMessage(`Saved ${companyThemeName(theme)} for ${selected.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save theme');
    } finally { setSaving(false); }
  };

  return (
    <MasterShell>
      <main className="mx-auto max-w-7xl space-y-6 p-4 text-slate-900 dark:text-white md:p-7">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold"><Palette className="text-amber-500" /> Company Themes</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Manage each company's appearance independently of subscription packages.</p>
          </div>
          <button type="button" onClick={() => void load()} title="Refresh companies"
            className="rounded-lg border p-3 dark:border-slate-700"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} /></button>
        </header>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{message}</p>}
        <div className="grid gap-5 lg:grid-cols-[330px_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="relative mb-3"><Search size={17} className="absolute left-3 top-3 text-slate-400" />
              <input className="w-full rounded-lg border border-slate-200 bg-transparent py-2.5 pl-10 pr-3 text-sm outline-none dark:border-slate-700"
                placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="max-h-[65vh] space-y-1 overflow-y-auto">
              {loading && <p className="p-3 text-sm text-slate-500">Loading...</p>}
              {!loading && filtered.length === 0 && <p className="p-3 text-sm text-slate-500">No companies found.</p>}
              {filtered.map(c => <button key={c._id} type="button" onClick={() => { setSelectedId(c._id); setMessage(''); }}
                className={`flex w-full items-start gap-2 rounded-lg p-3 text-left text-sm ${selectedId === c._id ? 'bg-amber-50 ring-1 ring-amber-400 dark:bg-amber-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <Building2 size={17} className="mt-0.5 shrink-0 text-slate-400" />
                <span><span className="block font-bold">{c.name}</span>
                  <span className="block text-xs text-slate-500">{c.ownerEmail || '—'}</span>
                  <span className="block text-xs text-slate-500">Current: {companyThemeName(c.theme)}</span>
                </span>
              </button>)}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            {selected ? <>
              <h2 className="text-lg font-bold">{selected.name}</h2>
              <p className="mb-5 mt-1 text-sm text-slate-500">Choose a company theme. The change applies when the tenant next loads its admin panel.</p>
              <CompanyThemePicker value={theme} onChange={setTheme} disabled={saving} />
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => void save()}
                  disabled={saving || resolveCompanyTheme(selected.theme) === theme}
                  className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
                  <Save size={17} /> {saving ? 'Saving...' : 'Save Theme'}
                </button>
              </div>
            </> : <p className="p-6 text-sm text-slate-500">Select a company to manage its theme.</p>}
          </section>
        </div>
      </main>
    </MasterShell>
  );
}

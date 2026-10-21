'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { useRouter } from 'next/navigation';

import { Plus, Search, Eye, EyeOff, Pencil, Trash2, X, Users, ShieldCheck, Building2, RefreshCw, CheckCircle2, AlertCircle, LockKeyhole, Copy, ArrowLeft } from 'lucide-react';

import MasterShell from '@/app/components/ui/MasterShell';

const API = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '');

type Admin = {

  _id: string; name: string; email: string; phone: string; address: string;

  isActive: boolean; createdAt: string;

  company: { _id: string; name: string; ownerEmail: string; plan: string; masterPackageId?: string | { _id: string; name: string }; isActive: boolean } | null;

};

type Company = {

  _id: string;

  name: string;

  ownerEmail: string;

  plan: string;
  masterPackageId?: string | { _id: string; name: string };

  isActive: boolean;

  createdAt?: string;

  admins?: Array<{ _id: string }>;

};

type ManagementRow = {

  id: string;

  companyId: string | null;

  admin: Admin | null;

  company: Company | null;

  orphan: boolean;

};

type AdminForm = {

  companyName: string; ownerEmail: string; plan: string; masterPackageId: string; adminName: string;

  adminEmail: string; adminPassword: string; phone: string; address: string; isActive: boolean;

};

const initialForm: AdminForm = { companyName: '', ownerEmail: '', plan: '', masterPackageId: '', adminName: '', adminEmail: '', adminPassword: '', phone: '', address: '', isActive: true };

const inputClass = 'w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:ring-amber-500/20';

const labelClass = 'mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200';

const cardClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800';

type SubscriptionPackage = {
  _id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  allowedPages: string[];
  isActive: boolean;
};

export default function CreateAdminPage() {

  const router = useRouter();

  const [admins, setAdmins] = useState<Admin[]>([]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [availablePackages, setAvailablePackages] = useState<SubscriptionPackage[]>([]);
  const [packagesError, setPackagesError] = useState('');

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState('');

  const [modal, setModal] = useState<'add' | 'view' | 'edit' | 'delete' | null>(null);

  const [selected, setSelected] = useState<Admin | null>(null);

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [form, setForm] = useState<AdminForm>({ ...initialForm });

  const [showPassword, setShowPassword] = useState(false);

  const [showCredentials, setShowCredentials] = useState(false);

  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');

  const [modalError, setModalError] = useState('');

  const redirectUnauthorized = useCallback(() => {

    localStorage.removeItem('sr_master_token');

    router.replace('/');

  }, [router]);

  const apiRequest = useCallback(async (path: string, options: RequestInit = {}) => {

    const token = localStorage.getItem('sr_master_token');

    if (!token) { redirectUnauthorized(); throw new Error('Master login required.'); }

    const response = await fetch(`${API}/master${path}`, {

      ...options, cache: 'no-store',

      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },

    });

  if (response.status === 401) {

  const token = localStorage.getItem('sr_master_token');

  if (!token) {

    router.replace('/');

    throw new Error('Master login required.');

  }

  throw new Error(

    'Master API returned 401. Please check the Master session.'

  );

}

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`API returned non-JSON (HTTP ${response.status}) from ${response.url}. Check Express API routing.`);
    }
    const data = await response.json();

    if (!response.ok || !data.success) throw new Error(data.message || 'Request failed.');

    return data;

  }, [redirectUnauthorized, router]);

  const loadPackages = useCallback(async () => {
    try {
      const result = await apiRequest('/packages');
      setAvailablePackages(Array.isArray(result.packages) ? result.packages : []);
      setPackagesError('');
    } catch (err) {
      setPackagesError(err instanceof Error ? err.message : 'Could not fetch packages');
    }
  }, [apiRequest]);

  const loadAdmins = useCallback(async () => {

    setLoading(true);

    try {

      const [adminsResult, companiesResult] = await Promise.all([

        apiRequest('/admins'),

        apiRequest('/companies'),

      ]);

      setAdmins(Array.isArray(adminsResult.admins) ? adminsResult.admins : []);

      setCompanies(Array.isArray(companiesResult.companies) ? companiesResult.companies : []);

      setError('');

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to load companies and admins.');

    } finally {

      setLoading(false);

    }

  }, [apiRequest]);

  useEffect(() => { void loadAdmins(); void loadPackages(); }, [loadAdmins, loadPackages]);

  const update = (key: keyof AdminForm, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  const openAdd = () => { setSelectedCompany(null); setSelected(null); setForm({ ...initialForm }); void loadPackages(); setModalError(''); setShowPassword(false); setModal('add'); };

  const openView = (admin: Admin) => { setSelectedCompany(null); setSelected(admin); setModalError(''); setModal('view'); };

  const openEdit = (admin: Admin) => {

    setSelected(admin);
    void loadPackages();

    setForm({ companyName: admin.company?.name || '', ownerEmail: admin.company?.ownerEmail || '', plan: admin.company?.plan || '', masterPackageId: typeof admin.company?.masterPackageId === 'string' ? admin.company.masterPackageId : admin.company?.masterPackageId?._id || '', adminName: admin.name, adminEmail: admin.email, adminPassword: '', phone: admin.phone || '', address: admin.address || '', isActive: admin.isActive });

    setModalError(''); setShowPassword(false); setModal('edit');

  };

  const openDelete = (admin: Admin) => {

    setSelectedCompany(null);

    setSelected(admin);

    setModalError('');

    setModal('delete');

  };

  const openDeleteCompany = (company: Company) => {

    setSelected(null);

    setSelectedCompany(company);

    setModalError('');

    setModal('delete');

  };

  const closeModal = () => { if (saving || deleting) return; setModal(null); setSelected(null); setSelectedCompany(null); setModalError(''); };

  const submit = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault(); if (saving) return;

    setSaving(true); setModalError(''); setError(''); setSuccess('');

    try {

      if ((modal === 'add' || modal === 'edit') && !form.masterPackageId) {
        throw new Error('Please select a subscription package.');
      }
      if (modal === 'add') {

        await apiRequest('/companies', { method: 'POST', body: JSON.stringify({ companyName: form.companyName.trim(), ownerEmail: form.ownerEmail.trim(), plan: form.plan, masterPackageId: form.masterPackageId, adminName: form.adminName.trim(), adminEmail: form.adminEmail.trim(), adminPassword: form.adminPassword }) });

        setCredentials({ email: form.adminEmail.trim(), password: form.adminPassword });

        setShowCredentials(false);

        setSuccess('Company and administrator created successfully.');

      } else if (modal === 'edit' && selected) {

        await apiRequest(`/admins/${selected._id}`, { method: 'PATCH', body: JSON.stringify({ name: form.adminName.trim(), email: form.adminEmail.trim(), phone: form.phone.trim(), address: form.address.trim(), isActive: form.isActive, companyName: form.companyName.trim(), ownerEmail: form.ownerEmail.trim(), plan: form.plan, masterPackageId: form.masterPackageId, ...(form.adminPassword ? { password: form.adminPassword } : {}) }) });

        setSuccess('Administrator updated successfully.');

      } else return;

      setModal(null); setSelected(null);

      await loadAdmins();

    } catch (err) { setModalError(err instanceof Error ? err.message : 'Unable to save administrator.'); }

    finally { setSaving(false); }

  };

  const deleteAdmin = async () => {

    if ((!selected && !selectedCompany) || deleting) return;

    setDeleting(true);

    setModalError('');

    setError('');

    setSuccess('');

    try {

      const path = selected

        ? `/admins/${selected._id}`

        : `/companies/${selectedCompany!._id}`;

      await apiRequest(path, { method: 'DELETE' });

      setModal(null);

      setSelected(null);

      setSelectedCompany(null);

      setSuccess('Company and linked administrator accounts deleted successfully.');

      await loadAdmins();

    } catch (err) {

      setModalError(err instanceof Error ? err.message : 'Unable to delete company.');

    } finally {

      setDeleting(false);

    }

  };

  // Every company appears once. Admins without a valid company also appear

  // so inconsistent records are visible instead of silently hidden.

const rows: ManagementRow[] = companies.flatMap<ManagementRow>(

  (company): ManagementRow[] => {

    const linkedAdmins = admins.filter(

      (admin) => admin.company?._id === company._id

    );

    if (linkedAdmins.length === 0) {

      return [

        {

          id: `company-${company._id}`,

          companyId: company._id,

          admin: null,

          company,

          orphan: true,

        },

      ];

    }

    return linkedAdmins.map(

      (admin): ManagementRow => ({

        id: `admin-${admin._id}`,

        companyId: company._id,

        admin,

        company,

        orphan: false,

      })

    );

  }

);

  for (const admin of admins) {

    if (!companies.some((company) => company._id === admin.company?._id)) {

      rows.push({

        id: `unlinked-${admin._id}`,

        companyId: admin.company?._id || null,

        admin,

        company: null,

        orphan: false,

      });

    }

  }

  const filtered = rows.filter((row) => [

    row.admin?.name || '',

    row.admin?.email || '',

    row.company?.name || row.admin?.company?.name || '',

    row.company?.plan || row.admin?.company?.plan || '',

  ].some((value) => value.toLowerCase().includes(search.trim().toLowerCase())));

  const orphanCount = rows.filter((row) => row.orphan).length;

  const activeCount = admins.filter(a => a.isActive).length;

  const fields: Array<[string, string]> = selected ? [

    ['Administrator', selected.name], ['Login Email', selected.email], ['Phone', selected.phone || '—'],

    ['Address', selected.address || '—'], ['Company', selected.company?.name || '—'],

    ['Company Email', selected.company?.ownerEmail || '—'], ['Plan', selected.company?.plan || '—'],

    ['Password', 'Protected — use Edit to reset'], ['Admin Status', selected.isActive ? 'Active' : 'Inactive'],

    ['Company Status', selected.company ? (selected.company.isActive ? 'Active' : 'Inactive') : 'Unknown'],

    ['Created', selected.createdAt ? new Date(selected.createdAt).toLocaleString('en-GB') : '—'],

  ] : [];

  return (

    <MasterShell>

      <div className="mx-auto max-w-7xl space-y-6 pb-10 text-slate-900 dark:text-white">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>

            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-amber-600 dark:text-amber-400"><ShieldCheck size={17} /> Platform Administration</div>

            <h1 className="text-3xl font-extrabold">Admin Management</h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Manage companies and administrators together, including companies without admins.</p>

          </div>

          <div className="flex flex-wrap gap-2">

            <button type="button" onClick={() => router.push('/master-dashboard')} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800"><ArrowLeft size={17} /> Dashboard</button>

            <button type="button" onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-900 hover:bg-amber-300"><Plus size={18} /> Add Admin</button>

          </div>

        </div>

        <div className="grid gap-4 sm:grid-cols-3">

          {[

            { label: 'Total Administrators', value: admins.length, icon: Users, color: 'text-blue-600' },

            { label: 'Active Administrators', value: activeCount, icon: ShieldCheck, color: 'text-emerald-600' },

            { label: 'Companies Without Admin', value: orphanCount, icon: LockKeyhole, color: 'text-red-600' },

          ].map(item => { const Icon = item.icon; return <div key={item.label} className={`${cardClass} p-5`}><div className="flex items-center justify-between"><span className="text-sm text-slate-500 dark:text-slate-300">{item.label}</span><Icon size={22} className={item.color} /></div><div className="mt-3 text-3xl font-extrabold">{loading ? '—' : item.value}</div></div>; })}

        </div>

        {success && <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"><CheckCircle2 size={19} /> {success}<button className="ml-auto" onClick={() => setSuccess('')} aria-label="Dismiss success"><X size={17} /></button></div>}

        {error && <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300"><AlertCircle size={19} /> {error}<button className="ml-auto" onClick={() => setError('')} aria-label="Dismiss error"><X size={17} /></button></div>}

        {credentials && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">

          <div className="flex items-center justify-between gap-3"><h3 className="font-bold">New Administrator Credentials</h3><button type="button" onClick={() => setCredentials(null)} aria-label="Dismiss credentials"><X size={18} /></button></div>

          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Save securely now. The password cannot be retrieved later.</p>

          <p className="mt-3 text-sm">Email: <strong>{credentials.email}</strong></p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm"><span>Password:</span><code className="rounded-lg bg-white px-3 py-2 dark:bg-slate-800">{showCredentials ? credentials.password : '••••••••'}</code><button type="button" onClick={() => setShowCredentials(!showCredentials)} aria-label="Toggle new password" className="rounded-lg border border-amber-300 p-2">{showCredentials ? <EyeOff size={17} /> : <Eye size={17} />}</button><button type="button" onClick={() => void navigator.clipboard.writeText(credentials.password)} aria-label="Copy new password" className="rounded-lg border border-amber-300 p-2"><Copy size={17} /></button></div>

        </div>}

        <section className={`${cardClass} overflow-hidden`}>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-700">

            <div><h2 className="text-lg font-bold">Companies & Administrators</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{filtered.length} records</p></div>

            <div className="flex items-center gap-2"><div className="relative"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search administrators..." aria-label="Search administrators" className={`${inputClass} w-48 pl-10 sm:w-64`} /></div><button type="button" onClick={() => void loadAdmins()} title="Refresh" className="rounded-xl border border-slate-300 p-3 dark:border-slate-600"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button></div>

          </div>

          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="px-5 py-4">Administrator</th><th className="px-5 py-4">Company</th><th className="px-5 py-4">Plan</th><th className="px-5 py-4">Password</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Created</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">

            {loading ? (

              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Loading companies and administrators...</td></tr>

            ) : filtered.length === 0 ? (

              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">No records found.</td></tr>

            ) : filtered.map((row) => (

              <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">

                <td className="px-5 py-4">

                  <div className="font-bold">{row.admin?.name || 'No Administrator'}</div>

                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">

                    {row.admin?.email || 'Company has no linked admin'}

                  </div>

                </td>

                <td className="px-5 py-4">

                  <span className="flex items-center gap-2">

                    <Building2 size={16} className="text-slate-400" />

                    {row.company?.name || row.admin?.company?.name || 'Unknown'}

                  </span>

                </td>

                <td className="px-5 py-4 capitalize">

                  {availablePackages.find(p => p._id === (typeof row.company?.masterPackageId === 'string' ? row.company.masterPackageId : row.company?.masterPackageId?._id))?.name || row.company?.plan || row.admin?.company?.plan || '—'}

                </td>

                <td className="px-5 py-4 text-xs text-slate-500">

                  {row.admin ? 'Protected' : '—'}

                </td>

                <td className="px-5 py-4">

                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.orphan

                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'

                    : row.admin?.isActive

                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'

                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>

                    {row.orphan ? 'No Admin' : row.admin?.isActive ? 'Active' : 'Inactive'}

                  </span>

                </td>

                <td className="px-5 py-4 text-xs text-slate-500">

                  {(row.admin?.createdAt || row.company?.createdAt)

                    ? new Date((row.admin?.createdAt || row.company?.createdAt)!).toLocaleDateString('en-GB')

                    : '—'}

                </td>

                <td className="px-5 py-4">

                  <div className="flex justify-end gap-2">

                    {row.admin && <>

                      <button type="button" onClick={() => openView(row.admin!)} title="View" className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/10"><Eye size={17} /></button>

                      <button type="button" onClick={() => openEdit(row.admin!)} title="Edit" className="rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-500/10"><Pencil size={17} /></button>

                    </>}

                    {(row.admin || row.company) && (

                      <button type="button" onClick={() => row.admin ? openDelete(row.admin) : openDeleteCompany(row.company!)} title="Delete company and linked accounts" className="rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-500/10"><Trash2 size={17} /></button>

                    )}

                  </div>

                </td>

              </tr>

            ))}

          </tbody></table></div>

        </section>

      </div>

      {(modal === 'add' || modal === 'edit') && <div className="fixed inset-0 z-[100] flex items-center justify-center p-3"><div className="absolute inset-0 bg-black/60" onClick={closeModal} /><div role="dialog" aria-modal="true" aria-label={modal === 'add' ? 'Add Admin' : 'Edit Admin'} className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800">

        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-700 dark:bg-slate-900"><div><h2 className="text-lg font-bold">{modal === 'add' ? 'Add Company & Admin' : 'Edit Administrator'}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{modal === 'add' ? 'Create a company and its primary administrator.' : 'Update company, administrator details and access.'}</p></div><button type="button" onClick={closeModal} aria-label="Close modal"><X size={21} /></button></div>

        <form onSubmit={submit} className="overflow-y-auto p-6"><div className="grid gap-4 sm:grid-cols-2">

          {(modal === 'add' || modal === 'edit') && <><h3 className="border-b border-slate-200 pb-2 text-sm font-bold dark:border-slate-700 sm:col-span-2">Company Information</h3><div><label htmlFor="companyName" className={labelClass}>Company Name *</label><input id="companyName" required maxLength={120} className={inputClass} value={form.companyName} onChange={e => update('companyName', e.target.value)} /></div><div><label htmlFor="ownerEmail" className={labelClass}>Company Email *</label><input id="ownerEmail" required type="email" className={inputClass} value={form.ownerEmail} onChange={e => update('ownerEmail', e.target.value)} /></div><div className="sm:col-span-2">
              <label htmlFor="masterPackageId" className={labelClass}>Subscription Package *</label>
              <select id="masterPackageId" required className={inputClass} value={form.masterPackageId}
                onChange={e => {
                  const pkg = availablePackages.find(p => p._id === e.target.value);
                  setForm(prev => ({ ...prev, masterPackageId: e.target.value, plan: pkg?.name || '' }));
                }}>
                <option value="">Select a package</option>
                {availablePackages.filter(p => p.isActive || p._id === form.masterPackageId).map(pkg => (
                  <option key={pkg._id} value={pkg._id}>{pkg.name} — PKR {Number(pkg.monthlyPrice || 0).toLocaleString()} / month ({pkg.allowedPages.length} pages){!pkg.isActive ? ' [Inactive]' : ''}</option>
                ))}
              </select>
              {packagesError && <p className="mt-2 text-xs text-red-600">{packagesError}</p>}
              {!packagesError && availablePackages.length === 0 && <p className="mt-2 text-xs text-amber-600">No packages found. Create one in Master Package Management first.</p>}
              {form.masterPackageId && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-slate-700 dark:border-amber-900 dark:bg-slate-900 dark:text-slate-200">
                <p className="font-bold">Included Pages</p>
                <p className="mt-1">{availablePackages.find(p => p._id === form.masterPackageId)?.allowedPages.join(', ') || 'No page information available'}</p>
              </div>}
            </div></>}

          <h3 className="border-b border-slate-200 pb-2 text-sm font-bold dark:border-slate-700 sm:col-span-2">Administrator Information</h3><div><label htmlFor="adminName" className={labelClass}>Full Name *</label><input id="adminName" required className={inputClass} value={form.adminName} onChange={e => update('adminName', e.target.value)} /></div><div><label htmlFor="adminEmail" className={labelClass}>Login Email *</label><input id="adminEmail" required type="email" className={inputClass} value={form.adminEmail} onChange={e => update('adminEmail', e.target.value)} /></div>

          {modal === 'edit' && <><div><label htmlFor="phone" className={labelClass}>Phone</label><input id="phone" className={inputClass} value={form.phone} onChange={e => update('phone', e.target.value)} /></div><div><label htmlFor="address" className={labelClass}>Address</label><input id="address" className={inputClass} value={form.address} onChange={e => update('address', e.target.value)} /></div></>}

          <div className="sm:col-span-2"><label htmlFor="adminPassword" className={labelClass}>{modal === 'add' ? 'Password *' : 'New Password (optional)'}</label><div className="relative"><input id="adminPassword" required={modal === 'add'} type={showPassword ? 'text' : 'password'} minLength={8} maxLength={128} autoComplete="new-password" className={`${inputClass} pr-12`} value={form.adminPassword} onChange={e => update('adminPassword', e.target.value)} placeholder={modal === 'add' ? 'Minimum 8 characters' : 'Leave blank to keep current password'} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility" className="absolute right-4 top-3.5 text-slate-500">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>

          {modal === 'edit' && <label className="flex items-center gap-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.isActive} onChange={e => update('isActive', e.target.checked)} className="h-4 w-4 accent-amber-500" /> Administrator Active</label>}

        </div>

        {modalError && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{modalError}</div>}

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700"><button type="button" disabled={saving} onClick={closeModal} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold dark:border-slate-600">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-900 disabled:opacity-60">{saving ? 'Saving...' : modal === 'add' ? 'Create Company & Admin' : 'Save Changes'}</button></div>

        </form></div></div>}

      {modal === 'view' && selected && <div className="fixed inset-0 z-[100] flex items-center justify-center p-3"><div className="absolute inset-0 bg-black/60" onClick={closeModal} /><div role="dialog" aria-modal="true" aria-label="Administrator Details" className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800"><div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-bold"><Eye size={20} /> Administrator Details</h2><button onClick={closeModal} aria-label="Close"><X size={20} /></button></div><div className="space-y-3">{fields.map(([label, value]) => <div key={label} className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-3 text-sm dark:border-slate-700"><span className="text-slate-500 dark:text-slate-400">{label}</span><span className="break-words font-semibold">{value}</span></div>)}</div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-600">Close</button><button type="button" onClick={() => openEdit(selected)} className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900"><Pencil size={16} /> Edit</button></div></div></div>}

              {modal === 'delete' && (selected || selectedCompany) && (

          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3">

            <div className="absolute inset-0 bg-black/60" onClick={closeModal} />

            <div role="alertdialog" aria-modal="true" aria-label="Delete Company" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">

              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600"><Trash2 size={24} /></div>

              <h2 className="text-xl font-bold">Delete Company & Administrator?</h2>

              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">

                Permanently delete company <strong>{selectedCompany?.name || selected?.company?.name || 'Unknown'}</strong>

                {selected ? <> and administrator <strong>{selected.name}</strong></> : <> (currently without an administrator)</>}?

              </p>

              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">

                This removes the company and all its linked user accounts. Customers, bills, payments and other tenant data are not removed. Master account is unaffected.

              </p>

              {modalError && <p role="alert" className="mt-3 text-sm text-red-600">{modalError}</p>}

              <div className="mt-6 flex justify-end gap-3">

                <button type="button" disabled={deleting} onClick={closeModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-600">Cancel</button>

                <button type="button" disabled={deleting} onClick={() => void deleteAdmin()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{deleting ? 'Deleting...' : 'Delete Company & Admin'}</button>

              </div>

            </div>

          </div>

        )}

</MasterShell>

  );

}

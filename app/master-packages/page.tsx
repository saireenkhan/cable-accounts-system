
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import MasterShell from "@/app/components/ui/MasterShell";
import {
  Package, Plus, Save, Pencil, CheckSquare, Square,
  Search, ShieldCheck, RefreshCw
} from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

type PageItem = {
  label: string;
  href: string;
  section: string;
};

type MasterPackage = {
  _id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  allowedPages: string[];
  isActive: boolean;
};

const emptyForm = {
  name: "",
  description: "",
  monthlyPrice: 0,
  allowedPages: [] as string[],
  isActive: true,
};

export default function MasterPackagesPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [packages, setPackages] = useState<MasterPackage[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const request = useCallback(async (
    path: string,
    options: RequestInit = {}
  ) => {
    const token = localStorage.getItem("sr_master_token");
    if (!token) {
      window.location.href = "/master/login";
      throw new Error("Master login required");
    }

    const res = await fetch(`${API}/master/packages${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      window.location.href = "/master/login";
      throw new Error("Master session expired");
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Request failed");
    }
    return data;
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [pageData, packageData] = await Promise.all([
        request("/pages"),
        request(""),
      ]);
      setPages(pageData.pages || []);
      setPackages(packageData.packages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  const sections = useMemo(
    () => [...new Set(pages.map(page => page.section))],
    [pages]
  );

  const visiblePages = pages.filter(page =>
    `${page.label} ${page.href} ${page.section}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function togglePage(href: string) {
    setForm(current => ({
      ...current,
      allowedPages: current.allowedPages.includes(href)
        ? current.allowedPages.filter(route => route !== href)
        : [...current.allowedPages, href],
    }));
  }

  function toggleSection(section: string) {
    const routes = pages
      .filter(page => page.section === section)
      .map(page => page.href);

    const allSelected = routes.every(route =>
      form.allowedPages.includes(route)
    );

    setForm(current => ({
      ...current,
      allowedPages: allSelected
        ? current.allowedPages.filter(route => !routes.includes(route))
        : [...new Set([...current.allowedPages, ...routes])],
    }));
  }

  function editPackage(pkg: MasterPackage) {
    setEditingId(pkg._id);
    setForm({
      name: pkg.name,
      description: pkg.description || "",
      monthlyPrice: pkg.monthlyPrice,
      allowedPages: [...pkg.allowedPages],
      isActive: pkg.isActive,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, allowedPages: [] });
  }

  async function savePackage(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Enter package name");
      return;
    }

    if (!form.allowedPages.length) {
      setError("Select at least one page");
      return;
    }

    try {
      setSaving(true);

      await request(editingId ? `/${editingId}` : "", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form),
      });

      setMessage(editingId
        ? "Package updated successfully"
        : "Package created successfully"
      );

      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save package");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(pkg: MasterPackage) {
    try {
      setError("");
      await request(`/${pkg._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 " +
    "text-sm text-slate-900 outline-none focus:border-blue-500 " +
    "dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  return (
    <MasterShell>
      <main className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white md:p-7">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-bold">
                <Package className="text-blue-600" />
                Package Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage subscription packages and admin page access.
              </p>
            </div>
            <button
              onClick={resetForm}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={17} /> New Package
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950">
              {message}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <form
              onSubmit={savePackage}
              className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-7"
            >
              <h2 className="text-lg font-bold">
                {editingId ? "Edit Package" : "Create New Package"}
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  <span>Package Name</span>
                  <input
                    className={inputClass}
                    placeholder="Professional ISP"
                    value={form.name}
                    onChange={e => setForm({
                      ...form, name: e.target.value
                    })}
                    required
                  />
                </label>

                <label className="space-y-2 text-sm font-medium">
                  <span>Monthly Price (PKR)</span>
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={form.monthlyPrice}
                    onChange={e => setForm({
                      ...form,
                      monthlyPrice: Number(e.target.value)
                    })}
                    required
                  />
                </label>
              </div>

              <label className="block space-y-2 text-sm font-medium">
                <span>Description</span>
                <textarea
                  className={inputClass}
                  rows={2}
                  placeholder="Package details..."
                  value={form.description}
                  onChange={e => setForm({
                    ...form, description: e.target.value
                  })}
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">Select Allowed Pages</h3>
                  <p className="text-xs text-slate-500">
                    {form.allowedPages.length} of {pages.length} selected
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      allowedPages: pages.map(p => p.href)
                    })}
                    className="rounded-lg border px-3 py-2 text-xs dark:border-slate-700"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({
                      ...form, allowedPages: []
                    })}
                    className="rounded-lg border px-3 py-2 text-xs dark:border-slate-700"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
                <input
                  className={`${inputClass} pl-10`}
                  placeholder="Search pages..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                {sections.map(section => {
                  const sectionPages = visiblePages.filter(
                    page => page.section === section
                  );
                  if (!sectionPages.length) return null;

                  const allSectionPages = pages.filter(
                    page => page.section === section
                  );
                  const allSelected = allSectionPages.every(page =>
                    form.allowedPages.includes(page.href)
                  );

                  return (
                    <div
                      key={section}
                      className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(section)}
                        className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left font-semibold dark:bg-slate-800"
                      >
                        <span className="flex items-center gap-2">
                          {allSelected
                            ? <CheckSquare size={18} className="text-blue-600" />
                            : <Square size={18} />}
                          {section}
                        </span>
                        <span className="text-xs text-slate-500">
                          {allSectionPages.filter(p =>
                            form.allowedPages.includes(p.href)
                          ).length}/{allSectionPages.length}
                        </span>
                      </button>

                      <div className="grid gap-2 p-4 sm:grid-cols-2">
                        {sectionPages.map(page => (
                          <label
                            key={page.href}
                            className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <input
                              type="checkbox"
                              className="mt-1 accent-blue-600"
                              checked={form.allowedPages.includes(page.href)}
                              onChange={() => togglePage(page.href)}
                            />
                            <span>
                              <span className="block text-sm font-medium">
                                {page.label}
                              </span>
                              <span className="text-xs text-slate-500">
                                {page.href}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm({
                    ...form, isActive: e.target.checked
                  })}
                  className="accent-blue-600"
                />
                Active Package
              </label>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  <Save size={17} />
                  {saving ? "Saving..." : editingId ? "Update Package" : "Create Package"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border px-5 py-3 dark:border-slate-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 p-6 text-white">
                <ShieldCheck size={28} />
                <h3 className="mt-3 text-lg font-bold">Package Access Control</h3>
                <p className="mt-2 text-sm text-blue-50">
                  Each tenant receives the pages selected in its assigned package.
                </p>
                <div className="mt-5 text-3xl font-bold">{packages.length}</div>
                <div className="text-sm text-blue-100">Total Packages</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold">Saved Packages</h3>
                  <button type="button" onClick={load} title="Refresh">
                    <RefreshCw size={16} />
                  </button>
                </div>

                {loading ? (
                  <p className="text-sm text-slate-500">Loading...</p>
                ) : packages.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No packages created yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {packages.map(pkg => (
                      <div
                        key={pkg._id}
                        className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold">{pkg.name}</h4>
                            <p className="text-xs text-slate-500">
                              {pkg.allowedPages.length} pages
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => editPackage(pkg)}
                            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>

                        <p className="mt-2 text-sm font-semibold">
                          PKR {pkg.monthlyPrice.toLocaleString()}/month
                        </p>

                        <button
                          type="button"
                          onClick={() => toggleStatus(pkg)}
                          className={`mt-3 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            pkg.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {pkg.isActive ? "Active" : "Inactive"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </MasterShell>
  );
}

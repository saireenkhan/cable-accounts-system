'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import {
  MapPin,
  PlusCircle,
  Edit2,
  Trash2,
  Building2,
  Home,
  Store,
  Users,
  Handshake,
  ChevronDown,
  ChevronUp,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type AreaColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';

type PartnerArea = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  partners: number;
  color: AreaColor;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type AreaFilter = 'all' | 'active' | 'inactive';

export default function PartnerAreasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AreaFilter>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState<PartnerArea[]>([]);
  const [editingArea, setEditingArea] = useState<PartnerArea | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPartnerAreas();
  }, []);

  const fetchPartnerAreas = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const [areasRes, partnersRes] = await Promise.all([
        api.get('/partner-areas'),
        api.get('/partners?limit=10000'),
      ]);

      const partnerCounts: Record<string, number> = {};
      if (partnersRes.data.success) {
        partnersRes.data.partners.forEach((partner: any) => {
          const areaKey =
            partner.partnerAreaName ||
            partner.area?.name ||
            partner.area ||
            partner.areaId;
          if (areaKey) {
            partnerCounts[areaKey] = (partnerCounts[areaKey] || 0) + 1;
          }
        });
      }

      if (areasRes.data.success && Array.isArray(areasRes.data.areas)) {
        const formattedAreas: PartnerArea[] = areasRes.data.areas.map(
          (area: any, index: number) => ({
            id: String(area._id),
            name: area.name || 'Unnamed Area',
            code: area.code || '',
            description: area.description || '',
            partners:
              partnerCounts[area.name] || partnerCounts[String(area._id)] || 0,
            color: (['blue', 'green', 'purple', 'orange', 'red', 'indigo'][
              index % 6
            ] || 'blue') as AreaColor,
            createdAt: area.createdAt,
            updatedAt: area.updatedAt,
          })
        );

        setAreas(formattedAreas);
        // setExpandedId((previous) => previous ?? formattedAreas[0]?.id ?? null);
      }
    } catch (error) {
      console.error('Error fetching partner areas:', error);
      toast.error('Failed to load partner areas');
    } finally {
      setLoading(false);
    }
  };

  const handleAreaAdded = (data: any) => {
    toast.success(
      editingArea
        ? `Partner area "${data.name}" updated successfully!`
        : `Partner area "${data.name}" added successfully!`
    );
    setEditingArea(null);
    setIsModalOpen(false);
    fetchPartnerAreas();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/partner-areas/${id}`);
      setAreas((previous) => previous.filter((area) => area.id !== id));
      setExpandedId((previous) => (previous === id ? null : previous));
      if (editingArea?.id === id) {
        setEditingArea(null);
        setIsModalOpen(false);
      }
      toast.success(`Partner area "${name}" deleted`);
    } catch {
      toast.error('Failed to delete partner area');
    }
  };

  const handleEdit = (area: PartnerArea, event?: React.MouseEvent) => {
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
        area.code?.toLowerCase().includes(query);

      const isActive = area.partners > 0;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [areas, searchQuery, statusFilter]);

  const colorMap: Record<
    AreaColor,
    { border: string; bg: string; icon: string; text: string; button: string }
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
    if (lower.includes('gulshan') || lower.includes('garden')) return <Home className="h-5 w-5" />;
    if (lower.includes('market') || lower.includes('mall')) return <Store className="h-5 w-5" />;
    if (lower.includes('colony') || lower.includes('town')) return <Building2 className="h-5 w-5" />;
    return <MapPin className="h-5 w-5" />;
  };

  const formatDate = (value?: string | Date) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  };

  const areaFields: Field[] = [
    { name: 'name', label: 'Partner Area Name', type: 'text', required: true, placeholder: 'Enter partner area name' },
    { name: 'code', label: 'Area Code', type: 'text', placeholder: 'Optional area code' },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description' },
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
        {/* Header */}
        <div className="flex items-center gap-2">
          <Handshake className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Partner Areas / Streets
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Organize partners by service area.
            </p>
          </div>
        </div>

        {/* Search + filter */}
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
              onClick={() => setIsFilterOpen((p) => !p)}
              className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-gray-400" />
                {statusFilter === 'all' ? 'All Areas' : statusFilter === 'active' ? 'Active Areas' : 'Inactive Areas'}
              </span>
              <ChevronDown
                className={cn('h-4 w-4 text-gray-400 transition-transform', isFilterOpen && 'rotate-180')}
              />
            </button>

            {isFilterOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 h-full w-full cursor-default"
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
                      {statusFilter === option.value && <Check className="h-4 w-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Cards */}
        {filteredAreas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No partner areas found</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Try changing your search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredAreas.map((area) => {
              const colors = colorMap[area.color];
              const isExpanded = expandedId === area.id;
              const isActive = area.partners > 0;

              return (
                <article
                  key={area.id}
                  className={cn(
                    'relative w-full overflow-hidden rounded-xl border bg-white shadow-sm transition-all dark:bg-gray-800',
                    colors.border,
                    isExpanded && 'shadow-lg'
                  )}
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl', colors.bg)}>
                          <span className={colors.icon}>{getAreaIcon(area.name)}</span>
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
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Partners count */}
                    <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                      <Users className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {area.partners.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Partners</span>
                    </div>

                    {/* Expanded */}
                    {isExpanded && (
                      <>
                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                          <InfoBlock
                            icon={<Users className="h-4 w-4 text-blue-500" />}
                            label="Total Partners"
                            value={area.partners}
                          />
                          <InfoBlock
                            icon={<MapPin className="h-4 w-4 text-gray-500" />}
                            label="Area Code"
                            value={area.code || '—'}
                          />
                          <InfoBlock
                            icon={<Home className="h-4 w-4 text-gray-400" />}
                            label="Created On"
                            value={formatDate(area.createdAt)}
                          />
                          <InfoBlock
                            icon={<Home className="h-4 w-4 text-gray-400" />}
                            label="Last Updated"
                            value={formatDate(area.updatedAt)}
                          />
                        </div>

                        <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={() => toggleExpand(area.id)}
                            className={cn(
                              'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition',
                              colors.button
                            )}
                          >
                            View Details
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleEdit(area, e)}
                            className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-900/40"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit Area
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(area.id, area.name)}
                            className="flex items-center justify-center rounded-lg bg-red-50 px-3 py-2.5 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40"
                            aria-label={`Delete ${area.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}

                    {!isExpanded && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(area.id)}
                        className={cn(
                          'mt-4 flex w-full items-center gap-1 border-t border-gray-100 pt-3 text-sm font-semibold transition-all hover:gap-2 dark:border-gray-700',
                          colors.text
                        )}
                      >
                        View Details <span aria-hidden="true">→</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingArea(null);
          }}
          onSuccess={handleAreaAdded}
          title={editingArea ? 'Edit Partner Area' : 'Add New Partner Area'}
          subtitle={editingArea ? 'Update the partner area details below' : 'Create a new service area for partners'}
          fields={areaFields}
          submitLabel={editingArea ? 'Update Partner Area' : 'Add Partner Area'}
          color="blue"
          endpoint={editingArea ? `/partner-areas/${editingArea.id}` : '/partner-areas'}
          method={editingArea ? 'PUT' : 'POST'}
          initialData={
            editingArea
              ? { name: editingArea.name, code: editingArea.code || '', description: editingArea.description || '' }
              : undefined
          }
          transformData={transformAreaData}
        />

        <button
          type="button"
          onClick={() => {
            setEditingArea(null);
            setIsModalOpen(true);
          }}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
        >
          <PlusCircle className="h-5 w-5" />
          Add Partner Area
        </button>
      </div>
    </Layout>
  );
}

/* ---------- Helpers ---------- */

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
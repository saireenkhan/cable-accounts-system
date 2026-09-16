'use client';

import React, { useState, useEffect } from 'react';
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
  Handshake,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

// ✅ TypeScript interfaces
interface PartnerArea {
  id: string;
  name: string;
  partners: number;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  code?: string;
  description?: string;
}

interface ApiArea {
  _id: string;
  name: string;
  code?: string;
  description?: string;
}

interface ApiPartner {
  partnerAreaName?: string;
  area?: string;
  areaId?: string;
}

export default function PartnerAreasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState<PartnerArea[]>([]);
  const [editingArea, setEditingArea] = useState<PartnerArea | null>(null);

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

      // Count partners by area
      const partnerCounts: Record<string, number> = {};
      if (partnersRes.data.success) {
        partnersRes.data.partners.forEach((partner: ApiPartner) => {
          const areaKey =
            partner.partnerAreaName || partner.area || partner.areaId;
          if (areaKey) {
            partnerCounts[areaKey] = (partnerCounts[areaKey] || 0) + 1;
          }
        });
      }

      if (areasRes.data.success) {
        const colors: PartnerArea['color'][] = [
          'blue',
          'green',
          'purple',
          'orange',
          'red',
          'indigo',
        ];

        const formattedAreas: PartnerArea[] = areasRes.data.areas.map(
          (area: ApiArea, index: number) => ({
            id: area._id,
            name: area.name,
            partners:
              partnerCounts[area.name] || partnerCounts[area._id] || 0,
            color: colors[index % colors.length],
            code: area.code,
            description: area.description,
          })
        );
        setAreas(formattedAreas);
      }
    } catch (error) {
      console.error('Error fetching partner areas:', error);
      toast.error('Failed to load partner areas');
    } finally {
      setLoading(false);
    }
  };

  const totalAreas = areas.length;
  const totalPartners = areas.reduce(
    (sum, area) => sum + (area.partners || 0),
    0
  );

  const areaFields: Field[] = [
    {
      name: 'name',
      label: 'Area Name',
      type: 'text',
      required: true,
      placeholder: 'Enter area name',
    },
    {
      name: 'code',
      label: 'Area Code',
      type: 'text',
      placeholder: 'Optional area code',
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
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await api.delete(`/partner-areas/${id}`);
        setAreas(areas.filter((area) => area.id !== id));
        toast.success(`Partner area "${name}" deleted`);
        if (editingArea?.id === id) setEditingArea(null);
      } catch (error) {
        toast.error('Failed to delete partner area');
      }
    }
  };

  const handleEdit = (area: PartnerArea) => {
    setEditingArea(area);
    setIsModalOpen(true);
  };

  const filteredAreas = areas.filter((area) =>
    area.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const colorClasses: Record<PartnerArea['color'], string> = {
    blue: 'from-blue-500 to-blue-600 border-blue-200 dark:border-blue-800',
    green:
      'from-green-500 to-green-600 border-green-200 dark:border-green-800',
    purple:
      'from-purple-500 to-purple-600 border-purple-200 dark:border-purple-800',
    orange:
      'from-orange-500 to-orange-600 border-orange-200 dark:border-orange-800',
    red: 'from-red-500 to-red-600 border-red-200 dark:border-red-800',
    indigo:
      'from-indigo-500 to-indigo-600 border-indigo-200 dark:border-indigo-800',
  };

  const bgColorClasses: Record<PartnerArea['color'], string> = {
    blue: 'bg-blue-50 dark:bg-blue-950/30',
    green: 'bg-green-50 dark:bg-green-950/30',
    purple: 'bg-purple-50 dark:bg-purple-950/30',
    orange: 'bg-orange-50 dark:bg-orange-950/30',
    red: 'bg-red-50 dark:bg-red-950/30',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/30',
  };

  const iconColorClasses: Record<PartnerArea['color'], string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
  };

  const getAreaIcon = (name: string) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('gulshan') || lower.includes('garden'))
      return <Home className="h-6 w-6" />;
    if (lower.includes('market') || lower.includes('mall'))
      return <Store className="h-6 w-6" />;
    if (lower.includes('colony') || lower.includes('town'))
      return <Building2 className="h-6 w-6" />;
    return <MapPin className="h-6 w-6" />;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Handshake className="h-6 w-6 text-blue-600" />
              Partner Areas / Streets
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Organize partners by service area.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingArea(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/25"
          >
            <PlusCircle className="h-4 w-4" />
            Add Partner Area
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  TOTAL PARTNER AREAS
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalAreas}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  TOTAL PARTNERS
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {totalPartners.toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <SearchBar
          placeholder="Search partner areas..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Area Cards Grid */}
        {filteredAreas.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No partner areas found. Click "Add Partner Area" to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAreas.map((area) => (
              <div
                key={area.id}
                className={cn(
                  'group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all hover:shadow-lg hover:scale-[1.02]',
                  colorClasses[area.color],
                  'overflow-hidden'
                )}
              >
                <div
                  className={cn(
                    'h-1.5 w-full',
                    area.color === 'blue' && 'bg-blue-500',
                    area.color === 'green' && 'bg-green-500',
                    area.color === 'purple' && 'bg-purple-500',
                    area.color === 'orange' && 'bg-orange-500',
                    area.color === 'red' && 'bg-red-500',
                    area.color === 'indigo' && 'bg-indigo-500'
                  )}
                />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'p-2.5 rounded-xl',
                          bgColorClasses[area.color]
                        )}
                      >
                        <span className={iconColorClasses[area.color]}>
                          {getAreaIcon(area.name)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg uppercase">
                          {area.name}
                        </h3>
                        {area.code && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {area.code}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(area)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(area.id, area.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {area.partners || 0}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Partners
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit Partner Area Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingArea(null);
          }}
          onSuccess={handleAreaAdded}
          title={editingArea ? 'Edit Partner Area' : 'Add New Partner Area'}
          subtitle={
            editingArea
              ? 'Update the partner area details below'
              : 'Create a new service area for partners'
          }
          fields={areaFields}
          submitLabel={
            editingArea ? 'Update Partner Area' : 'Add Partner Area'
          }
          color="blue"
          endpoint={
            editingArea
              ? `/partner-areas/${editingArea.id}`
              : '/partner-areas'
          }
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
      </div>
    </Layout>
  );
}
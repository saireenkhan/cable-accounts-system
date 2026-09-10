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
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function AreasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState<any[]>([]);

  // Fetch areas from API
  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      // ✅ Fetch all customers first to get area counts
      const [areasRes, customersRes] = await Promise.all([
        api.get('/areas'),
        api.get('/customers?limit=10000') // Get all customers
      ]);
      
      // ✅ Count customers by area name
      const customerCounts: Record<string, number> = {};
      if (customersRes.data.success) {
        customersRes.data.customers.forEach((customer: any) => {
          const areaName = customer.area?.name;
          if (areaName) {
            customerCounts[areaName] = (customerCounts[areaName] || 0) + 1;
          }
        });
      }
      
      if (areasRes.data.success) {
        const formattedAreas = areasRes.data.areas.map((area: any, index: number) => ({
          id: area._id,
          name: area.name,
          customers: customerCounts[area.name] || 0,
          color: ['blue', 'green', 'purple', 'orange', 'red', 'indigo'][index % 6],
          code: area.code,
          description: area.description,
        }));
        setAreas(formattedAreas);
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
      toast.error('Failed to load areas');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalAreas = areas.length;
  const totalCustomers = areas.reduce((sum, area) => sum + (area.customers || 0), 0);

  // Area fields for modal
  const areaFields: Field[] = [
    { name: 'name', label: 'Area Name', type: 'text', required: true, placeholder: 'Enter area name' },
    { name: 'code', label: 'Area Code', type: 'text', placeholder: 'e.g., GUL-001' },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description' },
  ];

  // Transform area data before sending
  const transformAreaData = (data: any) => {
    return {
      name: data.name,
      code: data.code || '',
      description: data.description || '',
    };
  };

  const handleAreaAdded = (data: any) => {
    toast.success(`Area "${data.name}" added successfully!`);
    fetchAreas();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await api.delete(`/areas/${id}`);
        setAreas(areas.filter(area => area.id !== id));
        toast.success(`Area "${name}" deleted`);
      } catch (error) {
        toast.error('Failed to delete area');
      }
    }
  };

  const handleEdit = (name: string) => {
    toast.success(`Editing "${name}"`);
  };

  const filteredAreas = areas.filter(area =>
    area.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Color mapping for cards
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 border-blue-200 dark:border-blue-800',
    green: 'from-green-500 to-green-600 border-green-200 dark:border-green-800',
    purple: 'from-purple-500 to-purple-600 border-purple-200 dark:border-purple-800',
    orange: 'from-orange-500 to-orange-600 border-orange-200 dark:border-orange-800',
    red: 'from-red-500 to-red-600 border-red-200 dark:border-red-800',
    indigo: 'from-indigo-500 to-indigo-600 border-indigo-200 dark:border-indigo-800',
  };

  const bgColorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-950/30',
    green: 'bg-green-50 dark:bg-green-950/30',
    purple: 'bg-purple-50 dark:bg-purple-950/30',
    orange: 'bg-orange-50 dark:bg-orange-950/30',
    red: 'bg-red-50 dark:bg-red-950/30',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/30',
  };

  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
  };

  const getAreaIcon = (name: string) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('gulshan') || lower.includes('garden')) return <Home className="h-6 w-6" />;
    if (lower.includes('market') || lower.includes('mall')) return <Store className="h-6 w-6" />;
    if (lower.includes('colony') || lower.includes('town')) return <Building2 className="h-6 w-6" />;
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
              <MapPin className="h-6 w-6 text-blue-600" />
              Areas / Streets
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Organize customers by service area.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/25"
          >
            <PlusCircle className="h-4 w-4" />
            Add Area
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL AREAS</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL CUSTOMERS</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {totalCustomers.toLocaleString()}
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
          placeholder="Search areas..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Area Cards Grid */}
        {filteredAreas.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No areas found. Click "Add Area" to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAreas.map((area) => (
              <div
                key={area.id}
                className={cn(
                  'group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all hover:shadow-lg hover:scale-[1.02]',
                  colorClasses[area.color as keyof typeof colorClasses],
                  'overflow-hidden'
                )}
              >
                <div className={cn(
                  'h-1.5 w-full',
                  area.color === 'blue' && 'bg-blue-500',
                  area.color === 'green' && 'bg-green-500',
                  area.color === 'purple' && 'bg-purple-500',
                  area.color === 'orange' && 'bg-orange-500',
                  area.color === 'red' && 'bg-red-500',
                  area.color === 'indigo' && 'bg-indigo-500',
                )} />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2.5 rounded-xl',
                        bgColorClasses[area.color as keyof typeof bgColorClasses]
                      )}>
                        <span className={iconColorClasses[area.color as keyof typeof iconColorClasses]}>
                          {getAreaIcon(area.name)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg uppercase">
                          {area.name}
                        </h3>
                        {area.code && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{area.code}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(area.name)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Edit2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(area.id, area.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* ✅ Show actual customer count */}
                  <div className="flex items-center gap-2 mt-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {area.customers || 0}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Customers
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Area Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleAreaAdded}
          title="Add New Area"
          subtitle="Create a new service area for customers"
          fields={areaFields}
          submitLabel="Add Area"
          color="blue"
          endpoint="/areas"
          transformData={transformAreaData}
        />
      </div>
    </Layout>
  );
}
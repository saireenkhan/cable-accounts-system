'use client';

import React, { useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { 
  MapPin, 
  PlusCircle, 
  Users, 
  Edit2, 
  Trash2,
  Building2,
  Home,
  Store,
  Factory
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function AreasPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [areas, setAreas] = useState([
    { id: 1, name: 'Gulshan Block 1', customers: 340, color: 'blue' },
    { id: 2, name: 'Model Colony', customers: 285, color: 'green' },
    { id: 3, name: 'Green Town', customers: 229, color: 'purple' },
    { id: 4, name: 'New Market', customers: 194, color: 'orange' },
  ]);

  // Calculate stats
  const totalAreas = areas.length;
  const totalCustomers = areas.reduce((sum, area) => sum + area.customers, 0);

  // Area fields for modal
  const areaFields: Field[] = [
    { name: 'name', label: 'Area Name', type: 'text', required: true, placeholder: 'Enter area name' },
    { name: 'code', label: 'Area Code', type: 'text', placeholder: 'e.g., GUL-001' },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description' },
  ];

  const handleAreaAdded = (data: any) => {
    const newArea = {
      id: Date.now(),
      name: data.name.toUpperCase(),
      customers: 0,
      color: ['blue', 'green', 'purple', 'orange', 'red', 'indigo'][Math.floor(Math.random() * 6)],
    };
    setAreas([newArea, ...areas]);
    toast.success(`Area "${data.name}" added successfully!`);
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      setAreas(areas.filter(area => area.id !== id));
      toast.success(`Area "${name}" deleted`);
    }
  };

  const handleEdit = (name: string) => {
    toast.success(`Editing "${name}"`);
  };

  const filteredAreas = areas.filter(area =>
    area.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  // Get icon based on area name
  const getAreaIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('gulshan') || lower.includes('garden')) return <Home className="h-6 w-6" />;
    if (lower.includes('market') || lower.includes('mall')) return <Store className="h-6 w-6" />;
    if (lower.includes('colony') || lower.includes('town')) return <Building2 className="h-6 w-6" />;
    return <MapPin className="h-6 w-6" />;
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
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
                {/* Color bar at top */}
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
                  {/* Icon and Name */}
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
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
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

                  {/* Customers Count */}
                  <div className="flex items-center gap-2 mt-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {area.customers}
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
        />
      </div>
    </Layout>
  );
}
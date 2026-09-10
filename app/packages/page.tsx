'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import { 
  Package, 
  PlusCircle, 
  Edit2, 
  Trash2,
  TrendingUp,
  DollarSign,
  Wifi,
  Zap
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function PackagesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);

  // Fetch packages from API
  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }
      const response = await api.get('/packages');
      if (response.data.success) {
        const formattedPackages = response.data.packages.map((pkg: any, index: number) => ({
          id: pkg._id,
          name: pkg.name,
          price: pkg.sellingPrice || 0,
          bandwidth: pkg.bandwidth || 'N/A',
          purchasePrice: pkg.purchasePrice || 0,
          sellingPrice: pkg.sellingPrice || 0,
          profit: pkg.profit || 0,
          color: ['blue', 'green', 'purple', 'orange', 'red', 'indigo'][index % 6],
          description: pkg.description || '',
        }));
        setPackages(formattedPackages);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  // Package form fields for modal
  const packageFields: Field[] = [
    { 
      name: 'name', 
      label: 'Package Name', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'BASIC', value: 'BASIC' },
        { label: 'STANDARD', value: 'STANDARD' },
        { label: 'PREMIUM', value: 'PREMIUM' },
      ]
    },
    { 
      name: 'bandwidth', 
      label: 'Bandwidth', 
      type: 'select', 
      required: true, 
      options: [
        { label: '25 Mbps', value: '25 Mbps' },
        { label: '50 Mbps', value: '50 Mbps' },
        { label: '100 Mbps', value: '100 Mbps' },
      ]
    },
    { name: 'sellingPrice', label: 'Selling Price (Rs.)', type: 'text', required: true, placeholder: '1200' },
    { name: 'purchasePrice', label: 'Purchase Price (Rs.)', type: 'text', required: true, placeholder: '800' },
    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Package description' },
  ];

  // ✅ Transform package data before sending
  const transformPackageData = (data: any) => {
    return {
      name: data.name,
      bandwidth: data.bandwidth,
      sellingPrice: parseFloat(data.sellingPrice) || 0,
      purchasePrice: parseFloat(data.purchasePrice) || 0,
      description: data.description || '',
    };
  };

  const handlePackageAdded = (data: any) => {
    const sellingPrice = data.sellingPrice || 0;
    const purchasePrice = data.purchasePrice || 0;
    
    const newPackage = {
      id: data._id || Date.now(),
      name: data.name,
      price: sellingPrice,
      bandwidth: data.bandwidth || 'N/A',
      purchasePrice: purchasePrice,
      sellingPrice: sellingPrice,
      profit: sellingPrice - purchasePrice,
      color: ['blue', 'green', 'purple', 'orange', 'red', 'indigo'][Math.floor(Math.random() * 6)],
    };
    setPackages([newPackage, ...packages]);
    toast.success(`Package "${data.name}" added successfully!`);
    fetchPackages(); // Refresh the list
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" package?`)) {
      try {
        await api.delete(`/packages/${id}`);
        setPackages(packages.filter(pkg => pkg.id !== id));
        toast.success(`Package "${name}" deleted`);
      } catch (error) {
        toast.error('Failed to delete package');
      }
    }
  };

  const handleEdit = (name: string) => {
    toast.success(`Editing "${name}" package`);
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.name?.toLowerCase().includes(searchQuery.toLowerCase())
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

  const priceColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
  };

  // Get icon based on package name
  const getPackageIcon = (name: string) => {
    const lower = name?.toLowerCase() || '';
    if (lower.includes('basic')) return <Wifi className="h-6 w-6" />;
    if (lower.includes('standard')) return <Zap className="h-6 w-6" />;
    if (lower.includes('premium')) return <TrendingUp className="h-6 w-6" />;
    return <Package className="h-6 w-6" />;
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
              <Package className="h-6 w-6 text-blue-600" />
              Packages
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage package purchase cost, selling price and monthly profit.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/25"
          >
            <PlusCircle className="h-4 w-4" />
            Add Package
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL PACKAGES</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {packages.length}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">HIGHEST PROFIT</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  Rs. {packages.length > 0 ? Math.max(...packages.map(p => p.profit || 0)).toLocaleString() : '0'}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <SearchBar
          placeholder="Search packages..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Package Cards Grid */}
        {filteredPackages.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No packages found. Click "Add Package" to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className={cn(
                  'group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all hover:shadow-lg hover:scale-[1.02]',
                  colorClasses[pkg.color as keyof typeof colorClasses],
                  'overflow-hidden'
                )}
              >
                {/* Color bar at top */}
                <div className={cn(
                  'h-2 w-full',
                  pkg.color === 'blue' && 'bg-blue-500',
                  pkg.color === 'green' && 'bg-green-500',
                  pkg.color === 'purple' && 'bg-purple-500',
                  pkg.color === 'orange' && 'bg-orange-500',
                  pkg.color === 'red' && 'bg-red-500',
                  pkg.color === 'indigo' && 'bg-indigo-500',
                )} />

                <div className="p-6">
                  {/* Package Name and Actions */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-3 rounded-xl',
                        bgColorClasses[pkg.color as keyof typeof bgColorClasses]
                      )}>
                        <span className={iconColorClasses[pkg.color as keyof typeof iconColorClasses]}>
                          {getPackageIcon(pkg.name)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-xl">
                          {pkg.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {pkg.bandwidth}
                        </p>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(pkg.name)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Edit2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg.id, pkg.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* Price Display */}
                  <div className="mb-4">
                    <p className={cn(
                      'text-3xl font-bold',
                      priceColorClasses[pkg.color as keyof typeof priceColorClasses]
                    )}>
                      Rs. {pkg.price.toLocaleString()}
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Purchase price</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Rs. {pkg.purchasePrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Selling price</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Rs. {pkg.sellingPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="col-span-2 bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-green-600 dark:text-green-400">Profit</p>
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        Rs. {pkg.profit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Package Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handlePackageAdded}
          title="Add New Package"
          subtitle="Create a new service package for customers"
          fields={packageFields}
          submitLabel="Add Package"
          color="blue"
          endpoint="/packages"
          transformData={transformPackageData}
        />
      </div>
    </Layout>
  );
}
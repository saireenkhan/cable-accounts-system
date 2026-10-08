
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
  Wifi,
  Zap,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

interface ISP {
  _id: string;
  name: string;
  ispName?: string;
}

interface PackageItem {
  id: string;
  name: string;
  price: number;
  bandwidth: string;
  purchasePrice: number;
  sellingPrice: number;
  profit: number;
  color: string;
  description: string;
  isp: string;
  ispName: string;
}

const getIspId = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'object') {
    return String(value._id || value.id || '');
  }
  return String(value);
};

export default function PackagesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isps, setIsps] = useState<ISP[]>([]);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);

  useEffect(() => {
    fetchPackages();
    fetchIsps();
  }, []);

  // Fetch packages from the existing Packages API.
  const fetchPackages = async () => {
    try {
      const token = sessionStorage.getItem('token');

      if (!token) {
        console.warn('[Packages] No authentication token found');
        return;
      }

      const response = await api.get('/packages');

      if (response.data.success) {
        const formattedPackages: PackageItem[] = (
          response.data.packages || []
        ).map((pkg: any, index: number) => {
          const purchasePrice = Number(pkg.purchasePrice) || 0;
          const sellingPrice = Number(pkg.sellingPrice) || 0;

          return {
            id: String(pkg._id),
            name: pkg.name || '',
            price: sellingPrice,
            bandwidth: pkg.bandwidth || 'N/A',
            purchasePrice,
            sellingPrice,
            profit:
              pkg.profit !== undefined && pkg.profit !== null
                ? Number(pkg.profit)
                : sellingPrice - purchasePrice,
            color: [
              'blue',
              'green',
              'purple',
              'orange',
              'red',
              'indigo',
            ][index % 6],
            description: pkg.description || '',
            isp: getIspId(pkg.isp),
            ispName:
              typeof pkg.isp === 'object'
                ? pkg.isp?.name || pkg.isp?.ispName || ''
                : '',
          };
        });

        setPackages(formattedPackages);
      }
    } catch (error: any) {
      console.error('[Packages] Fetch error:', error);
      toast.error(
        error.response?.data?.message || 'Failed to load packages'
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing ISPs from the ISP Management API.
  const fetchIsps = async () => {
    try {
      const response = await api.get('/isps');

      const rawIsps = Array.isArray(response.data)
        ? response.data
        : response.data?.isps || response.data?.data || [];

      if (!Array.isArray(rawIsps)) {
        setIsps([]);
        toast.error('Unexpected ISP response format');
        return;
      }

      const formattedIsps: ISP[] = rawIsps
        .filter((isp: any) => isp && (isp._id || isp.id))
        .map((isp: any) => ({
          _id: String(isp._id || isp.id),
          name: String(isp.name || isp.ispName || 'Unnamed ISP'),
        }));

      setIsps(formattedIsps);
    } catch (error: any) {
      console.error('[Packages] ISP fetch error:', error);
      toast.error(
        error.response?.data?.message || 'Failed to load ISPs'
      );
    }
  };

  // Each package can belong to exactly one ISP.
  const packageFields: Field[] = [
    {
      name: 'isp',
      label: 'Select ISP',
      type: 'select',
      required: true,
      options: isps.map((isp) => ({
        label: isp.name,
        value: isp._id,
      })),
    },
    {
      name: 'name',
      label: 'Package Name',
      type: 'text',
      required: true,
    },
    {
      name: 'bandwidth',
      label: 'Bandwidth',
      type: 'text',
      required: true,
    },
    {
      name: 'sellingPrice',
      label: 'Selling Price (Rs.)',
      type: 'number',
      required: true,
    },
    {
      name: 'purchasePrice',
      label: 'Purchase Price (Rs.)',
      type: 'number',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Package description',
    },
  ];

  // Include the selected ISP in create/update requests.
  const transformPackageData = (data: any) => ({
    isp: getIspId(data.isp),
    name: data.name,
    bandwidth: data.bandwidth,
    sellingPrice: parseFloat(data.sellingPrice) || 0,
    purchasePrice: parseFloat(data.purchasePrice) || 0,
    description: data.description || '',
  });

  const handlePackageAdded = (data: any) => {
    toast.success(
      editingPackage
        ? `Package "${data.name}" updated successfully!`
        : `Package "${data.name}" added successfully!`
    );

    setEditingPackage(null);
    setIsModalOpen(false);
    fetchPackages();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" package?`)) {
      return;
    }

    try {
      await api.delete(`/packages/${id}`);

      setPackages((previous) =>
        previous.filter((pkg) => pkg.id !== id)
      );

      toast.success(`Package "${name}" deleted`);

      if (editingPackage?.id === id) {
        setEditingPackage(null);
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Failed to delete package'
      );
    }
  };

  const handleEdit = (pkg: PackageItem) => {
    setEditingPackage(pkg);
    setIsModalOpen(true);
  };

  const getIspName = (pkg: PackageItem): string => {
    const matchedIsp = isps.find(
      (isp) => isp._id === pkg.isp
    );

    return matchedIsp?.name || pkg.ispName || 'Not Assigned';
  };

  const filteredPackages = packages.filter((pkg) => {
    const query = searchQuery.toLowerCase().trim();

    return (
      pkg.name.toLowerCase().includes(query) ||
      pkg.bandwidth.toLowerCase().includes(query) ||
      getIspName(pkg).toLowerCase().includes(query)
    );
  });

  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600 border-blue-200 dark:border-blue-800',
    green: 'from-green-500 to-green-600 border-green-200 dark:border-green-800',
    purple: 'from-purple-500 to-purple-600 border-purple-200 dark:border-purple-800',
    orange: 'from-orange-500 to-orange-600 border-orange-200 dark:border-orange-800',
    red: 'from-red-500 to-red-600 border-red-200 dark:border-red-800',
    indigo: 'from-indigo-500 to-indigo-600 border-indigo-200 dark:border-indigo-800',
  };

  const bgColorClasses: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-950/30',
    green: 'bg-green-50 dark:bg-green-950/30',
    purple: 'bg-purple-50 dark:bg-purple-950/30',
    orange: 'bg-orange-50 dark:bg-orange-950/30',
    red: 'bg-red-50 dark:bg-red-950/30',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/30',
  };

  const iconColorClasses: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
  };

  const priceColorClasses: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
  };

  const getPackageIcon = (name: string) => {
    const lower = name?.toLowerCase() || '';

    if (lower.includes('basic')) {
      return <Wifi className="h-6 w-6" />;
    }

    if (lower.includes('standard')) {
      return <Zap className="h-6 w-6" />;
    }

    if (lower.includes('premium')) {
      return <TrendingUp className="h-6 w-6" />;
    }

    return <Package className="h-6 w-6" />;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              Packages
            </h1>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage ISP-specific packages, purchase cost, selling price
              and monthly profit.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingPackage(null);
              fetchIsps();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#d6b138] hover:bg-[#f7ce48] text-gray-900 rounded-lg text-sm"
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
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  TOTAL PACKAGES
                </p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  HIGHEST PROFIT
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  Rs.{' '}
                  {packages.length > 0
                    ? Math.max(
                        ...packages.map((p) => p.profit || 0)
                      ).toLocaleString()
                    : '0'}
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
          placeholder="Search packages or ISPs..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Package Grid */}
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
                  colorClasses[pkg.color],
                  'overflow-hidden'
                )}
              >
                <div className="p-6">
                  {/* Name and Actions */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'p-3 rounded-xl',
                          bgColorClasses[pkg.color]
                        )}
                      >
                        <span className={iconColorClasses[pkg.color]}>
                          {getPackageIcon(pkg.name)}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white text-xl break-words">
                          {pkg.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {pkg.bandwidth}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          fetchIsps();
                          handleEdit(pkg);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </button>

                      <button
                        onClick={() => handleDelete(pkg.id, pkg.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* Assigned ISP */}
                  <div className="mb-4 flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      ISP:
                    </span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {getIspName(pkg)}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <p
                      className={cn(
                        'text-3xl font-bold',
                        priceColorClasses[pkg.color]
                      )}
                    >
                      Rs. {pkg.price.toLocaleString()}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Purchase price
                      </p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Rs. {pkg.purchasePrice.toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Selling price
                      </p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Rs. {pkg.sellingPrice.toLocaleString()}
                      </p>
                    </div>

                    <div className="col-span-2 bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Profit
                      </p>
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

        {/* Add / Edit Package Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPackage(null);
          }}
          onSuccess={handlePackageAdded}
          title={editingPackage ? 'Edit Package' : 'Add New Package'}
          subtitle={
            editingPackage
              ? 'Update the package details below'
              : 'Create a new service package for an ISP'
          }
          fields={packageFields}
          submitLabel={
            editingPackage ? 'Update Package' : 'Add Package'
          }
          color="blue"
          endpoint={
            editingPackage
              ? `/packages/${editingPackage.id}`
              : '/packages'
          }
          method={editingPackage ? 'PUT' : 'POST'}
          initialData={
            editingPackage
              ? {
                  isp: editingPackage.isp,
                  name: editingPackage.name,
                  bandwidth: editingPackage.bandwidth,
                  sellingPrice: editingPackage.sellingPrice,
                  purchasePrice: editingPackage.purchasePrice,
                  description: editingPackage.description || '',
                }
              : undefined
          }
          transformData={transformPackageData}
        />
      </div>
    </Layout>
  );
}

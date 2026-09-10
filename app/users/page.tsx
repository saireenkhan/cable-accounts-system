'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  UserMinus,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchPackages();
    fetchAreas();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await api.get('/customers?limit=10000');
      if (response.data.success) {
        const formattedUsers = response.data.customers.map((customer: any) => ({
          id: customer._id,
          customerId: customer.customerId || 'N/A',
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
          area: customer.area?.name || 'N/A',
          monthlyFee: `Rs. ${customer.monthlyFee?.toLocaleString() || 0}`,
          status: customer.status
            ? customer.status.charAt(0).toUpperCase() + customer.status.slice(1)
            : 'Active',
        }));
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await api.get('/packages');
      if (response.data.success) {
        setPackages(response.data.packages);
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchAreas = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await api.get('/areas');
      if (response.data.success) {
        setAreas(response.data.areas);
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'Active').length;
  const inactiveUsers = users.filter((u) => u.status === 'Inactive').length;
  const expiredUsers = users.filter((u) => u.status === 'Expired').length;

  // ✅ Updated: User ID field first, then rest
  const userFields: Field[] = [
    {
      name: 'customerId',
      label: 'User ID',
      type: 'text',
      required: true,
      placeholder: 'e.g., USR-001',
    },
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Enter full name',
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'text',
      required: true,
      placeholder: '0300-1234567',
    },
    {
      name: 'address',
      label: 'Address',
      type: 'text',
      required: true,
      placeholder: 'House #, Street',
    },
    {
      name: 'area',
      label: 'Area',
      type: 'select',
      required: true,
      searchable: true,
      options: areas.map((area: any) => ({
        label: area.name,
        value: area.name,
      })),
    },
    {
      name: 'package',
      label: 'Package',
      type: 'select',
      required: true,
      searchable: true,
      options: packages.map((pkg: any) => ({
        label: `${pkg.name} - Rs. ${pkg.sellingPrice?.toLocaleString() || 0}`,
        value: pkg.name,
      })),
    },
    {
      name: 'monthlyFee',
      label: 'Monthly Fee',
      type: 'text',
      required: true,
      placeholder: 'Auto-filled from package',
      dependsOn: 'package',
      updateOnChange: (value: any, formData: any, context: any) => {
        const packages = context?.packages || [];
        const selectedPkg = packages.find((p: any) => p.name === value);
        return selectedPkg?.sellingPrice || '';
      },
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Expired', value: 'expired' },
      ],
    },
  ];

  const transformUserData = (data: any) => {
    const selectedPackage = packages.find((pkg: any) => pkg.name === data.package);
    const monthlyFee =
      selectedPackage?.sellingPrice || parseFloat(data.monthlyFee) || 0;

    return {
      customerId: data.customerId,
      name: data.name,
      phone: data.phone,
      cnic: data.cnic || '',
      address: data.address,
      area: data.area,
      package: data.package,
      monthlyFee: monthlyFee,
      status: data.status || 'active',
    };
  };

  const handleUserAdded = (data: any) => {
    toast.success(`${data.name} added successfully!`);
    fetchUsers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await api.delete(`/customers/${id}`);
        setUsers(users.filter((u) => u.id !== id));
        toast.success(`${name} deleted`);
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  const handleEdit = (name: string) => {
    toast.success(`Editing ${name}`);
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.customerId?.toLowerCase().includes(query) ||
      user.code?.toLowerCase().includes(query) ||
      user.phone?.includes(query)
    );
  });

  const columns = [
    { key: 'customerId', header: 'User ID' },
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Customer' },
    { key: 'phone', header: 'Phone' },
    { key: 'area', header: 'Area' },
    { key: 'monthlyFee', header: 'Monthly Fee' },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span
          className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            item.status === 'Active' &&
              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            item.status === 'Inactive' &&
              'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
            item.status === 'Expired' &&
              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            item.status === 'Suspended' &&
              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          )}
        >
          {item.status}
        </span>
      ),
    },
  ];

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              User Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage cable connections and customer details.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/25"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  TOTAL USERS
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalUsers}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">ACTIVE</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {activeUsers}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  INACTIVE
                </p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                  {inactiveUsers}
                </p>
              </div>
              <div className="h-12 w-12 bg-gray-50 dark:bg-gray-900/30 rounded-full flex items-center justify-center">
                <UserX className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  EXPIRED
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {expiredUsers}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <UserMinus className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        <SearchBar
          placeholder="Search by name, user ID, code or phone..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              User List
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredUsers.length} users found
            </span>
          </div>
          <div className="p-4">
            <DataTable
              data={filteredUsers}
              columns={columns}
              actions={[
                {
                  label: 'Edit',
                  value: 'edit',
                  icon: <Edit className="h-4 w-4" />,
                },
                {
                  label: 'View',
                  value: 'view',
                  icon: <Eye className="h-4 w-4" />,
                },
                {
                  label: 'Delete',
                  value: 'delete',
                  icon: <Trash2 className="h-4 w-4" />,
                },
              ]}
              onAction={(item, action) => {
                if (action === 'delete') {
                  handleDelete(item.id, item.name);
                } else if (action === 'edit') {
                  handleEdit(item.name);
                } else if (action === 'view') {
                  toast.success(`Viewing ${item.name}`);
                }
              }}
              accordionTitle="name"
              accordionSubtitle="customerId"
              emptyMessage="No users found matching your search"
            />
          </div>
        </div>

        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleUserAdded}
          title="Add New User"
          subtitle="Create a new cable connection for a customer"
          fields={userFields}
          submitLabel="Add User"
          color="blue"
          endpoint="/customers"
          transformData={transformUserData}
          context={{ packages, areas }}
        />
      </div>
    </Layout>
  );
}
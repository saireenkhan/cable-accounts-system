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
  X,
  Phone,
  MapPin,
  Package as PackageIcon,
  DollarSign,
  Hash,
  Home,
  CheckCircle,
  XCircle,
  Clock,
  User as UserIcon,
  Percent,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);

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
          address: customer.address || '',
          area: customer.area?.name || 'N/A',
          areaId: customer.area?._id || '',
          package: customer.package || '',
          packagePrice: customer.packagePrice || 0,
          discount: customer.discount || 0,
          discountRaw: customer.discount || 0,
          monthlyFeeRaw: customer.monthlyFee || 0,
          monthlyFee: `Rs. ${customer.monthlyFee?.toLocaleString() || 0}`,
          status: customer.status
            ? customer.status.charAt(0).toUpperCase() + customer.status.slice(1)
            : 'Active',
          statusRaw: customer.status || 'active',
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

  // ✅ Updated fields — discount added BEFORE monthlyFee
  const userFields: Field[] = [
    {
      name: 'customerId',
      label: 'User ID',
      type: 'text',
      required: true,
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
    // ✅ NEW — Discount field
    {
      name: 'discount',
      label: 'Discount (Rs.)',
      type: 'number',
      placeholder: '0',
      defaultValue: '0',
    },
    // ✅ Monthly fee now depends on BOTH package and discount
    {
      name: 'monthlyFee',
      label: 'Monthly Fee (Rs.)',
      type: 'text',
      required: true,
      placeholder: 'Auto-filled',
      dependsOn: 'package',
      updateOnChange: (value: any, formData: any, context: any) => {
        const packages = context?.packages || [];
        const selectedPkg = packages.find((p: any) => p.name === value);
        const packagePrice = selectedPkg?.sellingPrice || 0;

        const discount = parseFloat(String(formData?.discount || 0)) || 0;

        return Math.max(0, packagePrice - discount);
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

  // ✅ Transform — discount included, monthlyFee computed as (packagePrice - discount)
  const transformUserData = (data: any) => {
    const selectedPackage = packages.find((pkg: any) => pkg.name === data.package);
    const packagePrice = selectedPackage?.sellingPrice || 0;
    const discount = parseFloat(String(data.discount || 0)) || 0;
    const monthlyFee = Math.max(0, packagePrice - discount);

    return {
      customerId: data.customerId,
      name: data.name,
      phone: data.phone,
      cnic: data.cnic || '',
      address: data.address,
      area: data.area,
      package: data.package,
      discount: discount,
      monthlyFee: monthlyFee,
      status: data.status || 'active',
    };
  };

  const handleUserAdded = (data: any) => {
    toast.success(
      editingUser
        ? `${data.name} updated successfully!`
        : `${data.name} added successfully!`
    );
    setEditingUser(null);
    setIsModalOpen(false);
    fetchUsers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await api.delete(`/customers/${id}`);
      setUsers(users.filter((u) => u.id !== id));
      toast.success(`${name} deleted`);
      if (editingUser?.id === id) setEditingUser(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleView = (user: any) => {
    setViewingUser(user);
    setIsViewOpen(true);
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.customerId?.toLowerCase().includes(query) ||
      user.phone?.includes(query)
    );
  });

  // ✅ Updated columns — Discount replaces Code
  const columns = [
    { key: 'customerId', header: 'User ID' },
    { key: 'name', header: 'Customer' },
    { key: 'phone', header: 'Phone' },
    { key: 'area', header: 'Area' },
    {
      key: 'discount',
      header: 'Discount',
      render: (item: any) => (
        <span
          className={cn(
            'font-medium',
            item.discount > 0
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {item.discount > 0
            ? `Rs. ${item.discount.toLocaleString()}`
            : 'Rs. 0'}
        </span>
      ),
    },
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
            onClick={() => {
              setEditingUser(null);
              setIsModalOpen(true);
            }}
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
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ACTIVE
                </p>
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
          placeholder="Search by name, user ID or phone..."
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
                  value: 'edit',
                  icon: <Edit className="h-4 w-4" />,
                },
                {
                  value: 'view',
                  icon: <Eye className="h-4 w-4" />,
                },
                {
                  value: 'delete',
                  icon: <Trash2 className="h-4 w-4" />,
                },
              ]}
              onAction={(item, action) => {
                if (action === 'delete') {
                  handleDelete(item.id, item.name);
                } else if (action === 'edit') {
                  handleEdit(item);
                } else if (action === 'view') {
                  handleView(item);
                }
              }}
              accordionTitle="name"
              accordionSubtitle="customerId"
              emptyMessage="No users found matching your search"
            />
          </div>
        </div>

        {/* ✅ Add / Edit User Modal — with discount */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingUser(null);
          }}
          onSuccess={handleUserAdded}
          title={editingUser ? 'Edit User' : 'Add New User'}
          subtitle={
            editingUser
              ? 'Update the customer details below'
              : 'Create a new cable connection for a customer'
          }
          fields={userFields}
          submitLabel={editingUser ? 'Update User' : 'Add User'}
          color="blue"
          endpoint={editingUser ? `/customers/${editingUser.id}` : '/customers'}
          method={editingUser ? 'PUT' : 'POST'}
          initialData={
            editingUser
              ? {
                  customerId: editingUser.customerId,
                  name: editingUser.name,
                  phone: editingUser.phone,
                  address: editingUser.address,
                  area: editingUser.area,
                  package: editingUser.package,
                  discount: editingUser.discountRaw || 0,
                  monthlyFee: editingUser.monthlyFeeRaw,
                  status: editingUser.statusRaw,
                }
              : undefined
          }
          transformData={transformUserData}
          context={{ packages, areas }}
        />

        {/* ✅ View User Modal — with discount */}
        {isViewOpen && viewingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsViewOpen(false)}
            />

            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {viewingUser.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      User ID: {viewingUser.customerId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsViewOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-4">
                <div className="flex justify-center">
                  <span
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm font-semibold inline-flex items-center gap-1.5',
                      viewingUser.status === 'Active' &&
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                      viewingUser.status === 'Inactive' &&
                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
                      viewingUser.status === 'Expired' &&
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                      viewingUser.status === 'Suspended' &&
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    )}
                  >
                    {viewingUser.status === 'Active' && (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {viewingUser.status === 'Inactive' && (
                      <XCircle className="h-4 w-4" />
                    )}
                    {viewingUser.status === 'Expired' && (
                      <Clock className="h-4 w-4" />
                    )}
                    {viewingUser.status === 'Suspended' && (
                      <XCircle className="h-4 w-4" />
                    )}
                    {viewingUser.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ViewField
                    icon={<Hash className="h-4 w-4" />}
                    label="User ID"
                    value={viewingUser.customerId}
                  />
                  <ViewField
                    icon={<UserIcon className="h-4 w-4" />}
                    label="Full Name"
                    value={viewingUser.name}
                  />
                  <ViewField
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={viewingUser.phone}
                  />
                  <ViewField
                    icon={<MapPin className="h-4 w-4" />}
                    label="Area"
                    value={viewingUser.area}
                  />
                  <ViewField
                    icon={<PackageIcon className="h-4 w-4" />}
                    label="Package"
                    value={viewingUser.package || 'No package assigned'}
                  />
                  <ViewField
                    icon={<Percent className="h-4 w-4" />}
                    label="Discount"
                    value={
                      viewingUser.discount > 0
                        ? `Rs. ${viewingUser.discount.toLocaleString()}`
                        : 'Rs. 0'
                    }
                  />
                  <ViewField
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Monthly Fee"
                    value={`Rs. ${viewingUser.monthlyFeeRaw.toLocaleString()}`}
                    highlight
                  />
                  <ViewField
                    icon={<Home className="h-4 w-4" />}
                    label="Address"
                    value={viewingUser.address || 'N/A'}
                    fullWidth
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  onClick={() => setIsViewOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsViewOpen(false);
                    handleEdit(viewingUser);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// Helper component
function ViewField({
  icon,
  label,
  value,
  highlight = false,
  fullWidth = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
  highlight?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        fullWidth && 'sm:col-span-2',
        highlight
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      )}
    >
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
        {icon}
        {label}
      </div>
      <p
        className={cn(
          'font-semibold',
          highlight
            ? 'text-blue-700 dark:text-blue-400 text-lg'
            : 'text-gray-900 dark:text-white'
        )}
      >
        {value}
      </p>
    </div>
  );
}
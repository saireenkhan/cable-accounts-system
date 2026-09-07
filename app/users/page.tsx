'use client';

import React, { useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Eye,
  UserCheck,
  UserX,
  UserMinus,
  UserCog
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([
    {
      id: 1,
      code: 'LC-1001',
      name: 'Ahmed Khan',
      phone: '0300-1234567',
      area: 'Gulshan Block 1',
      monthlyFee: 'Rs. 1,500',
      status: 'Active',
    },
    {
      id: 2,
      code: 'LC-1002',
      name: 'Ali Raza',
      phone: '0321-7654321',
      area: 'Model Colony',
      monthlyFee: 'Rs. 1,800',
      status: 'Active',
    },
    {
      id: 3,
      code: 'LC-1003',
      name: 'Usman Shah',
      phone: '0333-2221110',
      area: 'Green Town',
      monthlyFee: 'Rs. 1,500',
      status: 'Inactive',
    },
    {
      id: 4,
      code: 'LC-1004',
      name: 'Saira Fatima',
      phone: '0345-6789012',
      area: 'Gulshan Block 1',
      monthlyFee: 'Rs. 2,000',
      status: 'Active',
    },
    {
      id: 5,
      code: 'LC-1005',
      name: 'Muhammad Ali',
      phone: '0312-3456789',
      area: 'Model Colony',
      monthlyFee: 'Rs. 1,200',
      status: 'Expired',
    },
  ]);

  // Calculate stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'Active').length;
  const inactiveUsers = users.filter(u => u.status === 'Inactive').length;
  const expiredUsers = users.filter(u => u.status === 'Expired').length;

  // User fields for modal
  const userFields: Field[] = [
    { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter full name' },
    { name: 'phone', label: 'Phone', type: 'text', required: true, placeholder: '0300-1234567' },
    { name: 'cnic', label: 'CNIC', type: 'text', placeholder: '12345-1234567-1' },
    { name: 'address', label: 'Address', type: 'text', required: true, placeholder: 'House #, Street' },
    { 
      name: 'area', 
      label: 'Area', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'Gulshan Block 1', value: 'Gulshan Block 1' },
        { label: 'Model Colony', value: 'Model Colony' },
        { label: 'Green Town', value: 'Green Town' },
      ]
    },
    { 
      name: 'package', 
      label: 'Package', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'Basic - Rs. 1,200', value: 'Basic' },
        { label: 'Standard - Rs. 1,500', value: 'Standard' },
        { label: 'Premium - Rs. 1,800', value: 'Premium' },
      ]
    },
    { name: 'monthlyFee', label: 'Monthly Fee', type: 'text', required: true, placeholder: 'Rs. 1,500' },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
        { label: 'Suspended', value: 'Suspended' },
        { label: 'Expired', value: 'Expired' },
      ]
    },
  ];

  const handleUserAdded = (data: any) => {
    const newUser = {
      id: Date.now(),
      code: `LC-${String(users.length + 1).padStart(4, '0')}`,
      name: data.name,
      phone: data.phone,
      area: data.area,
      monthlyFee: `Rs. ${parseFloat(data.monthlyFee).toLocaleString()}`,
      status: data.status || 'Active',
    };
    setUsers([newUser, ...users]);
    toast.success(`${data.name} added successfully!`);
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      setUsers(users.filter(u => u.id !== id));
      toast.success(`${name} deleted`);
    }
  };

  const handleEdit = (name: string) => {
    toast.success(`Editing ${name}`);
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.code.toLowerCase().includes(query) ||
      user.phone.includes(query)
    );
  });

  const columns = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Customer' },
    { key: 'phone', header: 'Phone' },
    { key: 'area', header: 'Area' },
    { key: 'monthlyFee', header: 'Monthly Fee' },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: any) => (
        <span className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          item.status === 'Active' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          item.status === 'Inactive' && 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
          item.status === 'Expired' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          item.status === 'Suspended' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        )}>
          {item.status}
        </span>
      )
    },
  ];

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header - Same as Receive Payment */}
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

        {/* Stats - Same format as Receive Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL USERS</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">INACTIVE</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">EXPIRED</p>
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
        {/* Search - Same as Receive Payment */}
        <SearchBar
          placeholder="Search by name, code or phone..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Table - Same as Receive Payment */}
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
                { label: 'Edit', value: 'edit', icon: <Edit className="h-4 w-4" /> },
                { label: 'View', value: 'view', icon: <Eye className="h-4 w-4" /> },
                { label: 'Delete', value: 'delete', icon: <Trash2 className="h-4 w-4" /> },
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
              accordionSubtitle="code"
              emptyMessage="No users found matching your search"
            />
          </div>
        </div>

        {/* Add User Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleUserAdded}
          title="Add New User"
          subtitle="Create a new cable connection for a customer"
          fields={userFields}
          submitLabel="Add User"
          color="blue"
        />
      </div>
    </Layout>
  );
}
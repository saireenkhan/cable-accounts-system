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
  Phone,
  MapPin,
  Briefcase,
  Calendar
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function StaffPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [staff, setStaff] = useState([
    {
      id: 1,
      staffId: 'ST-001',
      name: 'Recovery Operator',
      phone: '0300-5551234',
      designation: 'Collector',
      area: 'Gulshan Block 1',
      status: 'Active',
    },
    {
      id: 2,
      staffId: 'ST-002',
      name: 'Kamran Ali',
      phone: '0321-6644221',
      designation: 'Technician',
      area: 'Model Colony',
      status: 'Active',
    },
    {
      id: 3,
      staffId: 'ST-003',
      name: 'Saima Akhtar',
      phone: '0333-7890123',
      designation: 'Sales Executive',
      area: 'Green Town',
      status: 'Active',
    },
    {
      id: 4,
      staffId: 'ST-004',
      name: 'Usman Ghani',
      phone: '0345-5678901',
      designation: 'Installer',
      area: 'Gulshan Block 1',
      status: 'Inactive',
    },
  ]);

  // Calculate stats
  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.status === 'Active').length;
  const inactiveStaff = staff.filter(s => s.status === 'Inactive').length;

  // Staff fields for modal
  const staffFields: Field[] = [
    { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Enter staff name' },
    { name: 'phone', label: 'Phone', type: 'text', required: true, placeholder: '0300-1234567' },
    { name: 'email', label: 'Email', type: 'text', placeholder: 'staff@example.com' },
    { name: 'cnic', label: 'CNIC', type: 'text', placeholder: '12345-1234567-1' },
    { 
      name: 'designation', 
      label: 'Designation', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'Collector', value: 'Collector' },
        { label: 'Technician', value: 'Technician' },
        { label: 'Installer', value: 'Installer' },
        { label: 'Sales Executive', value: 'Sales Executive' },
        { label: 'Manager', value: 'Manager' },
        { label: 'Other', value: 'Other' },
      ]
    },
    { 
      name: 'area', 
      label: 'Assigned Area', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'Gulshan Block 1', value: 'Gulshan Block 1' },
        { label: 'Model Colony', value: 'Model Colony' },
        { label: 'Green Town', value: 'Green Town' },
      ]
    },
    { name: 'salary', label: 'Salary (Rs.)', type: 'text', placeholder: '25,000' },
    { name: 'joiningDate', label: 'Joining Date', type: 'date' },
    { name: 'address', label: 'Address', type: 'textarea', placeholder: 'Staff address' },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ]
    },
  ];

  const handleStaffAdded = (data: any) => {
    const newStaff = {
      id: Date.now(),
      staffId: `ST-${String(staff.length + 1).padStart(3, '0')}`,
      name: data.name,
      phone: data.phone,
      designation: data.designation,
      area: data.area,
      status: data.status || 'Active',
    };
    setStaff([newStaff, ...staff]);
    toast.success(`${data.name} added successfully!`);
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      setStaff(staff.filter(s => s.id !== id));
      toast.success(`${name} deleted`);
    }
  };

  const handleEdit = (name: string) => {
    toast.success(`Editing ${name}`);
  };

  const filteredStaff = staff.filter(member => {
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.staffId.toLowerCase().includes(query) ||
      member.phone.includes(query) ||
      member.designation.toLowerCase().includes(query)
    );
  });

  const columns = [
    { key: 'staffId', header: 'Staff ID' },
    { key: 'name', header: 'Name' },
    { key: 'phone', header: 'Phone' },
    { key: 'designation', header: 'Designation' },
    { key: 'area', header: 'Area' },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: any) => (
        <span className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          item.status === 'Active' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          item.status === 'Inactive' && 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
        )}>
          {item.status}
        </span>
      )
    },
  ];

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Staff Profile
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage staff members and their contact details.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/25"
          >
            <UserPlus className="h-4 w-4" />
            Add Staff
          </button>
        </div>

        {/* Stats - 3 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL STAFF</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalStaff}
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
                  {activeStaff}
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
                  {inactiveStaff}
                </p>
              </div>
              <div className="h-12 w-12 bg-gray-50 dark:bg-gray-900/30 rounded-full flex items-center justify-center">
                <UserX className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <SearchBar
          placeholder="Search by name, ID, phone or designation..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Staff Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Staff List
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredStaff.length} staff found
            </span>
          </div>
          <div className="p-4">
            <DataTable
              data={filteredStaff}
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
              accordionSubtitle="staffId"
              emptyMessage="No staff found matching your search"
            />
          </div>
        </div>

        {/* Add Staff Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleStaffAdded}
          title="Add New Staff"
          subtitle="Add a new staff member to the system"
          fields={staffFields}
          submitLabel="Add Staff"
          color="blue"
        />
      </div>
    </Layout>
  );
}
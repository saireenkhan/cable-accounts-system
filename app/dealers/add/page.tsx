'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { 
  Truck, 
  PlusCircle, 
  Edit, 
  Trash2, 
  Eye,
  UserPlus,
  Phone,
  MapPin,
  CreditCard,
  Building2
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function DealersPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Dealers');
  const [dealers, setDealers] = useState([
    {
      id: 1,
      dealerId: 'DLR-001',
      name: 'City Cable Dealer',
      cellNo: '0300-1112233',
      area: 'Gulshan Block 1',
      address: 'Gulshan Block 1',
      remarks: 'Main area dealer',
      status: 'active',
    },
    {
      id: 2,
      dealerId: 'DLR-002',
      name: 'Star Network',
      cellNo: '0321-4455667',
      area: 'Model Colony',
      address: 'Model Colony',
      remarks: 'Active recovery dealer',
      status: 'active',
    },
    {
      id: 3,
      dealerId: 'DLR-003',
      name: 'Pak Vision Cable',
      cellNo: '0333-7788990',
      area: 'Green Town',
      address: 'Green Town',
      remarks: 'Fiber linked dealer',
      status: 'active',
    },
  ]);

  // Calculate stats
  const totalDealers = dealers.length;

  // Dealer fields for modal
  const dealerFields: Field[] = [
    { name: 'name', label: 'Dealer Name', type: 'text', required: true, placeholder: 'Enter dealer name' },
    { name: 'cellNo', label: 'Cell No.', type: 'text', required: true, placeholder: '0330-1234567' },
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
    { name: 'address', label: 'Address', type: 'text', placeholder: 'Dealer address' },
    { name: 'openingBalance', label: 'Opening Balance (Rs.)', type: 'text', placeholder: '0' },
    { name: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Additional notes...' },
  ];

  const handleDealerAdded = (data: any) => {
    const newDealer = {
      id: Date.now(),
      dealerId: `DLR-${String(dealers.length + 1).padStart(3, '0')}`,
      name: data.name,
      cellNo: data.cellNo,
      area: data.area,
      address: data.address || data.area,
      remarks: data.remarks || '',
      status: 'active',
    };
    setDealers([newDealer, ...dealers]);
    toast.success(`${data.name} added successfully!`);
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      setDealers(dealers.filter(d => d.id !== id));
      toast.success(`${name} deleted`);
    }
  };

  const handleEdit = (name: string) => {
    toast.success(`Editing ${name}`);
  };

  const filteredDealers = dealers.filter(dealer => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      dealer.name.toLowerCase().includes(query) ||
      dealer.dealerId.toLowerCase().includes(query) ||
      dealer.cellNo.includes(query);
    
    const matchesStatus = selectedStatus === 'All Dealers' || 
      (selectedStatus === 'Active' && dealer.status === 'active') ||
      (selectedStatus === 'Inactive' && dealer.status === 'inactive');
    
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { key: 'dealerId', header: 'Dealer ID' },
    { key: 'name', header: 'Dealer Name' },
    { key: 'cellNo', header: 'Cell No.' },
    { key: 'area', header: 'Area' },
    { key: 'address', header: 'Address' },
    { key: 'remarks', header: 'Remarks' },
  ];

  const statusOptions = ['All Dealers', 'Active', 'Inactive'];

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck className="h-6 w-6 text-purple-600" />
              Dealers
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage dealer information and contact details.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-500/25"
          >
            <UserPlus className="h-4 w-4" />
            Add Dealer
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL DEALERS</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalDealers}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Truck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">ACTIVE</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {dealers.filter(d => d.status === 'active').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">INACTIVE</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                  {dealers.filter(d => d.status === 'inactive').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gray-50 dark:bg-gray-900/30 rounded-full flex items-center justify-center">
                <Truck className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL RECOVERY</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  77.2%
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              placeholder="Search dealer name, ID or cell no..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Dealer List
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredDealers.length} dealers found
            </span>
          </div>
          <div className="p-4">
            <DataTable
              data={filteredDealers}
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
              accordionSubtitle="dealerId"
              emptyMessage="No dealers found matching your search"
            />
          </div>
        </div>

        {/* Add Dealer Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleDealerAdded}
          title="Add New Dealer"
          subtitle="Add a new dealer to the system"
          fields={dealerFields}
          submitLabel="Add Dealer"
          color="purple"
        />
      </div>
    </Layout>
  );
}
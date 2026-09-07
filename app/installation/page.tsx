'use client';

import React, { useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { 
  Wrench, 
  PlusCircle, 
  Printer, 
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Download,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function InstallationPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [charges, setCharges] = useState([
    {
      id: 1,
      date: '03 Sep 2026',
      customer: 'Ahmed Khan',
      area: 'Gulshan Block 1',
      chargeType: 'New Connection',
      amount: 3500,
      status: 'Paid',
    },
    {
      id: 2,
      date: '04 Sep 2026',
      customer: 'Ali Raza',
      area: 'Model Colony',
      chargeType: 'Fiber Re-installation',
      amount: 2500,
      status: 'Unpaid',
    },
    {
      id: 3,
      date: '05 Sep 2026',
      customer: 'Usman Shah',
      area: 'Green Town',
      chargeType: 'Router Replacement',
      amount: 1500,
      status: 'Paid',
    },
    {
      id: 4,
      date: '06 Sep 2026',
      customer: 'Saira Fatima',
      area: 'Gulshan Block 1',
      chargeType: 'New Connection',
      amount: 3500,
      status: 'Paid',
    },
  ]);

  // Calculate stats
  const totalCharges = charges.length;
  const totalAmount = charges.reduce((sum, c) => sum + c.amount, 0);
  const paidAmount = charges.filter(c => c.status === 'Paid').reduce((sum, c) => sum + c.amount, 0);
  const unpaidAmount = charges.filter(c => c.status === 'Unpaid').reduce((sum, c) => sum + c.amount, 0);
  const paidCount = charges.filter(c => c.status === 'Paid').length;
  const unpaidCount = charges.filter(c => c.status === 'Unpaid').length;

  // Installation fields for modal
  const installationFields: Field[] = [
    { 
      name: 'customer', 
      label: 'Customer', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'Ahmed Khan', value: 'Ahmed Khan' },
        { label: 'Ali Raza', value: 'Ali Raza' },
        { label: 'Usman Shah', value: 'Usman Shah' },
        { label: 'Saira Fatima', value: 'Saira Fatima' },
      ]
    },
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
      name: 'chargeType', 
      label: 'Charge Type', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'New Connection', value: 'New Connection' },
        { label: 'Fiber Re-installation', value: 'Fiber Re-installation' },
        { label: 'Router Replacement', value: 'Router Replacement' },
        { label: 'Cable Repair', value: 'Cable Repair' },
        { label: 'Other', value: 'Other' },
      ]
    },
    { name: 'amount', label: 'Amount (Rs.)', type: 'text', required: true, placeholder: '3,500' },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'Paid', value: 'Paid' },
        { label: 'Unpaid', value: 'Unpaid' },
      ]
    },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Additional notes...' },
  ];

  const handleChargeAdded = (data: any) => {
    const newCharge = {
      id: Date.now(),
      date: data.date ? new Date(data.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }),
      customer: data.customer,
      area: data.area,
      chargeType: data.chargeType,
      amount: parseFloat(data.amount) || 0,
      status: data.status,
    };
    setCharges([newCharge, ...charges]);
    toast.success(`Installation charge of Rs. ${newCharge.amount} recorded for ${data.customer}`);
  };

  const handleDelete = (id: number, customer: string) => {
    if (confirm(`Are you sure you want to delete this charge for "${customer}"?`)) {
      setCharges(charges.filter(c => c.id !== id));
      toast.success(`Charge deleted`);
    }
  };

  const handleEdit = (customer: string) => {
    toast.success(`Editing charge for ${customer}`);
  };

  const handlePrint = (charge: any) => {
    toast.success(`Printing charge receipt for ${charge.customer}`);
  };

  const filteredCharges = charges.filter(charge => {
    const query = searchQuery.toLowerCase();
    return (
      charge.customer.toLowerCase().includes(query) ||
      charge.chargeType.toLowerCase().includes(query) ||
      charge.area.toLowerCase().includes(query)
    );
  });

  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'customer', header: 'Customer' },
    { key: 'area', header: 'Area' },
    { key: 'chargeType', header: 'Charge Type' },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (item: any) => (
        <span>Rs. {item.amount.toLocaleString()}</span>
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: any) => (
        <span className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          item.status === 'Paid' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          item.status === 'Unpaid' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
              <Wrench className="h-6 w-6 text-indigo-600" />
              Installation Charges
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track customer installation and field-service charges.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/25"
            >
              <PlusCircle className="h-4 w-4" />
              Add Installation Charge
            </button>
            <button
              onClick={() => toast.success('Exporting charges...')}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats - 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL CHARGES</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalCharges}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Installation & service
                </p>
              </div>
              <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                <Wrench className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">THIS MONTH CHARGES</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  Rs. {totalAmount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Installation revenue
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">COLLECTED</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  Rs. {paidAmount.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {paidCount} charges paid
                </p>
              </div>
              <div className="h-12 w-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">PENDING COLLECTION</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  Rs. {unpaidAmount.toLocaleString()}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Unpaid charges
                </p>
              </div>
              <div className="h-12 w-12 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <SearchBar
          placeholder="Search by customer, charge type or area..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Charges Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Installation Charges List
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredCharges.length} charges found
            </span>
          </div>
          <div className="p-4">
            <DataTable
              data={filteredCharges}
              columns={columns}
              actions={[
                { label: 'Print', value: 'print', icon: <Printer className="h-4 w-4" /> },
                { label: 'Edit', value: 'edit', icon: <Edit className="h-4 w-4" /> },
                { label: 'Delete', value: 'delete', icon: <Trash2 className="h-4 w-4" /> },
              ]}
              onAction={(item, action) => {
                if (action === 'delete') {
                  handleDelete(item.id, item.customer);
                } else if (action === 'edit') {
                  handleEdit(item.customer);
                } else if (action === 'print') {
                  handlePrint(item);
                }
              }}
              accordionTitle="customer"
              accordionSubtitle="chargeType"
              emptyMessage="No charges found matching your search"
            />
          </div>
        </div>
        {/* Add Installation Charge Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleChargeAdded}
          title="Add Installation Charge"
          subtitle="Track customer installation and field-service charges"
          fields={installationFields}
          submitLabel="Add Charge"
          color="indigo"
        />
      </div>
    </Layout>
  );
}
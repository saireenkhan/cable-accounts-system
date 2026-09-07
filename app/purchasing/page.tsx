'use client';

import React, { useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { 
  ShoppingBag, 
  PlusCircle, 
  Printer, 
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Package,
  Truck,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Download
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function PurchasingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [purchases, setPurchases] = useState([
    {
      id: 1,
      purchaseNo: 'PUR-001',
      vendor: 'Network Traders',
      item: '24 Core Fiber Cable',
      quantity: 2,
      unit: 'km',
      amount: 120000,
      paidAmount: 120000,
      balance: 0,
      date: '03 Sep 2026',
      status: 'Paid',
      remarks: 'Main fiber line installation',
    },
    {
      id: 2,
      purchaseNo: 'PUR-002',
      vendor: 'Tech Vision',
      item: 'ONU Devices',
      quantity: 20,
      unit: 'units',
      amount: 78000,
      paidAmount: 40000,
      balance: 38000,
      date: '04 Sep 2026',
      status: 'Partial',
      remarks: 'For new connections',
    },
    {
      id: 3,
      purchaseNo: 'PUR-003',
      vendor: 'Cable World',
      item: 'Cat6 Ethernet Cable',
      quantity: 500,
      unit: 'meters',
      amount: 45000,
      paidAmount: 0,
      balance: 45000,
      date: '05 Sep 2026',
      status: 'Pending',
      remarks: 'Stock replenishment',
    },
  ]);

  // Calculate stats
  const totalPurchases = purchases.length;
  const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = purchases.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalBalance = purchases.reduce((sum, p) => sum + p.balance, 0);
  const paidCount = purchases.filter(p => p.status === 'Paid').length;
  const partialCount = purchases.filter(p => p.status === 'Partial').length;
  const pendingCount = purchases.filter(p => p.status === 'Pending').length;

  // Purchase fields for modal
  const purchaseFields: Field[] = [
    { name: 'vendor', label: 'Vendor', type: 'text', required: true, placeholder: 'Enter vendor name' },
    { name: 'item', label: 'Item', type: 'text', required: true, placeholder: 'Enter item name' },
    { name: 'quantity', label: 'Quantity', type: 'text', required: true, placeholder: '10' },
    { name: 'unit', label: 'Unit', type: 'text', placeholder: 'km, units, meters, etc.' },
    { name: 'amount', label: 'Total Amount (Rs.)', type: 'text', required: true, placeholder: '50,000' },
    { name: 'paidAmount', label: 'Paid Amount (Rs.)', type: 'text', placeholder: '0' },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'Paid', value: 'Paid' },
        { label: 'Partial', value: 'Partial' },
        { label: 'Pending', value: 'Pending' },
      ]
    },
    { name: 'date', label: 'Purchase Date', type: 'date' },
    { name: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Additional notes...' },
  ];

  const handlePurchaseAdded = (data: any) => {
    const amount = parseFloat(data.amount) || 0;
    const paidAmount = parseFloat(data.paidAmount) || 0;
    
    const newPurchase = {
      id: Date.now(),
      purchaseNo: `PUR-${String(purchases.length + 1).padStart(3, '0')}`,
      vendor: data.vendor,
      item: data.item,
      quantity: parseInt(data.quantity) || 0,
      unit: data.unit || '',
      amount: amount,
      paidAmount: paidAmount,
      balance: amount - paidAmount,
      date: data.date ? new Date(data.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: data.status,
      remarks: data.remarks || '',
    };
    setPurchases([newPurchase, ...purchases]);
    toast.success(`Purchase recorded for ${data.item}`);
  };

  const handleDelete = (id: number, item: string) => {
    if (confirm(`Are you sure you want to delete this purchase for "${item}"?`)) {
      setPurchases(purchases.filter(p => p.id !== id));
      toast.success(`Purchase deleted`);
    }
  };

  const handleEdit = (item: string) => {
    toast.success(`Editing purchase for ${item}`);
  };

  const handlePrint = (purchase: any) => {
    toast.success(`Printing purchase ${purchase.purchaseNo}`);
  };

  const filteredPurchases = purchases.filter(purchase => {
    const query = searchQuery.toLowerCase();
    return (
      purchase.vendor.toLowerCase().includes(query) ||
      purchase.item.toLowerCase().includes(query) ||
      purchase.purchaseNo.toLowerCase().includes(query)
    );
  });

  const columns = [
    { key: 'purchaseNo', header: 'Purchase No.' },
    { key: 'vendor', header: 'Vendor' },
    { key: 'item', header: 'Item' },
    { 
      key: 'quantity', 
      header: 'Qty',
      render: (item: any) => (
        <span>{item.quantity} {item.unit}</span>
      )
    },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (item: any) => (
        <span>Rs. {item.amount.toLocaleString()}</span>
      )
    },
    { 
      key: 'balance', 
      header: 'Balance',
      render: (item: any) => (
        <span className={cn(
          item.balance === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        )}>
          Rs. {item.balance.toLocaleString()}
        </span>
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: any) => (
        <span className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          item.status === 'Paid' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          item.status === 'Partial' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          item.status === 'Pending' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
              <ShoppingBag className="h-6 w-6 text-orange-600" />
              Purchasing
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Record equipment, cable and operational purchases.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-orange-500/25"
            >
              <PlusCircle className="h-4 w-4" />
              Add Purchase
            </button>
            <button
              onClick={() => toast.success('Exporting purchases...')}
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
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL PURCHASES</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalPurchases}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Equipment and materials
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">THIS MONTH PURCHASE</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  Rs. {totalAmount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Equipment and materials
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">PAID</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  Rs. {totalPaid.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {paidCount} purchases
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
                <p className="text-sm text-gray-500 dark:text-gray-400">PENDING PAYABLE</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  Rs. {totalBalance.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Supplier balance
                </p>
              </div>
              <div className="h-12 w-12 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <SearchBar
          placeholder="Search by vendor, item or purchase no..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Purchases Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Purchase History
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredPurchases.length} purchases found
            </span>
          </div>
          <div className="p-4">
            <DataTable
              data={filteredPurchases}
              columns={columns}
              actions={[
                { label: 'Print', value: 'print', icon: <Printer className="h-4 w-4" /> },
                { label: 'Edit', value: 'edit', icon: <Edit className="h-4 w-4" /> },
                { label: 'Delete', value: 'delete', icon: <Trash2 className="h-4 w-4" /> },
              ]}
              onAction={(item, action) => {
                if (action === 'delete') {
                  handleDelete(item.id, item.item);
                } else if (action === 'edit') {
                  handleEdit(item.item);
                } else if (action === 'print') {
                  handlePrint(item);
                }
              }}
              accordionTitle="item"
              accordionSubtitle="purchaseNo"
              emptyMessage="No purchases found matching your search"
            />
          </div>
        </div>

        {/* Add Purchase Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handlePurchaseAdded}
          title="Add New Purchase"
          subtitle="Record equipment, cable and operational purchases"
          fields={purchaseFields}
          submitLabel="Add Purchase"
        />
      </div>
    </Layout>
  );
}
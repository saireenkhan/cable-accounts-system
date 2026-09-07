'use client';

import React, { useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal'; // ✅ Import Field type
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { PlusCircle, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [payments, setPayments] = useState([
    {
      id: 1,
      receipt: 'RC-260903-001',
      customer: 'Ahmed Khan',
      month: 'September 2026',
      date: '03 Sep 2026',
      method: 'Cash',
      amount: 'Rs. 1,500',
    },
    {
      id: 2,
      receipt: 'RC-260903-002',
      customer: 'Ali Raza',
      month: 'September 2026',
      date: '03 Sep 2026',
      method: 'JazzCash',
      amount: 'Rs. 1,000',
    },
  ]);

  // ✅ Properly typed payment fields
  const paymentFields: Field[] = [
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
    { name: 'month', label: 'Month', type: 'text', required: true, placeholder: 'September 2026' },
    { name: 'amount', label: 'Amount', type: 'text', required: true, placeholder: '1,500' },
    { 
      name: 'method', 
      label: 'Payment Method', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'Cash', value: 'Cash' },
        { label: 'JazzCash', value: 'JazzCash' },
        { label: 'EasyPaisa', value: 'EasyPaisa' },
        { label: 'Bank Transfer', value: 'Bank Transfer' },
      ]
    },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Additional notes...' },
  ];

  const handlePaymentAdded = (payment: any) => {
    const receiptNo = `RC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(payments.length + 1).padStart(3, '0')}`;
    
    const newPayment = {
      id: Date.now(),
      receipt: receiptNo,
      customer: payment.customer,
      month: payment.month,
      date: payment.date ? new Date(payment.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }),
      method: payment.method,
      amount: `Rs. ${parseFloat(payment.amount).toLocaleString()}`,
    };
    
    setPayments([newPayment, ...payments]);
    toast.success(`Payment of ${newPayment.amount} recorded!`);
  };

  const filteredPayments = payments.filter(payment => {
    const query = searchQuery.toLowerCase();
    return (
      payment.customer.toLowerCase().includes(query) ||
      payment.receipt.toLowerCase().includes(query) ||
      payment.month.toLowerCase().includes(query)
    );
  });

  const columns = [
    { key: 'receipt', header: 'Receipt' },
    { key: 'customer', header: 'Customer' },
    { key: 'month', header: 'Month' },
    { key: 'date', header: 'Date' },
    { key: 'method', header: 'Method' },
    { key: 'amount', header: 'Amount' },
  ];

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Receive Payment
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review payment history and issue customer receipts.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-500/25"
          >
            <PlusCircle className="h-4 w-4" />
            Receive Payment
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">TODAY'S COLLECTION</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              Rs. 68,500
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">42 receipts</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">MONTHLY COLLECTION</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              Rs. 1,435,500
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">↑ 76.7% recovered</p>
          </div>
        </div>

        {/* Search */}
        <SearchBar
          placeholder="Search by receipt, customer or month..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Payment History</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{filteredPayments.length} receipts found</span>
          </div>
          <div className="p-4">
            <DataTable
              data={filteredPayments}
              columns={columns}
              actions={[
                { label: 'Print', value: 'print', icon: <Printer className="h-4 w-4" /> },
              ]}
              onAction={(item, action) => {
                if (action === 'print') {
                  toast.success(`Printing receipt ${item.receipt}`);
                }
              }}
              accordionTitle="customer"
              accordionSubtitle="receipt"
            />
          </div>
        </div>

        {/* ✅ Reusable Modal with proper types */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handlePaymentAdded}
          title="Receive Payment"
          subtitle="Record payment from customer"
          fields={paymentFields}
          submitLabel="Record Payment"
          color="green"
        />
      </div>
    </Layout>
  );
}
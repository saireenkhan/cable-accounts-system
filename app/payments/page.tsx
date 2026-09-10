'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import { PlusCircle, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PaymentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Fetch payments and customers
  useEffect(() => {
    fetchPayments();
    fetchCustomers();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await api.get('/payments');
      if (response.data.success) {
        const formattedPayments = response.data.payments.map((payment: any) => ({
          id: payment._id,
          receipt: payment.receiptNo || 'N/A',
          customer: payment.customer?.name || 'Unknown',
          month: payment.month || 'N/A',
          date: payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-PK', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          }) : 'N/A',
          method: payment.paymentMethod ? payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1) : 'N/A',
          amount: payment.amount || 0,
        }));
        setPayments(formattedPayments);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await api.get('/customers?limit=1000');
      if (response.data.success) {
        setCustomers(response.data.customers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  // ✅ 12 Months for dropdown
  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const monthOptions = monthsList.map(month => ({
    label: `${month} ${currentYear}`,
    value: `${month} ${currentYear}`
  }));

  // ✅ Payment fields with month dropdown and searchable customer
  const paymentFields: Field[] = [
    { 
      name: 'customer', 
      label: 'Customer', 
      type: 'select', 
      required: true, 
      options: customers.map((c: any) => ({
        label: `${c.name} - (${c.code})`,
        value: c.name
      })),
      searchable: true,
    },
    { 
      name: 'month', 
      label: 'Month', 
      type: 'select', 
      required: true, 
      options: monthOptions
    },
    { 
      name: 'amount', 
      label: 'Amount (Rs.)', 
      type: 'text', 
      required: true, 
      placeholder: '1500' 
    },
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
    { 
      name: 'date', 
      label: 'Date', 
      type: 'date', 
      required: true 
    },
    { 
      name: 'remarks', 
      label: 'Remarks', 
      type: 'textarea', 
      placeholder: 'Additional notes...' 
    },
  ];

  const handlePaymentAdded = (payment: any) => {
    fetchPayments();
    toast.success('Payment recorded successfully!');
  };

  const filteredPayments = payments.filter(payment => {
    const query = searchQuery.toLowerCase();
    return (
      payment.customer?.toLowerCase().includes(query) ||
      payment.receipt?.toLowerCase().includes(query) ||
      payment.month?.toLowerCase().includes(query)
    );
  });

  const columns = [
    { key: 'receipt', header: 'Receipt' },
    { key: 'customer', header: 'Customer' },
    { key: 'month', header: 'Month' },
    { key: 'date', header: 'Date' },
    { key: 'method', header: 'Method' },
    { 
      key: 'amount', 
      header: 'Amount',
      render: (item: any) => `Rs. ${(item.amount || 0).toLocaleString()}`
    },
  ];

  const totalPayments = payments.length;
  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL PAYMENTS</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalPayments}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Printer className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL COLLECTION</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  Rs. {totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <PlusCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
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
              emptyMessage="No payments found"
            />
          </div>
        </div>

        {/* Add Payment Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handlePaymentAdded}
          title="Receive Payment"
          subtitle="Record payment from customer"
          fields={paymentFields}
          submitLabel="Record Payment"
          color="green"
          endpoint="/payments"
          context={{ customers: customers }}
        />
      </div>
    </Layout>
  );
}
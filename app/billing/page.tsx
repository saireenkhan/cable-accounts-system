'use client';

import React, { useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { 
  PlusCircle, 
  Printer, 
  FileText, 
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Download
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function BillingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('September 2026');
  const [isGenerating, setIsGenerating] = useState(false);
  const [bills, setBills] = useState([
    {
      id: 1,
      billNo: 'B-260901',
      customer: 'Ahmed Khan',
      month: 'Sep 2026',
      total: 'Rs. 1,500',
      paid: 'Rs. 1,500',
      balance: 'Rs. 0',
      status: 'Paid',
    },
    {
      id: 2,
      billNo: 'B-260902',
      customer: 'Ali Raza',
      month: 'Sep 2026',
      total: 'Rs. 2,300',
      paid: 'Rs. 1,000',
      balance: 'Rs. 1,300',
      status: 'Partial',
    },
    {
      id: 3,
      billNo: 'B-260903',
      customer: 'Usman Shah',
      month: 'Sep 2026',
      total: 'Rs. 1,500',
      paid: 'Rs. 0',
      balance: 'Rs. 1,500',
      status: 'Pending',
    },
  ]);

  // Calculate totals
  const totalBills = bills.length;
  const totalAmount = bills.reduce((sum, bill) => {
    const amount = parseFloat(bill.total.replace(/[^0-9.]/g, ''));
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  
  const totalPaid = bills.reduce((sum, bill) => {
    const amount = parseFloat(bill.paid.replace(/[^0-9.]/g, ''));
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  
  const totalBalance = bills.reduce((sum, bill) => {
    const amount = parseFloat(bill.balance.replace(/[^0-9.]/g, ''));
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const billingFields: Field[] = [
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
    { name: 'total', label: 'Total Amount', type: 'text', required: true, placeholder: '1,500' },
    { name: 'paid', label: 'Paid Amount', type: 'text', placeholder: '0' },
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
  ];

  const filteredBills = bills.filter(bill => {
    const query = searchQuery.toLowerCase();
    return (
      bill.customer.toLowerCase().includes(query) ||
      bill.billNo.toLowerCase().includes(query)
    );
  });

  const handleGenerateBills = () => {
    setIsGenerating(true);
    setTimeout(() => {
      toast.success(`Bills for ${selectedMonth} generated successfully!`);
      setIsGenerating(false);
    }, 2000);
  };

  const handleBillAdded = (data: any) => {
    const newBill = {
      id: Date.now(),
      billNo: `B-${new Date().toISOString().slice(2,10).replace(/-/g,'')}${String(bills.length + 1).padStart(2, '0')}`,
      customer: data.customer,
      month: data.month,
      total: `Rs. ${parseFloat(data.total).toLocaleString()}`,
      paid: `Rs. ${parseFloat(data.paid || 0).toLocaleString()}`,
      balance: `Rs. ${(parseFloat(data.total) - parseFloat(data.paid || 0)).toLocaleString()}`,
      status: data.status,
    };
    setBills([newBill, ...bills]);
    toast.success(`Bill for ${data.customer} added successfully!`);
  };

  const columns = [
    { key: 'billNo', header: 'Bill No.' },
    { key: 'customer', header: 'Customer' },
    { key: 'month', header: 'Month' },
    { key: 'total', header: 'Total' },
    { key: 'paid', header: 'Paid' },
    { key: 'balance', header: 'Balance' },
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

  const months = [
    'September 2026',
    'August 2026',
    'July 2026',
    'June 2026',
  ];

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Monthly Billing
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generate and review customer bills.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/25"
            >
              <PlusCircle className="h-4 w-4" />
              Add Bill
            </button>
            <button
              onClick={handleGenerateBills}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-green-500/25 disabled:opacity-70"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Generate {selectedMonth}
                </>
              )}
            </button>
          </div>
        </div>
   {/* Stats - 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL BILLS</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalBills}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL AMOUNT</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  Rs. {totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">COLLECTED</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  Rs. {totalPaid.toLocaleString()}
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
                <p className="text-sm text-gray-500 dark:text-gray-400">OUTSTANDING</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  Rs. {totalBalance.toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Month Selector + Search - Same row like Dealer Payments */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            >
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <SearchBar
              placeholder="Search customer..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
        </div>

     

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Bills for {selectedMonth}
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredBills.length} bills found
            </span>
          </div>
          <div className="p-4">
            <DataTable
              data={filteredBills}
              columns={columns}
              actions={[
                { label: 'Print', value: 'print', icon: <Printer className="h-4 w-4" /> },
              ]}
              onAction={(item, action) => {
                if (action === 'print') {
                  toast.success(`Printing bill ${item.billNo}`);
                }
              }}
              accordionTitle="customer"
              accordionSubtitle="billNo"
              emptyMessage="No bills found for this month"
            />
          </div>
        </div>

        {/* Add Bill Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleBillAdded}
          title="Add New Bill"
          subtitle="Create a new bill for a customer"
          fields={billingFields}
          submitLabel="Add Bill"
          color="blue"
        />
      </div>
    </Layout>
  );
}
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Layout from '@/app/components/ui/Layout';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import {
  PlusCircle,
  Printer,
  CreditCard,
  Wallet,
  DollarSign,
  Users,
  X,
  User,
  MapPin,
  Package,
  Save,
  RefreshCw,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

// ============================================================
// MONTH UTILS
// ============================================================
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const parseMonth = (monthStr: string) => {
  const parts = (monthStr || '').split(' ');
  return {
    name: parts[0] || '',
    year: parseInt(parts[1] || '0'),
    idx: MONTHS.indexOf(parts[0]),
  };
};

const compareMonths = (a: string, b: string) => {
  const pa = parseMonth(a);
  const pb = parseMonth(b);
  if (isNaN(pa.year) || isNaN(pb.year) || pa.idx === -1 || pb.idx === -1) return 0;
  if (pa.year !== pb.year) return pa.year - pb.year;
  return pa.idx - pb.idx;
};

// ============================================================
// ✅ Resolve a partner's area to its display name
// Handles:
//   - partner.area is a populated object { _id, name }
//   - partner.area is a string name "Mateen Heaven 5H"
//   - partner.area is an ObjectId string "6aa54e..."
// ============================================================
function resolveAreaName(
  partnerArea: any,
  areaLookup: Record<string, string>
): string {
  if (!partnerArea) return 'No Area';

  // If it's an object with name
  if (typeof partnerArea === 'object' && partnerArea.name) {
    return partnerArea.name;
  }

  const asString = String(partnerArea).trim();

  // If the string is in our lookup map, use the resolved name
  if (areaLookup[asString]) return areaLookup[asString];

  // If the string is an area name (not an ObjectId), return as-is
  // ObjectId = 24 hex chars
  const isObjectId = /^[a-fA-F0-9]{24}$/.test(asString);
  if (!isObjectId) return asString;

  // It's an ObjectId with no lookup match
  return 'Unknown Area';
}

// ============================================================
// ✅ CORE: allocate the ENTIRE payment pool oldest-first
// ============================================================
interface MonthAllocation {
  month: string;
  expected: number;
  applied: number;
  remaining: number;
  isPaid: boolean;
  overpaid: number;
}

function allocatePayments(
  monthlyFee: number,
  paymentsForPartner: { month: string; amount: number }[]
): MonthAllocation[] {
  if (!monthlyFee || monthlyFee <= 0) return [];

  const byMonth: Record<string, number> = {};
  paymentsForPartner.forEach((p) => {
    if (!p.month) return;
    byMonth[p.month] =
      (byMonth[p.month] || 0) + (parseFloat(String(p.amount)) || 0);
  });

  const months = Object.keys(byMonth).sort(compareMonths);
  if (months.length === 0) return [];

  const totalPool = months.reduce((sum, m) => sum + byMonth[m], 0);

  let pool = totalPool;
  const result: MonthAllocation[] = [];

  for (const month of months) {
    const applied = Math.min(pool, monthlyFee);
    const remaining = Math.max(0, monthlyFee - applied);
    pool -= applied;

    result.push({
      month,
      expected: monthlyFee,
      applied,
      remaining,
      isPaid: remaining === 0,
      overpaid: 0,
    });
  }

  return result;
}

// ============ SEARCHABLE SELECT ============
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  disabled,
}: {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  disabled?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = options.find((opt) => opt.value === value);
    setDisplayValue(selected?.label || '');
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (optValue: string, optLabel: string) => {
    setDisplayValue(optLabel);
    setIsOpen(false);
    setSearchTerm('');
    onChange(optValue);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={cn(
          'w-full px-3 py-2 rounded-lg border cursor-pointer flex items-center justify-between',
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/50'
            : 'border-gray-300 dark:border-gray-600',
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span
            className={cn(
              'truncate',
              displayValue ? 'text-gray-900 dark:text-white' : 'text-gray-400'
            )}
          >
            {displayValue || placeholder}
          </span>
        </div>
        <span className="text-gray-400 ml-2">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${label || 'options'}...`}
                className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                No {label?.toLowerCase() || 'options'} found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    'px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                    value === opt.value &&
                      'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  )}
                  onClick={() => handleSelect(opt.value, opt.label)}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ PARTNER PAYMENT MODAL ============
function ReceivePartnerPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  customers,
  payments,
  packages,
  areas,
  areaLookup,
  fetchData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  customers: any[];
  payments: any[];
  packages: any[];
  areas: any[];
  areaLookup: Record<string, string>;
  fetchData: () => void;
}) {
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingNoPayment, setIsSubmittingNoPayment] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthAllocation[]>([]);

  // ✅ Build area options from the `/partner-areas` endpoint, NOT from partners
  const areaOptions = areas
    .map((a: any) => ({
      label: a.name || a.areaName || String(a._id),
      value: a.name || a.areaName || String(a._id),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // ✅ Filter partners by resolved area name
  const getFilteredCustomers = () => {
    if (!selectedArea) return [];
    return customers.filter((c: any) => {
      const resolved = resolveAreaName(c.area, areaLookup);
      return resolved === selectedArea;
    });
  };

  const filteredCustomers = getFilteredCustomers();

  const userOptions = filteredCustomers.map((c: any) => {
    const userId = c.partnerId || c.code || 'N/A';
    return {
      label: `${userId} - ${c.name} - Rs. ${c.monthlyFee?.toLocaleString() || 0}`,
      value: c._id,
    };
  });

  const currentYear = new Date().getFullYear();
  const monthOptions = MONTHS.map((month) => `${month} ${currentYear}`);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const defaultMonth = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
      setSelectedMonth(defaultMonth);
      setPaymentDate(now.toISOString().split('T')[0]);
      setSelectedArea('');
      setSelectedCustomerId('');
      setReceiveAmount('');
      setPaymentMethod('Cash');
      setNotes('');
      setCustomerDetails(null);
      setMonthlySummary([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find((c) => c._id === selectedCustomerId);
      setCustomerDetails(customer || null);

      if (customer) {
        const customerPayments = payments.filter(
          (p) => p.customer === customer.name && !p.isNoPayment
        );

        const allocs = allocatePayments(
          customer.monthlyFee || 0,
          customerPayments.map((p: any) => ({ month: p.month, amount: p.amount }))
        );

        setMonthlySummary(allocs);
      }
    } else {
      setCustomerDetails(null);
      setMonthlySummary([]);
    }
  }, [selectedCustomerId, customers, payments]);

  useEffect(() => {
    setSelectedCustomerId('');
    setCustomerDetails(null);
    setMonthlySummary([]);
  }, [selectedArea]);

  const getPackageName = () => {
    if (!customerDetails?.package) return 'No package assigned';
    if (typeof customerDetails.package === 'string') return customerDetails.package;
    if (typeof customerDetails.package === 'object')
      return customerDetails.package.name || 'Unknown Package';
    return 'No package assigned';
  };

  const getCurrentMonthBalance = () => {
    if (!customerDetails) {
      return { previousBalance: 0, currentBalance: 0, totalBalance: 0 };
    }

    const monthlyFee = customerDetails.monthlyFee || 0;
    const allocs = monthlySummary || [];

    const previousBalance = allocs
      .filter((a) => compareMonths(a.month, selectedMonth) < 0 && !a.isPaid)
      .reduce((sum, a) => sum + a.remaining, 0);

    const selectedAlloc = allocs.find((a) => a.month === selectedMonth);
    const currentBalance = selectedAlloc ? selectedAlloc.remaining : monthlyFee;

    return {
      previousBalance,
      currentBalance,
      totalBalance: previousBalance + currentBalance,
    };
  };

  const { previousBalance, currentBalance, totalBalance } = getCurrentMonthBalance();

  const receivedAmount = parseFloat(receiveAmount) || 0;
  const remainingBalance = Math.max(0, totalBalance - receivedAmount);

  const selectedAllocation = (monthlySummary || []).find(
    (a) => a.month === selectedMonth
  );
  const isDuplicateMonth = !!selectedAllocation?.isPaid;
  const alreadyPaidThisMonth = selectedAllocation?.applied || 0;

  const handleSubmit = async () => {
    if (!selectedArea) return toast.error('Please select an area first');
    if (!selectedCustomerId) return toast.error('Please select a User');
    if (!selectedMonth) return toast.error('Please select a billing month');
    if (!receiveAmount || parseFloat(receiveAmount) <= 0)
      return toast.error('Please enter a valid amount');

    if (isDuplicateMonth) {
      toast.error(
        `${customerDetails?.name} has already fully paid for ${selectedMonth}. Duplicate entries are not allowed.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const customerObj = customers.find((c) => c._id === selectedCustomerId);
      if (!customerObj) {
        toast.error('User not found');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        partner: customerObj.name,
        month: selectedMonth,
        amount: receivedAmount,
        paymentMethod: paymentMethod,
        paymentDate: paymentDate,
        remarks: notes,
      };

      const response = await api.post('/partner-payments', payload);

      if (response.data.success) {
        toast.success(
          `Payment of Rs. ${receivedAmount.toLocaleString()} recorded for ${customerObj.name}`
        );
        fetchData();
        onSuccess?.();
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to record payment');
      }
    } catch (error: any) {
      console.error('❌ Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoPayment = async () => {
    if (!selectedArea) return toast.error('Please select an area first');
    if (!selectedCustomerId) return toast.error('Please select a User');
    if (!selectedMonth) return toast.error('Please select a billing month');

    setIsSubmittingNoPayment(true);
    try {
      const customerObj = customers.find((c) => c._id === selectedCustomerId);
      if (!customerObj) {
        toast.error('User not found');
        setIsSubmittingNoPayment(false);
        return;
      }

      const payload = {
        partner: customerObj.name,
        month: selectedMonth,
        amount: 0,
        paymentMethod: 'None',
        paymentDate: paymentDate,
        remarks: notes || 'No payment received',
        isNoPayment: true,
      };

      const response = await api.post('/partner-payments', payload);

      if (response.data.success) {
        toast.success(`No payment recorded for ${customerObj.name} - ${selectedMonth}`);
        fetchData();
        onSuccess?.();
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to record');
      }
    } catch (error: any) {
      console.error('❌ Error recording no-payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record');
    } finally {
      setIsSubmittingNoPayment(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Receive Partner Payment
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select area, then User ID to record payment
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {isDuplicateMonth && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
              <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Already fully paid for {selectedMonth}</p>
                <p className="text-xs mt-0.5">
                  {customerDetails?.name} has already fully paid Rs.{' '}
                  {alreadyPaidThisMonth.toLocaleString()} for {selectedMonth}.
                  Duplicate entries are not allowed.
                </p>
              </div>
            </div>
          )}

          {!isDuplicateMonth && alreadyPaidThisMonth > 0 && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-sm flex items-start gap-2">
              <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Partial payment already recorded</p>
                <p className="text-xs mt-0.5">
                  {customerDetails?.name} has paid Rs.{' '}
                  {alreadyPaidThisMonth.toLocaleString()} for {selectedMonth}. You
                  can record the remaining Rs.{' '}
                  {(selectedAllocation?.remaining || 0).toLocaleString()}.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Area *
                </label>
                <SearchableSelect
                  options={areaOptions}
                  value={selectedArea}
                  onChange={setSelectedArea}
                  placeholder="Search & Select Area"
                  label="Area"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <User className="h-4 w-4 inline mr-1" />
                  User ID *
                </label>
                <SearchableSelect
                  options={userOptions}
                  value={selectedCustomerId}
                  onChange={setSelectedCustomerId}
                  placeholder={selectedArea ? 'Select User ID' : 'Select area first'}
                  label="User ID"
                  disabled={!selectedArea}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  User Name
                </label>
                <input
                  type="text"
                  value={customerDetails?.name || ''}
                  readOnly
                  placeholder="Auto-filled from User ID"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-white cursor-not-allowed font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Package className="h-4 w-4 inline mr-1" />
                  Package
                </label>
                <input
                  type="text"
                  value={getPackageName()}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Billing Month *
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Package Price (Rs.)
                </label>
                <input
                  type="text"
                  value={customerDetails?.monthlyFee?.toLocaleString() || '0'}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Previous Balance (Rs.)
                </label>
                {previousBalance > 0 ? (
                  <input
                    type="text"
                    value={previousBalance.toLocaleString()}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 cursor-not-allowed font-semibold"
                  />
                ) : (
                  <input
                    type="text"
                    value="Rs. 0 (No outstanding balance)"
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-900 dark:text-white"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Balance (Rs.)
                </label>
                <input
                  type="text"
                  value={totalBalance.toLocaleString()}
                  readOnly
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800 cursor-not-allowed font-bold text-lg',
                    totalBalance > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  )}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-1">
                  {previousBalance > 0 && (
                    <span>Previous: Rs. {previousBalance.toLocaleString()}</span>
                  )}
                  <span>Current: Rs. {currentBalance.toLocaleString()}</span>
                  {previousBalance > 0 && (
                    <span>= Rs. {totalBalance.toLocaleString()}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Receive Amount (Rs.) *
                </label>
                <input
                  type="number"
                  value={receiveAmount}
                  onChange={(e) => setReceiveAmount(e.target.value)}
                  placeholder="0"
                  disabled={isDuplicateMonth}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none font-semibold',
                    isDuplicateMonth
                      ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed'
                      : 'border-green-500 dark:border-green-600'
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Remaining Balance (Rs.)
                </label>
                <input
                  type="text"
                  value={remainingBalance.toLocaleString()}
                  readOnly
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border bg-gray-100 dark:bg-gray-800 cursor-not-allowed font-bold text-lg',
                    remainingBalance === 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                />
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleNoPayment}
              disabled={isSubmittingNoPayment || !selectedCustomerId || !selectedArea}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/25"
            >
              {isSubmittingNoPayment ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  No Payment
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !selectedCustomerId ||
                !selectedArea ||
                !receiveAmount ||
                isDuplicateMonth
              }
              className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:from-blue-700 hover:to-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Record
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN PAGE ============
export default function ReceivePartnerPaymentPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [areaLookup, setAreaLookup] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const [paymentsRes, customersRes, packagesRes, areasRes] = await Promise.all([
        api.get('/partner-payments'),
        api.get('/partners?limit=1000'),
        api.get('/packages'),
        api.get('/partner-areas'),
      ]);

      // ✅ Build area lookup map: { "6aa54e..." -> "Mateen Heaven 5H", "Mateen Heaven 5H" -> "Mateen Heaven 5H" }
      const lookup: Record<string, string> = {};
      if (areasRes.data.success) {
        const areaList = areasRes.data.areas || [];
        areaList.forEach((a: any) => {
          const id = String(a._id);
          const name = a.name || a.areaName || id;
          lookup[id] = name;
          lookup[name] = name;
        });
        setAreas(areaList);
      }
      setAreaLookup(lookup);

      if (paymentsRes.data.success) {
        const partnerIdMap: Record<string, string> = {};
        (customersRes.data.partners || []).forEach((p: any) => {
          partnerIdMap[p.name] = p.partnerId || p.code || 'N/A';
        });

        const formattedPayments = paymentsRes.data.payments.map((payment: any) => {
          const partnerName = payment.partner?.name || 'Unknown';
          const displayUserId =
            payment.partner?.partnerId ||
            partnerIdMap[partnerName] ||
            payment.partner?.code ||
            'N/A';

          return {
            id: payment._id,
            receipt: payment.receiptNo || 'N/A',
            userId: displayUserId,
            customer: partnerName,
            customerId: payment.partner?._id || '',
            month: payment.month || 'N/A',
            date: payment.paymentDate
              ? new Date(payment.paymentDate).toLocaleDateString('en-PK', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : 'N/A',
            method: payment.paymentMethod
              ? payment.paymentMethod.charAt(0).toUpperCase() +
                payment.paymentMethod.slice(1)
              : 'N/A',
            amount: payment.amount || 0,
            rawDate: payment.paymentDate,
            isNoPayment: payment.isNoPayment || false,
            packagePrice:
              payment.packagePrice || payment.partner?.monthlyFee || 0,
          };
        });
        setPayments(formattedPayments);
      }

      if (customersRes.data.success) {
        setCustomers(customersRes.data.partners);
      }

      if (packagesRes.data.success) {
        setPackages(packagesRes.data.packages || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const totalCustomers = customers.length;

  const totalReceivable = customers.reduce((sum: number, customer: any) => {
    const monthlyFee = parseFloat(String(customer.monthlyFee)) || 0;
    if (monthlyFee === 0) return sum;

    const customerPayments = payments.filter(
      (p) => p.customer === customer.name && !p.isNoPayment
    );
    const activeMonths = new Set<string>();
    customerPayments.forEach((p) => {
      if (p.month) activeMonths.add(p.month);
    });

    const monthCount = activeMonths.size > 0 ? activeMonths.size : 1;

    return sum + monthlyFee * monthCount;
  }, 0);

  const totalCollected = payments
    .filter((p) => !p.isNoPayment)
    .reduce((sum, p) => sum + (parseFloat(String(p.amount)) || 0), 0);

  const totalProfit = payments
    .filter((p) => !p.isNoPayment)
    .reduce((sum, p) => {
      const customer = customers.find((c) => c.name === p.customer);
      if (!customer) return sum;

      const pkgName =
        typeof customer.package === 'string'
          ? customer.package
          : customer.package?.name;
      if (!pkgName) return sum;

      const pkg = packages.find((pk: any) => pk.name === pkgName);
      if (!pkg) return sum;

      const selling = parseFloat(String(pkg.sellingPrice)) || 0;
      const cost = parseFloat(String(pkg.purchasePrice)) || 0;
      if (selling <= 0) return sum;

      const ratio = (selling - cost) / selling;
      const profit = (parseFloat(String(p.amount)) || 0) * ratio;

      return sum + profit;
    }, 0);

  const totalProfitMargin =
    totalCollected > 0 ? Math.round((totalProfit / totalCollected) * 100) : 0;

  const now = new Date();
  const currentMonthIndex = now.getMonth();
  const currentYear = now.getFullYear();

  const isPastOrCurrentMonth = (monthStr: string) => {
    const [monthName, yearStr] = monthStr.split(' ');
    const year = parseInt(yearStr);
    const monthIndex = MONTHS.indexOf(monthName);

    if (isNaN(year) || monthIndex === -1) return false;

    if (year < currentYear) return true;
    if (year === currentYear && monthIndex <= currentMonthIndex) return true;

    return false;
  };

  const monthStatusCounts = { paid: 0, partial: 0, notpaid: 0 };
  const currentMonth = `${MONTHS[currentMonthIndex]} ${currentYear}`;

  customers.forEach((customer: any) => {
    const monthlyFee = parseFloat(String(customer.monthlyFee)) || 0;
    if (monthlyFee === 0) return;

    const customerPayments = payments.filter(
      (p) => p.customer === customer.name && !p.isNoPayment
    );

    if (customerPayments.length === 0) {
      monthStatusCounts.notpaid += 1;
      return;
    }

    const allocs = allocatePayments(
      monthlyFee,
      customerPayments.map((p: any) => ({ month: p.month, amount: p.amount }))
    );

    const currentAlloc = allocs.find((a) => a.month === currentMonth);

    if (currentAlloc) {
      if (currentAlloc.isPaid) monthStatusCounts.paid += 1;
      else if (currentAlloc.applied > 0) monthStatusCounts.partial += 1;
      else monthStatusCounts.notpaid += 1;
    } else {
      monthStatusCounts.notpaid += 1;
    }
  });

  const paidCustomers = monthStatusCounts.paid;
  const partialCustomers = monthStatusCounts.partial;
  const notPaidCustomers = monthStatusCounts.notpaid;

  const getPaymentStatus = (payment: any) => {
    const customer = customers.find((c) => c.name === payment.customer);
    if (!customer) {
      return { status: 'pending', label: 'Not Paid', color: 'pending' };
    }

    const monthlyFee = parseFloat(String(customer.monthlyFee)) || 0;
    if (monthlyFee === 0) {
      return { status: 'paid', label: 'Paid', color: 'paid' };
    }

    const allCustomerPayments = payments.filter(
      (p) => p.customer === payment.customer && !p.isNoPayment
    );

    if (allCustomerPayments.length === 0) {
      return { status: 'pending', label: 'Not Paid', color: 'pending' };
    }

    const allocs = allocatePayments(
      monthlyFee,
      allCustomerPayments.map((p: any) => ({ month: p.month, amount: p.amount }))
    );

    const thisMonth = allocs.find((a) => a.month === payment.month);
    if (!thisMonth) {
      return { status: 'partial', label: 'Partial', color: 'partial' };
    }

    if (thisMonth.isPaid) {
      return { status: 'paid', label: 'Paid', color: 'paid' };
    }

    if (thisMonth.applied > 0) {
      return { status: 'partial', label: 'Partial', color: 'partial' };
    }

    if (isPastOrCurrentMonth(payment.month)) {
      return { status: 'pending', label: 'Not Paid', color: 'pending' };
    }

    return { status: 'partial', label: 'Partial', color: 'partial' };
  };

  const filteredPayments = payments.filter((payment) => {
    const query = searchQuery.toLowerCase();
    return (
      payment.userId?.toLowerCase().includes(query) ||
      payment.customer?.toLowerCase().includes(query) ||
      payment.receipt?.toLowerCase().includes(query) ||
      payment.month?.toLowerCase().includes(query)
    );
  });

  const columns = [
    { key: 'userId', header: 'User ID' },
    { key: 'customer', header: 'User' },
    { key: 'month', header: 'Month' },
    { key: 'date', header: 'Date' },
    { key: 'method', header: 'Method' },
    {
      key: 'packagePrice',
      header: 'Package Price',
      render: (item: any) => `Rs. ${(item.packagePrice || 0).toLocaleString()}`,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: any) => `Rs. ${(item.amount || 0).toLocaleString()}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => {
        const statusInfo = getPaymentStatus(item);
        return (
          <span
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1',
              statusInfo.color === 'paid' &&
                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              statusInfo.color === 'partial' &&
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
              statusInfo.color === 'pending' &&
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}
          >
            {statusInfo.color === 'paid' && (
              <CheckCircle className="h-3 w-3" />
            )}
            {statusInfo.color === 'partial' && <Clock className="h-3 w-3" />}
            {statusInfo.color === 'pending' && <XCircle className="h-3 w-3" />}
            {statusInfo.label}
          </span>
        );
      },
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
              <CreditCard className="h-6 w-6 text-green-600" />
              Receive Partner Payments
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select area, then User ID to record payment
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:from-blue-700 hover:to-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Receive Payment
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  TOTAL USER
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalCustomers}
                </p>
                <div className="flex flex-wrap gap-3 mt-2">
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {paidCustomers} Paid
                  </span>
                  <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {partialCustomers} Partial
                  </span>
                  <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {notPaidCustomers} Not Paid
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  TOTAL RECEIVABLE
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  Rs. {totalReceivable.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Expected total (all active months)
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Wallet className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  TOTAL COLLECTION
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  Rs. {totalCollected.toLocaleString()}
                </p>

                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      TOTAL PROFIT
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      Rs. {Math.round(totalProfit).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                    {totalCollected > 0
                      ? `${totalProfitMargin}% margin · ${Math.min(
                          100,
                          Math.round((totalCollected / totalReceivable) * 100)
                        )}% recovered`
                      : '0% margin'}
                  </p>
                </div>
              </div>
              <div className="h-12 w-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        <SearchBar
          placeholder="Search by User ID, User or month..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Partner Payment History
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredPayments.length} receipts found
            </span>
          </div>
          <div className="p-4">
            <DataTable
              data={filteredPayments}
              columns={columns}
              actions={[
                {
                  label: 'Print',
                  value: 'print',
                  icon: <Printer className="h-4 w-4" />,
                },
              ]}
              onAction={(item, action) => {
                if (action === 'print') {
                  toast.success(`Printing receipt for ${item.customer}`);
                }
              }}
              accordionTitle="customer"
              accordionSubtitle="userId"
              emptyMessage="No User payments found"
            />
          </div>
        </div>

        <ReceivePartnerPaymentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            fetchAllData();
          }}
          customers={customers}
          payments={payments}
          packages={packages}
          areas={areas}
          areaLookup={areaLookup}
          fetchData={fetchAllData}
        />
      </div>
    </Layout>
  );
}
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, User, Search } from 'lucide-react';
import api from '@/app/lib/api';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

type Customer = {
  _id: string;
  name?: string;
  customerId?: string;
  phone?: string;
  monthlyFee?: number;
  area?: any;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customers: Customer[];
  editingPromise?: any | null;
};

/* ============================================================
   USER SEARCHABLE SELECT
   Shows only User ID in dropdown + closed state
============================================================ */
function UserSearchableSelect({
  customers,
  value,
  onChange,
  placeholder = 'Select User',
}: {
  customers: Customer[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = customers.find((c) => c._id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 100);
    return customers
      .filter(
        (c) =>
          String(c.customerId || '').toLowerCase().includes(q) ||
          String(c.name || '').toLowerCase().includes(q) ||
          String(c.phone || '').toLowerCase().includes(q)
      )
      .slice(0, 100);
  }, [customers, query]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-left flex items-center justify-between text-sm"
      >
        <span className="flex items-center gap-2 truncate">
          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span
            className={cn(
              'truncate',
              selected
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-400'
            )}
          >
            {selected ? selected.customerId : placeholder}
          </span>
        </span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-72 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search user ID, name or phone..."
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-60">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                No users found
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => {
                    onChange(c._id);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                    c._id === value &&
                      'bg-blue-50 dark:bg-blue-900/30'
                  )}
                >
                  <div className="font-medium">{c.customerId}</div>
                  <div className="text-xs text-gray-500">{c.phone}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN MODAL
============================================================ */
export default function AddPaymentPromiseModal({
  isOpen,
  onClose,
  onSuccess,
  customers,
  editingPromise,
}: Props) {
  const [customerId, setCustomerId] = useState('');
  const [promiseAmount, setPromiseAmount] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [recoveryOfficer, setRecoveryOfficer] = useState('');
  const [promiseSource, setPromiseSource] = useState('Phone Call');
  const [remarks, setRemarks] = useState('');

  const [saving, setSaving] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c._id === customerId) || null,
    [customers, customerId]
  );

  /* ----------------------------------------------------------
     RESET WHEN OPENED
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!isOpen) return;

    const today = new Date().toISOString().slice(0, 10);

    if (editingPromise) {
      setCustomerId(
        editingPromise.customer?._id || editingPromise.customer
      );
      setPromiseAmount(String(editingPromise.promiseAmount || ''));
      setPromiseDate(
        editingPromise.promiseDate
          ? new Date(editingPromise.promiseDate)
              .toISOString()
              .slice(0, 10)
          : today
      );
      setPaymentMethod(editingPromise.paymentMethod || 'Cash');
      setRecoveryOfficer(editingPromise.recoveryOfficer || '');
      setPromiseSource(editingPromise.promiseSource || 'Phone Call');
      setRemarks(editingPromise.remarks || '');
    } else {
      setCustomerId('');
      setPromiseAmount('');
      setPromiseDate(today);
      setPaymentMethod('Cash');
      setRecoveryOfficer('');
      setPromiseSource('Phone Call');
      setRemarks('');
    }
  }, [isOpen, editingPromise]);

  if (!isOpen) return null;

  /* ----------------------------------------------------------
     SAVE
  ---------------------------------------------------------- */
  const handleSave = async () => {
    if (!customerId) return toast.error('Please select a user');
    if (!promiseAmount || Number(promiseAmount) <= 0)
      return toast.error('Please enter a valid promise amount');
    if (!promiseDate) return toast.error('Please select a promise date');

    setSaving(true);
    try {
      const payload = {
        customer: customerId,
        promiseAmount: Number(promiseAmount),
        promiseDate,
        paymentMethod,
        recoveryOfficer,
        promiseSource,
        remarks,
      };

      if (editingPromise) {
        await api.put(`/promises/${editingPromise._id}`, payload);
        toast.success('Promise updated');
      } else {
        await api.post('/promises', payload);
        toast.success('Promise saved');
      }

      onSuccess();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to save promise');
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* HEADER */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {editingPromise ? 'Edit Payment Promise' : 'Add Payment Promise'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {editingPromise
                ? 'Update the promise details below.'
                : 'Create a new customer payment commitment.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-11rem)] space-y-5">
          {/* USER ID */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Select User
            </label>
            <UserSearchableSelect
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
            />
          </div>

          {/* USER NAME (auto) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              User Name
            </label>
            <input
              type="text"
              value={selectedCustomer?.name || ''}
              readOnly
              placeholder="Auto-filled from User ID"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/60 text-gray-900 dark:text-white cursor-not-allowed"
            />
          </div>

          {/* GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Promise Amount
              </label>
              <input
                type="number"
                value={promiseAmount}
                onChange={(e) => setPromiseAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Promise Date
              </label>
              <input
                type="date"
                value={promiseDate}
                onChange={(e) => setPromiseDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              >
                <option>Cash</option>
                <option>JazzCash</option>
                <option>EasyPaisa</option>
                <option>Bank Transfer</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Recovery Officer
              </label>
              <input
                type="text"
                value={recoveryOfficer}
                onChange={(e) => setRecoveryOfficer(e.target.value)}
                placeholder="Officer name"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Promise Source
              </label>
              <select
                value={promiseSource}
                onChange={(e) => setPromiseSource(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              >
                <option>Phone Call</option>
                <option>WhatsApp</option>
                <option>SMS</option>
                <option>Visit</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          {/* REMARKS */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Customer Commitment / Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Example: Customer promised to pay after salary..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 resize-none"
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-[#d6b138] hover:bg-[#f7ce48] text-white text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Promise'}
          </button>
        </div>
      </div>
    </div>
  );
}
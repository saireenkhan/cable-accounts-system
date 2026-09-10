'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, User, Search } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';
import api from '@/app/lib/api';

export type FieldType = 'text' | 'select' | 'textarea' | 'date' | 'number';

export interface Field {
  name: string;
  label: string;
  type?: FieldType;
  options?: Array<{ label: string; value: string }>;
  required?: boolean;
  placeholder?: string;
  dependsOn?: string;
  updateOnChange?: (value: any, formData: any, context?: any) => any;
  searchable?: boolean;
  readOnly?: boolean;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
  title?: string;
  subtitle?: string;
  fields?: Field[];
  submitLabel?: string;
  cancelLabel?: string;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'indigo' | 'orange';
  endpoint?: string;
  transformData?: (data: any) => any;
  context?: any;
}

const defaultFields: Field[] = [
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
    ],
  },
  {
    name: 'package',
    label: 'Package',
    type: 'select',
    required: true,
    options: [
      { label: 'Basic', value: 'Basic' },
      { label: 'Standard', value: 'Standard' },
      { label: 'Premium', value: 'Premium' },
    ],
  },
  {
    name: 'monthlyFee',
    label: 'Monthly Fee',
    type: 'text',
    required: true,
    placeholder: '1500',
    dependsOn: 'package',
    updateOnChange: (value: any, formData: any, context: any) => {
      const packages = context?.packages || [];
      const selectedPkg = packages.find((p: any) => p.name === value);
      return selectedPkg?.sellingPrice || '';
    },
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Suspended', value: 'suspended' },
      { label: 'Expired', value: 'expired' },
    ],
  },
];

const colorMap = {
  blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  green: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  red: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
  indigo: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
  orange: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
};

const buttonColorMap = {
  blue: 'bg-blue-600 hover:bg-blue-700',
  green: 'bg-green-600 hover:bg-green-700',
  red: 'bg-red-600 hover:bg-red-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
  indigo: 'bg-indigo-600 hover:bg-indigo-700',
  orange: 'bg-orange-600 hover:bg-orange-700',
};

// ✅ Searchable Select Component
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  name,
}: {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (name: string, value: string) => void;
  placeholder: string;
  label?: string;
  name: string;
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
    onChange(name, optValue);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={cn(
          'w-full px-3 py-2 rounded-lg border cursor-pointer flex items-center justify-between',
          isOpen ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-gray-300 dark:border-gray-600',
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={displayValue ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
          {displayValue || placeholder}
        </span>
        <span className="text-gray-400 ml-2">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
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
                    value === opt.value && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
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

export function AddUserModal({
  isOpen,
  onClose,
  onSuccess,
  title = 'Add New Record',
  subtitle = 'Create a new record',
  fields,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  color = 'blue',
  endpoint = '/customers',
  transformData,
  context = {},
}: AddUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const prevIsOpenRef = useRef(isOpen);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // ✅ Memoize fields
  const finalFields = useMemo(() => {
    return fields && fields.length > 0 ? fields : defaultFields;
  }, [fields]);

  // ✅ Initialize form data when modal opens
  // ✅ AND compute initial values for readOnly fields without dependsOn
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      const initialData: Record<string, any> = {};

      finalFields.forEach((field) => {
        // ✅ Auto-compute readOnly fields with updateOnChange but no dependsOn
        if (field.readOnly && field.updateOnChange && !field.dependsOn) {
          try {
            const initialValue = field.updateOnChange(null, {}, context);
            initialData[field.name] = initialValue ?? '';
            console.log(`🎫 Auto-generated ${field.name}:`, initialValue);
          } catch (e) {
            console.error(`Error computing initial value for ${field.name}:`, e);
            initialData[field.name] = '';
          }
        } else {
          initialData[field.name] = '';
        }
      });

      initialData._context = context;
      setFormData(initialData);
      setApiError(null);
      retryCountRef.current = 0;
      console.log('🔄 Modal opened, initial data:', initialData);
    }

    prevIsOpenRef.current = isOpen;
  }, [isOpen, finalFields, context]);

  // ✅ Handle dynamic field updates
  // ✅ TWO-PASS APPROACH: fixes cascading dependencies
  const updateDependentFields = useCallback(
    (name: string, value: any) => {
      console.log(`🔄 Updating dependent fields for: ${name} = ${value}`);
      const newFormData = { ...formData, [name]: value };

      // ✅ Pass 1: Update fields where dependsOn matches the changed field
      finalFields.forEach((field) => {
        if (field.dependsOn === name && field.updateOnChange) {
          try {
            const newValue = field.updateOnChange(value, newFormData, context);
            if (newValue !== undefined && newValue !== null) {
              newFormData[field.name] = newValue;
              console.log(`   ➜ [Pass 1] ${field.name} = ${newValue}`);
            }
          } catch (e) {
            console.error(`Error updating ${field.name}:`, e);
          }
        }
      });

      // ✅ Pass 2: Re-run ALL fields with dependsOn to cascade
      // (fixes case where field depends on 2+ things)
      finalFields.forEach((field) => {
        if (field.dependsOn && field.updateOnChange) {
          try {
            const newValue = field.updateOnChange(
              newFormData[field.dependsOn],
              newFormData,
              context
            );
            if (newValue !== undefined && newValue !== null) {
              newFormData[field.name] = newValue;
              console.log(`   ➜ [Pass 2] ${field.name} = ${newValue}`);
            }
          } catch (e) {
            console.error(`Error cascading ${field.name}:`, e);
          }
        }
      });

      return newFormData;
    },
    [formData, finalFields, context]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      console.log(`📝 Input changed: ${name} = ${value}`);
      const newFormData = updateDependentFields(name, value);
      setFormData(newFormData);
      setApiError(null);
      retryCountRef.current = 0;
    },
    [updateDependentFields]
  );

  // ✅ Handle searchable select change
  const handleSelectChange = useCallback(
    (name: string, value: string) => {
      console.log(`📝 Select changed: ${name} = ${value}`);
      const newFormData = updateDependentFields(name, value);
      console.log('📋 Updated form data:', newFormData);
      setFormData(newFormData);
      setApiError(null);
      retryCountRef.current = 0;
    },
    [updateDependentFields]
  );

  // ✅ Check duplicate receipt
  const isDuplicateReceiptError = (error: any): boolean => {
    const errorMessage = error?.response?.data?.message || error?.message || '';
    return (
      errorMessage.includes('E11000 duplicate key error') && errorMessage.includes('receiptNo')
    );
  };

  // ✅ Submit with retry
  const submitWithRetry = async (payload: any): Promise<any> => {
    try {
      const response = await api.post(endpoint, payload);
      retryCountRef.current = 0;
      return response;
    } catch (error: any) {
      if (isDuplicateReceiptError(error) && retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        const currentRetry = retryCountRef.current;
        console.log(
          `🔄 Duplicate receipt. Retrying... (Attempt ${currentRetry}/${maxRetries})`
        );

        toast.loading(`Retrying... (Attempt ${currentRetry}/${maxRetries})`, {
          duration: 2000,
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        return submitWithRetry(payload);
      }

      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missingFields = finalFields.filter((f) => f.required && !formData[f.name]);
    if (missingFields.length > 0) {
      setApiError(`Please fill in: ${missingFields.map((f) => f.label).join(', ')}`);
      return;
    }

    setIsLoading(true);
    setApiError(null);
    retryCountRef.current = 0;

    try {
      let payload = { ...formData };

      delete payload._context;

      // ✅ Parse numbers
      if (payload.amount) payload.amount = parseFloat(payload.amount) || 0;
      if (payload.monthlyFee) payload.monthlyFee = parseFloat(payload.monthlyFee) || 0;
      if (payload.sellingPrice) payload.sellingPrice = parseFloat(payload.sellingPrice) || 0;
      if (payload.purchasePrice) payload.purchasePrice = parseFloat(payload.purchasePrice) || 0;
      if (payload.openingBalance) payload.openingBalance = parseFloat(payload.openingBalance) || 0;

      if (transformData) {
        payload = transformData(payload);
      }

      console.log('📤 Sending data to API:', JSON.stringify(payload, null, 2));

      const response = await submitWithRetry(payload);

      console.log('📥 API Response:', response.data);

      if (response.data.success) {
        const result =
          response.data.customer ||
          response.data.purchase ||
          response.data.dealer ||
          response.data.staff ||
          response.data.area ||
          response.data.package ||
          response.data.payment ||
          response.data.data ||
          response.data;
        onSuccess?.(result);
        onClose();
        toast.success('Record added successfully!');
      } else {
        setApiError(response.data.message || 'Failed to add record');
      }
    } catch (error: any) {
      console.error('❌ Full Error:', error);
      console.error('❌ Error Response:', error.response);
      console.error('❌ Error Data:', error.response?.data);

      let message = 'Failed to add record';

      if (isDuplicateReceiptError(error)) {
        message = 'Duplicate receipt number. Please try again with a different date or contact support.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors).join(', ');
        message = errors;
      } else if (typeof error.response?.data === 'string') {
        message = error.response.data;
      } else if (error.response) {
        message = `Server error: ${error.response.status}`;
      } else if (error.request) {
        message = 'No response from server. Please check if backend is running.';
      } else {
        message = error.message || 'Failed to add record';
      }

      setApiError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between px-6 py-4 border-b',
            colorMap[color as keyof typeof colorMap],
            'border-gray-200 dark:border-gray-700'
          )}
        >
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {apiError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
              <span className="text-lg mt-0.5">⚠️</span>
              <span>{apiError}</span>
            </div>
          )}

          {retryCountRef.current > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400 text-sm flex items-start gap-2">
              <span className="text-lg mt-0.5">🔄</span>
              <span>
                Retrying due to duplicate receipt... (Attempt {retryCountRef.current}/
                {maxRetries})
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {finalFields.map((field) => {
              if (field.name === '_context') return null;

              const dependsOnField = field.dependsOn;
              const isDependent =
                dependsOnField !== undefined && formData[dependsOnField] !== undefined;
              let fieldValue = formData[field.name] || '';

              // ✅ Recompute dependent field value on render (live updates)
              if (isDependent && field.updateOnChange && dependsOnField) {
                const calculatedValue = field.updateOnChange(
                  formData[dependsOnField],
                  formData,
                  context
                );
                if (
                  calculatedValue !== undefined &&
                  calculatedValue !== null &&
                  calculatedValue !== fieldValue
                ) {
                  fieldValue = calculatedValue;
                }
              }

              return (
                <div
                  key={field.name}
                  className={field.type === 'textarea' ? 'md:col-span-2' : ''}
                >
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {field.label} {field.required && '*'}
                  </label>
                  {field.type === 'select' ? (
                    field.searchable ? (
                      <SearchableSelect
                        options={field.options || []}
                        value={formData[field.name] || ''}
                        onChange={handleSelectChange}
                        placeholder={`Select ${field.label}`}
                        label={field.label}
                        name={field.name}
                      />
                    ) : (
                      <select
                        name={field.name}
                        value={formData[field.name] || ''}
                        onChange={handleChange}
                        required={field.required}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">Select {field.label}</option>
                        {field.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )
                  ) : field.type === 'textarea' ? (
                    <textarea
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      rows={3}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      name={field.name}
                      value={fieldValue}
                      onChange={handleChange}
                      required={field.required}
                      placeholder={field.placeholder}
                      readOnly={field.readOnly || !!field.dependsOn}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none',
                        (field.readOnly || field.dependsOn) &&
                          'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'px-6 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-70',
                buttonColorMap[color as keyof typeof buttonColorMap]
              )}
            >
              {isLoading ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
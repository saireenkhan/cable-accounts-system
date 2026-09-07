'use client';

import React, { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export type FieldType = 'text' | 'select' | 'textarea' | 'date' | 'number';

export interface Field {
  name: string;
  label: string;
  type?: FieldType;
  options?: Array<{ label: string; value: string }>;
  required?: boolean;
  placeholder?: string;
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
  color?: 'blue' | 'green' | 'red' | 'purple' | 'indigo';
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
    ]
  },
  { 
    name: 'package', 
    label: 'Package', 
    type: 'select', 
    required: true,
    options: [
      { label: 'Basic - Rs. 1,200', value: 'Basic' },
      { label: 'Standard - Rs. 1,500', value: 'Standard' },
      { label: 'Premium - Rs. 1,800', value: 'Premium' },
    ]
  },
  { name: 'monthlyFee', label: 'Monthly Fee', type: 'text', required: true, placeholder: 'Rs. 1,500' },
  { 
    name: 'status', 
    label: 'Status', 
    type: 'select',
    options: [
      { label: 'Active', value: 'Active' },
      { label: 'Inactive', value: 'Inactive' },
      { label: 'Suspended', value: 'Suspended' },
      { label: 'Expired', value: 'Expired' },
    ]
  },
];

const colorMap = {
  blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  green: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
  red: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
  indigo: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
};

const buttonColorMap = {
  blue: 'bg-blue-600 hover:bg-blue-700',
  green: 'bg-green-600 hover:bg-green-700',
  red: 'bg-red-600 hover:bg-red-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
  indigo: 'bg-indigo-600 hover:bg-indigo-700',
};

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
}: AddUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const finalFields = fields && fields.length > 0 ? fields : defaultFields;

  useEffect(() => {
    if (isOpen) {
      const initialData: Record<string, any> = {};
      finalFields.forEach(field => {
        initialData[field.name] = '';
      });
      setFormData(initialData);
    }
  }, [isOpen, finalFields]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const missingFields = finalFields.filter(f => f.required && !formData[f.name]);
    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.map(f => f.label).join(', ')}`);
      setIsLoading(false);
      return;
    }

    setTimeout(() => {
      const result = {
        id: Date.now(),
        ...formData,
      };
      onSuccess?.(result);
      onClose();
      setIsLoading(false);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between px-6 py-4 border-b',
          colorMap[color],
          'border-gray-200 dark:border-gray-700'
        )}>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {finalFields.map((field) => (
              <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {field.label} {field.required && '*'}
                </label>
                {field.type === 'select' ? (
                  <select
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={handleChange}
                    required={field.required}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
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
                    value={formData[field.name] || ''}
                    onChange={handleChange}
                    required={field.required}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                )}
              </div>
            ))}
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
                buttonColorMap[color]
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
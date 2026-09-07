import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-green-600 bg-green-50 dark:bg-green-900/30',
    inactive: 'text-gray-600 bg-gray-50 dark:bg-gray-900/30',
    expired: 'text-red-600 bg-red-50 dark:bg-red-900/30',
    default: 'text-red-600 bg-red-50 dark:bg-red-900/30',
    paid: 'text-green-600 bg-green-50 dark:bg-green-900/30',
    partial: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',
    pending: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30',
    online: 'text-green-600 bg-green-50 dark:bg-green-900/30',
    offline: 'text-red-600 bg-red-50 dark:bg-red-900/30',
    warning: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30',
    maintenance: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  };
  return colors[status?.toLowerCase()] || 'text-gray-600 bg-gray-50 dark:bg-gray-900/30';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    expired: 'Expired',
    default: 'Default',
    paid: 'Paid',
    partial: 'Partial',
    pending: 'Pending',
    online: 'Online',
    offline: 'Offline',
    warning: 'Warning',
    maintenance: 'Maintenance',
    suspended: 'Suspended',
    disconnected: 'Disconnected',
  };
  return labels[status?.toLowerCase()] || status;
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function generateId(prefix: string = '', length: number = 6): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return prefix ? `${prefix}-${result}` : result;
}
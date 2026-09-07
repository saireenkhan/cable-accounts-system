'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { useMediaQuery } from '../hooks/useMediaQuery';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  onAction?: (item: T, action: string) => void;
  actions?: Array<{
    label: string;
    value: string;
    icon?: React.ReactNode;
    className?: string;
  }>;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  accordionTitle?: string;
  accordionSubtitle?: string;
}

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  onRowClick,
  onAction,
  actions = [],
  isLoading = false,
  emptyMessage = 'No data found',
  className,
  accordionTitle,
  accordionSubtitle,
}: DataTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  const toggleRow = (id: string | number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getRowId = (item: T): string | number => {
    return (item as any).id || (item as any).code || (item as any).receiptNo || JSON.stringify(item);
  };

  const renderMobileCard = (item: T) => {
    const id = getRowId(item);
    const isExpanded = expandedRows.has(id);
    const visibleColumns = columns.filter(col => !col.hideOnMobile);

    const titleKey = accordionTitle || (columns[0]?.key as string);
    const subtitleKey = accordionSubtitle || (columns[1]?.key as string);

    const getValue = (key: string | keyof T) => {
      if (typeof key === 'string' && key.includes('.')) {
        const parts = key.split('.');
        let value: any = item;
        for (const part of parts) {
          value = value?.[part];
        }
        return value;
      }
      return (item as any)[key];
    };

    const title = getValue(titleKey) || `Item ${id}`;
    const subtitle = getValue(subtitleKey) || '';

    return (
      <div
        key={id}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-3 overflow-hidden transition-all"
      >
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
          onClick={() => toggleRow(id)}
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 dark:text-white truncate">
              {typeof title === 'string' || typeof title === 'number' ? title : JSON.stringify(title)}
            </div>
            {subtitle && (
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {typeof subtitle === 'string' || typeof subtitle === 'number' ? subtitle : JSON.stringify(subtitle)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            {actions.length > 0 && (
              <div onClick={(e) => e.stopPropagation()}>
                {/* Action buttons would go here */}
              </div>
            )}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
            {visibleColumns.map((col) => {
              const value = getValue(col.key);
              const displayValue = col.render ? col.render(item) : value;

              return (
                <div key={String(col.key)} className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {col.header}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white text-right max-w-[60%] break-words">
                    {displayValue !== undefined && displayValue !== null ? displayValue : '-'}
                  </span>
                </div>
              );
            })}
            {actions.length > 0 && (
              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {actions.map((action) => (
                  <button
                    key={action.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction?.(item, action.value);
                    }}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md transition-colors',
                      'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600',
                      'text-gray-700 dark:text-gray-300',
                      action.className
                    )}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (isTablet) {
      return (
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {columns.filter(col => !col.hideOnMobile).map((col) => (
                  <th
                    key={String(col.key)}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {col.header}
                  </th>
                ))}
                {actions.length > 0 && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((item) => {
                const id = getRowId(item);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(item)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  >
                    {columns.filter(col => !col.hideOnMobile).map((col) => {
                      const value = (item as any)[col.key];
                      const displayValue = col.render ? col.render(item) : value;
                      return (
                        <td key={String(col.key)} className="px-4 py-3 text-gray-900 dark:text-white">
                          {displayValue !== undefined && displayValue !== null ? displayValue : '-'}
                        </td>
                      );
                    })}
                    {actions.length > 0 && (
                      <td className="px-4 py-3 text-right space-x-2">
                        {actions.map((action) => (
                          <button
                            key={action.value}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAction?.(item, action.value);
                            }}
                            className={cn(
                              'p-1.5 rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-gray-700',
                              action.className
                            )}
                            title={action.label}
                          >
                            {action.icon || action.label}
                          </button>
                        ))}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((item) => {
              const id = getRowId(item);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(item)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  {columns.map((col) => {
                    const value = (item as any)[col.key];
                    const displayValue = col.render ? col.render(item) : value;
                    return (
                      <td
                        key={String(col.key)}
                        className={cn('px-4 py-3 text-gray-900 dark:text-white', col.className)}
                      >
                        {displayValue !== undefined && displayValue !== null ? displayValue : '-'}
                      </td>
                    );
                  })}
                  {actions.length > 0 && (
                    <td className="px-4 py-3 text-right space-x-2">
                      {actions.map((action) => (
                        <button
                          key={action.value}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAction?.(item, action.value);
                          }}
                          className={cn(
                            'px-3 py-1.5 text-xs rounded-md transition-colors',
                            'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600',
                            'text-gray-700 dark:text-gray-300',
                            action.className
                          )}
                        >
                          {action.icon && <span className="mr-1">{action.icon}</span>}
                          {action.label}
                        </button>
                      ))}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {isMobile ? (
        <div className="space-y-2">
          {data.map((item) => renderMobileCard(item))}
        </div>
      ) : (
        renderTable()
      )}
    </div>
  );
}
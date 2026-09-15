'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
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
    label?: string;
    value: string;
    icon?: React.ReactNode;
    className?: string;
  }>;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  accordionTitle?: string;
  accordionSubtitle?: string;
  // ✅ NEW — pagination controls
  pageSize?: number;           // default 10
  showPagination?: boolean;    // default true
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
  pageSize = 20,
  showPagination = true,
}: DataTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // ✅ Reset to page 1 whenever the data array changes (e.g. filter/search)
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  // ✅ Pagination math
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(currentPage, totalPages); // guard against stale page
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex]
  );

  const goToPage = (page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clamped);
  };

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
                    title={action.label}
                    aria-label={action.label}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600',
                      'text-gray-700 dark:text-gray-300',
                      action.className
                    )}
                  >
                    {action.icon}
                    {action.label && <span className="ml-1">{action.label}</span>}
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
              {paginatedData.map((item) => {
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
                            title={action.label}
                            aria-label={action.label}
                            className={cn(
                              'p-2 rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-gray-700',
                              action.className
                            )}
                          >
                            {action.icon}
                            {action.label && <span className="ml-1">{action.label}</span>}
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
            {paginatedData.map((item) => {
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
                          title={action.label}
                          aria-label={action.label}
                          className={cn(
                            'p-2 rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-gray-700',
                            action.className
                          )}
                        >
                          {action.icon}
                          {action.label && <span className="ml-1">{action.label}</span>}
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

  // ✅ Pagination UI
  const renderPagination = () => {
    if (!showPagination || data.length <= pageSize) return null;

    const startRecord = startIndex + 1;
    const endRecord = Math.min(endIndex, data.length);

    // Build page numbers with ellipsis
    const pageNumbers: (number | '...')[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      pageNumbers.push(1);
      if (safePage > 3) pageNumbers.push('...');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pageNumbers.push(i);
      if (safePage < totalPages - 2) pageNumbers.push('...');
      pageNumbers.push(totalPages);
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        {/* Record counter */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{startRecord}</span>
          {' – '}
          <span className="font-semibold text-gray-700 dark:text-gray-300">{endRecord}</span>
          {' of '}
          <span className="font-semibold text-gray-700 dark:text-gray-300">{data.length}</span> records
        </div>

        {/* Page controls */}
        <div className="flex items-center gap-1">
          {/* Prev */}
          <button
            onClick={() => goToPage(safePage - 1)}
            disabled={safePage === 1}
            className={cn(
              'p-2 rounded-md transition-colors',
              safePage === 1
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page numbers */}
          {pageNumbers.map((p, i) =>
            p === '...' ? (
              <span
                key={`ellipsis-${i}`}
                className="px-2 text-gray-400 dark:text-gray-500 text-sm"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={cn(
                  'min-w-[32px] h-8 px-2 rounded-md text-sm font-medium transition-colors',
                  safePage === p
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {p}
              </button>
            )
          )}

          {/* Next */}
          <button
            onClick={() => goToPage(safePage + 1)}
            disabled={safePage === totalPages}
            className={cn(
              'p-2 rounded-md transition-colors',
              safePage === totalPages
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
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
          {paginatedData.map((item) => renderMobileCard(item))}
        </div>
      ) : (
        renderTable()
      )}

      {/* ✅ Pagination */}
      {renderPagination()}
    </div>
  );
}
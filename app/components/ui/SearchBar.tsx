'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '@/app/lib/utils';

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  filters?: Array<{
    label: string;
    value: string;
    options: Array<{ label: string; value: string }>;
  }>;
  onFilterChange?: (key: string, value: string) => void;
}

export function SearchBar({
  value = '',
  onChange,
  onSearch,
  placeholder = 'Search...',
  className,
  autoFocus = false,
  filters = [],
  onFilterChange,
}: SearchBarProps) {
  const [searchValue, setSearchValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange?.(searchValue);
      onSearch?.(searchValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, onChange, onSearch]);

  const handleClear = () => {
    setSearchValue('');
    onChange?.('');
    onSearch?.('');
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filterValues, [key]: value };
    setFilterValues(newFilters);
    onFilterChange?.(key, value);
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'relative flex items-center gap-2 transition-all duration-200',
          isFocused ? 'ring-2 ring-blue-500/50' : ''
        )}
      >
        <div
          className={cn(
            'flex-1 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border transition-colors',
            isFocused
              ? 'border-blue-500 dark:border-blue-500'
              : 'border-gray-300 dark:border-gray-600',
            'px-3 py-2'
          )}
        >
          <Search className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 min-w-0"
          />
          {searchValue && (
            <button
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>

        {filters.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'p-2 rounded-lg border transition-colors flex-shrink-0',
              showFilters
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            )}
          >
            <Filter className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters dropdown */}
      {showFilters && filters.length > 0 && (
        <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filters.map((filter) => (
            <div key={filter.value} className="space-y-1">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {filter.label}
              </label>
              <select
                value={filterValues[filter.value] || ''}
                onChange={(e) => handleFilterChange(filter.value, e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">All {filter.label}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
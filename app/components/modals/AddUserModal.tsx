'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';

import {
  X,
  User,
  Search,
  Check,
} from 'lucide-react';

import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';
import api from '@/app/lib/api';

export type FieldType =
  | 'text'
  | 'select'
  | 'textarea'
  | 'date'
  | 'number';

export interface Field {
  name: string;
  label: string;
  type?: FieldType;

  options?: Array<{
    label: string;
    value: string;
  }>;

  required?: boolean;
  placeholder?: string;

  dependsOn?: string;

  updateOnChange?: (
    value: any,
    formData: any,
    context?: any
  ) => any;

  searchable?: boolean;

  multiple?: boolean;

  readOnly?: boolean;
  defaultValue?: any;

  min?: number;

  max?:
    | number
    | ((formData: any, context?: any) => number);

  maxLength?: number;
  step?: number;

  editable?: boolean;

  disabledUntil?: string;
}

type Option = {
  label: string;
  value: string;
};

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;

  title?: string;
  subtitle?: string;

  fields?: Field[];

  submitLabel?: string;
  cancelLabel?: string;

  color?:
    | 'blue'
    | 'green'
    | 'red'
    | 'purple'
    | 'indigo'
    | 'orange';

  endpoint?: string;

  transformData?: (data: any) => any;

  context?: any;

  method?: 'POST' | 'PUT' | 'PATCH';

  initialData?: Record<string, any>;

  dynamicOptions?: (
    fieldName: string,
    formData: Record<string, any>
  ) => Option[];
}

const defaultFields: Field[] = [
  {
    name: 'name',
    label: 'Full Name',
    type: 'text',
    required: true,
    placeholder: 'Enter full name',
  },
  {
    name: 'phone',
    label: 'Phone',
    type: 'text',
    required: true,
    placeholder: '0300-1234567',
  },
  {
    name: 'cnic',
    label: 'CNIC',
    type: 'text',
    placeholder: '12345-1234567-1',
  },
  {
    name: 'address',
    label: 'Address',
    type: 'text',
    required: true,
    placeholder: 'House #, Street',
  },
];

const colorMap = {
  blue:
    'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',

  green:
    'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',

  red:
    'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',

  purple:
    'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',

  indigo:
    'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',

  orange:
    'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
};

const buttonColorMap = {
  blue: 'bg-blue-600 hover:bg-blue-700',
  green: 'bg-green-600 hover:bg-green-700',
  red: 'bg-red-600 hover:bg-red-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
  indigo: 'bg-indigo-600 hover:bg-indigo-700',
  orange: 'bg-orange-600 hover:bg-orange-700',
};

// ======================================================
// SEARCHABLE SINGLE SELECT
// ======================================================

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  name,
  disabled = false,
}: {
  options: Option[];
  value: string;
  onChange: (
    name: string,
    value: string
  ) => void;
  placeholder: string;
  label?: string;
  name: string;
  disabled?: boolean;
}) {
  const [searchTerm, setSearchTerm] =
    useState('');

  const [isOpen, setIsOpen] =
    useState(false);

  const [displayValue, setDisplayValue] =
    useState('');

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = options.find(
      (opt) => opt.value === value
    );

    setDisplayValue(
      selected?.label || ''
    );
  }, [value, options]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
      setSearchTerm('');
    }
  }, [disabled]);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  const filteredOptions =
    options.filter((opt) =>
      opt.label
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        )
    );

  const handleSelect = (
    optValue: string,
    optLabel: string
  ) => {
    setDisplayValue(optLabel);
    setIsOpen(false);
    setSearchTerm('');

    onChange(name, optValue);
  };

  return (
    <div
      className="relative"
      ref={dropdownRef}
    >
      <div
        aria-disabled={disabled}
        className={cn(
          'w-full px-2.5 py-1.5 text-sm rounded-md border flex items-center justify-between',

          disabled
            ? 'cursor-not-allowed opacity-60 bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600'
            : 'cursor-pointer bg-white dark:bg-gray-800',

          !disabled &&
            (isOpen
              ? 'border-blue-500 ring-2 ring-blue-500/50'
              : 'border-gray-300 dark:border-gray-600'),

          'text-gray-900 dark:text-white'
        )}
        onClick={() => {
          if (disabled) return;

          setIsOpen(!isOpen);
        }}
      >
        <span
          className={
            displayValue
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-400'
          }
        >
          {displayValue ||
            placeholder}
        </span>

        <span className="text-gray-400 ml-2 text-xs">
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-lg max-h-52 overflow-hidden">
          <div className="p-1.5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-700 rounded-md">
              <Search className="h-3.5 w-3.5 text-gray-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                placeholder={`Search ${
                  label || 'options'
                }...`}
                className="flex-1 bg-transparent outline-none text-xs text-gray-900 dark:text-white placeholder-gray-400"
                onClick={(e) =>
                  e.stopPropagation()
                }
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-40">
            {filteredOptions.length ===
            0 ? (
              <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                No{' '}
                {label?.toLowerCase() ||
                  'options'}{' '}
                found
              </div>
            ) : (
              filteredOptions.map(
                (opt) => (
                  <div
                    key={opt.value}
                    className={cn(
                      'px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',

                      value === opt.value &&
                        'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    )}
                    onClick={() =>
                      handleSelect(
                        opt.value,
                        opt.label
                      )
                    }
                  >
                    {opt.label}
                  </div>
                )
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================================
// SEARCHABLE MULTI SELECT
// ======================================================

function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  name,
  disabled = false,
}: {
  options: Option[];
  value: string[];
  onChange: (
    name: string,
    value: string[]
  ) => void;
  placeholder: string;
  label?: string;
  name: string;
  disabled?: boolean;
}) {
  const [searchTerm, setSearchTerm] =
    useState('');

  const [isOpen, setIsOpen] =
    useState(false);

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  const selectedValues =
    Array.isArray(value)
      ? value
      : [];

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
      setSearchTerm('');
    }
  }, [disabled]);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  const filteredOptions =
    options.filter((opt) =>
      opt.label
        .toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        )
    );

  const toggleOption = (
    optionValue: string
  ) => {
    const exists =
      selectedValues.includes(
        optionValue
      );

    const nextValue = exists
      ? selectedValues.filter(
          (item) =>
            item !== optionValue
        )
      : [
          ...selectedValues,
          optionValue,
        ];

    onChange(
      name,
      [
        ...new Set(
          nextValue.filter(Boolean)
        ),
      ]
    );
  };

  const selectedLabels =
    options
      .filter((option) =>
        selectedValues.includes(
          option.value
        )
      )
      .map((option) => option.label);

  return (
    <div
      className="relative"
      ref={dropdownRef}
    >
      <div
        aria-disabled={disabled}
        className={cn(
          'w-full min-h-[34px] px-2.5 py-1.5 text-sm rounded-md border flex items-center justify-between gap-2',

          disabled
            ? 'cursor-not-allowed opacity-60 bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600'
            : 'cursor-pointer bg-white dark:bg-gray-800',

          !disabled &&
            (isOpen
              ? 'border-blue-500 ring-2 ring-blue-500/50'
              : 'border-gray-300 dark:border-gray-600'),

          'text-gray-900 dark:text-white'
        )}
        onClick={() => {
          if (disabled) return;

          setIsOpen(!isOpen);
        }}
      >
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {selectedLabels.length >
          0 ? (
            selectedLabels.map(
              (item) => (
                <span
                  key={item}
                  className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                >
                  {item}
                </span>
              )
            )
          ) : (
            <span className="text-gray-400">
              {placeholder}
            </span>
          )}
        </div>

        <span className="flex-shrink-0 text-gray-400 text-xs">
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 p-1.5 dark:border-gray-700">
            <div className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 dark:bg-gray-700">
              <Search className="h-3.5 w-3.5 text-gray-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
                placeholder={`Search ${
                  label || 'options'
                }...`}
                className="flex-1 bg-transparent text-xs text-gray-900 outline-none placeholder-gray-400 dark:text-white"
                onClick={(e) =>
                  e.stopPropagation()
                }
              />
            </div>
          </div>

          <div className="max-h-44 overflow-y-auto">
            {filteredOptions.length ===
            0 ? (
              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                No{' '}
                {label?.toLowerCase() ||
                  'options'}{' '}
                found
              </div>
            ) : (
              filteredOptions.map(
                (option) => {
                  const selected =
                    selectedValues.includes(
                      option.value
                    );

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        toggleOption(
                          option.value
                        )
                      }
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',

                        selected
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border',

                          selected
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 dark:border-gray-500'
                        )}
                      >
                        {selected && (
                          <Check className="h-2.5 w-2.5" />
                        )}
                      </span>

                      <span className="truncate">
                        {
                          option.label
                        }
                      </span>
                    </button>
                  );
                }
              )
            )}
          </div>

          {selectedValues.length >
            0 && (
            <div className="border-t border-gray-200 px-2.5 py-1.5 dark:border-gray-700">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {selectedValues.length}{' '}
                ISP
                {selectedValues.length !==
                1
                  ? 's'
                  : ''}{' '}
                selected
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ======================================================
// ADD USER MODAL
// ======================================================

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
  method = 'POST',
  initialData,
  dynamicOptions,
}: AddUserModalProps) {
  const [isLoading, setIsLoading] =
    useState(false);

  const [formData, setFormData] =
    useState<Record<string, any>>({});

  const [apiError, setApiError] =
    useState<string | null>(null);

  const prevIsOpenRef =
    useRef(isOpen);

  const retryCountRef =
    useRef(0);

  const maxRetries = 3;

  const finalFields = useMemo(() => {
    return fields &&
      fields.length > 0
      ? fields
      : defaultFields;
  }, [fields]);

  // ======================================================
  // INITIALIZE FORM
  // ======================================================

  useEffect(() => {
    if (
      isOpen &&
      !prevIsOpenRef.current
    ) {
      const formInit: Record<
        string,
        any
      > = {};

      finalFields.forEach((field) => {
        if (
          initialData &&
          initialData[field.name] !==
            undefined
        ) {
          if (field.multiple) {
            const initialValue =
              initialData[
                field.name
              ];

            formInit[field.name] =
              Array.isArray(
                initialValue
              )
                ? initialValue
                : initialValue
                ? [initialValue]
                : [];
          } else {
            formInit[field.name] =
              initialData[
                field.name
              ];
          }

          return;
        }

        if (
          field.readOnly &&
          field.updateOnChange &&
          !field.dependsOn
        ) {
          try {
            const initialValue =
              field.updateOnChange(
                null,
                {},
                context
              );

            formInit[field.name] =
              field.multiple
                ? Array.isArray(
                    initialValue
                  )
                  ? initialValue
                  : initialValue
                  ? [initialValue]
                  : []
                : initialValue ??
                  '';
          } catch (e) {
            console.error(
              `Error computing initial value for ${field.name}:`,
              e
            );

            formInit[field.name] =
              field.multiple
                ? []
                : '';
          }

          return;
        }

        if (
          field.defaultValue !==
          undefined
        ) {
          formInit[field.name] =
            field.multiple
              ? Array.isArray(
                  field.defaultValue
                )
                ? field.defaultValue
                : field.defaultValue
                ? [
                    field.defaultValue,
                  ]
                : []
              : field.defaultValue;

          return;
        }

        if (field.multiple) {
          formInit[field.name] = [];
        } else {
          formInit[field.name] = '';
        }
      });

      formInit._context = context;

      setFormData(formInit);
      setApiError(null);

      retryCountRef.current = 0;
    }

    prevIsOpenRef.current = isOpen;
  }, [
    isOpen,
    finalFields,
    context,
    initialData,
  ]);

  // ======================================================
  // GET FIELD MAX
  // ======================================================

  const getFieldMax =
    useCallback(
      (
        field: Field,
        data: Record<string, any>
      ): number | undefined => {
        if (
          typeof field.max ===
          'function'
        ) {
          try {
            return field.max(
              data,
              context
            );
          } catch (e) {
            console.error(
              `Error calculating max for ${field.name}:`,
              e
            );

            return undefined;
          }
        }

        return field.max;
      },
      [context]
    );

  // ======================================================
  // RESOLVE OPTIONS
  // ======================================================

  const getFieldOptions =
    useCallback(
      (
        field: Field,
        data: Record<string, any>
      ): Option[] => {
        if (
          dynamicOptions &&
          field.disabledUntil
        ) {
          try {
            return (
              dynamicOptions(
                field.name,
                data
              ) || []
            );
          } catch (e) {
            console.error(
              `Error resolving dynamic options for ${field.name}:`,
              e
            );

            return [];
          }
        }

        return field.options || [];
      },
      [dynamicOptions]
    );

  // ======================================================
  // LOCKED BY PARENT
  // ======================================================

  const isLockedByParent =
    useCallback(
      (
        field: Field,
        data: Record<string, any>
      ): boolean => {
        if (!field.disabledUntil) {
          return false;
        }

        return !data[
          field.disabledUntil
        ];
      },
      []
    );

  // ======================================================
  // UPDATE DEPENDENT FIELDS
  // ======================================================

  const updateDependentFields =
    useCallback(
      (
        name: string,
        value: any
      ) => {
        const previousValue =
          formData[name];

        const newFormData = {
          ...formData,
          [name]: value,
        };

        if (
          previousValue !== value
        ) {
          const clearLockedFields =
            (parent: string) => {
              finalFields.forEach(
                (field) => {
                  if (
                    field.disabledUntil ===
                    parent
                  ) {
                    newFormData[
                      field.name
                    ] = field.multiple
                      ? []
                      : '';

                    clearLockedFields(
                      field.name
                    );
                  }
                }
              );
            };

          clearLockedFields(name);
        }

        // PASS 1
        finalFields.forEach(
          (field) => {
            if (
              field.dependsOn ===
                name &&
              field.updateOnChange
            ) {
              try {
                const newValue =
                  field.updateOnChange(
                    value,
                    newFormData,
                    context
                  );

                if (
                  newValue !==
                    undefined &&
                  newValue !== null
                ) {
                  newFormData[
                    field.name
                  ] = field.multiple
                    ? Array.isArray(
                        newValue
                      )
                      ? newValue
                      : [
                          newValue,
                        ]
                    : newValue;
                }
              } catch (e) {
                console.error(
                  `Error updating ${field.name}:`,
                  e
                );
              }
            }
          }
        );

        // PASS 2
        finalFields.forEach(
          (field) => {
            if (
              field.dependsOn &&
              field.updateOnChange
            ) {
              try {
                const newValue =
                  field.updateOnChange(
                    newFormData[
                      field.dependsOn
                    ],
                    newFormData,
                    context
                  );

                if (
                  newValue !==
                    undefined &&
                  newValue !== null
                ) {
                  newFormData[
                    field.name
                  ] = field.multiple
                    ? Array.isArray(
                        newValue
                      )
                      ? newValue
                      : [
                          newValue,
                        ]
                    : newValue;
                }
              } catch (e) {
                console.error(
                  `Error cascading ${field.name}:`,
                  e
                );
              }
            }
          }
        );

        // NUMBER MAX
        finalFields.forEach(
          (field) => {
            if (
              field.type !==
              'number'
            ) {
              return;
            }

            const maxValue =
              getFieldMax(
                field,
                newFormData
              );

            const currentValue =
              newFormData[
                field.name
              ];

            if (
              maxValue !==
                undefined &&
              currentValue !==
                '' &&
              currentValue !==
                undefined &&
              currentValue !== null
            ) {
              const numericValue =
                parseFloat(
                  String(
                    currentValue
                  )
                );

              if (
                !Number.isNaN(
                  numericValue
                ) &&
                numericValue >
                  maxValue
              ) {
                newFormData[
                  field.name
                ] = maxValue;
              }
            }
          }
        );

        return newFormData;
      },
      [
        formData,
        finalFields,
        context,
        getFieldMax,
      ]
    );

  // ======================================================
  // NORMAL INPUT CHANGE
  // ======================================================

  const handleChange =
    useCallback(
      (
        e: React.ChangeEvent<
          HTMLInputElement |
            HTMLSelectElement |
            HTMLTextAreaElement
        >
      ) => {
        const {
          name,
          value,
        } = e.target;

        const changedField =
          finalFields.find(
            (field) =>
              field.name === name
          );

        let newValue = value;

        if (
          changedField?.type ===
            'number' &&
          value !== ''
        ) {
          const maxValue =
            getFieldMax(
              changedField,
              {
                ...formData,
                [name]: value,
              }
            );

          if (
            maxValue !==
              undefined &&
            parseFloat(value) >
              maxValue
          ) {
            newValue =
              String(maxValue);
          }
        }

        const newFormData =
          updateDependentFields(
            name,
            newValue
          );

        setFormData(
          newFormData
        );

        setApiError(null);

        retryCountRef.current = 0;
      },
      [
        updateDependentFields,
        finalFields,
        formData,
        getFieldMax,
      ]
    );

  // ======================================================
  // SINGLE SELECT CHANGE
  // ======================================================

  const handleSelectChange =
    useCallback(
      (
        name: string,
        value: string
      ) => {
        const newFormData =
          updateDependentFields(
            name,
            value
          );

        setFormData(
          newFormData
        );

        setApiError(null);

        retryCountRef.current = 0;
      },
      [updateDependentFields]
    );

  // ======================================================
  // MULTI SELECT CHANGE
  // ======================================================

  const handleMultiSelectChange =
    useCallback(
      (
        name: string,
        value: string[]
      ) => {
        const normalizedValue = [
          ...new Set(
            (Array.isArray(value)
              ? value
              : []
            )
              .map((item) =>
                String(item).trim()
              )
              .filter(Boolean)
          ),
        ];

        const newFormData =
          updateDependentFields(
            name,
            normalizedValue
          );

        setFormData(
          newFormData
        );

        setApiError(null);

        retryCountRef.current = 0;
      },
      [updateDependentFields]
    );

  // ======================================================
  // DUPLICATE RECEIPT CHECK
  // ======================================================

  const isDuplicateReceiptError =
    (error: any): boolean => {
      const errorMessage =
        error?.response?.data
          ?.message ||
        error?.message ||
        '';

      return (
        String(errorMessage).includes(
          'E11000 duplicate key error'
        ) &&
        String(errorMessage).includes(
          'receiptNo'
        )
      );
    };

  // ======================================================
  // SUBMIT WITH RETRY
  // ======================================================

  const submitWithRetry =
    async (
      payload: any
    ): Promise<any> => {
      try {
        console.log(
          '📤 AddUserModal API REQUEST:',
          {
            method,
            endpoint,
            payload,
          }
        );

        const response =
          method === 'PUT'
            ? await api.put(
                endpoint,
                payload
              )
            : method ===
              'PATCH'
            ? await api.patch(
                endpoint,
                payload
              )
            : await api.post(
                endpoint,
                payload
              );

        console.log(
          '✅ AddUserModal API RESPONSE:',
          {
            status:
              response.status,
            data:
              response.data,
          }
        );

        retryCountRef.current = 0;

        return response;
      } catch (error: any) {
        console.error(
          '❌ AddUserModal API ERROR:',
          {
            status:
              error?.response
                ?.status,

            responseData:
              error?.response
                ?.data,

            responseHeaders:
              error?.response
                ?.headers,

            message:
              error?.message,

            method,

            endpoint,

            payload,
          }
        );

        if (
          isDuplicateReceiptError(
            error
          ) &&
          retryCountRef.current <
            maxRetries
        ) {
          retryCountRef.current +=
            1;

          const currentRetry =
            retryCountRef.current;

          toast.loading(
            `Retrying... (Attempt ${currentRetry}/${maxRetries})`,
            {
              duration: 2000,
            }
          );

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                2000
              )
          );

          return submitWithRetry(
            payload
          );
        }

        throw error;
      }
    };

  // ======================================================
  // HANDLE SUBMIT
  // ======================================================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const missingFields =
      finalFields.filter(
        (f) => {
          if (!f.required) {
            return false;
          }

          const value =
            formData[f.name];

          if (f.multiple) {
            return (
              !Array.isArray(
                value
              ) ||
              value.length === 0
            );
          }

          return (
            value === undefined ||
            value === null ||
            String(value).trim() === ''
          );
        }
      );

    if (
      missingFields.length >
      0
    ) {
      setApiError(
        `Please fill in: ${missingFields
          .map(
            (f) => f.label
          )
          .join(', ')}`
      );

      return;
    }

    setIsLoading(true);
    setApiError(null);
    retryCountRef.current = 0;

    try {
      let payload: Record<
        string,
        any
      > = {
        ...formData,
      };

      delete payload._context;

      // ======================================================
      // NORMALIZE MULTI-SELECT FIELDS
      // ======================================================

      for (const field of finalFields) {
        if (!field.multiple) {
          continue;
        }

        const value =
          payload[field.name];

        if (
          value === undefined ||
          value === null
        ) {
          payload[field.name] = [];
          continue;
        }

        if (!Array.isArray(value)) {
          payload[field.name] = [
            String(value).trim(),
          ];
          continue;
        }

        payload[field.name] = [
          ...new Set(
            value
              .map((item: any) =>
                String(item).trim()
              )
              .filter(Boolean)
          ),
        ];
      }

      // ======================================================
      // NUMBER CONVERSIONS
      // ======================================================

      if (
        payload.amount !==
          undefined &&
        payload.amount !== ''
      ) {
        payload.amount =
          parseFloat(
            payload.amount
          ) || 0;
      }

      if (
        payload.monthlyFee !==
          undefined &&
        payload.monthlyFee !== ''
      ) {
        payload.monthlyFee =
          parseFloat(
            payload.monthlyFee
          ) || 0;
      }

      if (
        payload.sellingPrice !==
          undefined &&
        payload.sellingPrice !== ''
      ) {
        payload.sellingPrice =
          parseFloat(
            payload.sellingPrice
          ) || 0;
      }

      if (
        payload.purchasePrice !==
          undefined &&
        payload.purchasePrice !== ''
      ) {
        payload.purchasePrice =
          parseFloat(
            payload.purchasePrice
          ) || 0;
      }

      if (
        payload.openingBalance !==
          undefined &&
        payload.openingBalance !== ''
      ) {
        payload.openingBalance =
          parseFloat(
            payload.openingBalance
          ) || 0;
      }

      if (
        payload.discount !==
          undefined &&
        payload.discount !== ''
      ) {
        payload.discount =
          parseFloat(
            payload.discount
          ) || 0;
      }

      // ======================================================
      // FINAL MAX VALIDATION
      // ======================================================

      for (const field of finalFields) {
        if (
          field.type !==
          'number'
        ) {
          continue;
        }

        const maxValue =
          getFieldMax(
            field,
            payload
          );

        const currentValue =
          payload[
            field.name
          ];

        if (
          maxValue !==
            undefined &&
          currentValue !==
            undefined &&
          currentValue !==
            null &&
          currentValue !== ''
        ) {
          const numericValue =
            parseFloat(
              String(
                currentValue
              )
            );

          if (
            !Number.isNaN(
              numericValue
            ) &&
            numericValue >
              maxValue
          ) {
            throw new Error(
              `${field.label} cannot exceed ${maxValue}.`
            );
          }
        }
      }

      // ======================================================
      // TRANSFORM
      // ======================================================

      if (transformData) {
        payload =
          transformData(
            payload
          );

        for (const field of finalFields) {
          if (!field.multiple) {
            continue;
          }

          const value =
            payload[field.name];

          if (
            value === undefined ||
            value === null
          ) {
            payload[field.name] = [];
          } else if (
            !Array.isArray(value)
          ) {
            payload[field.name] = [
              String(value).trim(),
            ];
          } else {
            payload[field.name] = [
              ...new Set(
                value
                  .map((item: any) =>
                    String(item).trim()
                  )
                  .filter(Boolean)
              ),
            ];
          }
        }
      }

      // ======================================================
      // FINAL REQUEST LOG
      // ======================================================

      console.log(
        '🚀 FINAL PAYLOAD:',
        {
          endpoint,
          method,
          payload,
        }
      );

      // ======================================================
      // API
      // ======================================================

      const response =
        await submitWithRetry(
          payload
        );

      if (
        response.data?.success
      ) {
        const result =
          response.data
            .customer ||
          response.data
            .purchase ||
          response.data
            .dealer ||
          response.data
            .staff ||
          response.data
            .area ||
          response.data
            .package ||
          response.data
            .payment ||
          response.data
            .data ||
          response.data;

        onSuccess?.(
          result
        );

        onClose();

        toast.success(
          method === 'PUT'
            ? 'Record updated successfully!'
            : 'Record added successfully!'
        );
      } else {
        const message =
          response.data
            ?.message ||
          'Failed to add record';

        setApiError(message);
        toast.error(message);
      }
    } catch (error: any) {
      console.error(
        '❌ Full Error:',
        error
      );

      let message =
        'Failed to add record';

      if (
        isDuplicateReceiptError(
          error
        )
      ) {
        message =
          'Duplicate receipt number. Please try again with a different date or contact support.';
      } else if (
        error?.response?.data
          ?.message
      ) {
        message =
          error.response.data
            .message;
      } else if (
        error?.response?.data
          ?.errors
      ) {
        const errors =
          Object.values(
            error.response
              .data.errors
          )
            .map((item: any) =>
              typeof item ===
              'string'
                ? item
                : item?.message ||
                  JSON.stringify(
                    item
                  )
            )
            .join(', ');

        message =
          errors ||
          'Validation failed';
      } else if (
        typeof error
          ?.response?.data ===
        'string'
      ) {
        message =
          error.response.data;
      } else if (
        error?.response
      ) {
        message = `Server error: ${error.response.status}`;
      } else if (
        error?.request
      ) {
        message =
          'No response from server. Please check if backend is running.';
      } else {
        message =
          error?.message ||
          'Failed to add record';
      }

      setApiError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ======================================================
  // MODAL
  // ======================================================

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-700">

        {/* HEADER */}

        <div
          className={cn(
            'flex items-center justify-between px-4 py-2.5 border-b',
            colorMap[
              color as keyof typeof colorMap
            ],
            'border-gray-200 dark:border-gray-700'
          )}
        >
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <User className="h-4 w-4" />

              {title}
            </h2>

            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="px-4 py-3 overflow-y-auto max-h-[calc(85vh-7rem)]"
        >
          {apiError && (
            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-xs flex items-start gap-1.5">
              <span className="text-sm mt-0.5">
                ⚠️
              </span>

              <span>
                {apiError}
              </span>
            </div>
          )}

          {retryCountRef.current >
            0 && (
            <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md text-yellow-700 dark:text-yellow-400 text-xs flex items-start gap-1.5">
              <span className="text-sm mt-0.5">
                🔄
              </span>

              <span>
                Retrying due to
                duplicate receipt...
                (Attempt{' '}
                {
                  retryCountRef.current
                }
                /{maxRetries})
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {finalFields.map(
              (field) => {
                if (
                  field.name ===
                  '_context'
                ) {
                  return null;
                }

                const dependsOnField =
                  field.dependsOn;

                const isDependent =
                  dependsOnField !==
                    undefined &&
                  formData[
                    dependsOnField
                  ] !== undefined;

                let fieldValue =
                  formData[
                    field.name
                  ] ?? '';

                if (
                  isDependent &&
                  field.updateOnChange &&
                  dependsOnField &&
                  !field.editable
                ) {
                  try {
                    const calculatedValue =
                      field.updateOnChange(
                        formData[
                          dependsOnField
                        ],
                        formData,
                        context
                      );

                    if (
                      calculatedValue !==
                        undefined &&
                      calculatedValue !==
                        null
                    ) {
                      fieldValue =
                        field.multiple
                          ? Array.isArray(
                              calculatedValue
                            )
                            ? calculatedValue
                            : [
                                calculatedValue,
                              ]
                          : calculatedValue;
                    }
                  } catch (e) {
                    console.error(
                      `Error calculating ${field.name}:`,
                      e
                    );
                  }
                }

                const isReadOnly =
                  Boolean(
                    field.readOnly ||
                      (!!field.dependsOn &&
                        !field.editable)
                  );

                const lockedByParent =
                  isLockedByParent(
                    field,
                    formData
                  );

                const isDisabled =
                  isReadOnly ||
                  lockedByParent;

                const fieldOptions =
                  getFieldOptions(
                    field,
                    formData
                  );

                const fieldMax =
                  getFieldMax(
                    field,
                    formData
                  );

                return (
                  <div
                    key={
                      field.name
                    }
                    className={
                      field.type ===
                      'textarea'
                        ? 'md:col-span-2'
                        : ''
                    }
                  >
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                      {
                        field.label
                      }{' '}
                      {field.required &&
                        '*'}
                    </label>

                    {/* SELECT */}

                    {field.type ===
                    'select' ? (
                      field.multiple ? (
                        <SearchableMultiSelect
                          options={
                            fieldOptions
                          }
                          value={
                            Array.isArray(
                              formData[
                                field.name
                              ]
                            )
                              ? formData[
                                  field.name
                                ]
                              : []
                          }
                          onChange={
                            handleMultiSelectChange
                          }
                          placeholder={
                            field.placeholder ||
                            `Select ${field.label}`
                          }
                          label={
                            field.label
                          }
                          name={
                            field.name
                          }
                          disabled={
                            isDisabled
                          }
                        />
                      ) : field.searchable ? (
                        <SearchableSelect
                          options={
                            fieldOptions
                          }
                          value={
                            typeof formData[
                              field.name
                            ] ===
                            'string'
                              ? formData[
                                  field.name
                                ]
                              : ''
                          }
                          onChange={
                            handleSelectChange
                          }
                          placeholder={
                            field.placeholder ||
                            `Select ${field.label}`
                          }
                          label={
                            field.label
                          }
                          name={
                            field.name
                          }
                          disabled={
                            isDisabled
                          }
                        />
                      ) : (
                        <select
                          name={
                            field.name
                          }
                          value={
                            typeof formData[
                              field.name
                            ] ===
                            'string'
                              ? formData[
                                  field.name
                                ]
                              : ''
                          }
                          onChange={
                            handleChange
                          }
                          required={
                            field.required
                          }
                          disabled={
                            isDisabled
                          }
                          className="w-full px-2.5 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 dark:disabled:bg-gray-700/50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {field.placeholder ||
                              `Select ${field.label}`}
                          </option>

                          {fieldOptions.map(
                            (
                              opt
                            ) => (
                              <option
                                key={
                                  opt.value
                                }
                                value={
                                  opt.value
                                }
                              >
                                {
                                  opt.label
                                }
                              </option>
                            )
                          )}
                        </select>
                      )
                    ) : field.type ===
                      'textarea' ? (
                      <textarea
                        name={
                          field.name
                        }
                        value={
                          typeof formData[
                            field.name
                          ] ===
                          'string'
                            ? formData[
                                field.name
                              ]
                            : ''
                        }
                        onChange={
                          handleChange
                        }
                        required={
                          field.required
                        }
                        rows={2}
                        placeholder={
                          field.placeholder
                        }
                        readOnly={
                          isReadOnly
                        }
                        className={cn(
                          'w-full px-2.5 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none',

                          isReadOnly &&
                            'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed'
                        )}
                      />
                    ) : (
                      <input
                        type={
                          field.type ||
                          'text'
                        }
                        name={
                          field.name
                        }
                        value={
                          fieldValue
                        }
                        onChange={
                          handleChange
                        }
                        required={
                          field.required
                        }
                        placeholder={
                          field.placeholder
                        }
                        readOnly={
                          isReadOnly
                        }
                        disabled={
                          lockedByParent
                        }
                        min={
                          field.min
                        }
                        max={
                          fieldMax
                        }
                        maxLength={
                          field.maxLength
                        }
                        step={
                          field.step
                        }
                        className={cn(
                          'w-full px-2.5 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none',

                          (isReadOnly ||
                            lockedByParent) &&
                            'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed',

                          lockedByParent &&
                            'opacity-60'
                        )}
                      />
                    )}
                  </div>
                );
              }
            )}
          </div>

          {/* ACTIONS */}

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              {cancelLabel}
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'px-4 py-1.5 text-sm text-white rounded-md font-medium transition-colors disabled:opacity-70',
                buttonColorMap[
                  color as keyof typeof buttonColorMap
                ]
              )}
            >
              {isLoading
                ? 'Saving...'
                : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  X,
  Phone,
  MapPin,
  DollarSign,
  Hash,
  Home,
  CheckCircle,
  XCircle,
  CalendarDays,
  Briefcase,
} from 'lucide-react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

const spinner = (
  <Layout>
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  </Layout>
);

const colorClasses: Record<string, string> = {
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-blue-500/30',
  green:
    'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-500 ring-green-500/30',
  gray: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 border-gray-500 ring-gray-500/30',
  orange:
    'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-500 ring-orange-500/30',
  red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-500 ring-red-500/30',
};

/* ============================================================
   DATE HELPERS
============================================================ */

function toDateInput(val: any): string {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function displayDate(val: any): string {
  if (!val) return 'N/A';
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* ============================================================
   VIEW FIELD
============================================================ */

function ViewField({
  icon,
  label,
  value,
  highlight,
  fullWidth,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
  highlight?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        fullWidth && 'sm:col-span-2',
        highlight
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
      )}
    >
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
        {icon}
        {label}
      </div>

      <p
        className={cn(
          'font-semibold',
          highlight
            ? 'text-blue-700 dark:text-blue-400 text-lg'
            : 'text-gray-900 dark:text-white'
        )}
      >
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   PAGE
============================================================ */

function StaffPageContent() {
  const [modal, setModal] = useState(false);
  const [view, setView] = useState(false);
  const [viewingStaffId, setViewingStaffId] = useState<string | null>(null);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

  const viewingStaff = viewingStaffId
    ? staff.find((s) => s.id === viewingStaffId) || null
    : null;

  /* ==========================================================
     FETCH AREAS
  ========================================================== */

  const fetchAreas = async () => {
    try {
      if (!sessionStorage.getItem('token')) return [];

      const { data } = await api.get('/areas');
      const list = data.success ? data.areas || [] : [];
      setAreas(list);
      return list;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  /* ==========================================================
     FETCH STAFF
  ========================================================== */

  const fetchStaff = async () => {
    try {
      if (!sessionStorage.getItem('token')) {
        setLoading(false);
        return;
      }

      const { data } = await api.get('/staff');

      if (!data.success) return;

      const mapped = (data.staff || []).map((s: any) => ({
        id: s._id,
        staffId: s.staffId || 'N/A',
        name: s.name || '',
        phone: s.phone || '',
        email: s.email || '',
        cnic: s.cnic || '',
        designation: s.designation || '',
        salaryRaw: Number(s.salary || 0),
        salary: `Rs. ${Number(s.salary || 0).toLocaleString()}`,
        joiningDate: s.joiningDate ? toDateInput(s.joiningDate) : '',
        address: s.address || '',
        assignedArea:
          s.assignedArea && typeof s.assignedArea === 'object'
            ? s.assignedArea.name || ''
            : s.assignedArea || '',
        isActive: s.isActive !== undefined ? s.isActive : true,
        status: s.isActive === false ? 'Inactive' : 'Active',
        remarks: s.remarks || '',
        raw: s,
      }));

      setStaff(mapped);
    } catch (e) {
      console.error('Error fetching staff:', e);
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    (async () => {
      await fetchAreas();
      await fetchStaff();
    })();
  }, []);

  /* ==========================================================
     STATS
  ========================================================== */

  const stats = [
    ['all', 'TOTAL STAFF', staff.length, Users, 'blue'],
    [
      'active',
      'ACTIVE',
      staff.filter((s) => s.isActive).length,
      UserCheck,
      'green',
    ],
    [
      'inactive',
      'INACTIVE',
      staff.filter((s) => !s.isActive).length,
      UserX,
      'gray',
    ],
  ] as const;

  /* ==========================================================
     STAFF FORM FIELDS
  ========================================================== */

  const staffFields: Field[] = [
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Enter staff name',
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'text',
      required: true,
      placeholder: '0300-1234567',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      placeholder: 'staff@example.com',
    },
    {
      name: 'cnic',
      label: 'CNIC',
      type: 'text',
      placeholder: '12345-1234567-1',
    },
    {
      name: 'designation',
      label: 'Designation',
      type: 'select',
      required: true,
      options: [
        { label: 'Collector', value: 'Collector' },
        { label: 'Technician', value: 'Technician' },
        { label: 'Installer', value: 'Installer' },
        { label: 'Sales Executive', value: 'Sales Executive' },
        { label: 'Manager', value: 'Manager' },
        { label: 'Other', value: 'Other' },
      ],
    },
    {
      name: 'area',
      label: 'Assigned Area',
      type: 'select',
      required: true,
      searchable: true,
      options: areas.map((a) => ({
        label: a.name,
        value: a.name,
      })),
    },
    {
      name: 'salary',
      label: 'Salary (Rs.)',
      type: 'number',
      required: true,
      placeholder: '25000',
      min: 0,
      step: 100,
    },
    {
      name: 'joiningDate',
      label: 'Joining Date',
      type: 'date',
      required: true,
    },
    {
      name: 'address',
      label: 'Address',
      type: 'textarea',
      placeholder: 'Staff address',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
      defaultValue: 'Active',
    },
    {
      name: 'remarks',
      label: 'Remarks',
      type: 'textarea',
      placeholder: 'Additional notes...',
    },
  ];

  /* ==========================================================
     TRANSFORM FORM DATA
  ========================================================== */

  const transformStaffData = (data: any) => {
    return {
      name: data.name?.trim() || '',
      phone: data.phone?.trim() || '',
      email: data.email?.trim() || '',
      cnic: data.cnic?.trim() || '',
      designation: data.designation,
      salary: parseFloat(data.salary) || 0,
      joiningDate:
        data.joiningDate || new Date().toISOString().split('T')[0],
      address: data.address?.trim() || '',
      assignedArea: data.area || '',
      isActive: data.status === 'Active',
      remarks: data.remarks || '',
    };
  };

  /* ==========================================================
     SUCCESS
  ========================================================== */

  const handleSuccess = () => {
    setEditingStaff(null);
    setModal(false);
    fetchStaff();
  };

  /* ==========================================================
     DELETE
  ========================================================== */

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await api.delete(`/staff/${id}`);
      setStaff((prev) => prev.filter((s) => s.id !== id));
      toast.success(`${name} deleted`);
      if (editingStaff?.id === id) setEditingStaff(null);
      if (viewingStaffId === id) {
        setView(false);
        setViewingStaffId(null);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete staff');
    }
  };

  /* ==========================================================
     FILTERED STAFF
  ========================================================== */

  const filteredStaff = staff.filter((s) => {
    const q = search.toLowerCase();

    const matchesStatus =
      filter === 'all' ||
      (filter === 'active' && s.isActive) ||
      (filter === 'inactive' && !s.isActive);

    const matchesSearch =
      s.name?.toLowerCase().includes(q) ||
      s.staffId?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      s.designation?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  /* ==========================================================
     TABLE COLUMNS
  ========================================================== */

  const columns = [
    { key: 'staffId', header: 'Staff ID' },
    {
      key: 'name',
      header: 'Staff',
      render: (s: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white">
            {s.name}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <CalendarDays className="h-3 w-3 text-blue-500" />
            Joined: {displayDate(s.joiningDate)}
          </span>
        </div>
      ),
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (s: any) => (
        <span className="inline-flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-gray-400" />
          {s.designation || '—'}
        </span>
      ),
    },
    { key: 'phone', header: 'Phone' },
    {
      key: 'assignedArea',
      header: 'Area',
      render: (s: any) => s.assignedArea || '—',
    },
    { key: 'salary', header: 'Salary' },
    {
      key: 'status',
      header: 'Status',
      render: (s: any) => (
        <span
          className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            s.isActive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          )}
        >
          {s.status}
        </span>
      ),
    },
  ];

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return spinner;
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <Layout>
      <div className="space-y-5">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Staff Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage staff members and their contact details.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingStaff(null);
              setModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#d6b138] hover:bg-[#f7ce48] text-gray-900 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Staff
          </button>
        </header>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(([key, label, value, Icon, color]) => {
            const active = filter === key;
            const c = colorClasses[color];
            const parts = c.split(' ');

            return (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={cn(
                  'bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 text-left transition-all hover:shadow-md hover:scale-[1.02]',
                  active
                    ? `${parts.slice(-3).join(' ')} ring-2`
                    : 'border-gray-200 dark:border-gray-700'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {label}
                    </p>
                    <p className={cn('text-2xl font-bold mt-1', parts[0])}>
                      {value}
                    </p>
                    <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                      {active ? 'Filtered' : ''}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center',
                      parts.slice(1, 3).join(' ')
                    )}
                  >
                    <Icon className={cn('h-6 w-6', parts[0])} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* SEARCH */}
        <SearchBar
          placeholder="Search by name, ID, phone or designation..."
          value={search}
          onChange={setSearch}
        />

        {/* STAFF LIST */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                Staff List
              </h2>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {filter === 'active' ? 'Active' : 'Inactive'}
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredStaff.length} staff found
            </span>
          </div>

          <div className="p-2">
            <DataTable
              data={filteredStaff}
              columns={columns}
              actions={[
                { value: 'edit', icon: <Edit className="h-3 w-3" /> },
                { value: 'view', icon: <Eye className="h-3 w-3" /> },
                { value: 'delete', icon: <Trash2 className="h-3 w-3" /> },
              ]}
              onAction={(item, action) => {
                if (action === 'delete') {
                  handleDelete(item.id, item.name);
                  return;
                }
                if (action === 'edit') {
                  setEditingStaff(item);
                  setModal(true);
                  return;
                }
                if (action === 'view') {
                  setViewingStaffId(item.id);
                  setView(true);
                  return;
                }
              }}
              accordionTitle="name"
              accordionSubtitle="staffId"
              emptyMessage="No staff found matching your search"
            />
          </div>
        </section>

        {/* ADD / EDIT STAFF MODAL */}
        <AddUserModal
          isOpen={modal}
          onClose={() => {
            setModal(false);
            setEditingStaff(null);
          }}
          onSuccess={handleSuccess}
          title={editingStaff ? 'Edit Staff' : 'Add New Staff'}
          subtitle={
            editingStaff
              ? 'Update the staff details below'
              : 'Add a new staff member to the system'
          }
          fields={staffFields}
          submitLabel={editingStaff ? 'Update Staff' : 'Add Staff'}
          color="blue"
          endpoint={editingStaff ? `/staff/${editingStaff.id}` : '/staff'}
          method={editingStaff ? 'PUT' : 'POST'}
          initialData={
            editingStaff
              ? {
                  name: editingStaff.name,
                  phone: editingStaff.phone,
                  email: editingStaff.email,
                  cnic: editingStaff.cnic,
                  designation: editingStaff.designation,
                  area: editingStaff.assignedArea,
                  salary: editingStaff.salaryRaw,
                  joiningDate: editingStaff.joiningDate,
                  address: editingStaff.address,
                  status: editingStaff.isActive ? 'Active' : 'Inactive',
                  remarks: editingStaff.remarks,
                }
              : undefined
          }
          transformData={transformStaffData}
          context={{ areas }}
        />

        {/* VIEW STAFF MODAL */}
        {view && viewingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setView(false);
                setViewingStaffId(null);
              }}
            />

            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {viewingStaff.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Staff ID: {viewingStaff.staffId}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setView(false);
                    setViewingStaffId(null);
                  }}
                  className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-4">
                <div className="flex justify-center">
                  <span
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm font-semibold inline-flex items-center gap-1.5',
                      viewingStaff.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    )}
                  >
                    {viewingStaff.isActive ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {viewingStaff.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ViewField
                    icon={<Hash className="h-4 w-4" />}
                    label="Staff ID"
                    value={viewingStaff.staffId}
                  />
                  <ViewField
                    icon={<Users className="h-4 w-4" />}
                    label="Full Name"
                    value={viewingStaff.name}
                  />
                  <ViewField
                    icon={<Phone className="h-4 w-4" />}
                    label="Phone"
                    value={viewingStaff.phone}
                  />
                  <ViewField
                    icon={<Briefcase className="h-4 w-4" />}
                    label="Designation"
                    value={viewingStaff.designation || '—'}
                  />
                  <ViewField
                    icon={<MapPin className="h-4 w-4" />}
                    label="Assigned Area"
                    value={viewingStaff.assignedArea || 'Not assigned'}
                  />
                  <ViewField
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Salary"
                    value={`Rs. ${viewingStaff.salaryRaw.toLocaleString()}`}
                    highlight
                  />
                  <ViewField
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Joining Date"
                    value={displayDate(viewingStaff.joiningDate)}
                  />
                  <ViewField
                    icon={<Hash className="h-4 w-4" />}
                    label="CNIC"
                    value={viewingStaff.cnic || 'N/A'}
                  />
                  <ViewField
                    icon={<Home className="h-4 w-4" />}
                    label="Address"
                    value={viewingStaff.address || 'N/A'}
                    fullWidth
                  />
                  {viewingStaff.remarks && (
                    <ViewField
                      icon={<Hash className="h-4 w-4" />}
                      label="Remarks"
                      value={viewingStaff.remarks}
                      fullWidth
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  onClick={() => {
                    setView(false);
                    setViewingStaffId(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setView(false);
                    setViewingStaffId(null);
                    setEditingStaff(viewingStaff);
                    setModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function StaffPage() {
  return (
    <Suspense fallback={spinner}>
      <StaffPageContent />
    </Suspense>
  );
}
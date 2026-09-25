'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { DataTable } from '@/app/components/ui/DataTable';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import {
  Handshake,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Phone,
  MapPin,
  CreditCard,
  Building2,
  X,
  Hash,
  User as UserIcon,
  Home,
  DollarSign,
  FileText,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

// ============ VIEW FIELD COMPONENT ============
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
          ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
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
            ? 'text-[#d6b138] dark:text-[#f7ce48] text-lg'
            : 'text-gray-900 dark:text-white'
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function PartnersListPage() {
  const router = useRouter();

  const [modal, setModal] = useState(false);
  const [view, setView] = useState(false);
  const [viewingPartner, setViewingPartner] = useState<any>(null);
  const [editingPartner, setEditingPartner] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Partners');
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);

  // Fetch partners + areas
  useEffect(() => {
    fetchPartners();
    fetchAreas();
  }, []);

  const fetchPartners = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await api.get('/partners-list');
      if (response.data.success) {
        const formattedPartners = response.data.partners.map((partner: any) => ({
          id: partner._id,
          partnerId: partner.partnerId || 'N/A',
          name: partner.name || 'Unknown',
          cellNo: partner.cellNo || 'N/A',
          area: partner.area?.name || partner.area || 'N/A',
          address: partner.address || 'N/A',
          openingBalance: Number(partner.openingBalance || 0),
          remarks: partner.remarks || '',
          status: partner.status || 'active',
        }));
        setPartners(formattedPartners);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch partner areas
  const fetchAreas = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      let areasList: any[] = [];

      try {
        const response = await api.get('/partner-areas');
        if (response.data.success && response.data.areas) {
          areasList = response.data.areas;
          console.log('📋 Partner areas loaded:', areasList);
        }
      } catch (err) {
        console.log('⚠️ /partner-areas not found, trying /areas...');
        const response = await api.get('/areas');
        if (response.data.success && response.data.areas) {
          areasList = response.data.areas;
        }
      }

      setAreas(areasList);
    } catch (error) {
      console.error('Error fetching partner areas:', error);
      toast.error('Failed to load areas');
    }
  };

  // Calculate stats
  const totalPartners = partners.length;
  const activePartners = partners.filter((p) => p.status === 'active').length;
  const inactivePartners = partners.filter((p) => p.status === 'inactive').length;

  // ✅ Transform partner data before sending
  const transformPartnerData = (data: any) => {
    return {
      partnerId: data.partnerId,
      name: data.name,
      cellNo: data.cellNo,
      area: data.area,
      address: data.address || data.area,
      openingBalance: parseFloat(data.openingBalance) || 0,
      remarks: data.remarks || '',
    };
  };

  // ✅ Partner fields — partnerId and name read-only when editing
  const partnerFields: Field[] = [
    {
      name: 'partnerId',
      label: 'Partner ID',
      type: 'text',
      required: true,
      placeholder: 'e.g., PTR-001',
      readOnly: !!editingPartner,   // ✅ Lock when editing
    },
    {
      name: 'name',
      label: 'Partner Name',
      type: 'text',
      required: true,
      placeholder: 'Enter partner name',
      readOnly: !!editingPartner,   // ✅ Lock when editing
    },
    {
      name: 'cellNo',
      label: 'Cell No.',
      type: 'text',
      required: true,
      placeholder: '0330-1234567',
    },
    {
      name: 'area',
      label: 'Area',
      type: 'select',
      required: true,
      searchable: true,
      options:
        areas.length > 0
          ? areas.map((area: any) => ({
              label: area.name,
              value: area.name,
            }))
          : [{ label: 'No areas available - add one first', value: '' }],
    },
    {
      name: 'address',
      label: 'Address',
      type: 'text',
      placeholder: 'Partner address',
    },
    {
      name: 'openingBalance',
      label: 'Opening Balance (Rs.)',
      type: 'text',
      placeholder: '0',
    },
    {
      name: 'remarks',
      label: 'Remarks',
      type: 'textarea',
      placeholder: 'Additional notes...',
    },
  ];

  const handlePartnerSuccess = (data: any) => {
    toast.success(
      editingPartner
        ? `${data.name} updated successfully!`
        : `${data.name} added successfully!`
    );
    setEditingPartner(null);
    setModal(false);
    fetchPartners();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await api.delete(`/partners-list/${id}`);
        setPartners(partners.filter((p) => p.id !== id));
        toast.success(`${name} deleted`);
        if (editingPartner?.id === id) setEditingPartner(null);
      } catch (error) {
        toast.error('Failed to delete partner');
      }
    }
  };

  // ✅ Open modal pre-filled for editing
  const handleEdit = (partner: any) => {
    setEditingPartner(partner);
    setModal(true);
  };

  // Safe filtering
  const filteredPartners = partners.filter((partner) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      partner.name?.toLowerCase().includes(query) ||
      partner.partnerId?.toLowerCase().includes(query) ||
      partner.cellNo?.includes(query);

    const matchesStatus =
      selectedStatus === 'All Partners' ||
      (selectedStatus === 'Active' && partner.status === 'active') ||
      (selectedStatus === 'Inactive' && partner.status === 'inactive');

    return matchesSearch && matchesStatus;
  });

  // Columns — NO commission
  const columns = [
    { key: 'partnerId', header: 'Partner ID' },
    { key: 'name', header: 'Partner Name' },
    { key: 'cellNo', header: 'Cell No.' },
    { key: 'area', header: 'Area' },
    { key: 'address', header: 'Address' },
    { key: 'remarks', header: 'Remarks' },
  ];

  const statusOptions = ['All Partners', 'Active', 'Inactive'];

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d6b138]"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Handshake className="h-6 w-6 text-[#d6b138]" />
              Partners
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage partner information and contact details.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingPartner(null);
              setModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#d6b138] hover:bg-[#f7ce48] text-gray-900 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Add Partner
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL PARTNERS</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalPartners}
                </p>
              </div>
              <div className="h-12 w-12 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <Handshake className="h-6 w-6 text-[#d6b138] dark:text-[#f7ce48]" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">ACTIVE</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {activePartners}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">INACTIVE</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">
                  {inactivePartners}
                </p>
              </div>
              <div className="h-12 w-12 bg-gray-50 dark:bg-gray-900/30 rounded-full flex items-center justify-center">
                <Handshake className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL RECOVERY</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  77.2%
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              placeholder="Search partner name, ID or cell no..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#d6b138] focus:border-transparent outline-none transition-all"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Partner List
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredPartners.length} partners found
            </span>
          </div>
          <div className="p-4">
            <DataTable
              data={filteredPartners}
              columns={columns}
              actions={[
                { value: 'edit', icon: <Edit className="h-4 w-4" /> },
                { value: 'view', icon: <Eye className="h-4 w-4" /> },
                { value: 'delete', icon: <Trash2 className="h-4 w-4" /> },
              ]}
              onAction={(item, action) => {
                if (action === 'delete') {
                  handleDelete(item.id, item.name);
                } else if (action === 'edit') {
                  handleEdit(item);
                } else if (action === 'view') {
                  setViewingPartner(item);
                  setView(true);
                }
              }}
              accordionTitle="name"
              accordionSubtitle="partnerId"
              emptyMessage="No partners found matching your search"
            />
          </div>
        </div>

        {/* Add / Edit Partner Modal */}
        <AddUserModal
          isOpen={modal}
          onClose={() => {
            setModal(false);
            setEditingPartner(null);
          }}
          onSuccess={handlePartnerSuccess}
          title={editingPartner ? 'Edit Partner' : 'Add New Partner'}
          subtitle={
            editingPartner
              ? 'Update partner details below'
              : 'Add a new partner to the system'
          }
          fields={partnerFields}
          submitLabel={editingPartner ? 'Update Partner' : 'Add Partner'}
          color="blue"
          endpoint={
            editingPartner ? `/partners-list/${editingPartner.id}` : '/partners-list'
          }
          method={editingPartner ? 'PUT' : 'POST'}
          initialData={
            editingPartner
              ? {
                  partnerId: editingPartner.partnerId,
                  name: editingPartner.name,
                  cellNo: editingPartner.cellNo,
                  area: editingPartner.area,
                  address: editingPartner.address,
                  openingBalance: editingPartner.openingBalance,
                  remarks: editingPartner.remarks,
                }
              : undefined
          }
          transformData={transformPartnerData}
          context={{ areas }}
        />

        {/* View Partner Modal */}
        {view && viewingPartner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setView(false)}
            />

            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-amber-50 to-amber-50 dark:from-amber-950/30 dark:to-amber-950/30">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center">
                    <Handshake className="h-6 w-6 text-[#d6b138] dark:text-[#f7ce48]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {viewingPartner.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Partner ID: {viewingPartner.partnerId}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setView(false)}
                  className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-4">
                {/* Status badge */}
                <div className="flex justify-center">
                  <span
                    className={cn(
                      'px-4 py-1.5 rounded-full text-sm font-semibold inline-flex items-center gap-1.5',
                      viewingPartner.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        viewingPartner.status === 'active'
                          ? 'bg-green-500'
                          : 'bg-gray-500'
                      )}
                    />
                    {viewingPartner.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Fields grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ViewField
                    icon={<Hash className="h-4 w-4" />}
                    label="Partner ID"
                    value={viewingPartner.partnerId}
                  />
                  <ViewField
                    icon={<UserIcon className="h-4 w-4" />}
                    label="Partner Name"
                    value={viewingPartner.name}
                  />
                  <ViewField
                    icon={<Phone className="h-4 w-4" />}
                    label="Cell No."
                    value={viewingPartner.cellNo}
                  />
                  <ViewField
                    icon={<MapPin className="h-4 w-4" />}
                    label="Area"
                    value={viewingPartner.area}
                  />
                  <ViewField
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Opening Balance"
                    value={`Rs. ${Number(viewingPartner.openingBalance || 0).toLocaleString()}`}
                    highlight
                  />
                  <ViewField
                    icon={<Home className="h-4 w-4" />}
                    label="Address"
                    value={viewingPartner.address || 'N/A'}
                  />
                  <ViewField
                    icon={<FileText className="h-4 w-4" />}
                    label="Remarks"
                    value={viewingPartner.remarks || 'No remarks'}
                    fullWidth
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  onClick={() => setView(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium"
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    setView(false);
                    setEditingPartner(viewingPartner);
                    setModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#d6b138] hover:bg-[#f7ce48] text-gray-900 rounded-lg text-sm font-medium"
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
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { SearchBar } from '@/app/components/ui/SearchBar';
import api from '@/app/lib/api';
import {
  PlusCircle,
  Server,
  Edit2,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

type ISP = {
  id: string;
  name: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export default function ISPPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isps, setIsps] = useState<ISP[]>([]);
  const [editingISP, setEditingISP] = useState<ISP | null>(null);

  useEffect(() => {
    fetchISPs();
  }, []);

  const fetchISPs = async () => {
    try {
      setLoading(true);

      const response = await api.get('/isps');

      if (response.data.success) {
        const ispList = Array.isArray(response.data.isps)
          ? response.data.isps
          : [];

        setIsps(
          ispList.map((isp: any) => ({
            id: String(isp._id),
            name: isp.name || '',
            createdAt: isp.createdAt,
            updatedAt: isp.updatedAt,
          }))
        );
      } else {
        setIsps([]);
      }
    } catch (error) {
      console.error('Error fetching ISPs:', error);
      toast.error('Failed to load ISPs');
    } finally {
      setLoading(false);
    }
  };

  const handleISPSuccess = (data: any) => {
    toast.success(
      editingISP
        ? `ISP "${data.name}" updated successfully!`
        : `ISP "${data.name}" added successfully!`
    );

    setEditingISP(null);
    setIsModalOpen(false);

    fetchISPs();
  };

  const handleEdit = (
    isp: ISP,
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();

    setEditingISP(isp);
    setIsModalOpen(true);
  };

  const handleDelete = async (
    id: string,
    name: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"?`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/isps/${id}`);

      setIsps((previous) =>
        previous.filter((isp) => isp.id !== id)
      );

      toast.success(`ISP "${name}" deleted`);
    } catch (error) {
      console.error('Error deleting ISP:', error);
      toast.error('Failed to delete ISP');
    }
  };

  const filteredISPs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return isps;
    }

    return isps.filter((isp) =>
      isp.name.toLowerCase().includes(query)
    );
  }, [isps, searchQuery]);

  const ispFields: Field[] = [
    {
      name: 'name',
      label: 'ISP Name',
      type: 'text',
      required: true,
      placeholder: 'Enter ISP name',
    },
  ];

  const transformISPData = (data: any) => ({
    name: data.name?.trim(),
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">

        {/* Top actions */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              setEditingISP(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-[#D9A82E] px-4 py-3 text-sm text-white transition hover:bg-[#c99b29]"
          >
            <PlusCircle className="h-5 w-5" />
            Add ISP
          </button>
        </div>

        {/* Search */}
        <div className="w-full">
          <SearchBar
            placeholder="Search ISPs..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        {/* ISP Cards */}
        {filteredISPs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
            <Server className="mx-auto mb-3 h-10 w-10 text-gray-300" />

            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              No ISPs found
            </p>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {searchQuery
                ? 'Try changing your search.'
                : 'Add your first ISP to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredISPs.map((isp) => (
              <article
                key={isp.id}
                className="relative w-full overflow-hidden rounded-xl border border-blue-50 bg-white shadow-sm transition-all dark:border-blue-800 dark:bg-gray-800"
              >
                

                <div className="p-4">

                  {/* ISP Header */}
                  <div className="flex items-center justify-between gap-3">

                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
                        <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold uppercase leading-tight text-gray-900 dark:text-white">
                          {isp.name}
                        </h3>
                      </div>
                    </div>

                    {/* Edit/Delete */}
                    <div className="flex flex-shrink-0 items-center gap-1">

                      <button
                        type="button"
                        onClick={(event) =>
                          handleEdit(isp, event)
                        }
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30 dark:hover:text-amber-400"
                        aria-label={`Edit ${isp.name}`}
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            isp.id,
                            isp.name
                          )
                        }
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        aria-label={`Delete ${isp.name}`}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>
                  </div>

                </div>
              </article>
            ))}
          </div>
        )}

        {/* Add / Edit Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingISP(null);
          }}
          onSuccess={handleISPSuccess}
          title={
            editingISP
              ? 'Edit ISP'
              : 'Add New ISP'
          }
          subtitle={
            editingISP
              ? 'Update the ISP name below'
              : 'Create a new ISP'
          }
          fields={ispFields}
          submitLabel={
            editingISP
              ? 'Update ISP'
              : 'Add ISP'
          }
          color="blue"
          endpoint={
            editingISP
              ? `/isps/${editingISP.id}`
              : '/isps'
          }
          method={
            editingISP
              ? 'PUT'
              : 'POST'
          }
          initialData={
            editingISP
              ? {
                  name: editingISP.name,
                }
              : undefined
          }
          transformData={transformISPData}
        />
      </div>
    </Layout>
  );
}
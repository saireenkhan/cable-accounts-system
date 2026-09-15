'use client';

import React, { useState, useRef, useEffect } from 'react';
import Layout from '@/app/components/ui/Layout';
import api from '@/app/lib/api';
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  Copy,
  Check,
  MapPin,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

interface UploadResult {
  total: number;
  inserted: number;
  skipped: number;
  insertedIds: string[];
  errors: string[];
  message: string;
}

// ✅ Sample CSV — no `area` column (area is chosen on the page)
const SAMPLE_CSV = `customerId,name,phone,address,package,discount,monthlyFee,status
USR-001,John Doe,0300-1234567,"House 5, Street 3",BASIC,0,1500,active
USR-002,Jane Smith,0321-9876543,"Flat B-12, Block 1",PREMIUM,500,3500,active
USR-003,Ahmed Khan,0333-5555555,"Shop 12, Main Market",STANDARD,0,2500,active`;

const REQUIRED_HEADERS = ['customerId', 'name', 'phone', 'address'];
const OPTIONAL_HEADERS = ['package', 'discount', 'monthlyFee', 'status'];

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedArea, setSelectedArea] = useState('');
  const [areas, setAreas] = useState<any[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Fetch areas on mount
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await api.get('/areas');
        if (res.data.success) {
          setAreas(res.data.areas || []);
        }
      } catch (err) {
        console.error('Failed to fetch areas:', err);
        toast.error('Failed to load areas');
      } finally {
        setAreasLoading(false);
      }
    };
    fetchAreas();
  }, []);

  // ✅ Download sample via API
  const handleDownloadSample = () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';
    window.open(`${API_BASE}/customers/bulk-upload/sample`, '_blank');
    toast.success('Sample CSV downloaded');
  };

  // ✅ Copy sample to clipboard
  const handleCopySample = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_CSV);
      setCopied(true);
      toast.success('Sample copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const validateAndSetFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.csv')) {
      toast.error('Only .csv files are allowed');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File must be smaller than 10 MB');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const handleUpload = async () => {
    if (!selectedArea) {
      toast.error('Please select an area first');
      return;
    }
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('area', selectedArea);

      const response = await api.post('/customers/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data;

      setResult({
        total: data.total || 0,
        inserted: data.inserted || 0,
        skipped: data.skipped || 0,
        insertedIds: data.insertedIds || [],
        errors: data.errors || [],
        message: data.message || 'Upload complete',
      });

      if (data.success && data.inserted > 0) {
        toast.success(`Imported ${data.inserted} customers`);
      } else if (data.success && data.inserted === 0) {
        toast.error('No customers imported — check the result panel');
      } else {
        toast.error(data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to upload file';

      setResult({
        total: 0,
        inserted: 0,
        skipped: 0,
        insertedIds: [],
        errors: [msg],
        message: msg,
      });

      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-5 max-w-4xl">
        {/* ============================================ */}
        {/* PAGE HEADER */}
        {/* ============================================ */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="h-6 w-6 text-blue-600" />
            Bulk Upload Customers
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Import multiple customers at once from a CSV file.
          </p>
        </div>

        {/* ============================================ */}
        {/* STEP 1 — AREA SELECTOR (required first) */}
        {/* ============================================ */}
        <div
          className={cn(
            'rounded-xl shadow-sm border p-5 transition-all',
            selectedArea
              ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800'
              : 'bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/20'
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0',
                selectedArea
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white'
              )}
            >
              {selectedArea ? <Check className="h-4 w-4" /> : '1'}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                Select Area
                <span className="text-red-500">*</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Required — all customers in this file will be assigned to this
                area
              </p>
            </div>
          </div>

          {areasLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading areas...
            </div>
          ) : areas.length === 0 ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">No areas found</p>
                <p className="text-xs mt-1">
                  Please add areas on the{' '}
                  <a href="/areas" className="underline font-medium">
                    Areas page
                  </a>{' '}
                  first, then come back here.
                </p>
              </div>
            </div>
          ) : (
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors',
                selectedArea
                  ? 'border-green-500 dark:border-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/50'
                  : 'border-blue-500 dark:border-blue-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50'
              )}
            >
              <option value="">-- Select an Area --</option>
              {areas.map((area: any) => (
                <option key={area._id} value={area.name}>
                  {area.name}
                </option>
              ))}
            </select>
          )}

          {selectedArea && (
            <div className="mt-3 p-3 bg-green-100 dark:bg-green-950/40 border border-green-300 dark:border-green-800 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-300">
                All imported customers will be assigned to:{' '}
                <strong>{selectedArea}</strong>
              </p>
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* REST OF PAGE — only shown after area selected */}
        {/* ============================================ */}
        {!selectedArea ? (
          <div className="bg-gray-50 dark:bg-gray-900/50 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
            <MapPin className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Select an area above to continue
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              The CSV format instructions, sample, and upload will appear here
              once an area is chosen.
            </p>
          </div>
        ) : (
          <>
            {/* ============================================ */}
            {/* STEP 2 — INSTRUCTIONS */}
            {/* ============================================ */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  2
                </div>
                <h2 className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  CSV Format Instructions
                </h2>
              </div>

              <div className="space-y-3 text-sm text-blue-900/80 dark:text-blue-200/80">
                <p>
                  Your CSV file must have these <strong>4 required columns</strong>{' '}
                  at the start, in this exact order:
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {REQUIRED_HEADERS.map((h) => (
                    <span
                      key={h}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded-md font-mono text-xs font-medium"
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <p className="pt-2">
                  You may also include these <strong>optional columns</strong>{' '}
                  after the required ones (in any order):
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {OPTIONAL_HEADERS.map((h) => (
                    <span
                      key={h}
                      className="px-2.5 py-1 bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 rounded-md font-mono text-xs font-medium"
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <div className="pt-3 text-xs space-y-1">
                  <p>
                    <strong>Rules:</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    <li>Column names must match exactly (case-sensitive)</li>
                    <li>
                      <strong>Required:</strong> customerId, name, phone, address
                    </li>
                    <li>
                      <strong>Area is chosen above</strong> — not in the CSV
                    </li>
                    <li>
                      <strong>Optional:</strong> package, discount, monthlyFee,
                      status
                    </li>
                    <li>
                      Missing optional columns default to:{' '}
                      <code className="bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
                        package=&quot;&quot;, discount=0, monthlyFee=0,
                        status=active
                      </code>
                    </li>
                    <li>Duplicate customerId will be skipped</li>
                    <li>
                      Phone numbers missing leading 0 (10 digits) get auto-fixed
                    </li>
                    <li>File size limit: 10 MB</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* ============================================ */}
            {/* SAMPLE CSV PREVIEW */}
            {/* ============================================ */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Sample CSV
                </h2>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySample}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadSample}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                This is what a valid CSV file should look like. Use this exact
                format.
              </p>

              {/* Sample preview table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {[
                        'customerId',
                        'name',
                        'phone',
                        'address',
                        'package',
                        'discount',
                        'monthlyFee',
                        'status',
                      ].map((h) => (
                        <th
                          key={h}
                          className={cn(
                            'px-3 py-2 text-left font-mono font-semibold whitespace-nowrap',
                            REQUIRED_HEADERS.includes(h)
                              ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50'
                              : 'text-gray-600 dark:text-gray-400'
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 font-mono">
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        USR-001
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        John Doe
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        0300-1234567
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        House 5, Street 3
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        BASIC
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        0
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        1500
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        active
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        USR-002
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        Jane Smith
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        0321-9876543
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        Flat B-12, Block 1
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        PREMIUM
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        500
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        3500
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        active
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        USR-003
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        Ahmed Khan
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        0333-5555555
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        Shop 12, Main Market
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        STANDARD
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        0
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        2500
                      </td>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-200 whitespace-nowrap">
                        active
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-blue-100 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800 rounded" />
                  Required
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded" />
                  Optional
                </div>
              </div>

              {/* Raw CSV view */}
              <details className="mt-4 group">
                <summary className="cursor-pointer text-xs text-blue-600 dark:text-blue-400 hover:underline select-none flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  View raw CSV text
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-mono overflow-x-auto text-gray-700 dark:text-gray-300">
                  {SAMPLE_CSV}
                </pre>
              </details>
            </div>

            {/* ============================================ */}
            {/* STEP 3 — UPLOAD ZONE */}
            {/* ============================================ */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  3
                </div>
                <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                  Upload CSV File
                </h2>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setResult(null);
                      }}
                      className="ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 dark:text-gray-400">
                      Drag and drop your CSV file here, or{' '}
                      <span className="text-blue-600 font-medium">browse</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Only .csv files, max 10 MB
                    </p>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={handleUpload}
                  disabled={!file || !selectedArea || isUploading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload & Import
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ============================================ */}
        {/* RESULT */}
        {/* ============================================ */}
        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">
              Import Result
            </h2>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                  Total Rows
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.total}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600 dark:text-green-400 uppercase">
                  Inserted
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {result.inserted}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                <p className="text-xs text-red-600 dark:text-red-400 uppercase">
                  Skipped
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {result.skipped}
                </p>
              </div>
            </div>

            {/* Message */}
            <div
              className={cn(
                'p-3 rounded-lg mb-4 flex items-start gap-2 text-sm',
                result.inserted > 0
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-900'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900'
              )}
            >
              {result.inserted > 0 ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <span>{result.message}</span>
            </div>

            {/* Errors */}
            {result.errors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Errors / Skipped Rows
                </h3>
                <ul className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 text-xs space-y-1 max-h-64 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li
                      key={i}
                      className="text-red-800 dark:text-red-300 font-mono"
                    >
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/app/components/ui/Layout';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { DataTable } from '@/app/components/ui/DataTable';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import api from '@/app/lib/api';
import {
  Calendar,
  Users,
  UserCheck,
  UserX,
  UserMinus,
  CheckCircle,
  XCircle,
  Download,
  FileText,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

// ✅ PDF libs (client-side only)
import jsPDF from 'jspdf';
import autoTable, { RowInput, CellHookData } from 'jspdf-autotable';

export default function AttendancePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);

  // ✅ Monthly report state
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    fetchAllStaff();
    fetchAttendance();
  }, [selectedDate]);

  const fetchAllStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await api.get('/staff');
      if (response.data.success) {
        setAllStaff(response.data.staff);
        setStaffList(response.data.staff);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await api.get(`/attendance?date=${selectedDate}`);
      if (response.data.success) {
        let formattedAttendance = [];

        if (response.data.attendance && response.data.attendance.length > 0) {
          formattedAttendance = response.data.attendance.map((record: any) => ({
            id: record._id,
            staffId: record.staffId?.staffId || 'N/A',
            name: record.staffId?.name || 'Unknown',
            designation: record.staffId?.designation || 'N/A',
            area: record.staffId?.assignedArea?.name || 'N/A',
            status: record.status || 'Absent',
            checkIn: record.checkIn || '---',
            checkOut: record.checkOut || '---',
            remarks: record.remarks || '',
          }));
        } else {
          formattedAttendance = allStaff.map((staff: any) => ({
            id: staff._id,
            staffId: staff.staffId || 'N/A',
            name: staff.name || 'Unknown',
            designation: staff.designation || 'N/A',
            area: staff.assignedArea?.name || 'N/A',
            status: 'Absent',
            checkIn: '---',
            checkOut: '---',
            remarks: 'No record',
          }));
        }
        setAttendance(formattedAttendance);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  // ============ MONTHLY REPORT FETCH ============
  const fetchMonthlyReport = async () => {
    setReportLoading(true);
    try {
      const response = await api.get(
        `/attendance/monthly?month=${reportMonth}`
      );
      if (response.data.success) {
        setReportData(response.data);
      } else {
        toast.error('Failed to load monthly report');
      }
    } catch (error: any) {
      console.error('Error fetching monthly report:', error);
      toast.error(error.response?.data?.message || 'Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  // Auto-load report when month changes
  useEffect(() => {
    if (reportMonth) {
      fetchMonthlyReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportMonth]);

const generateMonthPDF = () => {
  if (!reportData) {
    toast.error('Load a report first');
    return;
  }

  const { year, monthIndex, daysInMonth, staffReports, totals } = reportData;

  const monthName = new Date(year, monthIndex, 1).toLocaleString('en-US', {
    month: 'long',
  });

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // ---- Header ----
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Cable Management System', pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Monthly Attendance Report — ${monthName} ${year}`,
    pageWidth / 2,
    62,
    { align: 'center' }
  );

  doc.setFontSize(10);
  doc.text(
    `Generated: ${new Date().toLocaleString('en-PK')}`,
    pageWidth / 2,
    78,
    { align: 'center' }
  );

  // ---- Summary Box ----
  autoTable(doc, {
    startY: 95,
    head: [['Metric', 'Value']],
    body: [
      ['Total Staff', staffReports.length.toString()],
      ['Days in Month', daysInMonth.toString()],
      ['Total Present Marks', totals.present.toString()],
      ['Total Absent Marks', totals.absent.toString()],
      ['Total Leave Marks', totals.leave.toString()],
      ['Total Half-Day Marks', totals.halfDay.toString()],
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 40, right: pageWidth - 220 },
    tableWidth: 180,
  });

  // ---- Day headers (1..N) ----
  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) =>
    String(i + 1)
  );

  // ✅ Explicitly typed as RowInput[] to avoid union inference issues
  const head: RowInput[] = [
    [
      { content: 'Staff ID', rowSpan: 2, styles: { halign: 'center' } },
      { content: 'Name', rowSpan: 2, styles: { halign: 'center' } },
      { content: 'Designation', rowSpan: 2, styles: { halign: 'center' } },
      { content: 'Area', rowSpan: 2, styles: { halign: 'center' } },
      {
        content: 'Days',
        colSpan: daysInMonth,
        styles: { halign: 'center' },
      },
      { content: 'P', rowSpan: 2, styles: { halign: 'center' } },
      { content: 'A', rowSpan: 2, styles: { halign: 'center' } },
      { content: 'L', rowSpan: 2, styles: { halign: 'center' } },
      { content: 'HD', rowSpan: 2, styles: { halign: 'center' } },
      { content: '%', rowSpan: 2, styles: { halign: 'center' } },
    ],
    dayHeaders.map((d) => ({
      content: d,
      styles: { halign: 'center' as const, fontSize: 7 },
    })),
  ];

  const body = staffReports.map((s: any) => {
    const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
      const status = s.days[i + 1];
      if (!status) return '-';
      if (status === 'Present') return 'P';
      if (status === 'Absent') return 'A';
      if (status === 'Leave') return 'L';
      if (status === 'Half Day') return 'H';
      return '-';
    });

    return [
      s.staffId,
      s.name,
      s.designation,
      s.area,
      ...dayCells,
      s.present.toString(),
      s.absent.toString(),
      s.leave.toString(),
      s.halfDay.toString(),
      `${s.percentage}%`,
    ];
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 15,
    head,
    body,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontSize: 7,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 70 },
      2: { cellWidth: 55 },
      3: { cellWidth: 55 },
    },
    didParseCell: (data: CellHookData) => {
      if (
        data.section === 'body' &&
        data.column.index >= 4 &&
        data.column.index < 4 + daysInMonth
      ) {
        const val = data.cell.raw as string;
        if (val === 'P') {
          data.cell.styles.textColor = [22, 163, 74];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'A') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'L') {
          data.cell.styles.textColor = [202, 138, 4];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'H') {
          data.cell.styles.textColor = [234, 88, 12];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 20, right: 20 },
  });

  // ---- Legend Footer ----
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(
    'Legend:  P = Present   A = Absent   L = Leave   H = Half Day   HD = Half Day Count   % = Attendance %',
    20,
    finalY
  );

  // ---- Save ----
  const fileName = `Attendance_${monthName}_${year}.pdf`;
  doc.save(fileName);
  toast.success(`PDF downloaded: ${fileName}`);
};
  // ============ STATS (daily) ============
  const totalStaff = attendance.length;
  const present = attendance.filter((s) => s.status === 'Present').length;
  const absent = attendance.filter((s) => s.status === 'Absent').length;
  const leave = attendance.filter((s) => s.status === 'Leave').length;

  const transformAttendanceData = (data: any) => ({
    staffId: data.staffId,
    date: data.date || selectedDate,
    status: data.status,
    checkIn: data.checkIn || '',
    checkOut: data.checkOut || '',
    remarks: data.remarks || '',
  });

  const attendanceFields: Field[] = [
    {
      name: 'staffId',
      label: 'Staff Member',
      type: 'select',
      searchable: true, 
      required: true,
      options: staffList.map((s: any) => ({
        label: `${s.staffId} - ${s.name} (${s.designation})`,
        value: s.staffId,
      })),
    },
    {
      name: 'date',
      label: 'Date',
      type: 'date',
      required: true,
      defaultValue: selectedDate,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Present', value: 'Present' },
        { label: 'Absent', value: 'Absent' },
        { label: 'Leave', value: 'Leave' },
        { label: 'Half Day', value: 'Half Day' },
      ],
    },
    { name: 'checkIn', label: 'Check In Time', type: 'text', placeholder: '09:00 AM' },
    { name: 'checkOut', label: 'Check Out Time', type: 'text', placeholder: '06:00 PM' },
    { name: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Additional notes...' },
  ];

  const handleAttendanceMarked = () => {
    toast.success('Attendance marked successfully!');
    fetchAttendance();
    fetchMonthlyReport();
  };

  const filteredAttendance = attendance.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.name?.toLowerCase().includes(query) ||
      member.staffId?.toLowerCase().includes(query)
    );
  });

  const attendanceColumns = [
    { key: 'staffId', header: 'Staff ID' },
    { key: 'name', header: 'Staff Name' },
    { key: 'designation', header: 'Designation' },
    { key: 'area', header: 'Area' },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => (
        <span
          className={cn(
            'px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit',
            item.status === 'Present' &&
              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            item.status === 'Absent' &&
              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            item.status === 'Leave' &&
              'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            item.status === 'Half Day' &&
              'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
          )}
        >
          {item.status === 'Present' && <CheckCircle className="h-3 w-3" />}
          {item.status === 'Absent' && <XCircle className="h-3 w-3" />}
          {item.status === 'Leave' && <UserMinus className="h-3 w-3" />}
          {item.status}
        </span>
      ),
    },
    {
      key: 'checkIn',
      header: 'Check In',
      render: (item: any) => (
        <span
          className={cn(
            'font-mono',
            item.checkIn !== '---'
              ? 'text-green-600 dark:text-green-400'
              : 'text-gray-400'
          )}
        >
          {item.checkIn}
        </span>
      ),
    },
    {
      key: 'checkOut',
      header: 'Check Out',
      render: (item: any) => (
        <span
          className={cn(
            'font-mono',
            item.checkOut !== '---'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-400'
          )}
        >
          {item.checkOut}
        </span>
      ),
    },
    { key: 'remarks', header: 'Remarks' },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
              <Calendar className="h-6 w-6 text-blue-600" />
              Daily Staff Attendance
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mark daily attendance, check-in/check-out time, and staff working status.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/25"
            >
              <UserCheck className="h-4 w-4" />
              Mark Attendance
            </button>
          </div>
        </div>

        {/* Daily Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL STAFF</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalStaff}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Registered staff
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">PRESENT</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {present}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  On duty today
                </p>
              </div>
              <div className="h-12 w-12 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">ABSENT</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {absent}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Not present
                </p>
              </div>
              <div className="h-12 w-12 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">LEAVE</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                  {leave}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Approved leave
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-50 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <UserMinus className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* ✅ MONTHLY ATTENDANCE REPORT SECTION */}
        {/* ============================================ */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              Monthly Attendance Report
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
              <button
                onClick={fetchMonthlyReport}
                disabled={reportLoading}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {reportLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                Load
              </button>
              <button
                onClick={generateMonthPDF}
                disabled={!reportData}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Generate PDF
              </button>
            </div>
          </div>

          <div className="p-4">
            {reportLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : !reportData ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                Select a month and click <strong>Load</strong> to generate the report.
              </div>
            ) : (
              <>
                {/* Report Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400 uppercase">
                      Total Staff
                    </p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                      {reportData.staffReports.length}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-600 dark:text-green-400 uppercase">
                      Total Present
                    </p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-300">
                      {reportData.totals.present}
                    </p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400 uppercase">
                      Total Absent
                    </p>
                    <p className="text-xl font-bold text-red-700 dark:text-red-300">
                      {reportData.totals.absent}
                    </p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 uppercase">
                      Total Leave
                    </p>
                    <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                      {reportData.totals.leave}
                    </p>
                  </div>
                </div>

                {/* Per-Staff Summary Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                        <th className="py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                          Staff ID
                        </th>
                        <th className="py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                          Name
                        </th>
                        <th className="py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                          Designation
                        </th>
                        <th className="py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">
                          Area
                        </th>
                        <th className="py-2 px-3 text-center text-green-600 dark:text-green-400 font-medium">
                          Present
                        </th>
                        <th className="py-2 px-3 text-center text-red-600 dark:text-red-400 font-medium">
                          Absent
                        </th>
                        <th className="py-2 px-3 text-center text-yellow-600 dark:text-yellow-400 font-medium">
                          Leave
                        </th>
                        <th className="py-2 px-3 text-center text-orange-600 dark:text-orange-400 font-medium">
                          Half Day
                        </th>
                        <th className="py-2 px-3 text-center text-gray-600 dark:text-gray-400 font-medium">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.staffReports.map((s: any, idx: number) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        >
                          <td className="py-2 px-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                            {s.staffId}
                          </td>
                          <td className="py-2 px-3 text-gray-900 dark:text-white font-medium">
                            {s.name}
                          </td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400 text-xs">
                            {s.designation}
                          </td>
                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400 text-xs">
                            {s.area}
                          </td>
                          <td className="py-2 px-3 text-center text-green-600 dark:text-green-400 font-semibold">
                            {s.present}
                          </td>
                          <td className="py-2 px-3 text-center text-red-600 dark:text-red-400 font-semibold">
                            {s.absent}
                          </td>
                          <td className="py-2 px-3 text-center text-yellow-600 dark:text-yellow-400 font-semibold">
                            {s.leave}
                          </td>
                          <td className="py-2 px-3 text-center text-orange-600 dark:text-orange-400 font-semibold">
                            {s.halfDay}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full text-xs font-semibold',
                                s.percentage >= 90 &&
                                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                s.percentage >= 75 &&
                                  s.percentage < 90 &&
                                  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                                s.percentage >= 50 &&
                                  s.percentage < 75 &&
                                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                                s.percentage < 50 &&
                                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              )}
                            >
                              {s.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* DAILY ATTENDANCE SECTION */}
        {/* ============================================ */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="flex-1">
            <SearchBar
              placeholder="Search staff name or ID..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Daily Attendance List
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredAttendance.length} staff found
            </span>
          </div>
          <div className="p-4">
            <DataTable
              data={filteredAttendance}
              columns={attendanceColumns}
              accordionTitle="name"
              accordionSubtitle="staffId"
              emptyMessage="No staff found. Please add staff members first."
            />
          </div>
        </div>

        {/* Mark Attendance Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleAttendanceMarked}
          title="Mark Attendance"
          subtitle="Record daily attendance for staff"
          fields={attendanceFields}
          submitLabel="Mark Attendance"
          color="blue"
          endpoint="/attendance"
          transformData={transformAttendanceData}
        />
      </div>
    </Layout>
  );
}
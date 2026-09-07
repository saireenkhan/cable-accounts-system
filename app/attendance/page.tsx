'use client';

import React, { useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { SearchBar } from '@/app/components/ui/SearchBar';
import { DataTable } from '@/app/components/ui/DataTable';
import { AddUserModal, Field } from '@/app/components/modals/AddUserModal';
import { 
  Calendar, 
  Users, 
  UserCheck, 
  UserX, 
  UserMinus,
  CheckCircle,
  XCircle,
  Download
} from 'lucide-react';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-09-05');
  const [attendance, setAttendance] = useState([
    {
      id: 1,
      staffId: 'ST-001',
      name: 'Recovery Operator',
      designation: 'Collector',
      area: 'Gulshan Block 1',
      status: 'Present',
      checkIn: '09:02 AM',
      checkOut: '06:05 PM',
      remarks: '',
    },
    {
      id: 2,
      staffId: 'ST-002',
      name: 'Kamran Ali',
      designation: 'Technician',
      area: 'Model Colony',
      status: 'Present',
      checkIn: '09:15 AM',
      checkOut: '---',
      remarks: 'Field duty',
    },
    {
      id: 3,
      staffId: 'ST-003',
      name: 'Imran Shah',
      designation: 'Collector',
      area: 'Green Town',
      status: 'Absent',
      checkIn: '---',
      checkOut: '---',
      remarks: 'No show',
    },
    {
      id: 4,
      staffId: 'ST-004',
      name: 'Saad Ahmed',
      designation: 'Supervisor',
      area: 'New Market',
      status: 'Present',
      checkIn: '08:55 AM',
      checkOut: '06:10 PM',
      remarks: '',
    },
    {
      id: 5,
      staffId: 'ST-005',
      name: 'Hina Raza',
      designation: 'Accounts Operator',
      area: 'Gulshan Block 1',
      status: 'Present',
      checkIn: '09:00 AM',
      checkOut: '05:45 PM',
      remarks: '',
    },
    {
      id: 6,
      staffId: 'ST-006',
      name: 'Bilal Hussain',
      designation: 'Technician',
      area: 'Model Colony',
      status: 'Leave',
      checkIn: '---',
      checkOut: '---',
      remarks: 'Approved leave',
    },
  ]);

  const [history] = useState([
    { date: '04 Sep 2026', total: 6, present: 5, absent: 1, leave: 0, percentage: 83.3 },
    { date: '03 Sep 2026', total: 6, present: 5, absent: 0, leave: 1, percentage: 83.3 },
    { date: '02 Sep 2026', total: 6, present: 4, absent: 1, leave: 1, percentage: 66.7 },
  ]);

  const totalStaff = attendance.length;
  const present = attendance.filter(s => s.status === 'Present').length;
  const absent = attendance.filter(s => s.status === 'Absent').length;
  const leave = attendance.filter(s => s.status === 'Leave').length;

  // Attendance fields for modal
  const attendanceFields: Field[] = [
    { 
      name: 'staffId', 
      label: 'Staff Member', 
      type: 'select', 
      required: true, 
      options: [
        { label: 'ST-001 - Recovery Operator (Collector)', value: 'ST-001' },
        { label: 'ST-002 - Kamran Ali (Technician)', value: 'ST-002' },
        { label: 'ST-003 - Imran Shah (Collector)', value: 'ST-003' },
        { label: 'ST-004 - Saad Ahmed (Supervisor)', value: 'ST-004' },
        { label: 'ST-005 - Hina Raza (Accounts Operator)', value: 'ST-005' },
        { label: 'ST-006 - Bilal Hussain (Technician)', value: 'ST-006' },
      ]
    },
    { name: 'date', label: 'Date', type: 'date', required: true },
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
      ]
    },
    { name: 'checkIn', label: 'Check In Time', type: 'text', placeholder: '09:00 AM' },
    { name: 'checkOut', label: 'Check Out Time', type: 'text', placeholder: '06:00 PM' },
    { name: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Additional notes...' },
  ];

  const handleAttendanceMarked = (data: any) => {
    // Staff mapping for names
    const staffMap: Record<string, { name: string; designation: string; area: string }> = {
      'ST-001': { name: 'Recovery Operator', designation: 'Collector', area: 'Gulshan Block 1' },
      'ST-002': { name: 'Kamran Ali', designation: 'Technician', area: 'Model Colony' },
      'ST-003': { name: 'Imran Shah', designation: 'Collector', area: 'Green Town' },
      'ST-004': { name: 'Saad Ahmed', designation: 'Supervisor', area: 'New Market' },
      'ST-005': { name: 'Hina Raza', designation: 'Accounts Operator', area: 'Gulshan Block 1' },
      'ST-006': { name: 'Bilal Hussain', designation: 'Technician', area: 'Model Colony' },
    };

    const staff = staffMap[data.staffId];
    const newAttendance = {
      id: Date.now(),
      staffId: data.staffId,
      name: staff?.name || '',
      designation: staff?.designation || '',
      area: staff?.area || '',
      status: data.status,
      checkIn: data.checkIn || '---',
      checkOut: data.checkOut || '---',
      remarks: data.remarks || '',
    };
    setAttendance([newAttendance, ...attendance]);
    toast.success(`Attendance marked for ${staff?.name}`);
  };

  const filteredAttendance = attendance.filter(member => {
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.staffId.toLowerCase().includes(query)
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
        <span className={cn(
          'px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit',
          item.status === 'Present' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          item.status === 'Absent' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          item.status === 'Leave' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          item.status === 'Half Day' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        )}>
          {item.status === 'Present' && <CheckCircle className="h-3 w-3" />}
          {item.status === 'Absent' && <XCircle className="h-3 w-3" />}
          {item.status === 'Leave' && <UserMinus className="h-3 w-3" />}
          {item.status}
        </span>
      )
    },
    { 
      key: 'checkIn', 
      header: 'Check In',
      render: (item: any) => (
        <span className={cn(
          'font-mono',
          item.checkIn !== '---' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
        )}>
          {item.checkIn}
        </span>
      )
    },
    { 
      key: 'checkOut', 
      header: 'Check Out',
      render: (item: any) => (
        <span className={cn(
          'font-mono',
          item.checkOut !== '---' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
        )}>
          {item.checkOut}
        </span>
      )
    },
    { key: 'remarks', header: 'Remarks' },
  ];

  const historyColumns = [
    { key: 'date', header: 'Date' },
    { key: 'total', header: 'Total Staff' },
    { key: 'present', header: 'Present' },
    { key: 'absent', header: 'Absent' },
    { key: 'leave', header: 'Leave' },
    { 
      key: 'percentage', 
      header: 'Attendance %',
      render: (item: any) => (
        <span className={cn(
          'font-semibold',
          item.percentage >= 80 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
        )}>
          {item.percentage}%
        </span>
      )
    },
  ];

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
            <button
              onClick={() => toast.success('Downloading report...')}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">TOTAL STAFF</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalStaff}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Registered staff</p>
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
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{present}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">On duty today</p>
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
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{absent}</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">Not present</p>
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
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{leave}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Approved leave</p>
              </div>
              <div className="h-12 w-12 bg-yellow-50 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <UserMinus className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Date Selector + Search */}
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

        {/* Attendance Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Attendance List</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">{filteredAttendance.length} staff found</span>
          </div>
          <div className="p-4">
            <DataTable
              data={filteredAttendance}
              columns={attendanceColumns}
              accordionTitle="name"
              accordionSubtitle="staffId"
              emptyMessage="No staff found matching your search"
            />
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Attendance History</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">Recent daily attendance summary</span>
          </div>
          <div className="p-4">
            <DataTable
              data={history}
              columns={historyColumns}
              emptyMessage="No history found"
            />
          </div>
        </div>

        {/* Mark Attendance Modal - Using AddUserModal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleAttendanceMarked}
          title="Mark Attendance"
          subtitle="Record daily attendance for staff"
          fields={attendanceFields}
          submitLabel="Mark Attendance"
          color="blue"
        />
      </div>
    </Layout>
  );
}
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import api from '@/app/lib/api';
import toast from 'react-hot-toast';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Lock,
  Save,
  Camera,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
  Building2,
} from 'lucide-react';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [user, setUser] = useState<any>(null);

  // Profile form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Show/hide password
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Current-password verification state
  const [verifyingCurrent, setVerifyingCurrent] = useState(false);
  const [currentValid, setCurrentValid] = useState<null | boolean>(null);
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Password change success state
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Company name
  const [companyName, setCompanyName] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem('companyName');
    if (stored) setCompanyName(stored);
  }, []);

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me');
      if (data.success && data.user) {
        setUser(data.user);
        setName(data.user.name || '');
        setPhone(data.user.phone || '');
        setAddress(data.user.address || '');
        sessionStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('user-updated'));
      }
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const { data } = await api.put('/auth/me', { name, phone, address });
      if (data.success) {
        setUser(data.user);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('user-updated'));
        toast.success('Profile updated');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const checkCurrentPassword = (value: string) => {
    setCurrentPassword(value);
    setCurrentValid(null);

    if (verifyTimeoutRef.current) clearTimeout(verifyTimeoutRef.current);

    if (!value) return;

    verifyTimeoutRef.current = setTimeout(async () => {
      try {
        setVerifyingCurrent(true);
        const { data } = await api.post('/auth/verify-password', {
          password: value,
        });
        setCurrentValid(!!data.success);
      } catch {
        setCurrentValid(false);
      } finally {
        setVerifyingCurrent(false);
      }
    }, 500);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill all password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (currentValid === false) {
      toast.error('Current password is incorrect');
      return;
    }

    try {
      setSavingPassword(true);
      await api.put('/auth/password', { currentPassword, newPassword });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentValid(null);

      setPasswordChanged(true);
      toast.success('Password changed successfully!');

      setTimeout(() => {
        setPasswordChanged(false);
      }, 5000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = companyName.trim();
    if (!trimmed) {
      toast.error('Company name cannot be empty');
      return;
    }

    try {
      setSavingCompany(true);
      sessionStorage.setItem('companyName', trimmed);
      window.dispatchEvent(new Event('company-updated'));
      setCompanySaved(true);
      toast.success('Company name updated');

      setTimeout(() => setCompanySaved(false), 3000);
    } finally {
      setSavingCompany(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      try {
        setUploadingAvatar(true);
        const { data } = await api.put('/auth/avatar', { avatar: dataUrl });
        if (data.success) {
          const updated = { ...user, avatar: data.avatar };
          setUser(updated);
          sessionStorage.setItem('user', JSON.stringify(updated));
          window.dispatchEvent(new Event('user-updated'));
          toast.success('Profile picture updated');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to upload image');
      } finally {
        setUploadingAvatar(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  const initial = (user?.name || 'A').trim().charAt(0).toUpperCase();
  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserIcon className="h-6 w-6 text-blue-600" />
            My Profile
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your account details and password.
          </p>
        </div>

        {/* Avatar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="avatar"
                  className="h-20 w-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  {initial}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 p-2 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 disabled:opacity-60"
                title="Change picture"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarChange}
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {user?.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {user?.email}
              </p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">
                Role: {user?.role}
              </p>
            </div>
          </div>
        </div>

        {/* Company Settings */}
        <form
          onSubmit={handleSaveCompany}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company Settings
          </h3>

          {companySaved && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-green-700 dark:text-green-300">
                Company name updated. It now appears in the header.
              </p>
            </div>
          )}

          <Field
            icon={<Building2 className="h-4 w-4" />}
            label="Company / Brand Name (shown in header)"
            value={companyName}
            onChange={setCompanyName}
            placeholder="Cable Management System"
          />

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingCompany}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {savingCompany ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Company Name
            </button>
          </div>
        </form>

        {/* Profile form */}
        <form
          onSubmit={handleSaveProfile}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Personal Information
          </h3>

          <Field
            icon={<UserIcon className="h-4 w-4" />}
            label="Full Name"
            value={name}
            onChange={setName}
          />

          <Field
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={phone}
            onChange={setPhone}
            placeholder="03XX-XXXXXXX"
          />

          <Field
            icon={<MapPin className="h-4 w-4" />}
            label="Address"
            value={address}
            onChange={setAddress}
            placeholder="Optional"
          />

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              User ID (read-only)
            </label>
            <input
              value={user?._id || ''}
              readOnly
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {savingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </form>

        {/* Password form */}
        <form
          onSubmit={handleChangePassword}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Change Password
          </h3>

          {passwordChanged && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                  Password changed successfully!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Your new password is now active. You&apos;ll stay logged in.
                </p>
              </div>
            </div>
          )}

          <PasswordField
            icon={<Lock className="h-4 w-4" />}
            label="Current Password"
            value={currentPassword}
            onChange={checkCurrentPassword}
            show={showCurrent}
            toggleShow={() => setShowCurrent((v) => !v)}
            status={
              verifyingCurrent
                ? 'checking'
                : currentValid === true
                ? 'valid'
                : currentValid === false
                ? 'invalid'
                : 'idle'
            }
          />

          <PasswordField
            icon={<Lock className="h-4 w-4" />}
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            toggleShow={() => setShowNew((v) => !v)}
            status={
              newPassword.length > 0
                ? newPassword.length >= 6
                  ? 'valid'
                  : 'invalid'
                : 'idle'
            }
          />

          <PasswordField
            icon={<Lock className="h-4 w-4" />}
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            toggleShow={() => setShowConfirm((v) => !v)}
            status={
              confirmPassword.length > 0
                ? passwordsMatch
                  ? 'valid'
                  : 'invalid'
                : 'idle'
            }
          />

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPassword}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {savingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

/* ---------- Helpers ---------- */

function Field({
  icon,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
      />
    </div>
  );
}

function PasswordField({
  icon,
  label,
  value,
  onChange,
  show,
  toggleShow,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggleShow: () => void;
  status: 'idle' | 'checking' | 'valid' | 'invalid';
}) {
  const borderClass =
    status === 'valid'
      ? 'border-green-500 focus:ring-green-500'
      : status === 'invalid'
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500';

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 pr-20 rounded-lg border bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 outline-none transition-colors ${borderClass}`}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {status === 'checking' && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
          {status === 'valid' && <Check className="h-4 w-4 text-green-500" />}
          {status === 'invalid' && <X className="h-4 w-4 text-red-500" />}
          <button
            type="button"
            onClick={toggleShow}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            tabIndex={-1}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
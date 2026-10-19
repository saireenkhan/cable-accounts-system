
'use client';

import React, { useEffect, useRef, useState } from 'react';
import MasterShell from '@/app/components/ui/MasterShell';
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
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

type MasterUser = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  avatar?: string;
};

async function masterApi(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  payload?: Record<string, unknown>
) {
  const token = localStorage.getItem('sr_master_token');

  if (!token) {
    throw new Error('Master session not found. Please log in again.');
  }

  const response = await fetch(`${API}/master${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export default function MasterProfilePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MasterUser | null>(null);

  // Personal information
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Loading states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Password verification
  const [verifyingCurrent, setVerifyingCurrent] = useState(false);
  const [currentValid, setCurrentValid] = useState<boolean | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const verifyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verifyVersionRef = useRef(0);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const data = await masterApi('/me');

        if (!active) return;

        const master = data.user as MasterUser;

        setUser(master);
        setName(master.name || '');
        setPhone(master.phone || '');
        setAddress(master.address || '');
      } catch (error: any) {
        if (active) {
          toast.error(error.message || 'Failed to load Master Profile');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      active = false;
      verifyVersionRef.current += 1;

      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current);
      }
    };
  }, []);

  const updateUser = (updated: MasterUser) => {
    setUser(updated);

    window.dispatchEvent(new Event('master-user-updated'));
  };

  // ========================================
  // SAVE PERSONAL INFORMATION
  // ========================================
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Full name is required');
      return;
    }

    try {
      setSavingProfile(true);

      const data = await masterApi('/me', 'PUT', {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });

      updateUser(data.user);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // ========================================
  // VERIFY CURRENT PASSWORD
  // ========================================
  const checkCurrentPassword = (value: string) => {
    setCurrentPassword(value);
    setCurrentValid(null);
    setVerifyingCurrent(false);

    verifyVersionRef.current += 1;
    const version = verifyVersionRef.current;

    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
    }

    if (!value) return;

    verifyTimeoutRef.current = setTimeout(async () => {
      if (version !== verifyVersionRef.current) return;

      try {
        setVerifyingCurrent(true);

        await masterApi('/verify-password', 'POST', {
          password: value,
        });

        if (version === verifyVersionRef.current) {
          setCurrentValid(true);
        }
      } catch {
        if (version === verifyVersionRef.current) {
          setCurrentValid(false);
        }
      } finally {
        if (version === verifyVersionRef.current) {
          setVerifyingCurrent(false);
        }
      }
    }, 500);
  };

  // ========================================
  // CHANGE PASSWORD
  // ========================================
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

      await masterApi('/password', 'PUT', {
        currentPassword,
        newPassword,
      });

      verifyVersionRef.current += 1;

      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current);
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentValid(null);
      setPasswordChanged(true);

      toast.success('Password changed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  // ========================================
  // UPLOAD PROFILE PICTURE
  // ========================================
  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ) {
      toast.error('Please select a JPG, PNG or WebP image');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    try {
      setUploadingAvatar(true);

      const avatar = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read image'));

        reader.readAsDataURL(file);
      });

      const data = await masterApi('/avatar', 'PUT', {
        avatar,
      });

      if (user) {
        updateUser({
          ...user,
          avatar: data.avatar,
        });
      }

      toast.success('Profile picture updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload picture');
    } finally {
      setUploadingAvatar(false);

      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  };

  const initial = (user?.name || 'M')
    .trim()
    .charAt(0)
    .toUpperCase();

  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  if (loading) {
    return (
      <MasterShell>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#d6b138]" />
        </div>
      </MasterShell>
    );
  }

  return (
    <MasterShell>
      <div className="mx-auto max-w-3xl space-y-6">

        {/* PAGE HEADER */}
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <UserIcon className="h-6 w-6 text-[#d6b138]" />
            My Profile
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your Master account details and password.
          </p>
        </div>

        {!user ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            Unable to load Master Profile.
          </div>
        ) : (
          <>
            {/* PROFILE PICTURE */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-5">
                <div className="relative">

                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Profile avatar"
                      className="h-20 w-20 rounded-full border-2 border-gray-200 object-cover dark:border-gray-700"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#d6b138] text-2xl font-bold text-gray-900">
                      {initial}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 rounded-full bg-[#d6b138] p-2 text-gray-900 shadow-lg hover:bg-[#f7ce48] disabled:opacity-60"
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
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={handleAvatarChange}
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                    {user.name}
                  </h2>

                  <p className="flex items-center gap-1.5 truncate text-sm text-gray-500 dark:text-gray-400">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </p>

                  <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">
                    Role: {user.role}
                  </p>
                </div>
              </div>
            </div>

            {/* PERSONAL INFORMATION */}
            <form
              onSubmit={handleSaveProfile}
              className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
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
                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Shield className="h-3.5 w-3.5" />
                  User ID (read-only)
                </label>

                <input
                  value={user.id || user._id || ''}
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-2 rounded-lg bg-[#d6b138] px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-[#f7ce48] disabled:opacity-60"
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

            {/* CHANGE PASSWORD */}
            <form
              onSubmit={handleChangePassword}
              className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <Lock className="h-4 w-4" />
                Change Password
              </h3>

              {passwordChanged && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
                  <Check className="h-5 w-5" />
                  Password changed successfully!
                </div>
              )}

              <PasswordField
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
                label="New Password"
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                toggleShow={() => setShowNew((v) => !v)}
                status={
                  !newPassword
                    ? 'idle'
                    : newPassword.length >= 6
                    ? 'valid'
                    : 'invalid'
                }
              />

              <PasswordField
                label="Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirm}
                toggleShow={() => setShowConfirm((v) => !v)}
                status={
                  !confirmPassword
                    ? 'idle'
                    : passwordsMatch
                    ? 'valid'
                    : 'invalid'
                }
              />

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPassword || verifyingCurrent}
                  className="flex items-center gap-2 rounded-lg bg-[#d6b138] px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-[#f7ce48] disabled:opacity-60"
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
          </>
        )}
      </div>
    </MasterShell>
  );
}

// ============================================
// REUSABLE TEXT FIELD
// ============================================
function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
        {icon}
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#d6b138] dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />
    </div>
  );
}

// ============================================
// REUSABLE PASSWORD FIELD
// ============================================
function PasswordField({
  label,
  value,
  onChange,
  show,
  toggleShow,
  status,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  toggleShow: () => void;
  status: 'idle' | 'checking' | 'valid' | 'invalid';
}) {
  const borderClass =
    status === 'valid'
      ? 'border-green-500'
      : status === 'invalid'
      ? 'border-red-500'
      : 'border-gray-300 dark:border-gray-600';

  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
        <Lock className="h-3.5 w-3.5" />
        {label}
      </label>

      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border bg-white px-3 py-2 pr-20 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#d6b138] dark:bg-gray-900 dark:text-white ${borderClass}`}
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {status === 'checking' && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}

          {status === 'valid' && (
            <Check className="h-4 w-4 text-green-500" />
          )}

          {status === 'invalid' && (
            <X className="h-4 w-4 text-red-500" />
          )}

          <button
            type="button"
            onClick={toggleShow}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

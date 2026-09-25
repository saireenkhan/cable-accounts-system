'use client';

import React, { useEffect, useState } from 'react';
import Layout from '@/app/components/ui/Layout';
import { DataTable } from '@/app/components/ui/DataTable';
import api from '@/app/lib/api';
import { cn } from '@/app/lib/utils';
import toast from 'react-hot-toast';
import {
  MessageCircle,
  Settings,
  Save,
  RefreshCw,
  Phone,
  User,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

type Config = {
  _id?: string;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string;
  apiVersion: string;
  isActive: boolean;
  autoReplyEnabled: boolean;
  expiryLookupRequiresPhoneMatch: boolean;
  greetingMessage: string;
  helpMessage: string;
  fallbackMessage: string;
  expiryAskIdMessage: string;
  expiryNotFoundMessage: string;
};

type WaMessage = {
  _id: string;
  phone: string;
  direction: 'in' | 'out';
  body: string;
  intent?: string;
  status?: string;
  createdAt: string;
};

const DEFAULT_CONFIG: Config = {
  phoneNumberId: '',
  businessAccountId: '',
  accessToken: '',
  verifyToken: '',
  appSecret: '',
  apiVersion: 'v21.0',
  isActive: true,
  autoReplyEnabled: true,
  expiryLookupRequiresPhoneMatch: true,
  greetingMessage: '',
  helpMessage: '',
  fallbackMessage: '',
  expiryAskIdMessage: '',
  expiryNotFoundMessage: '',
};

export default function WhatsAppPage() {
  const [tab, setTab] = useState<'settings' | 'messages'>('settings');
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/whatsapp/webhook`
      : '/api/whatsapp/webhook';

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/whatsapp/config');
      if (data.success) setConfig({ ...DEFAULT_CONFIG, ...data.config });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load config');
    }
  };

  const fetchMessages = async () => {
    try {
      const { data } = await api.get('/whatsapp/messages?limit=100');
      if (data.success) setMessages(data.messages || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load messages');
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchConfig(), fetchMessages()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data } = await api.put('/whatsapp/config', config);
      if (data.success) {
        toast.success('Settings saved');
        setConfig({ ...DEFAULT_CONFIG, ...data.config });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    setRefreshing(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const updateField = <K extends keyof Config>(key: K, value: Config[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

const messageColumns: any[] = [
    {
      key: 'direction',
      header: '',
      render: (m: WaMessage) => (
        <span
          className={cn(
            'inline-flex items-center justify-center h-7 w-7 rounded-full',
            m.direction === 'in'
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
          )}
        >
          {m.direction === 'in' ? (
            <ArrowDownLeft className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5" />
          )}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (m: WaMessage) => (
        <span className="font-mono text-xs">{m.phone}</span>
      ),
    },
    {
      key: 'body',
      header: 'Message',
      render: (m: WaMessage) => (
        <span className="line-clamp-2 text-sm">{m.body || '—'}</span>
      ),
    },
    {
      key: 'intent',
      header: 'Intent',
      render: (m: WaMessage) =>
        m.intent ? (
          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {m.intent}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'createdAt',
      header: 'Time',
      render: (m: WaMessage) => (
        <span className="text-xs text-gray-500">
          {new Date(m.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d6b138]" />
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
              <MessageCircle className="h-6 w-6 text-green-600" />
              WhatsApp Bot
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Auto-reply settings and conversation log.
            </p>
          </div>
        </div>

        {/* Webhook URL Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4 text-[#d6b138]" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Webhook URL (paste this in Meta)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
              {webhookUrl}
            </code>
            <button
              onClick={() => handleCopy(webhookUrl)}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-[#d6b138] hover:bg-[#f7ce48] text-gray-900"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Verify token: <code className="font-mono">{config.verifyToken || '(set below first)'}</code>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setTab('settings')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === 'settings'
                ? 'border-[#d6b138] text-[#d6b138]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <Settings className="h-4 w-4 inline-block mr-1.5" />
            Settings
          </button>
          <button
            onClick={() => setTab('messages')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === 'messages'
                ? 'border-[#d6b138] text-[#d6b138]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            <MessageCircle className="h-4 w-4 inline-block mr-1.5" />
            Messages ({messages.length})
          </button>
        </div>

        {tab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Credentials */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Meta Credentials
              </h3>

              <Field
                label="Phone Number ID"
                value={config.phoneNumberId}
                onChange={(v) => updateField('phoneNumberId', v)}
              />
              <Field
                label="WhatsApp Business Account ID"
                value={config.businessAccountId}
                onChange={(v) => updateField('businessAccountId', v)}
              />
              <Field
                label="Access Token"
                value={config.accessToken}
                onChange={(v) => updateField('accessToken', v)}
                type="password"
              />
              <Field
                label="App Secret"
                value={config.appSecret}
                onChange={(v) => updateField('appSecret', v)}
                type="password"
              />
              <Field
                label="Verify Token"
                value={config.verifyToken}
                onChange={(v) => updateField('verifyToken', v)}
              />
              <Field
                label="API Version"
                value={config.apiVersion}
                onChange={(v) => updateField('apiVersion', v)}
              />
            </div>

            {/* Toggles & Messages */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Behavior
              </h3>

              <Toggle
                label="Bot Active"
                checked={config.isActive}
                onChange={(v) => updateField('isActive', v)}
              />
              <Toggle
                label="Auto-Reply Enabled"
                checked={config.autoReplyEnabled}
                onChange={(v) => updateField('autoReplyEnabled', v)}
              />
              <Toggle
                label="Require Phone Match on Expiry Lookup"
                checked={config.expiryLookupRequiresPhoneMatch}
                onChange={(v) => updateField('expiryLookupRequiresPhoneMatch', v)}
              />

              <h3 className="font-semibold text-gray-900 dark:text-white pt-4">
                Message Templates
              </h3>

              <TextArea
                label="Greeting"
                value={config.greetingMessage}
                onChange={(v) => updateField('greetingMessage', v)}
              />
              <TextArea
                label="Help Menu"
                value={config.helpMessage}
                onChange={(v) => updateField('helpMessage', v)}
              />
              <TextArea
                label="Fallback"
                value={config.fallbackMessage}
                onChange={(v) => updateField('fallbackMessage', v)}
              />
              <TextArea
                label="Expiry — Ask for ID"
                value={config.expiryAskIdMessage}
                onChange={(v) => updateField('expiryAskIdMessage', v)}
              />
              <TextArea
                label="Expiry — Not Found"
                value={config.expiryNotFoundMessage}
                onChange={(v) => updateField('expiryNotFoundMessage', v)}
              />
            </div>

            {/* Save */}
            <div className="lg:col-span-2 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#d6b138] hover:bg-[#f7ce48] disabled:opacity-60 text-gray-900 rounded-lg text-sm font-medium"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}

        {tab === 'messages' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Conversation Log
              </h3>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <RefreshCw
                  className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')}
                />
                Refresh
              </button>
            </div>
            <div className="p-4">
              <DataTable
                data={messages}
                columns={messageColumns}
                emptyMessage="No messages yet. Send a WhatsApp message to your bot to see it here."
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

/* ---------- Small helper components ---------- */

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#d6b138] focus:border-transparent outline-none"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#d6b138] focus:border-transparent outline-none resize-y"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-[#d6b138]' : 'bg-gray-300 dark:bg-gray-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow',
            checked && 'translate-x-5'
          )}
        />
      </button>
    </label>
  );
}
'use client';

import Layout from '@/app/components/ui/Layout';

export default function PrivacyPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: September 2026
          </p>
        </div>

        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4 text-gray-700 dark:text-gray-300">
          <p>
            Smart Recovery operates the cable management system at
            cable-accounts-system.vercel.app. This page explains how we
            collect, use, and protect your information.
          </p>

          <h2 className="font-semibold text-lg text-gray-900 dark:text-white pt-2">
            Information We Collect
          </h2>
          <p>
            We collect the information you provide when registering a
            customer account: name, phone number, address, area, and package
            details. When you message us on WhatsApp, we store your phone
            number and message content to provide customer support.
          </p>

          <h2 className="font-semibold text-lg text-gray-900 dark:text-white pt-2">
            How We Use It
          </h2>
          <p>
            We use your information to manage your cable subscription, send
            billing reminders, respond to WhatsApp queries, and provide
            customer support. We do not sell or share your data with third
            parties.
          </p>

          <h2 className="font-semibold text-lg text-gray-900 dark:text-white pt-2">
            Data Deletion
          </h2>
          <p>
            To request deletion of your data, contact us at
            adnan@comsol.net.pk. We will process your request within 7
            business days.
          </p>

          <h2 className="font-semibold text-lg text-gray-900 dark:text-white pt-2">
            Contact
          </h2>
          <p>For questions about this policy, email adnan@comsol.net.pk.</p>
        </section>
      </div>
    </Layout>
  );
}
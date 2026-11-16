
'use client';

import { useEffect, useState } from 'react';

type CompanyTheme = 'original' | 'blue-black' | 'green-black';

const API = (
  process.env.NEXT_PUBLIC_API_URL || '/api'
).replace(/\/$/, '');

function validTheme(value: unknown): CompanyTheme {
  if (value === 'blue-black' || value === 'green-black') {
    return value;
  }

  return 'original';
}

function getAccountCacheKey(): string | null {
  try {
    const raw = sessionStorage.getItem('user');
    if (!raw) return null;

    const user = JSON.parse(raw);

    const accountId =
      user.tenantId?._id ||
      user.tenantId ||
      user._id ||
      user.id ||
      user.email;

    if (!accountId || typeof accountId !== 'string') {
      return null;
    }

    return `sr_theme_account_${accountId}`;
  } catch {
    return null;
  }
}

function applyTheme(theme: CompanyTheme) {
  document.documentElement.setAttribute(
    'data-sr-theme',
    theme
  );
}

export default function TenantCompanyThemeSync({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let hasTheme = false;

    const cacheKey = getAccountCacheKey();

    // Restore this authenticated account's previous theme.
    // Do NOT reset to Original on every navigation.
    if (cacheKey) {
      const cached = sessionStorage.getItem(cacheKey);

      if (
        cached === 'original' ||
        cached === 'blue-black' ||
        cached === 'green-black'
      ) {
        applyTheme(cached);
        hasTheme = true;
        setReady(true);
      }
    }

    async function syncTheme() {
      try {
        const token =
          sessionStorage.getItem('token') ||
          sessionStorage.getItem('sr_token') ||
          localStorage.getItem('token');

        if (!token) {
          throw new Error('Tenant session not found');
        }

        const response = await fetch(
          `${API}/tenant/theme/current`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          }
        );

        if (!response.ok) {
          throw new Error(
            `Theme API error: ${response.status}`
          );
        }

        const data = await response.json();

        if (data.success !== true) {
          throw new Error('Theme response unsuccessful');
        }

        if (cancelled) return;

        const theme = validTheme(data.theme);

        applyTheme(theme);

        if (cacheKey) {
          sessionStorage.setItem(cacheKey, theme);
        }

        hasTheme = true;
        setReady(true);
      } catch (error) {
        if (cancelled) return;

        console.error('Company theme sync failed:', error);

        if (!hasTheme) {
          // No verified cached theme is available.
          applyTheme('original');
        }

        setReady(true);
      }
    }

    void syncTheme();

    return () => {
      cancelled = true;
    };
  }, []);

  // Prevent the Original theme from appearing before
  // this account's theme is initialized.
  if (!ready) return null;

  return <>{children}</>;
}

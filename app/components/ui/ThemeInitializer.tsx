
'use client';

import Script from 'next/script';

export default function ThemeInitializer() {
  return (
    <Script
      id="smart-recovery-theme-init"
      strategy="beforeInteractive"
    >
      {`
        (function () {
          try {
            var theme = sessionStorage.getItem('sr_tenant_theme');

            if (
              theme === 'blue-black' ||
              theme === 'green-black'
            ) {
              document.documentElement.setAttribute(
                'data-sr-theme',
                theme
              );
            } else {
              document.documentElement.setAttribute(
                'data-sr-theme',
                'original'
              );
            }
          } catch (error) {
            document.documentElement.setAttribute(
              'data-sr-theme',
              'original'
            );
          }
        })();
      `}
    </Script>
  );
}

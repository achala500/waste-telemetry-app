import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chrono | 24-Hour Timeline Ledger & Telemetry',
  description:
    'Real-time focus telemetry, 24-hour timeline ledger, leak analysis, and focus tracking.',
  manifest: '/manifest.json',
  applicationName: 'Chrono',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Chrono',
    startupImage: [
      {
        url: '/icon.svg',
      },
    ],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
    shortcut: ['/icon.svg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#08080A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-[#08080A]">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.svg" />
        <link rel="apple-touch-startup-image" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Chrono" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    reg.onupdatefound = function() {
                      var installing = reg.installing;
                      if (installing) {
                        installing.onstatechange = function() {
                          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[Chrono PWA] New version ready.');
                          }
                        };
                      }
                    };
                  }).catch(function(err) {
                    console.warn('[Chrono PWA] SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className="bg-[#08080A] text-[#F4F4F6] min-h-screen min-h-[100dvh] antialiased selection:bg-[#A3E635]/25 selection:text-[#A3E635] flex flex-col font-sans overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}

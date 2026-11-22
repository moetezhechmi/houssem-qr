import type { Metadata, Viewport } from 'next';
import { PUB_URL } from '@/lib/env';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#8FAF9A',
};

export const metadata: Metadata = {
  title: 'Bieny Coffeeshop',
  description: 'Consultez votre progression et vos récompenses via votre lien personnel',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bieny Coffeeshop',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/logo_houssem.jpeg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="auto" data-theme="loyalty" suppressHydrationWarning>
      <body>
        <div className="app">{children}</div>
      </body>
    </html>
  );
}

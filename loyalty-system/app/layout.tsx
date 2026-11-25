import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { PUB_URL } from '@/lib/env';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
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
    icon: '/logo_houssem.jpeg',
    apple: '/logo_houssem.jpeg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="auto" data-theme="loyalty" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body>
        <div className="app">{children}</div>
      </body>
    </html>
  );
}

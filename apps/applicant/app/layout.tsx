/**
 * @file layout.tsx
 * @brief Root Document Layout for the IEEE ECU SB Public Recruitment Portal.
 * @details Provides responsive container styling, navigation bar, ambient visual accents,
 *          SEO metadata, and OpenGraph social preview assets.
 * @author IEEE ECU Student Branch
 */

import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import ChineseGeometricBackground from '@/components/ChineseGeometricBackground';
import DevToolsBlocker from '@/components/DevToolsBlocker';

export const metadata: Metadata = {
  metadataBase: new URL('https://ieee-ecu-applicant.vercel.app'),
  title: 'IEEE ECU Student Branch | Recruitment 2026-2027',
  description:
    'Official recruitment portal for IEEE ECU Student Branch Season 2026-2027. Apply now to join our team!',
  keywords: [
    'IEEE',
    'IEEE ECU',
    'IEEE ECU Student Branch',
    'Egyptian Chinese University',
    'Recruitment',
    'Student Branch',
    'Engineering',
    'Technology',
  ],
  authors: [{ name: 'IEEE ECU SB' }],
  openGraph: {
    title: 'IEEE ECU Student Branch | Recruitment 2026-2027',
    description:
      'Official recruitment portal for IEEE ECU Student Branch Season 2026-2027. Apply now to join our team!',
    siteName: 'IEEE ECU SB Recruitment',
    images: [
      {
        url: '/assets/logo/logo_white.png',
        width: 800,
        height: 600,
        alt: 'IEEE ECU Student Branch White Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IEEE ECU Student Branch | Recruitment 2026-2027',
    description:
      'Official recruitment portal for IEEE ECU Student Branch Season 2026-2027. Apply now to join our team!',
    images: ['/assets/logo/logo_white.png'],
  },
  icons: {
    icon: '/assets/logo/logo_white.png',
    shortcut: '/assets/logo/logo_white.png',
    apple: '/assets/logo/logo_white.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen flex flex-col bg-[#00040c] text-slate-100 selection:bg-[#00a1c0] selection:text-white relative">
        <DevToolsBlocker />
        <ChineseGeometricBackground />
        <Navbar />
        <main className="flex-1 flex flex-col relative z-10">{children}</main>
      </body>
    </html>
  );
}

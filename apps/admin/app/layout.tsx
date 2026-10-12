/**
 * @file layout.tsx
 * @brief Root Document Layout for the IEEE ECU SB Administration Platform.
 * @details Injects global styles, geometric ambient background canvas, security DevTools protections,
 *          and standardized metadata configurations.
 * @author IEEE ECU Student Branch
 */

import type { Metadata, Viewport } from 'next';
import './globals.css';
import ChineseGeometricBackground from '@/components/ChineseGeometricBackground';
import DevToolsBlocker from '@/components/DevToolsBlocker';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'),
  title: 'IEEE ECU SB | Recruitment Command Center',
  description:
    'Official IEEE ECU Student Branch Recruitment Command Center. Interview scheduling, candidate evaluation, and automated communications.',
  openGraph: {
    title: 'IEEE ECU SB | Recruitment Command Center',
    description:
      'Official IEEE ECU Student Branch Recruitment Command Center. Automated scheduling, live scoring, and communications.',
    siteName: 'IEEE ECU SB Admin',
    images: [
      {
        url: '/assets/logo/logo_white.png',
        width: 800,
        height: 600,
        alt: 'IEEE ECU SB Admin Portal Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: '/assets/logo/logo_white.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-[#00040c] text-slate-100 selection:bg-[#00a1c0] selection:text-white antialiased relative">
        <DevToolsBlocker />
        <ChineseGeometricBackground />
        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  );
}

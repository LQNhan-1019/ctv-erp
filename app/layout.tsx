import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { themeInitScript } from '@/components/theme-provider';
import './globals.css';
import './nova-admin.css';
import Providers from './providers';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'CTV ERP — Điều hành phân phối',
    template: '%s · CTV ERP',
  },
  description: 'Hệ thống ERP cho doanh nghiệp thương nhân phân phối.',
  openGraph: {
    title: 'CTV ERP — Điều hành phân phối',
    description: 'Điều hành phân phối, rõ từng nhịp vận hành.',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'CTV ERP' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CTV ERP — Điều hành phân phối',
    description: 'Điều hành phân phối, rõ từng nhịp vận hành.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body className={`${inter.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

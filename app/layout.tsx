import type { Metadata } from 'next';
// Đổi từ Geist sang Inter và Roboto_Mono
import { Inter, Roboto_Mono, Playfair_Display } from 'next/font/google';
import './globals.css';
import './nova-admin.css';
import Providers from './providers';

// Khai báo Inter thay cho Geist (Font nội dung chính)
const inter = Inter({
  variable: '--font-geist-sans', // Giữ nguyên tên biến để không phải sửa CSS
  subsets: ['latin', 'vietnamese'], 
  display: 'swap',
});

// Khai báo Roboto_Mono thay cho Geist_Mono (Font code/số liệu)
const robotoMono = Roboto_Mono({
  variable: '--font-geist-mono', // Giữ nguyên tên biến để không phải sửa CSS
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

// Khai báo Playfair Display (Font Serif cho tiêu đề lớn)
const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin', 'vietnamese'], 
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  // ... (giữ nguyên phần metadata của bạn)
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
    <html lang="vi">
      <body
        // Cập nhật tên class ở đây
        className={`${inter.variable} ${robotoMono.variable} ${playfair.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
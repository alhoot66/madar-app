import type {Metadata, Viewport} from 'next';
import PwaRegister from './pwa-register';

export const metadata: Metadata = {
  title: 'مَدَار | الإدارة والمتابعة المدرسية',
  description: 'منصة مدرسية مستقلة متعددة المدارس',
  appleWebApp: {capable: true, title: 'مَدَار', statusBarStyle: 'default'},
  icons: {
    icon: [
      {url: '/icon.svg', type: 'image/svg+xml'},
      {url: '/icon-192.png', sizes: '192x192', type: 'image/png'},
      {url: '/icon-512.png', sizes: '512x512', type: 'image/png'},
    ],
    apple: [{url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png'}],
  },
};

export const viewport: Viewport = {
  themeColor: '#173f68',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{margin: 0, background: '#f2f6fb', fontFamily: 'system-ui,Arial', color: '#173f68'}}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}

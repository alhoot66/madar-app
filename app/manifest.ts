import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'مَدَار | الإدارة والمتابعة المدرسية',
    short_name: 'مَدَار',
    description: 'منصة مستقلة للإدارة والمتابعة المدرسية',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f2f6fb',
    theme_color: '#173f68',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      {src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
      {src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
      {src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any'},
    ],
  };
}

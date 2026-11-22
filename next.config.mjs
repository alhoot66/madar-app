/** @type {import('next').NextConfig} */
// عند بناء برنامج سطح المكتب يُصدَّر الموقع كملفات ثابتة في out/ ليغلّفها Tauri.
// Tauri يضبط TAURI_ENV_PLATFORM تلقائيًا أثناء البناء، فما تحتاج أي إعداد إضافي.
// نسخة الويب العادية (npm run build) لا تتأثر.
const desktop = Boolean(process.env.TAURI_ENV_PLATFORM) || process.env.DESKTOP_BUILD === '1';

const nextConfig = desktop
  ? {
      output: 'export',
      trailingSlash: true,
      images: {unoptimized: true},
      env: {NEXT_PUBLIC_DESKTOP: '1'},
    }
  : {};

export default nextConfig;

'use client';
import {useEffect} from 'react';

// لا نسجّل عامل الخدمة داخل برنامج سطح المكتب: الملفات موجودة محليًا أصلًا.
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DESKTOP === '1') return;
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}

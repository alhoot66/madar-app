'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useSchool} from './useSchool';
import {isUnlocked} from './admin-pin';

/** لصفحات الإدارة الفرعية: يلزم أن يكون الحساب مديرًا وأن يكون قسم الإدارة مفتوحًا بالرقم السري. */
export function useAdmin() {
  const router = useRouter();
  const s = useSchool();
  const allowed = s.ready && s.profile?.role === 'admin' && isUnlocked();
  useEffect(() => { if (s.ready && !allowed) router.replace('/admin'); }, [s.ready, allowed, router]);
  return {...s, ready: allowed};
}

'use client';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {supabase} from './supabase';
import {themeFor, type Theme} from './theme';

export type SchoolProfile = {role: string; school_id: string; schools: {name: string; school_type: string | null} | null};

/** يتحقق من الدخول ويعيد ملف المستخدم وألوان مدرسته. */
export function useSchool(): {ready: boolean; profile: SchoolProfile | null; theme: Theme} {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const db = supabase();
        const {data: {user}} = await db.auth.getUser();
        if (!user) { router.replace('/login'); return; }
        const {data, error} = await db.from('profiles').select('role,school_id,schools(name,school_type)').eq('user_id', user.id).single();
        if (error || !data) { router.replace('/dashboard'); return; }
        if (active) { setProfile(data as unknown as SchoolProfile); setReady(true); }
      } catch { router.replace('/login'); }
    })();
    return () => { active = false; };
  }, [router]);
  return {ready, profile, theme: themeFor(profile?.schools?.school_type as 'boys' | 'girls' | null)};
}

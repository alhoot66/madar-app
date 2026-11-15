'use client';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {supabase} from '../../lib/supabase';
import {themeFor} from '../../lib/theme';

const modules = ['المتابعة الإدارية', 'الطلاب والسلوك والمواظبة', 'الدرجات والكشوف', 'الإدارة الصفية', 'الاعتمادات والتوقيعات', 'التقارير والطباعة'];
type Profile = {role: string; school_id: string; schools: {name: string; school_type: string | null} | null};

// إذا سجّل المدير مدرسته وكان التفعيل بالبريد مطلوبًا، نكمل التسجيل عند أول دخول.
async function finishPendingRegistration(): Promise<boolean> {
  let pending: {schoolName: string; principal: string; phone: string; email: string; type: string} | null = null;
  try { pending = JSON.parse(localStorage.getItem('madar_pending_school') || 'null'); } catch {}
  if (!pending) return false;
  const {error} = await supabase().rpc('register_school', {
    p_school_name: pending.schoolName, p_principal_name: pending.principal, p_phone: pending.phone, p_email: pending.email, p_school_type: pending.type,
  });
  if (error) return false;
  try { localStorage.removeItem('madar_pending_school'); } catch {}
  return true;
}

export default function Dashboard() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const db = supabase();
        const {data: {user}} = await db.auth.getUser();
        if (!user) { router.replace('/login'); return; }
        const load = () => db.from('profiles').select('role,school_id,schools(name,school_type)').eq('user_id', user.id).single();
        let {data, error} = await load();
        if ((error || !data) && await finishPendingRegistration()) ({data, error} = await load());
        if (error || !data) { router.replace('/register'); return; }
        if (active) { setProfile(data as unknown as Profile); setReady(true); }
      } catch { router.replace('/login'); }
    })();
    return () => { active = false; };
  }, [router]);

  if (!ready) return <main style={{padding: 28}}>جارٍ التحقق من صلاحيات الدخول...</main>;
  const t = themeFor(profile?.schools?.school_type as 'boys' | 'girls' | null);
  const girls = profile?.schools?.school_type === 'girls';
  const roleLabel = profile?.role === 'admin' ? (girls ? 'المديرة' : 'المدير') : profile?.role === 'deputy' ? (girls ? 'الوكيلة' : 'الوكيل') : (girls ? 'المعلمة' : 'المعلم');

  return (
    <main style={{maxWidth: 950, margin: 'auto', padding: 30}}>
      <div style={{background: t.primary, color: 'white', borderRadius: 24, padding: '22px 24px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12}}>
          <h1 style={{margin: 0}}>لوحة مَدَار</h1>
          <span style={{padding: '6px 14px', borderRadius: 999, background: t.accent, color: t.primaryDark, fontWeight: 700}}>{roleLabel}</span>
        </div>
        <p style={{margin: '8px 0 0', fontSize: 18}}>{profile?.schools?.name || 'مدرستك'}</p>
      </div>
      <p>هذه لوحة تأسيسية؛ الوظائف التفصيلية قيد التطوير ولا تحفظ سجلات بعد.</p>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14}}>
        {modules.map(m => <section key={m} style={{padding: 22, background: 'white', borderRadius: 14, color: t.primary}}><h3>{m}</h3><small>قيد التطوير</small></section>)}
      </div>
      <Link href="/admin" style={{display: 'block', marginTop: 24, padding: 16, textAlign: 'center', background: t.primary, color: 'white', borderRadius: 14, textDecoration: 'none', fontWeight: 700}}>قسم الإدارة</Link>
      <button style={{marginTop: 28}} onClick={async () => { await supabase().auth.signOut(); router.replace('/login'); }}>تسجيل الخروج</button>
    </main>
  );
}

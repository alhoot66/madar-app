'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {supabase} from '../../lib/supabase';
import {useSchool} from '../../lib/useSchool';

type ClassRow = {id: string; name: string; stage: string};

export default function Classes() {
  const {ready, profile, theme: t} = useSchool();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [name, setName] = useState('');
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mySubjects, setMySubjects] = useState<Record<string, string[]>>({});
  const canManage = profile?.role === 'admin' || profile?.role === 'deputy';
  const girls = profile?.schools?.school_type === 'girls';

  async function load() {
    const db = supabase();
    const {data, error} = await db.from('classes').select('id,name,stage').order('name');
    if (error) { setError('تعذر تحميل الفصول'); return; }
    setClasses(data ?? []);
    if (!canManage) {
      // المعلم: نعرض تحت كل فصل المواد التي يدرّسها فيه.
      const {data: {user}} = await db.auth.getUser();
      const {data: a} = await db.from('teacher_assignments').select('class_id,subjects(name)').eq('teacher_id', user?.id ?? '');
      const map: Record<string, string[]> = {};
      for (const row of (a ?? []) as unknown as {class_id: string; subjects: {name: string} | null}[]) {
        (map[row.class_id] ??= []).push(row.subjects?.name ?? '');
      }
      setMySubjects(map);
    }
  }
  useEffect(() => { if (ready) load(); }, [ready]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true); setError('');
    const {error} = await supabase().from('classes').insert({school_id: profile.school_id, name: name.trim(), stage: stage.trim()});
    setBusy(false);
    if (error) setError('تعذر إضافة الفصل'); else { setName(''); setStage(''); load(); }
  }

  if (!ready) return <main style={{padding: 28}}>جارٍ التحميل...</main>;
  const input: React.CSSProperties = {width: '100%', boxSizing: 'border-box', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #b9cbd8', fontFamily: 'inherit', fontSize: 16};

  return (
    <main style={{maxWidth: 620, margin: 'auto', padding: 20}}>
      <div style={{background: t.primary, color: 'white', borderRadius: 24, padding: '20px 22px'}}>
        <h1 style={{margin: 0}}>{canManage ? 'الفصول' : 'فصولي'}</h1>
        <p style={{margin: '6px 0 0'}}>{profile?.schools?.name}</p>
      </div>

      <div style={{display: 'grid', gap: 10, marginTop: 18}}>
        {classes.length === 0 && <p style={{color: '#4a6072'}}>{canManage ? 'لا توجد فصول بعد. أضف أول فصل من الأسفل.' : `لم تُسند ${girls ? 'إليكِ' : 'إليك'} فصول بعد. اطلب من إدارة المدرسة إسناد فصولك وموادك.`}</p>}
        {classes.map(c => (
          <Link key={c.id} href={`/classes/view?id=${encodeURIComponent(c.id)}`} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', minHeight: 56, boxSizing: 'border-box', background: 'white', borderRadius: 16, boxShadow: '0 4px 14px rgba(23,63,104,0.07)', color: t.primary, textDecoration: 'none'}}>
            <span><b>{c.name}</b><br/><small style={{color: '#4a6072'}}>{c.stage}{mySubjects[c.id]?.length ? ` — ${mySubjects[c.id].join('، ')}` : ''}</small></span>
            <span aria-hidden="true">‹</span>
          </Link>
        ))}
      </div>

      {canManage && <form onSubmit={add} style={{marginTop: 22, padding: 16, background: 'white', borderRadius: 16, display: 'grid', gap: 12}}>
        <b>إضافة فصل</b>
        <label>اسم الفصل<input required placeholder="مثال: أول متوسط / 1" value={name} onChange={e => setName(e.target.value)} style={input}/></label>
        <label>المرحلة<input required placeholder="مثال: المتوسطة" value={stage} onChange={e => setStage(e.target.value)} style={input}/></label>
        <button disabled={busy} style={{padding: 14, border: 0, borderRadius: 12, background: t.primary, color: 'white', fontFamily: 'inherit', fontWeight: 700}}>{busy ? 'جارٍ الإضافة' : 'إضافة الفصل'}</button>
        {error && <p role="alert" style={{color: '#a12222', margin: 0}}>{error}</p>}
      </form>}
      {!canManage && error && <p role="alert" style={{color: '#a12222'}}>{error}</p>}

      <Link href="/dashboard" style={{display: 'block', marginTop: 20, textAlign: 'center', color: t.primary, fontWeight: 700}}>العودة إلى لوحة التحكم</Link>
    </main>
  );
}

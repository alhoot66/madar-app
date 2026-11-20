'use client';
import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {supabase} from '../../../lib/supabase';
import {useAdmin} from '../../../lib/useAdmin';

type Member = {user_id: string; full_name: string; role: string; active: boolean};
type ClassRow = {id: string; name: string};
type Subject = {id: string; name: string};
type Assignment = {id: string; teacher_id: string; class_id: string; subject_id: string};

const card: React.CSSProperties = {background: 'white', borderRadius: 16, boxShadow: '0 4px 14px rgba(23,63,104,0.07)'};
const COMMON_SUBJECTS = ['القرآن الكريم', 'الدراسات الإسلامية', 'لغتي', 'الرياضيات', 'العلوم', 'اللغة الإنجليزية', 'الدراسات الاجتماعية', 'المهارات الرقمية', 'التربية الفنية', 'التربية البدنية'];

export default function Assignments() {
  const {ready, profile, theme: t} = useAdmin();
  const girls = profile?.schools?.school_type === 'girls';
  const [teachers, setTeachers] = useState<Member[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [pick, setPick] = useState<Record<string, {class_id: string; subject_id: string}>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const db = supabase();
    const [m, c, s, a] = await Promise.all([
      db.from('profiles').select('user_id,full_name,role,active').order('full_name'),
      db.from('classes').select('id,name').order('name'),
      db.from('subjects').select('id,name').order('name'),
      db.from('teacher_assignments').select('id,teacher_id,class_id,subject_id'),
    ]);
    if (m.error || c.error || s.error || a.error) { setError('تعذر التحميل. تأكد من تنفيذ ملف 006 في Supabase.'); return; }
    setTeachers((m.data ?? []).filter(x => x.role === 'teacher'));
    setClasses(c.data ?? []);
    setSubjects(s.data ?? []);
    setAssignments(a.data ?? []);
  }
  useEffect(() => { if (ready) load(); }, [ready]);

  const className = useMemo(() => new Map(classes.map(c => [c.id, c.name])), [classes]);
  const subjectName = useMemo(() => new Map(subjects.map(s => [s.id, s.name])), [subjects]);

  async function addSubjects(names: string[]) {
    if (!profile) return;
    const existing = new Set(subjects.map(s => s.name));
    const rows = names.map(n => n.trim()).filter(n => n && !existing.has(n)).map(name => ({school_id: profile.school_id, name}));
    if (rows.length === 0) { setError('المادة موجودة من قبل'); return; }
    setBusy(true); setError('');
    const {error} = await supabase().from('subjects').upsert(rows, {onConflict: 'school_id,name', ignoreDuplicates: true});
    setBusy(false);
    if (error) setError('تعذر إضافة المادة'); else { setNewSubject(''); load(); }
  }

  async function removeSubject(s: Subject) {
    const used = assignments.filter(a => a.subject_id === s.id).length;
    if (!confirm(used ? `حذف مادة ${s.name}؟ سيُلغى إسنادها (${used}) للمعلمين.` : `حذف مادة ${s.name}؟`)) return;
    const {error} = await supabase().from('subjects').delete().eq('id', s.id);
    if (error) setError('تعذر حذف المادة. قد تكون لها درجات مسجلة.'); else load();
  }

  async function assign(teacherId: string) {
    if (!profile) return;
    const p = pick[teacherId];
    if (!p?.class_id || !p?.subject_id) { setError('اختر الفصل والمادة'); return; }
    if (assignments.some(a => a.teacher_id === teacherId && a.class_id === p.class_id && a.subject_id === p.subject_id)) { setError('هذا الإسناد موجود من قبل'); return; }
    setBusy(true); setError('');
    const {error} = await supabase().from('teacher_assignments').insert({school_id: profile.school_id, teacher_id: teacherId, ...p});
    setBusy(false);
    if (error) setError('تعذر الإسناد'); else { setPick(x => ({...x, [teacherId]: {class_id: p.class_id, subject_id: ''}})); load(); }
  }

  async function unassign(a: Assignment) {
    const {error} = await supabase().from('teacher_assignments').delete().eq('id', a.id);
    if (error) setError('تعذر إلغاء الإسناد'); else load();
  }

  if (!ready) return <main style={{padding: 28}}>جارٍ التحميل...</main>;
  const input: React.CSSProperties = {width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1px solid #b9cbd8', fontFamily: 'inherit', fontSize: 15};
  const smallBtn: React.CSSProperties = {minHeight: 40, padding: '0 14px', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer'};
  const chip: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: t.soft, fontSize: 14};
  const x: React.CSSProperties = {border: 0, background: 'none', color: '#a12222', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1};
  const missingCommon = COMMON_SUBJECTS.filter(n => !subjects.some(s => s.name === n));

  return (
    <main style={{maxWidth: 620, margin: 'auto', padding: 20}}>
      <div style={{background: t.primary, color: 'white', borderRadius: 24, padding: '20px 22px'}}>
        <h1 style={{margin: 0, fontSize: 24}}>توزيع الفصول والمواد</h1>
        <p style={{margin: '6px 0 0'}}>{girls ? 'كل معلمة ترى فقط الفصول المسندة إليها' : 'كل معلم يرى فقط الفصول المسندة إليه'}</p>
      </div>
      {error && <p role="alert" style={{color: '#a12222'}}>{error}</p>}

      <section style={{...card, marginTop: 18, padding: 16, display: 'grid', gap: 12}}>
        <b>المواد</b>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
          {subjects.length === 0 && <small style={{color: '#4a6072'}}>لا توجد مواد بعد.</small>}
          {subjects.map(s => <span key={s.id} style={chip}>{s.name}<button type="button" aria-label={`حذف ${s.name}`} onClick={() => removeSubject(s)} style={x}>×</button></span>)}
        </div>
        <form onSubmit={e => { e.preventDefault(); addSubjects([newSubject]); }} style={{display: 'flex', gap: 8}}>
          <input required placeholder="اسم المادة" value={newSubject} onChange={e => setNewSubject(e.target.value)} style={{...input, flex: 1}}/>
          <button disabled={busy} style={{...smallBtn, border: 0, background: t.primary, color: 'white'}}>إضافة</button>
        </form>
        {missingCommon.length > 0 && <button type="button" disabled={busy} onClick={() => addSubjects(missingCommon)} style={{...smallBtn, justifySelf: 'start', border: `1px solid ${t.primary}`, background: 'white', color: t.primary}}>إضافة المواد الشائعة ({missingCommon.length})</button>}
      </section>

      <h2 style={{fontSize: 15, color: '#4a6072', margin: '22px 4px 8px'}}>{girls ? 'المعلمات' : 'المعلمون'}</h2>
      {classes.length === 0 && <p style={{color: '#4a6072'}}>أضف الفصول أولًا من صفحة <Link href="/classes" style={{color: t.primary}}>الفصول والطلاب</Link>.</p>}
      {teachers.length === 0 && <p style={{color: '#4a6072'}}>لم ينضم أحد بعد. أضف {girls ? 'المعلمات' : 'المعلمين'} من صفحة <Link href="/admin/teachers" style={{color: t.primary}}>{girls ? 'المعلمات' : 'المعلمون'}</Link>.</p>}
      <div style={{display: 'grid', gap: 12}}>
        {teachers.map(m => {
          const mine = assignments.filter(a => a.teacher_id === m.user_id);
          const p = pick[m.user_id] ?? {class_id: '', subject_id: ''};
          return (
            <div key={m.user_id} style={{...card, padding: 14, display: 'grid', gap: 10, opacity: m.active ? 1 : 0.65}}>
              <b>{m.full_name}{!m.active && <small style={{color: '#a12222'}}> (موقوف)</small>}</b>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                {mine.length === 0 && <small style={{color: '#a12222'}}>لا يوجد إسناد — لن {girls ? 'ترى' : 'يرى'} أي فصل</small>}
                {mine.map(a => <span key={a.id} style={chip}>{className.get(a.class_id)} — {subjectName.get(a.subject_id)}<button type="button" aria-label="إلغاء الإسناد" onClick={() => unassign(a)} style={x}>×</button></span>)}
              </div>
              {classes.length > 0 && subjects.length > 0 && (
                <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                  <select aria-label="الفصل" value={p.class_id} onChange={e => setPick(x => ({...x, [m.user_id]: {...p, class_id: e.target.value}}))} style={{...input, flex: 1, minWidth: 120}}>
                    <option value="">الفصل</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select aria-label="المادة" value={p.subject_id} onChange={e => setPick(x => ({...x, [m.user_id]: {...p, subject_id: e.target.value}}))} style={{...input, flex: 1, minWidth: 120}}>
                    <option value="">المادة</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button type="button" disabled={busy} onClick={() => assign(m.user_id)} style={{...smallBtn, border: 0, background: t.primary, color: 'white'}}>إسناد</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Link href="/admin" style={{display: 'block', marginTop: 24, textAlign: 'center', color: t.primary, fontWeight: 700}}>العودة إلى قسم الإدارة</Link>
    </main>
  );
}

'use client';
import {useEffect, useMemo, useState} from 'react';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import {supabase} from '../../../lib/supabase';
import {useSchool} from '../../../lib/useSchool';
import {parseNames, splitNew} from '../../../lib/names';

type Student = {id: string; full_name: string};

export default function ClassStudents() {
  const {id} = useParams<{id: string}>();
  const {ready, profile, theme: t} = useSchool();
  const [className, setClassName] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [guide, setGuide] = useState(false);

  async function load() {
    const db = supabase();
    const [c, s] = await Promise.all([
      db.from('classes').select('name').eq('id', id).single(),
      db.from('students').select('id,full_name').eq('class_id', id).order('full_name'),
    ]);
    if (c.error) { setError('تعذر تحميل الفصل'); return; }
    setClassName(c.data.name);
    setStudents(s.data ?? []);
  }
  useEffect(() => { if (ready) load(); }, [ready, id]);

  const {fresh, dupes} = useMemo(() => splitNew(parseNames(text), students.map(s => s.full_name)), [text, students]);

  async function save() {
    if (!profile || fresh.length === 0) return;
    setBusy(true); setError(''); setMsg('');
    const rows = fresh.map(full_name => ({school_id: profile.school_id, class_id: id, full_name}));
    const {error} = await supabase().from('students').insert(rows);
    setBusy(false);
    if (error) { setError('تعذر حفظ الطلاب. حاول مرة أخرى.'); return; }
    setMsg(`تمت إضافة ${fresh.length} طالب`);
    setText('');
    load();
  }

  if (!ready) return <main style={{padding: 28}}>جارٍ التحميل...</main>;

  return (
    <main style={{maxWidth: 620, margin: 'auto', padding: 20}}>
      <div style={{background: t.primary, color: 'white', borderRadius: 24, padding: '20px 22px'}}>
        <h1 style={{margin: 0}}>إضافة طلاب</h1>
        <p style={{margin: '6px 0 0'}}>إلى فصل: {className} — فيه الآن {students.length} طالب</p>
      </div>

      <div style={{marginTop: 18, display: 'grid', gap: 10}}>
        <label htmlFor="names" style={{fontWeight: 700}}>الصق أسماء الطلاب، اسم في كل سطر</label>
        <button type="button" onClick={() => setGuide(true)} style={{justifySelf: 'start', background: 'none', border: 0, padding: '6px 0', color: t.primary, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer'}}>كيف أنسخ الأسماء من نور؟</button>
        <textarea id="names" value={text} onChange={e => setText(e.target.value)} placeholder="انسخ عمود الأسماء من نور أو Excel والصقه هنا" rows={9} style={{padding: 14, borderRadius: 14, border: '1.5px solid #b9cbd8', fontFamily: 'inherit', fontSize: 16, lineHeight: 1.9, resize: 'vertical'}}/>
        <p style={{margin: 0, padding: '10px 14px', borderRadius: 12, background: t.soft, fontSize: 14}}>يتعرف التطبيق على الأسماء تلقائيًا، ويتجاهل الأرقام والأسطر الفارغة والأسماء المكررة.</p>

        {text.trim() && (
          <div style={{background: 'white', borderRadius: 16, padding: '14px 16px', display: 'grid', gap: 6}}>
            <b style={{fontSize: 14, color: '#4a6072'}}>معاينة قبل الحفظ</b>
            <div style={{display: 'flex', justifyContent: 'space-between'}}><span>أسماء جديدة</span><b>{fresh.length}</b></div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}><span>مكررة (لن تُضاف)</span><b>{dupes.length}</b></div>
            {fresh.length > 0 && <details><summary>عرض الأسماء الجديدة</summary><ol>{fresh.map(n => <li key={n}>{n}</li>)}</ol></details>}
          </div>
        )}

        <button type="button" disabled={busy || fresh.length === 0} onClick={save} style={{height: 54, border: 0, borderRadius: 14, background: fresh.length ? t.primary : '#9fb0c0', color: 'white', fontFamily: 'inherit', fontSize: 17, fontWeight: 700}}>{busy ? 'جارٍ الحفظ' : `إضافة ${fresh.length || ''} طالب إلى الفصل`}</button>
        {msg && <p role="status" style={{margin: 0, color: '#1d6f6b'}}>{msg}</p>}
        {error && <p role="alert" style={{margin: 0, color: '#a12222'}}>{error}</p>}
      </div>

      {students.length > 0 && (
        <details style={{marginTop: 20, background: 'white', borderRadius: 16, padding: '14px 16px'}}>
          <summary>طلاب الفصل ({students.length})</summary>
          <ol>{students.map(s => <li key={s.id}>{s.full_name}</li>)}</ol>
        </details>
      )}

      <Link href="/classes" style={{display: 'block', marginTop: 20, textAlign: 'center', color: t.primary, fontWeight: 700}}>العودة إلى الفصول</Link>

      {guide && (
        <div role="dialog" aria-modal="true" aria-labelledby="guide-title" style={{position: 'fixed', inset: 0, background: 'rgba(15,44,73,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center'}}>
          <div style={{background: 'white', width: '100%', maxWidth: 560, borderRadius: '24px 24px 0 0', padding: '20px 22px 26px', maxHeight: '90vh', overflow: 'auto'}}>
            <h2 id="guide-title" style={{marginTop: 0, color: t.primary}}>كيف أنسخ الأسماء من نور؟</h2>
            <ol style={{lineHeight: 1.9, paddingInlineStart: 22}}>
              <li><b>ادخل إلى نور</b> باسم المستخدم وكلمة المرور، أو عبر النفاذ الوطني الموحد.</li>
              <li><b>اختر دور «معلم»</b> إن كان لديك أكثر من دور.</li>
              <li>من القائمة: <b>التقارير ← تقارير أخرى ← كشف بأسماء الطلاب</b>.</li>
              <li><b>اختر الفصل</b>، ثم صدّر الكشف بصيغة <b>Excel</b>.</li>
              <li>افتح الملف، <b>حدد عمود الأسماء وانسخه</b>، ثم الصقه هنا.</li>
            </ol>
            <p style={{padding: '10px 14px', borderRadius: 12, background: '#fff4e5', color: '#6b3a00'}}>انسخ <b>الأسماء فقط</b>، دون أرقام الهوية. إذا لم يظهر الكشف في حسابك، اطلبه من وكيل شؤون الطلاب.</p>
            <button type="button" onClick={() => setGuide(false)} style={{width: '100%', height: 52, border: 0, borderRadius: 14, background: t.primary, color: 'white', fontFamily: 'inherit', fontSize: 16, fontWeight: 700}}>فهمت، سألصق الأسماء</button>
          </div>
        </div>
      )}
    </main>
  );
}

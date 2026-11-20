'use client';
import {useEffect, useMemo, useState} from 'react';
import {useParams, useRouter} from 'next/navigation';
import Link from 'next/link';
import {supabase} from '../../../lib/supabase';
import {useSchool} from '../../../lib/useSchool';
import {parseNames, splitNew} from '../../../lib/names';

type Student = {id: string; full_name: string};

export default function ClassStudents() {
  const {id} = useParams<{id: string}>();
  const router = useRouter();
  const {ready, profile, theme: t} = useSchool();
  const canManage = profile?.role === 'admin' || profile?.role === 'deputy';
  const [editingName, setEditingName] = useState<string | null>(null);
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
    // إذا أُضيف الاسم نفسه من جهاز آخر في اللحظة نفسها، نتجاهله بدل إفشال القائمة كلها.
    const {data, error} = await supabase().from('students')
      .upsert(rows, {onConflict: 'class_id,full_name', ignoreDuplicates: true})
      .select('id');
    setBusy(false);
    if (error) { setError('تعذر حفظ الطلاب. حاول مرة أخرى.'); return; }
    const added = data?.length ?? fresh.length;
    const skipped = fresh.length - added;
    setMsg(`تمت إضافة ${added} طالب` + (skipped > 0 ? ` (${skipped} موجود من قبل)` : ''));
    setText('');
    load();
  }

  async function removeStudent(s: Student) {
    if (!confirm(`حذف الطالب ${s.full_name} من الفصل؟`)) return;
    setError(''); setMsg('');
    const {error} = await supabase().from('students').delete().eq('id', s.id);
    if (error) setError('تعذر حذف الطالب. قد تكون له درجات أو سجلات مرتبطة.'); else load();
  }

  async function renameClass(e: React.FormEvent) {
    e.preventDefault();
    const n = (editingName ?? '').trim();
    if (!n) return;
    setError(''); setMsg('');
    const {error} = await supabase().from('classes').update({name: n}).eq('id', id);
    if (error) setError('تعذر تعديل اسم الفصل'); else { setEditingName(null); load(); }
  }

  async function removeClass() {
    if (students.length > 0) { setError('احذف طلاب الفصل أولًا، ثم احذف الفصل.'); return; }
    if (!confirm(`حذف فصل ${className}؟`)) return;
    const {error} = await supabase().from('classes').delete().eq('id', id);
    if (error) setError('تعذر حذف الفصل'); else router.replace('/classes');
  }

  if (!ready) return <main style={{padding: 28}}>جارٍ التحميل...</main>;
  const smallBtn: React.CSSProperties = {minHeight: 36, padding: '0 12px', borderRadius: 10, border: '1px solid #d5dee7', background: 'white', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer'};

  return (
    <main style={{maxWidth: 620, margin: 'auto', padding: 20}}>
      <div style={{background: t.primary, color: 'white', borderRadius: 24, padding: '20px 22px'}}>
        <h1 style={{margin: 0}}>إضافة طلاب</h1>
        <p style={{margin: '6px 0 0'}}>إلى فصل: {className} — فيه الآن {students.length} طالب</p>
      </div>

      {canManage && (editingName === null ? (
        <div style={{display: 'flex', gap: 8, marginTop: 12}}>
          <button type="button" onClick={() => setEditingName(className)} style={{...smallBtn, color: t.primary}}>تعديل اسم الفصل</button>
          <button type="button" onClick={removeClass} style={{...smallBtn, color: '#a12222'}}>حذف الفصل</button>
        </div>
      ) : (
        <form onSubmit={renameClass} style={{display: 'flex', gap: 8, marginTop: 12}}>
          <input required value={editingName} onChange={e => setEditingName(e.target.value)} style={{flex: 1, padding: 10, borderRadius: 10, border: '1px solid #b9cbd8', fontFamily: 'inherit', fontSize: 16}}/>
          <button style={{...smallBtn, background: t.primary, color: 'white', border: 0}}>حفظ</button>
          <button type="button" onClick={() => setEditingName(null)} style={smallBtn}>إلغاء</button>
        </form>
      ))}

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
          <ol style={{paddingInlineStart: 22}}>{students.map(s => (
            <li key={s.id} style={{padding: '4px 0'}}>
              <span style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8}}>
                {s.full_name}
                {canManage && <button type="button" onClick={() => removeStudent(s)} aria-label={`حذف ${s.full_name}`} style={{...smallBtn, minHeight: 32, color: '#a12222'}}>حذف</button>}
              </span>
            </li>
          ))}</ol>
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

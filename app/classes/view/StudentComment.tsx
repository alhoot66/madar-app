'use client';
import {useState} from 'react';
import {supabase} from '../../../lib/supabase';
import type {Theme} from '../../../lib/theme';

type Kind = 'report' | 'parent';

// نافذة «اكتب ملاحظة بمساعدة Claude»: المعلم يكتب نقاطًا قصيرة، ويحصل على نص مرتب يعدّله وينسخه.
// اسم الطالب لا يُرسل إلى Claude؛ الدالة على الخادم تتحقق من صلاحية المعلم على الطالب فقط.
export function StudentComment({student, theme: t, onClose}: {student: {id: string; full_name: string}; theme: Theme; onClose: () => void}) {
  const [kind, setKind] = useState<Kind>('report');
  const [notes, setNotes] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true); setError(''); setCopied(false);
    const {data, error} = await supabase().functions.invoke('student-comment', {body: {student_id: student.id, notes, kind}});
    setBusy(false);
    if (error) {
      let message = 'تعذر الاتصال بخدمة الكتابة. تحقق من الإنترنت وحاول مرة أخرى.';
      try { const body = await (error as {context?: Response}).context?.json(); if (body?.error) message = body.error; } catch {}
      setError(message);
      return;
    }
    setText(data?.text ?? '');
  }

  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setError('تعذر النسخ. حدد النص وانسخه يدويًا.'); }
  }

  const field: React.CSSProperties = {padding: 12, borderRadius: 12, border: '1.5px solid #b9cbd8', fontFamily: 'inherit', fontSize: 16, lineHeight: 1.8, resize: 'vertical'};
  const tab = (k: Kind, label: string) => (
    <button type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
      style={{flex: 1, minHeight: 44, borderRadius: 12, border: kind === k ? 0 : '1px solid #d5dee7', background: kind === k ? t.primary : 'white', color: kind === k ? 'white' : '#24384a', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer'}}>{label}</button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="comment-title" style={{position: 'fixed', inset: 0, background: 'rgba(15,44,73,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 10}}>
      <div style={{background: 'white', width: '100%', maxWidth: 560, borderRadius: '24px 24px 0 0', padding: '20px 22px 26px', maxHeight: '92vh', overflow: 'auto', display: 'grid', gap: 12}}>
        <h2 id="comment-title" style={{margin: 0, color: t.primary}}>ملاحظة عن {student.full_name}</h2>

        <div style={{display: 'flex', gap: 8}}>
          {tab('report', 'تعليق للشهادة')}
          {tab('parent', 'رسالة لولي الأمر')}
        </div>

        <label htmlFor="notes" style={{fontWeight: 700}}>اكتب نقاطًا قصيرة عن الطالب</label>
        <textarea id="notes" rows={4} maxLength={1200} value={notes} onChange={e => setNotes(e.target.value)} style={field}
          placeholder="مثال: مشارك في الحصة، خطه جميل، يتأخر في تسليم الواجبات، تحسن في الاختبار الأخير"/>
        <p style={{margin: 0, padding: '8px 12px', borderRadius: 10, background: t.soft, fontSize: 13}}>يكتب Claude النص من نقاطك فقط. اسم الطالب لا يُرسل. راجع النص قبل استخدامه.</p>

        <button type="button" onClick={generate} disabled={busy || notes.trim().length < 3}
          style={{height: 52, border: 0, borderRadius: 14, background: notes.trim().length >= 3 ? t.primary : '#9fb0c0', color: 'white', fontFamily: 'inherit', fontSize: 16, fontWeight: 700}}>
          {busy ? 'جارٍ الكتابة...' : text ? 'اكتب صياغة أخرى' : 'اكتب الملاحظة'}
        </button>

        {error && <p role="alert" style={{margin: 0, color: '#a12222'}}>{error}</p>}

        {text && (
          <>
            <label htmlFor="result" style={{fontWeight: 700}}>النص (يمكنك تعديله)</label>
            <textarea id="result" rows={6} value={text} onChange={e => { setText(e.target.value); setCopied(false); }} style={field}/>
            <button type="button" onClick={copy} style={{height: 48, borderRadius: 14, border: `1.5px solid ${t.primary}`, background: 'white', color: t.primary, fontFamily: 'inherit', fontSize: 16, fontWeight: 700}}>
              {copied ? 'تم النسخ ✓' : 'نسخ النص'}
            </button>
          </>
        )}

        <button type="button" onClick={onClose} style={{height: 44, border: 0, background: 'none', color: '#4a6072', fontFamily: 'inherit', fontSize: 15, fontWeight: 700}}>إغلاق</button>
      </div>
    </div>
  );
}

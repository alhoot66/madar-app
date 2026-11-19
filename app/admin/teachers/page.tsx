'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {supabase} from '../../../lib/supabase';
import {useAdmin} from '../../../lib/useAdmin';

type Member = {user_id: string; full_name: string; role: string; active: boolean};
type Invite = {id: string; full_name: string; code: string; created_at: string; expires_at: string; role: string};

const card: React.CSSProperties = {background: 'white', borderRadius: 16, boxShadow: '0 4px 14px rgba(23,63,104,0.07)'};

export default function Teachers() {
  const {ready, profile, theme: t} = useAdmin();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'teacher' | 'deputy'>('teacher');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const girls = profile?.schools?.school_type === 'girls';
  const teacherWord = girls ? 'المعلمة' : 'المعلم';
  const roleWord = (r: string) => r === 'deputy' ? (girls ? 'وكيلة' : 'وكيل') : r === 'admin' ? (girls ? 'مديرة' : 'مدير') : (girls ? 'معلمة' : 'معلم');
  const expired = (inv: Invite) => new Date(inv.expires_at).getTime() < Date.now();
  const expiryText = (inv: Invite) => expired(inv) ? 'انتهت صلاحيته — احذفه وأنشئ رمزًا جديدًا' : `صالح حتى ${new Date(inv.expires_at).toLocaleDateString('ar-SA')}`;

  async function load() {
    const db = supabase();
    const [m, i] = await Promise.all([
      db.from('profiles').select('user_id,full_name,role,active').order('full_name'),
      db.from('teacher_invites').select('id,full_name,code,created_at,expires_at,role').is('used_by', null).order('created_at', {ascending: false}),
    ]);
    if (m.error || i.error) { setError('تعذر تحميل المعلمين. تأكد من تنفيذ ملفي 004 و005 في Supabase.'); return; }
    setMembers((m.data ?? []).filter(x => x.role !== 'admin'));
    setInvites(i.data ?? []);
  }
  useEffect(() => { if (ready) load(); }, [ready]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const {error} = await supabase().rpc('create_teacher_invite', {p_full_name: name, p_role: role});
    setBusy(false);
    if (error) setError(error.message || 'تعذر إنشاء الدعوة'); else { setName(''); setRole('teacher'); load(); }
  }

  async function removeInvite(id: string) {
    if (!confirm('حذف هذه الدعوة؟ لن يعمل رمزها بعد الحذف.')) return;
    const {error} = await supabase().from('teacher_invites').delete().eq('id', id);
    if (error) setError('تعذر حذف الدعوة'); else load();
  }

  async function toggle(m: Member) {
    if (m.active && !confirm(`إيقاف حساب ${m.full_name}؟ لن يستطيع الدخول إلى بيانات المدرسة حتى تعيد تفعيله.`)) return;
    const {error} = await supabase().rpc('set_member_active', {p_user_id: m.user_id, p_active: !m.active});
    if (error) setError(error.message || 'تعذر تحديث الحساب'); else load();
  }

  function shareText(inv: Invite) {
    const link = `${window.location.origin}/join`;
    return `السلام عليكم ${inv.full_name}\nللانضمام إلى ${profile?.schools?.name ?? 'المدرسة'} في تطبيق مدار:\n1) افتح الرابط: ${link}\n2) اكتب رمز الدعوة: ${inv.code}\n3) أنشئ حسابك ببريدك وكلمة مرور.\nالرمز صالح حتى ${new Date(inv.expires_at).toLocaleDateString('ar-SA')}.`;
  }
  async function copy(inv: Invite) {
    try { await navigator.clipboard.writeText(shareText(inv)); setCopied(inv.id); setTimeout(() => setCopied(''), 2500); }
    catch { setError('تعذر النسخ. انسخ الرمز يدويًا.'); }
  }

  if (!ready) return <main style={{padding: 28}}>جارٍ التحميل...</main>;
  const input: React.CSSProperties = {width: '100%', boxSizing: 'border-box', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #b9cbd8', fontFamily: 'inherit', fontSize: 16};
  const smallBtn: React.CSSProperties = {minHeight: 40, padding: '0 14px', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer'};

  return (
    <main style={{maxWidth: 620, margin: 'auto', padding: 20}}>
      <div style={{background: t.primary, color: 'white', borderRadius: 24, padding: '20px 22px'}}>
        <h1 style={{margin: 0, fontSize: 24}}>{girls ? 'المعلمات' : 'المعلمون'}</h1>
        <p style={{margin: '6px 0 0'}}>{profile?.schools?.name}</p>
      </div>

      <form onSubmit={invite} style={{...card, marginTop: 18, padding: 16, display: 'grid', gap: 12}}>
        <b>إضافة {teacherWord}</b>
        <small style={{color: '#4a6072'}}>اكتب الاسم، فيظهر رمز دعوة. أرسله إلى {teacherWord} ليُنشئ حسابه بنفسه من صفحة الانضمام.</small>
        <label>الاسم الكامل<input required value={name} onChange={e => setName(e.target.value)} style={input}/></label>
        <label>نوع الحساب
          <select value={role} onChange={e => setRole(e.target.value as 'teacher' | 'deputy')} style={input}>
            <option value="teacher">{girls ? 'معلمة' : 'معلم'}</option>
            <option value="deputy">{girls ? 'وكيلة' : 'وكيل'}</option>
          </select>
        </label>
        <small style={{color: '#4a6072'}}>الرمز صالح لمدة 7 أيام ويُستخدم مرة واحدة.</small>
        <button disabled={busy} style={{padding: 14, border: 0, borderRadius: 12, background: t.primary, color: 'white', fontFamily: 'inherit', fontWeight: 700}}>{busy ? 'جارٍ الإنشاء' : 'إنشاء رمز دعوة'}</button>
      </form>
      {error && <p role="alert" style={{color: '#a12222'}}>{error}</p>}

      {invites.length > 0 && <>
        <h2 style={{fontSize: 15, color: '#4a6072', margin: '22px 4px 8px'}}>دعوات لم تُستخدم بعد</h2>
        <div style={{display: 'grid', gap: 10}}>
          {invites.map(inv => (
            <div key={inv.id} style={{...card, padding: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10}}>
              <span style={{flex: 1, minWidth: 140}}><b>{inv.full_name}</b> <small style={{color: '#4a6072'}}>({roleWord(inv.role)})</small><br/>
                <span style={{direction: 'ltr', display: 'inline-block', fontSize: 22, letterSpacing: 4, fontWeight: 700, color: expired(inv) ? '#9fb0c0' : t.primary, textDecoration: expired(inv) ? 'line-through' : 'none'}}>{inv.code}</span><br/>
                <small style={{color: expired(inv) ? '#a12222' : '#4a6072'}}>{expiryText(inv)}</small></span>
              {!expired(inv) && <button type="button" onClick={() => copy(inv)} style={{...smallBtn, border: 0, background: t.primary, color: 'white'}}>{copied === inv.id ? 'تم النسخ' : 'نسخ رسالة الدعوة'}</button>}
              <button type="button" onClick={() => removeInvite(inv.id)} style={{...smallBtn, border: '1px solid #d5dee7', background: 'white', color: '#a12222'}}>حذف</button>
            </div>
          ))}
        </div>
      </>}

      <h2 style={{fontSize: 15, color: '#4a6072', margin: '22px 4px 8px'}}>الحسابات</h2>
      <div style={{display: 'grid', gap: 10}}>
        {members.length === 0 && <p style={{color: '#4a6072', margin: 0}}>لم ينضم أحد بعد.</p>}
        {members.map(m => (
          <div key={m.user_id} style={{...card, padding: 14, display: 'flex', alignItems: 'center', gap: 10, opacity: m.active ? 1 : 0.65}}>
            <span style={{flex: 1}}><b>{m.full_name}</b> <small style={{color: '#4a6072'}}>({roleWord(m.role)})</small><br/>
              <small style={{color: m.active ? '#1d6f6b' : '#a12222'}}>{m.active ? 'نشط' : 'موقوف'}</small></span>
            <button type="button" onClick={() => toggle(m)} style={{...smallBtn, border: '1px solid #d5dee7', background: 'white', color: m.active ? '#a12222' : t.primary}}>{m.active ? 'إيقاف' : 'إعادة تفعيل'}</button>
          </div>
        ))}
      </div>

      <Link href="/admin" style={{display: 'block', marginTop: 24, textAlign: 'center', color: t.primary, fontWeight: 700}}>العودة إلى قسم الإدارة</Link>
    </main>
  );
}

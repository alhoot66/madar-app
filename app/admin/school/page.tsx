'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {supabase} from '../../../lib/supabase';
import {useAdmin} from '../../../lib/useAdmin';
import {themeFor} from '../../../lib/theme';

type SchoolType = 'boys' | 'girls';

export default function SchoolSettings() {
  const {ready, profile} = useAdmin();
  const [name, setName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<SchoolType>('boys');
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = themeFor(type);

  useEffect(() => {
    if (!ready || !profile) return;
    (async () => {
      const {data, error} = await supabase().from('schools').select('name,principal_name,phone,email,school_type').eq('id', profile.school_id).single();
      if (error || !data) { setError('تعذر تحميل بيانات المدرسة'); return; }
      setName(data.name ?? ''); setPrincipal(data.principal_name ?? ''); setPhone(data.phone ?? ''); setEmail(data.email ?? '');
      setType(data.school_type === 'girls' ? 'girls' : 'boys');
      setLoaded(true);
    })();
  }, [ready, profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setError('');
    if (!/^05\d{8}$/.test(phone.trim())) { setError('رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'); return; }
    setBusy(true);
    const {error} = await supabase().rpc('update_school', {p_school_name: name, p_principal_name: principal, p_phone: phone, p_email: email, p_school_type: type});
    setBusy(false);
    if (error) setError(error.message || 'تعذر الحفظ'); else setMsg('تم حفظ بيانات المدرسة');
  }

  if (!ready || !loaded) return <main style={{padding: 28}}>{error || 'جارٍ التحميل...'}</main>;
  const input: React.CSSProperties = {width: '100%', boxSizing: 'border-box', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #b9cbd8', fontFamily: 'inherit', fontSize: 16};
  const label: React.CSSProperties = {fontWeight: 700, fontSize: 15};

  return (
    <main style={{maxWidth: 520, margin: 'auto', padding: 20}}>
      <div style={{background: t.primary, color: 'white', borderRadius: 24, padding: '20px 22px'}}>
        <h1 style={{margin: 0, fontSize: 24}}>بيانات المدرسة</h1>
      </div>
      <form onSubmit={save} style={{marginTop: 18, padding: 18, background: 'white', borderRadius: 18, display: 'grid', gap: 14}}>
        <fieldset style={{border: 0, padding: 0, margin: 0}}>
          <legend style={label}>نوع المدرسة</legend>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8}}>
            {(['boys', 'girls'] as const).map(v => {
              const on = type === v; const c = themeFor(v);
              return (
                <label key={v} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 12, border: `2px solid ${on ? c.primary : '#d5dee7'}`, background: on ? c.soft : 'white', color: c.primary, fontWeight: 700, cursor: 'pointer'}}>
                  <input type="radio" name="type" value={v} checked={on} onChange={() => setType(v)}/>
                  {v === 'boys' ? 'بنين' : 'بنات'}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label style={label}>اسم المدرسة<input required value={name} onChange={e => setName(e.target.value)} style={input}/></label>
        <label style={label}>{type === 'girls' ? 'اسم المديرة' : 'اسم المدير'}<input required value={principal} onChange={e => setPrincipal(e.target.value)} style={input}/></label>
        <label style={label}>رقم الجوال<input required type="tel" inputMode="numeric" placeholder="05xxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} style={{...input, direction: 'ltr', textAlign: 'right'}}/></label>
        <label style={label}>البريد الإلكتروني<input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={{...input, direction: 'ltr', textAlign: 'right'}}/></label>
        <small style={{color: '#4a6072'}}>هذا بريد التواصل مع المدرسة، ولا يغيّر بريد تسجيل الدخول.</small>
        <button disabled={busy} style={{padding: 14, border: 0, borderRadius: 12, background: t.primary, color: 'white', fontFamily: 'inherit', fontSize: 16, fontWeight: 700}}>{busy ? 'جارٍ الحفظ' : 'حفظ'}</button>
        {error && <p role="alert" style={{color: '#a12222', margin: 0}}>{error}</p>}
        {msg && <p role="status" style={{margin: 0}}>{msg}</p>}
      </form>
      <Link href="/admin" style={{display: 'block', marginTop: 20, textAlign: 'center', color: t.primary, fontWeight: 700}}>العودة إلى قسم الإدارة</Link>
    </main>
  );
}

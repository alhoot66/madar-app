'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {supabase} from '../../lib/supabase';
import {themeFor} from '../../lib/theme';

type SchoolType = 'boys' | 'girls';

export default function Register() {
  const router = useRouter();
  const [schoolName, setSchoolName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState<SchoolType>('boys');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const t = themeFor(type);

  const input: React.CSSProperties = {width: '100%', boxSizing: 'border-box', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #b9cbd8', fontFamily: 'inherit', fontSize: 16};
  const label: React.CSSProperties = {fontWeight: 700, fontSize: 15};

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setInfo('');
    if (!/^05\d{8}$/.test(phone.trim())) { setError('رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'); return; }
    setBusy(true);
    try {
      const db = supabase();
      const {data, error: signUpError} = await db.auth.signUp({email: email.trim(), password});
      if (signUpError) throw signUpError;
      if (!data.session) {
        setInfo('أرسلنا رابط تفعيل إلى بريدك. فعّل الحساب ثم سجّل الدخول لإكمال تسجيل المدرسة.');
        try { localStorage.setItem('madar_pending_school', JSON.stringify({schoolName, principal, phone, email, type})); } catch {}
        return;
      }
      const {error: rpcError} = await db.rpc('register_school', {
        p_school_name: schoolName, p_principal_name: principal, p_phone: phone, p_email: email, p_school_type: type,
      });
      if (rpcError) throw rpcError;
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر التسجيل');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{maxWidth: 460, margin: '6vh auto', padding: 28, background: 'white', borderRadius: 18}}>
      <h1 style={{marginTop: 0, color: t.primary}}>تسجيل مدرسة جديدة</h1>
      <p style={{color: '#4a6072'}}>جميع الحقول مطلوبة. من يسجّل المدرسة يصبح مديرها في التطبيق.</p>
      <form onSubmit={submit} style={{display: 'grid', gap: 14}}>
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
        <label style={label}>اسم المدرسة<input required value={schoolName} onChange={e => setSchoolName(e.target.value)} style={input}/></label>
        <label style={label}>{type === 'girls' ? 'اسم المديرة' : 'اسم المدير'}<input required value={principal} onChange={e => setPrincipal(e.target.value)} style={input}/></label>
        <label style={label}>رقم الجوال<input required type="tel" inputMode="numeric" placeholder="05xxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} style={{...input, direction: 'ltr', textAlign: 'right'}}/></label>
        <label style={label}>البريد الإلكتروني<input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={{...input, direction: 'ltr', textAlign: 'right'}}/></label>
        <label style={label}>كلمة المرور<input required type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} style={input}/></label>
        <button disabled={busy} style={{padding: 14, border: 0, borderRadius: 12, background: t.primary, color: 'white', fontFamily: 'inherit', fontSize: 16, fontWeight: 700}}>{busy ? 'جارٍ التسجيل' : 'تسجيل المدرسة'}</button>
        {error && <p role="alert" style={{color: '#a12222', margin: 0}}>{error}</p>}
        {info && <p role="status" style={{margin: 0}}>{info}</p>}
      </form>
      <p style={{textAlign: 'center'}}>لديك حساب؟ <Link href="/login">تسجيل الدخول</Link></p>
      <p style={{textAlign: 'center'}}>معلم أو وكيل وصلك رمز دعوة؟ <Link href="/join">انضم إلى مدرستك</Link></p>
    </main>
  );
}

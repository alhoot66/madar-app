'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {supabase} from '../../lib/supabase';

const navy = '#173f68';

export default function Join() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasAccount, setHasAccount] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setInfo('');
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(c)) { setError('رمز الدعوة 6 خانات (حروف إنجليزية وأرقام)'); return; }
    setBusy(true);
    try {
      const db = supabase();
      if (hasAccount) {
        const {error} = await db.auth.signInWithPassword({email: email.trim(), password});
        if (error) throw error;
      } else {
        const {data, error} = await db.auth.signUp({email: email.trim(), password});
        if (error) throw error;
        if (!data.session) {
          try { localStorage.setItem('madar_pending_join', c); } catch {}
          setInfo('أرسلنا رابط تفعيل إلى بريدك. فعّل الحساب ثم سجّل الدخول، وسيكتمل الانضمام تلقائيًا.');
          return;
        }
      }
      const {error: rpcError} = await db.rpc('join_school', {p_code: c});
      if (rpcError) throw rpcError;
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر الانضمام');
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = {width: '100%', boxSizing: 'border-box', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #b9cbd8', fontFamily: 'inherit', fontSize: 16};
  const label: React.CSSProperties = {fontWeight: 700, fontSize: 15};

  return (
    <main style={{maxWidth: 440, margin: '6vh auto', padding: 28, background: 'white', borderRadius: 18}}>
      <h1 style={{marginTop: 0, color: navy}}>انضمام معلم / معلمة</h1>
      <p style={{color: '#4a6072'}}>اكتب رمز الدعوة الذي وصلك من إدارة المدرسة.</p>
      <form onSubmit={submit} style={{display: 'grid', gap: 14}}>
        <label style={label}>رمز الدعوة<input required autoCapitalize="characters" maxLength={6} value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{...input, direction: 'ltr', textAlign: 'center', fontSize: 22, letterSpacing: 6}}/></label>
        <label style={label}>البريد الإلكتروني<input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={{...input, direction: 'ltr', textAlign: 'right'}}/></label>
        <label style={label}>كلمة المرور<input required type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} style={input}/></label>
        <label style={{display: 'flex', gap: 8, alignItems: 'center'}}><input type="checkbox" checked={hasAccount} onChange={e => setHasAccount(e.target.checked)}/>لدي حساب في مدار من قبل</label>
        <button disabled={busy} style={{padding: 14, border: 0, borderRadius: 12, background: navy, color: 'white', fontFamily: 'inherit', fontSize: 16, fontWeight: 700}}>{busy ? 'جارٍ الانضمام' : 'انضمام'}</button>
        {error && <p role="alert" style={{color: '#a12222', margin: 0}}>{error}</p>}
        {info && <p role="status" style={{margin: 0}}>{info}</p>}
      </form>
      <p style={{textAlign: 'center'}}><Link href="/login">تسجيل الدخول</Link></p>
    </main>
  );
}

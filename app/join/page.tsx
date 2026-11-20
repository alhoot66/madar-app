'use client';
import {useEffect, useState} from 'react';
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
  // إذا كان المستخدم مسجّل الدخول (مثلًا فعّل بريده من جهاز آخر)، يكفيه كتابة الرمز.
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const e = new URLSearchParams(window.location.search).get('error');
      if (e) setError(e);
    } catch {}
    supabase().auth.getUser().then(({data}) => { if (data.user) setSignedInAs(data.user.email ?? ''); }).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setInfo('');
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(c)) { setError('رمز الدعوة 6 خانات (حروف إنجليزية وأرقام)'); return; }
    setBusy(true);
    try {
      const db = supabase();
      if (signedInAs === null) {
        if (hasAccount) {
          const {error} = await db.auth.signInWithPassword({email: email.trim(), password});
          if (error) throw error;
        } else {
          const {data, error} = await db.auth.signUp({email: email.trim(), password});
          if (error) throw error;
          // Supabase لا يُظهر خطأ للبريد المسجّل مسبقًا، بل يعيد مستخدمًا بلا هويات.
          if (data.user && data.user.identities && data.user.identities.length === 0) {
            setHasAccount(true);
            setError('هذا البريد مسجّل من قبل. اكتب كلمة مرورك واضغط انضمام.');
            return;
          }
          if (!data.session) {
            try { localStorage.setItem('madar_pending_join', c); } catch {}
            setInfo('أرسلنا رابط تفعيل إلى بريدك. فعّل الحساب ثم سجّل الدخول، وسيكتمل الانضمام تلقائيًا. إذا سجّلت الدخول من جهاز آخر، افتح صفحة الانضمام واكتب الرمز مرة أخرى.');
            return;
          }
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

  async function signOut() {
    await supabase().auth.signOut();
    setSignedInAs(null);
  }

  const input: React.CSSProperties = {width: '100%', boxSizing: 'border-box', padding: 12, marginTop: 6, borderRadius: 10, border: '1px solid #b9cbd8', fontFamily: 'inherit', fontSize: 16};
  const label: React.CSSProperties = {fontWeight: 700, fontSize: 15};

  return (
    <main style={{maxWidth: 440, margin: '6vh auto', padding: 28, background: 'white', borderRadius: 18}}>
      <h1 style={{marginTop: 0, color: navy}}>انضمام معلم / وكيل</h1>
      <p style={{color: '#4a6072'}}>اكتب رمز الدعوة الذي وصلك من إدارة المدرسة.</p>
      <form onSubmit={submit} style={{display: 'grid', gap: 14}}>
        <label style={label}>رمز الدعوة<input required autoCapitalize="characters" maxLength={6} value={code} onChange={e => setCode(e.target.value.toUpperCase())} style={{...input, direction: 'ltr', textAlign: 'center', fontSize: 22, letterSpacing: 6}}/></label>
        {signedInAs !== null ? (
          <p style={{margin: 0, padding: '10px 14px', borderRadius: 12, background: '#e3eef8', fontSize: 14}}>
            مسجّل الدخول بالبريد <b style={{direction: 'ltr', display: 'inline-block'}}>{signedInAs}</b>.{' '}
            <button type="button" onClick={signOut} style={{background: 'none', border: 0, padding: 0, color: navy, fontFamily: 'inherit', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer'}}>استخدم بريدًا آخر</button>
          </p>
        ) : <>
          <label style={label}>البريد الإلكتروني<input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={{...input, direction: 'ltr', textAlign: 'right'}}/></label>
          <label style={label}>كلمة المرور<input required type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} style={input}/></label>
          <label style={{display: 'flex', gap: 8, alignItems: 'center'}}><input type="checkbox" checked={hasAccount} onChange={e => setHasAccount(e.target.checked)}/>لدي حساب في مدار من قبل</label>
        </>}
        <button disabled={busy} style={{padding: 14, border: 0, borderRadius: 12, background: navy, color: 'white', fontFamily: 'inherit', fontSize: 16, fontWeight: 700}}>{busy ? 'جارٍ الانضمام' : 'انضمام'}</button>
        {error && <p role="alert" style={{color: '#a12222', margin: 0}}>{error}</p>}
        {info && <p role="status" style={{margin: 0}}>{info}</p>}
      </form>
      <p style={{textAlign: 'center'}}><Link href="/login">تسجيل الدخول</Link></p>
    </main>
  );
}

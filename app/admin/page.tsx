'use client';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {supabase} from '../../lib/supabase';
import {DEFAULT_ADMIN_PIN, checkPin, changePin, isDefaultPin} from '../../lib/admin-pin';

const navy = '#173f68';
const card: React.CSSProperties = {background: 'white', borderRadius: 18, boxShadow: '0 4px 14px rgba(23,63,104,0.07)', overflow: 'hidden'};
const row: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: 2, padding: '14px 16px', borderBottom: '1px solid #e6edf4'};
const keyStyle: React.CSSProperties = {height: 64, border: 0, borderRadius: 18, background: 'white', boxShadow: '0 3px 10px rgba(23,63,104,0.08)', color: navy, fontFamily: 'inherit', fontSize: 26, fontWeight: 700, cursor: 'pointer'};

type Profile = {role: string; full_name: string; schools: {name: string; school_type: string | null} | null};

export default function Admin() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [usingDefault, setUsingDefault] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const db = supabase();
        const {data: {user}} = await db.auth.getUser();
        if (!user) { router.replace('/login'); return; }
        const {data} = await db.from('profiles').select('role,full_name,schools(name,school_type)').eq('user_id', user.id).single();
        if (active) { setProfile((data as unknown as Profile) ?? null); setUsingDefault(isDefaultPin()); setReady(true); }
      } catch { router.replace('/login'); }
    })();
    return () => { active = false; };
  }, [router]);

  async function press(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next); setError('');
    if (next.length === 4) {
      if (await checkPin(next)) setUnlocked(true);
      else { setError('الرقم السري غير صحيح'); setPin(''); }
    }
  }

  if (!ready) return <main style={{padding: 28}}>جارٍ التحقق من صلاحيات الدخول...</main>;

  if (!unlocked) return (
    <main style={{maxWidth: 420, margin: 'auto', padding: '56px 24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: '100vh', boxSizing: 'border-box'}}>
      <h1 style={{margin: 0, fontSize: 26}}>قسم الإدارة</h1>
      <p style={{color: '#4a6072'}}>أدخل الرقم السري للإدارة</p>
      <div role="img" aria-label={`أُدخل ${pin.length} من 4`} style={{display: 'flex', gap: 18, margin: '16px 0', direction: 'ltr'}}>
        {[0, 1, 2, 3].map(i => <span key={i} style={{width: 20, height: 20, borderRadius: '50%', border: `2px solid ${navy}`, background: i < pin.length ? navy : 'transparent'}}/>)}
      </div>
      {usingDefault && <p style={{padding: '10px 16px', borderRadius: 12, background: '#e3eef8', fontSize: 14}}>الرقم الافتراضي: <b style={{direction: 'ltr', display: 'inline-block', letterSpacing: 3}}>{DEFAULT_ADMIN_PIN}</b> — يغيّره المدير من قسم الإدارة</p>}
      {error && <p role="alert" style={{color: '#a12222'}}>{error}</p>}
      <div style={{flex: 1}}/>
      <div style={{width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, direction: 'ltr'}}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => <button key={d} type="button" style={keyStyle} onClick={() => press(d)}>{d}</button>)}
        <button type="button" style={{...keyStyle, background: 'transparent', boxShadow: 'none', fontSize: 17}} onClick={() => router.push('/dashboard')}>رجوع</button>
        <button type="button" style={keyStyle} onClick={() => press('0')}>0</button>
        <button type="button" style={{...keyStyle, background: 'transparent', boxShadow: 'none', fontSize: 17}} onClick={() => setPin(pin.slice(0, -1))}>مسح</button>
      </div>
    </main>
  );

  const typeLabel = profile?.schools?.school_type === 'girls' ? 'بنات' : profile?.schools?.school_type === 'boys' ? 'بنين' : '';
  return (
    <main style={{maxWidth: 520, margin: 'auto', padding: 20}}>
      <div style={{background: navy, color: 'white', borderRadius: 24, padding: 20, display: 'flex', flexDirection: 'column', gap: 8}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12}}>
          <h1 style={{margin: 0, fontSize: 26}}>قسم الإدارة</h1>
          <button type="button" onClick={() => { setUnlocked(false); setPin(''); }} style={{height: 44, padding: '0 14px', border: 0, borderRadius: 12, background: 'rgba(255,255,255,0.14)', color: 'white', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer'}}>قفل</button>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', gap: 10}}>
          <span style={{fontSize: 18, fontWeight: 700}}>{profile?.schools?.name || 'مدرستك'}</span>
          {typeLabel && <span style={{padding: '4px 12px', borderRadius: 999, background: '#8bd3d0', color: '#0f2c49', fontSize: 13, fontWeight: 700}}>{typeLabel}</span>}
        </div>
      </div>

      <h2 style={{fontSize: 15, color: '#4a6072', margin: '22px 4px 8px'}}>المدرسة</h2>
      <div style={card}>
        <div style={row}><b>بيانات المدرسة</b><small style={{color: '#4a6072'}}>الاسم، المدير، الجوال، البريد — قيد التطوير</small></div>
        <div style={{...row, borderBottom: 0}}><b>المعلمون</b><small style={{color: '#4a6072'}}>إضافة المعلمين وإدارة حساباتهم — قيد التطوير</small></div>
      </div>

      <h2 style={{fontSize: 15, color: '#4a6072', margin: '22px 4px 8px'}}>الحماية</h2>
      <ChangePin onChanged={() => setUsingDefault(false)} usingDefault={usingDefault}/>

      <Link href="/dashboard" style={{display: 'block', marginTop: 24, padding: 14, textAlign: 'center', border: `1.5px solid ${navy}`, borderRadius: 14, color: navy, textDecoration: 'none', fontWeight: 700}}>العودة إلى لوحة التحكم</Link>
    </main>
  );
}

function ChangePin({onChanged, usingDefault}: {onChanged: () => void; usingDefault: boolean}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const input: React.CSSProperties = {width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '1px solid #b9cbd8', fontFamily: 'inherit', fontSize: 18, letterSpacing: 4, direction: 'ltr', textAlign: 'center'};
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const err = await changePin(current, next);
    setBusy(false);
    if (err) setMsg(err); else { setMsg('تم تغيير الرقم السري'); setCurrent(''); setNext(''); onChanged(); }
  }
  return (
    <form onSubmit={submit} style={{...card, padding: 16, display: 'grid', gap: 12}}>
      <b>تغيير الرقم السري</b>
      {usingDefault && <small style={{color: '#8a4b00'}}>الرقم الحالي هو الافتراضي (1234). غيّره حتى لا يدخل غير المدير.</small>}
      <label>الرقم الحالي<input type="password" inputMode="numeric" maxLength={4} required value={current} onChange={e => setCurrent(e.target.value)} style={input}/></label>
      <label>الرقم الجديد (4 أرقام)<input type="password" inputMode="numeric" maxLength={4} required value={next} onChange={e => setNext(e.target.value)} style={input}/></label>
      <button disabled={busy} style={{padding: 14, border: 0, borderRadius: 12, background: navy, color: 'white', fontFamily: 'inherit', fontWeight: 700}}>{busy ? 'جارٍ الحفظ' : 'حفظ الرقم الجديد'}</button>
      {msg && <p role="status" style={{margin: 0}}>{msg}</p>}
    </form>
  );
}

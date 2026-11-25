import React, {useEffect, useState} from 'react';
import {View, Text, TextInput, Pressable, ActivityIndicator, Share, StyleSheet} from 'react-native';
import {supabase} from './supabase';

// الفصول ← الطلاب ← ملاحظة بمساعدة Claude.
// المعلم يرى فصوله فقط (سياسات RLS في Supabase)، والمدير والوكيل يرون كل الفصول.
// الطلب يذهب إلى دالة student-comment على Supabase، ومفتاح Claude لا يصل إلى الجوال.
// اسم الطالب لا يُرسل إلى Claude، والدالة تحذفه من النقاط إن كتبه المعلم.

type Row = {id: string; name: string};
type Kind = 'report' | 'parent';

export function ClassNotes({onBack}: {onBack: () => void}) {
  const [cls, setCls] = useState<Row | null>(null);
  const [student, setStudent] = useState<Row | null>(null);

  if (student) return <StudentNote student={student} onBack={() => setStudent(null)}/>;
  if (cls) return <List key={cls.id} title={`طلاب ${cls.name}`} load={() => loadStudents(cls.id)} empty="لا يوجد طلاب في هذا الفصل" onPick={setStudent} onBack={() => setCls(null)}/>;
  return <List title="فصولي" load={loadClasses} empty="لا توجد فصول مسندة إليك بعد" onPick={setCls} onBack={onBack}/>;
}

async function loadClasses(): Promise<Row[]> {
  const {data, error} = await supabase.from('classes').select('id,name').order('name');
  if (error) throw error;
  return data ?? [];
}

async function loadStudents(classId: string): Promise<Row[]> {
  const {data, error} = await supabase.from('students').select('id,full_name').eq('class_id', classId).order('full_name');
  if (error) throw error;
  return (data ?? []).map(s => ({id: s.id, name: s.full_name}));
}

function List({title, load, empty, onPick, onBack}: {title: string; load: () => Promise<Row[]>; empty: string; onPick: (r: Row) => void; onBack: () => void}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    load().then(r => { if (alive) setRows(r); }, () => { if (alive) setError('تعذر التحميل. تحقق من الإنترنت.'); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- تحميل مرة واحدة لكل شاشة (المفتاح key يتغير مع الفصل)
  }, []);

  return (
    <View style={{gap: 10}}>
      <Back onPress={onBack}/>
      <Text style={s.heading}>{title}</Text>
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text>
        : rows === null ? <ActivityIndicator/>
        : rows.length === 0 ? <Text style={s.muted}>{empty}</Text>
        : rows.map(r => (
          <Pressable key={r.id} accessibilityRole="button" onPress={() => onPick(r)} style={({pressed}) => [s.row, pressed && {opacity: 0.6}]}>
            <Text style={s.rowText}>{r.name}</Text>
            <Text style={s.chevron}>‹</Text>
          </Pressable>
        ))}
    </View>
  );
}

function StudentNote({student, onBack}: {student: Row; onBack: () => void}) {
  const [kind, setKind] = useState<Kind>('report');
  const [notes, setNotes] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ready = notes.trim().length >= 3;

  async function generate() {
    setBusy(true); setError('');
    const {data, error} = await supabase.functions.invoke('student-comment', {body: {student_id: student.id, notes, kind}});
    setBusy(false);
    if (error) {
      let message = 'تعذر الاتصال بخدمة الكتابة. تحقق من الإنترنت وحاول مرة أخرى.';
      try { const body = await (error as {context?: Response}).context?.json(); if (body?.error) message = body.error; } catch {}
      setError(message);
      return;
    }
    setText(data?.text ?? '');
  }

  const tab = (k: Kind, label: string) => (
    <Pressable accessibilityRole="button" accessibilityState={{selected: kind === k}} onPress={() => setKind(k)} style={[s.tab, kind === k && s.tabOn]}>
      <Text style={[s.tabText, kind === k && {color: 'white'}]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{gap: 12}}>
      <Back onPress={onBack}/>
      <Text style={s.heading}>ملاحظة عن {student.name}</Text>
      <View style={{flexDirection: 'row-reverse', gap: 8}}>
        {tab('report', 'تعليق للشهادة')}
        {tab('parent', 'رسالة لولي الأمر')}
      </View>
      <Text style={s.label}>اكتب نقاطًا قصيرة عن الطالب</Text>
      <TextInput style={[s.input, {minHeight: 110}]} multiline maxLength={1200} value={notes} onChangeText={setNotes}
        placeholder="مثال: مشارك في الحصة، خطه جميل، يتأخر في تسليم الواجبات" textAlignVertical="top"/>
      <Text style={s.hint}>لا تكتب أسماء ولا أرقام هوية أو جوال. إن كتبت اسم الطالب يُحذف تلقائيًا قبل الإرسال. راجع النص قبل استخدامه.</Text>
      <Pressable accessibilityRole="button" disabled={busy || !ready} onPress={generate} style={[s.button, !ready && {backgroundColor: '#9fb0c0'}]}>
        {busy ? <ActivityIndicator color="white"/> : <Text style={s.buttonText}>{text ? 'اكتب صياغة أخرى' : 'اكتب الملاحظة'}</Text>}
      </Pressable>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {!!text && (
        <>
          <Text style={s.label}>النص (يمكنك تعديله)</Text>
          <TextInput style={[s.input, {minHeight: 140}]} multiline value={text} onChangeText={setText} textAlignVertical="top"/>
          <Pressable accessibilityRole="button" onPress={() => Share.share({message: text}).catch(() => {})} style={s.outline}>
            <Text style={s.outlineText}>مشاركة أو نسخ النص</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function Back({onPress}: {onPress: () => void}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={12} style={{alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center'}}>
      <Text style={{color: '#173f68', fontWeight: '700', fontSize: 16}}>رجوع ›</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  heading: {fontSize: 21, fontWeight: '700', color: '#173f68', textAlign: 'right'},
  label: {fontWeight: '700', color: '#24384a', textAlign: 'right'},
  muted: {color: '#64748b', textAlign: 'right'},
  hint: {backgroundColor: '#e3eef8', padding: 10, borderRadius: 10, fontSize: 13, textAlign: 'right', color: '#24384a'},
  error: {color: '#a12222', textAlign: 'right'},
  row: {backgroundColor: 'white', minHeight: 54, paddingHorizontal: 18, borderRadius: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between'},
  rowText: {fontSize: 16, color: '#24384a'},
  chevron: {fontSize: 22, color: '#9fb0c0'},
  tab: {flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#d5dee7', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center'},
  tabOn: {backgroundColor: '#173f68', borderColor: '#173f68'},
  tabText: {fontWeight: '700', color: '#24384a'},
  input: {backgroundColor: 'white', borderColor: '#b9cbd8', borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, textAlign: 'right', writingDirection: 'rtl'},
  button: {backgroundColor: '#173f68', minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  buttonText: {color: 'white', fontWeight: '700', fontSize: 16},
  outline: {minHeight: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#173f68', alignItems: 'center', justifyContent: 'center'},
  outlineText: {color: '#173f68', fontWeight: '700', fontSize: 16},
});

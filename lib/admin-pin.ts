// قفل قسم الإدارة برقم سري على هذا الجهاز.
// ملاحظة: هذا قفل للواجهة فقط حتى لا يدخل المعلمون قسم الإدارة من جهاز المدرسة.
// الحماية الحقيقية للبيانات تبقى في سياسات RLS في Supabase حسب دور المستخدم.

export const DEFAULT_ADMIN_PIN = '1234';
const STORAGE_KEY = 'madar_admin_pin_hash';

async function hash(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`madar:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function readStored(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

/** هل ما زال الرقم السري هو الافتراضي (1234)؟ */
export function isDefaultPin(): boolean {
  return readStored() === null;
}

export async function checkPin(pin: string): Promise<boolean> {
  const stored = readStored();
  if (stored === null) return pin === DEFAULT_ADMIN_PIN;
  return (await hash(pin)) === stored;
}

export async function changePin(current: string, next: string): Promise<string | null> {
  if (!(await checkPin(current))) return 'الرقم السري الحالي غير صحيح';
  if (!/^\d{4}$/.test(next)) return 'الرقم السري الجديد يجب أن يكون 4 أرقام';
  try { localStorage.setItem(STORAGE_KEY, await hash(next)); } catch { return 'تعذر حفظ الرقم السري على هذا الجهاز'; }
  return null;
}

// بعد إدخال الرقم السري يبقى قسم الإدارة مفتوحًا في هذه النافذة فقط حتى يُقفل أو تُغلق النافذة،
// حتى تعمل صفحات الإدارة الفرعية (بيانات المدرسة، المعلمون) دون إعادة إدخال الرقم.
const SESSION_KEY = 'madar_admin_unlocked';
export function markUnlocked(): void { try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {} }
export function isUnlocked(): boolean { try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; } }
export function lockAdmin(): void { try { sessionStorage.removeItem(SESSION_KEY); } catch {} }

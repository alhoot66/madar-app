// إزالة البيانات الشخصية من نقاط المعلم قبل إرسالها إلى Claude.
//
// ما تحذفه:
//   - أجزاء اسم هذا الطالب، كما هو مسجّل في قاعدة البيانات، حتى مع اختلاف الهمزات والتاء المربوطة،
//     ومع حروف ملتصقة في أوله مثل «و» و«ل».
//   - كل رقم متصل من 6 خانات فأكثر (هوية، جوال، رقم سجل)، بالأرقام العربية أو الهندية.
//
// ما لا تحذفه: أسماء أشخاص آخرين يكتبها المعلم. لذلك تطلب الواجهة صراحة عدم كتابة أي أسماء.

// كلمات شائعة في الأسماء المركبة لا تميّز الشخص وحدها، وحذفها يفسد جملًا عادية.
const SKIP = new Set(['بن', 'بنت', 'ابن', 'ابو', 'ام', 'عبد', 'الله', 'ال']);

function fold(s: string): string {
  return s.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ً-ْـ]/g, '');
}

const CLASS: Record<string, string> = {'ا': '[اأإآ]', 'ي': '[يى]', 'ه': '[هة]'};
const MARKS = '[\\u064B-\\u0652\\u0640]*'; // تشكيل وتطويل اختياري بين الحروف

function pattern(token: string): string {
  return [...token].map(c => (CLASS[c] ?? c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) + MARKS).join('');
}

export function redact(notes: string, fullName: string): string {
  const tokens = [...new Set(fold(fullName).split(/[\s\-ـ]+/).filter(t => t.length >= 2 && !SKIP.has(t)))];
  let out = notes;
  for (const t of tokens) {
    // ليس قبله حرف (مع السماح ببادئة أو اثنتين مثل و ف ب ل ك: «ولمحمد»)، وليس بعده حرف.
    const re = new RegExp(`(?<!\\p{L})[وفبلك]{0,2}${pattern(t)}(?!\\p{L})`, 'gu');
    out = out.replace(re, 'الطالب');
  }
  // منع الخروج من وسم <notes> في نص الطلب.
  out = out.replace(/<\s*\/?\s*notes\s*>/gi, '');
  // أرقام متصلة فقط، حتى لا تُحذف قائمة درجات مثل «15 16 17».
  return out.replace(/[0-9٠-٩۰-۹]{6,}/g, '[رقم محذوف]');
}

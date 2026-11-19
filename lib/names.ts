// تحويل نص ملصوق (من نور أو Excel) إلى قائمة أسماء نظيفة.
// - اسم في كل سطر
// - إذا كان السطر فيه أعمدة (مفصولة بـ Tab)، نأخذ أطول عمود فيه حروف عربية أو لاتينية
// - نحذف الأرقام في بداية السطر (رقم تسلسلي) والأسطر التي لا تحتوي حروفًا

const LETTERS = /[\p{L}]/u;
// عناوين أعمدة شائعة في كشوف نور و Excel
const HEADER = /^(اسم|الاسم|اسم الطالب|اسم الطالبة|الطالب|الطالبة|م|رقم|رقم الهوية|السجل المدني|الفصل|الصف|name|student)( |$)/i;

function cleanCell(cell: string): string {
  return cell.replace(/^[\s\d\-.)٠-٩]+/, '').replace(/ـ/g, '').replace(/\s+/g, ' ').trim();
}

export function parseNames(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const cells = raw.split('\t').map(cleanCell).filter(c => LETTERS.test(c) && !/^\d+$/.test(c));
    if (cells.length === 0) continue;
    const name = cells.reduce((a, b) => (b.length > a.length ? b : a));
    if (HEADER.test(name)) continue;
    if (name.split(' ').length < 2 && cells.length > 1) continue; // غالبًا عنوان عمود
    out.push(name);
  }
  return out;
}

export function normalize(name: string): string {
  return name
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ً-ْـ]/g, '') // التشكيل والتطويل
    .replace(/\s+/g, ' ')
    .trim();
}

/** يقسم الأسماء إلى جديدة ومكررة (داخل القائمة نفسها أو موجودة في الفصل). */
export function splitNew(names: string[], existing: string[]): {fresh: string[]; dupes: string[]} {
  const seen = new Set(existing.map(normalize));
  const fresh: string[] = [];
  const dupes: string[] = [];
  for (const n of names) {
    const k = normalize(n);
    if (seen.has(k)) dupes.push(n);
    else { seen.add(k); fresh.push(n); }
  }
  return {fresh, dupes};
}

// ألوان مدار حسب نوع المدرسة: بنين = أزرق، بنات = موف.
export type SchoolType = 'boys' | 'girls' | 'mixed' | null | undefined;

export type Theme = {primary: string; primaryDark: string; accent: string; soft: string};

const boys: Theme = {primary: '#173f68', primaryDark: '#0f2c49', accent: '#8bd3d0', soft: '#e3eef8'};
const girls: Theme = {primary: '#76457a', primaryDark: '#55305a', accent: '#e3c6e6', soft: '#f3e8f4'};

export function themeFor(type: SchoolType): Theme {
  return type === 'girls' ? girls : boys;
}

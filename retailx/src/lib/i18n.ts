import { D } from './dict';

export type Lang = 'ur' | 'en';
// [English, Urdu?]  — a missing Urdu entry falls back to English, so apps can add English-only strings.
type Entry = [string, string?];
const ALL: Record<string, Entry> = { ...D };

/** Apps add their own strings with registerDict({...}) (see src/lib/strings.ts). */
export function registerDict(extra: Record<string, Entry>) { Object.assign(ALL, extra); }

export function translate(key: string, lang: Lang): string {
  const e = ALL[key];
  if (!e) return key;
  return (lang === 'ur' ? e[1] : e[0]) || e[0];
}
export type TFn = (key: string, lang?: Lang) => string;

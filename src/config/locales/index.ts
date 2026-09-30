import type { Language, LocalizedText } from '../../types';
import en, { type Messages } from './en';
import th from './th';

export type { Messages };

export const MESSAGES: Record<Language, Messages> = { th, en };

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'th', label: 'ไทย' },
  { id: 'en', label: 'English' },
];

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Every valid dotted message key, e.g. `"landing.startAr"`. */
export type MessageKey = Paths<Messages>;

export type Vars = Record<string, string | number>;

export function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === 'string' ? node : undefined;
}

export function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/**
 * Translate a key. Falls back to English, then to the key itself, so a
 * missing translation is visible but never crashes the UI.
 */
export function translate(language: Language, key: string, vars?: Vars): string {
  const text = lookup(MESSAGES[language], key) ?? lookup(MESSAGES.en, key) ?? key;
  return interpolate(text, vars);
}

export function localized(text: LocalizedText, language: Language): string {
  return text[language] || text.en;
}

/** Collect every dotted key in a messages object (used by tests). */
export function allKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj === 'string') return [prefix];
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).flatMap(([k, v]) => allKeys(v, prefix ? `${prefix}.${k}` : k));
}

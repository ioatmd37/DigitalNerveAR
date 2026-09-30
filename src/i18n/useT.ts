import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { translate, type MessageKey, type Vars } from '../config/locales';
import type { AnatomyLayer, AnatomyStructure, LocalizedText } from '../types';

/** Translation hook. `t` is typed; `td` accepts config-driven dynamic keys. */
export function useT() {
  const language = useAppStore((s) => s.language);
  const t = useCallback((key: MessageKey, vars?: Vars) => translate(language, key, vars), [language]);
  const td = useCallback((key: string, vars?: Vars) => translate(language, key, vars), [language]);
  const loc = useCallback((text: LocalizedText) => text[language] || text.en, [language]);
  /** Primary name in the current language, secondary in the other language. */
  const names = useCallback(
    (item: Pick<AnatomyStructure | AnatomyLayer, 'nameTh' | 'nameEn'>) =>
      language === 'th'
        ? { primary: item.nameTh, secondary: item.nameEn }
        : { primary: item.nameEn, secondary: item.nameTh },
    [language],
  );
  return { t, td, loc, names, language };
}

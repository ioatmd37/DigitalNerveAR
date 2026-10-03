import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n/useT';
import type { PanelTab } from '../types';
import { Icon } from './Icon';

const GROUPS: { key: 'learn' | 'practice' | 'instructor'; tabs: PanelTab[] }[] = [
  { key: 'learn', tabs: ['surface', 'anatomy', 'layers', 'guided'] },
  { key: 'practice', tabs: ['needle', 'osce', 'quiz'] },
  { key: 'instructor', tabs: ['assessment', 'simple', 'transthecal', 'calibration'] },
];

/** Compact mode picker for the side panel (landscape), grouped Learn / Practice / Instructor. */
export function ModeMenu({ tabs, active, onSelect }: { tabs: PanelTab[]; active: PanelTab; onSelect: (t: PanelTab) => void }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        className="flex h-12 w-full items-center gap-2 px-4 text-left hover:bg-slate-800"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-xs text-slate-400">{t('common.mode')}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-50">{t(`modes.${active}`)}</span>
        <Icon name="chevronDown" className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute inset-x-2 top-12 z-30 rounded-md border border-slate-700 bg-slate-900 py-1">
          {GROUPS.map((g) => {
            const items = g.tabs.filter((x) => tabs.includes(x));
            if (!items.length) return null;
            return (
              <div key={g.key} className="py-1">
                <p className="px-3 pb-1 pt-1.5 text-xs text-slate-500">{t(`modeGroups.${g.key}`)}</p>
                {items.map((tab) => (
                  <button
                    key={tab}
                    role="option"
                    aria-selected={tab === active}
                    onClick={() => {
                      onSelect(tab);
                      setOpen(false);
                    }}
                    className={`flex min-h-10 w-full items-center justify-between px-3 text-left text-sm ${
                      tab === active ? 'bg-slate-800 font-semibold text-slate-50' : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {t(`modes.${tab}`)}
                    {tab === active && <Icon name="check" size={16} />}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

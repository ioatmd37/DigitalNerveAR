import { getLayer, getStructure } from '../config/anatomy';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';

/** Label card for the tapped structure: Thai + English names, notes, warnings. */
export function StructureCard() {
  const { t, loc, names } = useT();
  const id = useAppStore((s) => s.selectedStructure);
  const select = useAppStore((s) => s.selectStructure);
  if (!id) return null;
  const s = getStructure(id);
  const n = names(s);
  const layer = getLayer(s.layer);
  return (
    <div className="card pointer-events-auto max-h-full w-full max-w-sm overflow-y-auto p-4" role="dialog" aria-label={n.primary}>
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black text-slate-950 ring-2 ring-white/40"
          style={{ backgroundColor: s.color }}
          aria-hidden
        >
          {s.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-tight text-white">{n.primary}</h3>
          <p className="text-sm text-slate-300">{n.secondary}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {t('structureCard.layer')}: {names(layer).primary}
          </p>
        </div>
        <button
          className="-mr-1 -mt-1 flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-800 hover:text-white"
          onClick={() => select(null)}
          aria-label={t('common.close')}
        >
          ×
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-100">{loc(s.description)}</p>
      <div className="mt-3 rounded-xl bg-cyan-950/60 p-3 text-sm ring-1 ring-cyan-800">
        <p className="font-semibold text-cyan-200">ℹ {t('structureCard.note')}</p>
        <p className="mt-1 leading-relaxed text-slate-100">{loc(s.educationalNote)}</p>
      </div>
      {s.warningNote && (
        <div className="mt-2 rounded-xl bg-rose-950/60 p-3 text-sm ring-1 ring-rose-800">
          <p className="font-semibold text-rose-200">⚠ {t('structureCard.warning')}</p>
          <p className="mt-1 leading-relaxed text-slate-100">{loc(s.warningNote)}</p>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">{t('structureCard.simplified')}</p>
    </div>
  );
}

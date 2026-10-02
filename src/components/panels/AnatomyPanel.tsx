import { LEGEND_STRUCTURES } from '../../config/anatomy';
import { DIGIT_NOTES, getFinger } from '../../config/hand';
import { useStructureDefs } from '../../hooks/useDigit';
import { useT } from '../../i18n/useT';
import { useAppStore } from '../../store/useAppStore';
import { Toggle } from '../Toggle';
import { StructureButton } from './StructureButton';

export function AnatomyPanel() {
  const { t, loc, names } = useT();
  const finger = useAppStore((s) => s.selectedFinger);
  const legend = useStructureDefs(LEGEND_STRUCTURES);
  const veins = useAppStore((s) => s.userLayers.veins);
  const setLayer = useAppStore((s) => s.setLayer);
  const showLabels = useAppStore((s) => s.showLabels);
  const setShowLabels = useAppStore((s) => s.setShowLabels);
  return (
    <div>
      <p className="mb-3 text-sm leading-relaxed text-slate-300">{t('modeHelp.anatomy')}</p>
      <div className="mb-3 grid grid-cols-1 gap-2 @md:grid-cols-2">
        <Toggle label={t('anatomy.showVeins')} icon="V" color="#3b82f6" checked={veins} onChange={(v) => setLayer('veins', v)} />
        <Toggle label={t('common.labels')} icon="Aa" color="#94a3b8" checked={showLabels} onChange={setShowLabels} />
      </div>
      <h3 className="panel-title">{t('anatomy.legendTitle')}</h3>
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
        {legend
          .filter((s) => veins || s.layer !== 'veins')
          .map((s) => (
            <StructureButton key={s.id} structure={s} />
          ))}
      </div>
      <h3 className="panel-title mt-5">{t('anatomy.digitNotesTitle', { digit: names(getFinger(finger)).primary })}</h3>
      <ul className="space-y-2 text-sm leading-relaxed text-slate-300">
        {DIGIT_NOTES[finger].map((note, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-500" aria-hidden />
            <span>{loc(note)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">{t('anatomy.variationNote')}</p>
    </div>
  );
}

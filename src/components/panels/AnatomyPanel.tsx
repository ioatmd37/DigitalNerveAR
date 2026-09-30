import { getStructure, LEGEND_STRUCTURES } from '../../config/anatomy';
import { useT } from '../../i18n/useT';
import { useAppStore } from '../../store/useAppStore';
import { Toggle } from '../Toggle';
import { StructureButton } from './StructureButton';

export function AnatomyPanel() {
  const { t } = useT();
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
        {LEGEND_STRUCTURES.filter((id) => veins || getStructure(id).layer !== 'veins').map((id) => (
          <StructureButton key={id} structure={getStructure(id)} />
        ))}
      </div>
    </div>
  );
}

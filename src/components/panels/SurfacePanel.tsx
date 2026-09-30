import { getStructure, LANDMARK_STRUCTURES } from '../../config/anatomy';
import { useT } from '../../i18n/useT';
import { StructureButton } from './StructureButton';

export function SurfacePanel() {
  const { t } = useT();
  return (
    <div>
      <p className="mb-3 text-sm leading-relaxed text-slate-300">{t('modeHelp.surface')}</p>
      <h3 className="panel-title">{t('surface.landmarksTitle')}</h3>
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
        {LANDMARK_STRUCTURES.map((id) => (
          <StructureButton key={id} structure={getStructure(id)} />
        ))}
      </div>
    </div>
  );
}

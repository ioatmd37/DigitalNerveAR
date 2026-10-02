import { LANDMARK_STRUCTURES } from '../../config/anatomy';
import { useStructureDefs } from '../../hooks/useDigit';
import { useT } from '../../i18n/useT';
import { StructureButton } from './StructureButton';

export function SurfacePanel() {
  const { t } = useT();
  const landmarks = useStructureDefs(LANDMARK_STRUCTURES);
  return (
    <div>
      <p className="mb-3 text-sm leading-relaxed text-slate-300">{t('modeHelp.surface')}</p>
      <h3 className="panel-title">{t('surface.landmarksTitle')}</h3>
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
        {landmarks.map((s) => (
          <StructureButton key={s.id} structure={s} />
        ))}
      </div>
    </div>
  );
}

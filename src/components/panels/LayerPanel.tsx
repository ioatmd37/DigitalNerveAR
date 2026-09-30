import { LAYERS } from '../../config/anatomy';
import { useT } from '../../i18n/useT';
import { useAppStore } from '../../store/useAppStore';
import { Toggle } from '../Toggle';

export function LayerPanel() {
  const { t, names } = useT();
  const layers = useAppStore((s) => s.userLayers);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const setAll = useAppStore((s) => s.setAllLayers);
  const showLabels = useAppStore((s) => s.showLabels);
  const setShowLabels = useAppStore((s) => s.setShowLabels);
  return (
    <div>
      <p className="mb-3 text-sm leading-relaxed text-slate-300">{t('modeHelp.layers')}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <button className="btn btn-secondary btn-sm flex-1" onClick={() => setAll(true)}>
          {t('common.showAll')}
        </button>
        <button className="btn btn-secondary btn-sm flex-1" onClick={() => setAll(false)}>
          {t('common.hideAll')}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
        {LAYERS.map((l) => {
          const n = names(l);
          return (
            <Toggle
              key={l.id}
              label={n.primary}
              secondary={n.secondary}
              icon={l.icon}
              color={l.color}
              checked={layers[l.id]}
              onChange={() => toggleLayer(l.id)}
            />
          );
        })}
        <Toggle label={t('common.labels')} icon="Aa" color="#94a3b8" checked={showLabels} onChange={setShowLabels} />
      </div>
      <p className="mt-3 text-xs text-slate-400">{t('layerPanel.hint')}</p>
    </div>
  );
}

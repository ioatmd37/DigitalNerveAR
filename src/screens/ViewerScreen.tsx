import { lazy, Suspense, useState } from 'react';
import { DisclaimerBanner } from '../components/Disclaimer';
import { FingerSelector } from '../components/FingerSelector';
import { LanguageToggle } from '../components/LanguageToggle';
import { OrientationWidget } from '../components/OrientationWidget';
import { AnatomyPanel } from '../components/panels/AnatomyPanel';
import { AssessmentPanel } from '../components/panels/AssessmentPanel';
import { CalibrationPanel } from '../components/panels/CalibrationPanel';
import { GuidedPanel } from '../components/panels/GuidedPanel';
import { LayerPanel } from '../components/panels/LayerPanel';
import { NeedlePanel } from '../components/panels/NeedlePanel';
import { QuizPanel } from '../components/panels/QuizPanel';
import { SurfacePanel } from '../components/panels/SurfacePanel';
import { CalibrationBadge, TrackingBadge } from '../components/StatusBadges';
import { StructureCard } from '../components/StructureCard';
import type { ViewPreset } from '../explorer/ExplorerView';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/useAppStore';
import type { PanelTab } from '../types';

// Heavy 3D/AR code is split into separate chunks.
const ExplorerView = lazy(() => import('../explorer/ExplorerView').then((m) => ({ default: m.ExplorerView })));
const ARView = lazy(() => import('../ar/ARView').then((m) => ({ default: m.ARView })));

const LEARNER_TABS: { id: PanelTab; icon: string }[] = [
  { id: 'surface', icon: '◌' },
  { id: 'anatomy', icon: '⌬' },
  { id: 'layers', icon: '☰' },
  { id: 'guided', icon: '➜' },
  { id: 'needle', icon: '💉' },
  { id: 'quiz', icon: '?' },
];

const PRESETS: ViewPreset[] = ['dorsal', 'volar', 'radial', 'ulnar', 'oblique'];

export function ViewerScreen({ kind }: { kind: 'ar' | 'explorer' }) {
  const { t } = useT();
  const activeTab = useAppStore((s) => s.activeTab);
  const mode = useAppStore((s) => s.mode);
  const assessmentActive = useAppStore((s) => s.assessment.active);
  const instructor = useAppStore((s) => s.instructor.unlocked);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const setScreen = useAppStore((s) => s.setScreen);
  const startAssessment = useAppStore((s) => s.startAssessment);
  const [collapsed, setCollapsed] = useState(false);
  const [preset, setPreset] = useState<{ name: ViewPreset; nonce: number }>({ name: 'oblique', nonce: 0 });
  const [showMarker, setShowMarker] = useState(true);
  const [frozen, setFrozen] = useState(false);

  const tabs: { id: PanelTab; icon: string }[] = assessmentActive
    ? [{ id: 'assessment', icon: '⏱' }]
    : [...LEARNER_TABS];
  if (instructor) tabs.push({ id: 'calibration', icon: '⌖' });

  const goHome = () => {
    setScreen(instructor ? 'instructor' : 'landing');
  };

  const panel = (() => {
    switch (activeTab) {
      case 'surface':
        return <SurfacePanel />;
      case 'anatomy':
        return <AnatomyPanel />;
      case 'layers':
        return <LayerPanel />;
      case 'guided':
        return <GuidedPanel />;
      case 'needle':
        return <NeedlePanel />;
      case 'quiz':
        return <QuizPanel />;
      case 'assessment':
        return <AssessmentPanel />;
      case 'calibration':
        return <CalibrationPanel onStartAssessment={() => startAssessment(kind)} />;
    }
  })();

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-950 landscape:flex-row">
      {/* ------------------------------------------------ viewport */}
      <div className="relative min-h-0 flex-1">
        <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-slate-400">…</div>}>
          {kind === 'explorer' ? (
            <ExplorerView preset={preset} showMarker={showMarker} />
          ) : (
            <ARView frozen={frozen} onOpenExplorer={() => setScreen('explorer')} />
          )}
        </Suspense>

        {/* Top bar overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col">
          <div className="pointer-events-auto">
            <DisclaimerBanner variant="ar" />
          </div>
          <div className="flex flex-wrap items-center gap-2 p-2">
            <button className="btn btn-secondary btn-sm pointer-events-auto shadow-lg" onClick={goHome}>
              ← {t('common.home')}
            </button>
            <span className="chip pointer-events-auto hidden bg-cyan-500 text-slate-950 shadow-lg sm:inline-flex" aria-label={t('common.mode')}>
              {t(`modes.${mode}`)}
            </span>
            <TrackingBadge kind={kind} />
            <div className="pointer-events-auto">
              <FingerSelector compact />
            </div>
            <CalibrationBadge />
            {instructor && <span className="chip bg-violet-600 text-white">🎓 {t('instructor.unlocked')}</span>}
            <div className="pointer-events-auto ml-auto">
              <LanguageToggle compact />
            </div>
          </div>
          {kind === 'ar' && (
            <div className="pointer-events-auto flex gap-2 px-2">
              <button
                className={`btn btn-sm shadow-lg ${frozen ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFrozen((f) => !f)}
                aria-pressed={frozen}
              >
                {frozen ? `❄ ${t('tracking.unfreeze')}` : `❄ ${t('tracking.freeze')}`}
              </button>
            </div>
          )}
          {kind === 'explorer' && (
            <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto px-2 pb-1" role="group" aria-label={t('views.title')}>
              {PRESETS.map((p) => (
                <button
                  key={p}
                  className={`btn btn-sm shrink-0 shadow ${preset.name === p ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPreset((cur) => ({ name: p, nonce: cur.nonce + 1 }))}
                >
                  {t(`views.${p}`)}
                </button>
              ))}
              <button
                className={`btn btn-sm shrink-0 shadow ${showMarker ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setShowMarker((v) => !v)}
                aria-pressed={showMarker}
              >
                ▦ {t('views.showMarker')}
              </button>
            </div>
          )}
        </div>

        {/* Orientation key + structure card */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-1/3 z-10 flex items-end justify-between gap-2 p-2">
          <div className="shrink-0">
            <OrientationWidget />
          </div>
          <div className="pointer-events-none flex max-h-full min-w-0 flex-1 justify-end">
            <StructureCard />
          </div>
        </div>
        {kind === 'ar' && (
          <p className="pointer-events-none absolute bottom-2 left-1/2 z-0 hidden -translate-x-1/2 rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-200 md:block">
            {t('tracking.hint')}
          </p>
        )}
      </div>

      {/* ------------------------------------------------ control tray / side panel */}
      <aside
        className={`z-20 flex shrink-0 flex-col border-slate-700 bg-slate-900/97 backdrop-blur portrait:border-t landscape:border-l ${
          collapsed ? 'landscape:w-16' : 'portrait:max-h-[46vh] landscape:w-[min(380px,45vw)]'
        }`}
      >
        <div className="flex items-center gap-1 overflow-x-auto p-2 landscape:flex-wrap" role="tablist">
          <button
            className="btn btn-ghost btn-sm shrink-0 px-3"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? t('common.expand') : t('common.collapse')}
            aria-expanded={!collapsed}
          >
            <span className="portrait:hidden">{collapsed ? '◀' : '▶'}</span>
            <span className="landscape:hidden">{collapsed ? '▲' : '▼'}</span>
          </button>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCollapsed(false);
              }}
              title={t(`modes.${tab.id}`)}
              className={`btn btn-sm shrink-0 ${
                activeTab === tab.id ? 'btn-primary' : tab.id === 'calibration' ? 'bg-violet-700 text-white hover:bg-violet-600' : 'btn-secondary'
              } ${collapsed ? 'landscape:w-12 landscape:px-0' : ''}`}
            >
              <span aria-hidden>{tab.icon}</span>
              <span className={collapsed ? 'landscape:sr-only' : ''}>{t(`modes.${tab.id}`)}</span>
            </button>
          ))}
        </div>
        {!collapsed && (
          <div className="@container min-h-0 flex-1 overflow-y-auto px-3 pb-4" role="tabpanel">
            <h2 className="mb-2 text-lg font-bold text-white">{t(`modes.${activeTab}`)}</h2>
            {panel}
          </div>
        )}
      </aside>
    </div>
  );
}

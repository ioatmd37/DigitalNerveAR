import { lazy, Suspense, useState } from 'react';
import { DisclaimerBanner } from '../components/Disclaimer';
import { Icon } from '../components/Icon';
import { ModeMenu } from '../components/ModeMenu';
import { FingerSelector } from '../components/FingerSelector';
import { LanguageToggle } from '../components/LanguageToggle';
import { OrientationWidget } from '../components/OrientationWidget';
import { AnatomyPanel } from '../components/panels/AnatomyPanel';
import { AssessmentPanel } from '../components/panels/AssessmentPanel';
import { CalibrationPanel } from '../components/panels/CalibrationPanel';
import { GuidedPanel } from '../components/panels/GuidedPanel';
import { LayerPanel } from '../components/panels/LayerPanel';
import { NeedlePanel } from '../components/panels/NeedlePanel';
import { OscePanel } from '../components/panels/OscePanel';
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

const LEARNER_TABS: PanelTab[] = ['surface', 'anatomy', 'layers', 'guided', 'needle', 'osce', 'quiz'];

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

  const tabs: PanelTab[] = assessmentActive ? ['assessment'] : [...LEARNER_TABS];
  if (instructor) tabs.push('calibration');

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
      case 'osce':
        return <OscePanel />;
      case 'quiz':
        return <QuizPanel />;
      case 'assessment':
        return <AssessmentPanel />;
      case 'calibration':
        return <CalibrationPanel onStartAssessment={() => startAssessment(kind)} />;
    }
  })();

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-950">
      {/* ------------------------------------------------ header */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-950 px-2 sm:gap-3 sm:px-3">
        <button className="btn btn-ghost btn-sm -ml-1 gap-1 px-2" onClick={goHome} aria-label={t('common.home')}>
          <Icon name="back" />
          <span className="hidden sm:inline">{t('common.home')}</span>
        </button>
        <div className="min-w-0 flex-1 truncate text-sm">
          <span className="hidden text-slate-400 md:inline">{t('app.shortTitle')} / </span>
          <span className="font-semibold text-slate-100">{t(`modes.${mode}`)}</span>
        </div>
        <FingerSelector compact />
        <LanguageToggle compact />
      </header>

      <div className="flex min-h-0 flex-1 flex-col landscape:flex-row">
        {/* ------------------------------------------------ viewport */}
        <main className="relative min-h-0 flex-1">
          <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-slate-400">…</div>}>
            {kind === 'explorer' ? (
              <ExplorerView preset={preset} showMarker={showMarker} />
            ) : (
              <ARView frozen={frozen} onOpenExplorer={() => setScreen('explorer')} />
            )}
          </Suspense>

          {/* View controls */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start gap-2 p-2">
            {kind === 'explorer' && (
              <>
                <div className="seg pointer-events-auto max-w-full overflow-x-auto" role="group" aria-label={t('views.title')}>
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      className="seg-item"
                      aria-pressed={preset.name === p}
                      onClick={() => setPreset((cur) => ({ name: p, nonce: cur.nonce + 1 }))}
                    >
                      {t(`views.${p}`)}
                    </button>
                  ))}
                </div>
                <div className="seg pointer-events-auto">
                  <button className="seg-item" aria-pressed={showMarker} onClick={() => setShowMarker((v) => !v)}>
                    {t('views.showMarker')}
                  </button>
                </div>
              </>
            )}
            {kind === 'ar' && (
              <div className="seg pointer-events-auto">
                <button className="seg-item" aria-pressed={frozen} onClick={() => setFrozen((f) => !f)}>
                  {frozen ? t('tracking.unfreeze') : t('tracking.freeze')}
                </button>
              </div>
            )}
          </div>

          {/* Orientation key + structure card */}
          <div className="pointer-events-none absolute inset-x-0 bottom-9 top-14 z-10 flex items-end justify-between gap-2 p-2">
            <div className="shrink-0">
              <OrientationWidget />
            </div>
            <div className="pointer-events-none flex max-h-full min-w-0 flex-1 justify-end">
              <StructureCard />
            </div>
          </div>

          {/* Status strip: tracking, calibration, role, and the persistent safety notice. */}
          <div className="absolute inset-x-0 bottom-0 z-10 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-0.5 border-t border-slate-800 bg-slate-950/90 px-3 py-1 text-xs">
            <TrackingBadge kind={kind} />
            <CalibrationBadge />
            {instructor && <span className="text-slate-400">{t('instructor.unlocked')}</span>}
            <div className="ml-auto">
              <DisclaimerBanner variant="ar" />
            </div>
          </div>
        </main>

        {/* ------------------------------------------------ panel */}
        <aside
          className={`z-20 flex shrink-0 flex-col border-slate-800 bg-slate-900 portrait:border-t landscape:border-l ${
            collapsed ? 'landscape:w-12' : 'portrait:max-h-[46vh] landscape:w-[min(400px,45vw)]'
          }`}
        >
          <div className="flex items-stretch border-b border-slate-800">
            {!collapsed && (
              <div className="hidden min-w-0 flex-1 landscape:flex">
                <ModeMenu
                  tabs={tabs}
                  active={activeTab}
                  onSelect={(tab) => {
                    setActiveTab(tab);
                    setCollapsed(false);
                  }}
                />
              </div>
            )}
            <div className="flex min-w-0 flex-1 overflow-x-auto landscape:hidden" role="tablist">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={activeTab === tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setCollapsed(false);
                    }}
                    className="tab"
                  >
                    {t(`modes.${tab}`)}
                  </button>
                ))}
            </div>
            <button
              className="btn btn-ghost btn-sm shrink-0 rounded-none px-3"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? t('common.expand') : t('common.collapse')}
              aria-expanded={!collapsed}
            >
              <span className="portrait:hidden">
                <Icon name={collapsed ? 'chevronLeft' : 'chevronRight'} />
              </span>
              <span className="landscape:hidden">
                <Icon name={collapsed ? 'chevronUp' : 'chevronDown'} />
              </span>
            </button>
          </div>
          {!collapsed && (
            <div className="@container min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4" role="tabpanel">
              {panel}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

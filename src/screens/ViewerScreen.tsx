import { lazy, Suspense, useEffect, useRef, useState, type RefObject } from 'react';
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

/** Live height of an element (for keeping overlays clear of the portrait dock). */
function useElementHeight(ref: RefObject<HTMLElement | null>): number {
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return h;
}

function usePortrait(): boolean {
  const query = '(orientation: portrait)';
  const [portrait, setPortrait] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setPortrait(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return portrait;
}

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
  // Portrait starts with the dock folded so the AR view is unobstructed.
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches);
  const dockRef = useRef<HTMLElement>(null);
  const dockH = useElementHeight(dockRef);
  const portrait = usePortrait();
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

  const statusStrip = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
      <TrackingBadge kind={kind} />
      <CalibrationBadge />
      {instructor && <span className="text-slate-400">{t('instructor.unlocked')}</span>}
      <div className="ml-auto">
        <DisclaimerBanner variant="ar" />
      </div>
    </div>
  );

  const selectTab = (tab: PanelTab) => {
    setActiveTab(tab);
    setCollapsed(false);
  };

  /*
   * Landscape: header / viewport + side panel, as columns.
   * Portrait: the viewport fills the whole screen; the header and a compact,
   * translucent dock (status, mode tabs, panel) float over it so the AR
   * view keeps its full size.
   */
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-950" style={{ ['--dock-h' as string]: `${dockH}px` }}>
      {/* ------------------------------------------------ header */}
      <header className="z-20 flex h-12 shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-950 px-2 sm:gap-3 sm:px-3 portrait:absolute portrait:inset-x-0 portrait:top-0 portrait:h-11 portrait:border-slate-800/60 portrait:bg-slate-950/75 portrait:backdrop-blur-md">
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
              <ExplorerView preset={preset} showMarker={showMarker} bottomInset={portrait ? dockH : 0} />
            ) : (
              <ARView frozen={frozen} onOpenExplorer={() => setScreen('explorer')} />
            )}
          </Suspense>

          {/* View controls */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start gap-2 p-2 portrait:top-11 portrait:gap-1.5">
            {kind === 'explorer' && (
              <>
                <div className="seg pointer-events-auto max-w-full overflow-x-auto portrait:bg-slate-950/70 portrait:backdrop-blur" role="group" aria-label={t('views.title')}>
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      className="seg-item portrait:min-h-7 portrait:px-2 portrait:text-xs"
                      aria-pressed={preset.name === p}
                      onClick={() => setPreset((cur) => ({ name: p, nonce: cur.nonce + 1 }))}
                    >
                      {t(`views.${p}`)}
                    </button>
                  ))}
                </div>
                <div className="seg pointer-events-auto portrait:bg-slate-950/70 portrait:backdrop-blur">
                  <button
                    className="seg-item portrait:min-h-7 portrait:px-2 portrait:text-xs"
                    aria-pressed={showMarker}
                    onClick={() => setShowMarker((v) => !v)}
                  >
                    {t('views.showMarker')}
                  </button>
                </div>
              </>
            )}
            {kind === 'ar' && (
              <div className="seg pointer-events-auto portrait:bg-slate-950/70 portrait:backdrop-blur">
                <button className="seg-item portrait:min-h-7 portrait:text-xs" aria-pressed={frozen} onClick={() => setFrozen((f) => !f)}>
                  {frozen ? t('tracking.unfreeze') : t('tracking.freeze')}
                </button>
              </div>
            )}
          </div>

          {/* Orientation key + structure card (kept clear of the portrait dock) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-9 top-14 z-10 flex items-end justify-between gap-2 p-2 portrait:bottom-[calc(var(--dock-h)+0.5rem)] portrait:top-24">
            <div className="shrink-0">
              <OrientationWidget />
            </div>
            <div className="pointer-events-none flex max-h-full min-w-0 flex-1 justify-end portrait:compact">
              <StructureCard />
            </div>
          </div>

          {/* Landscape status strip: tracking, calibration, role, persistent safety notice. */}
          <div className="absolute inset-x-0 bottom-0 z-10 min-h-8 border-t border-slate-800 bg-slate-950/90 px-3 py-1 text-xs portrait:hidden">
            {statusStrip}
          </div>
        </main>

        {/* ------------------------------------------------ panel / portrait dock */}
        <aside
          ref={dockRef}
          className={`z-20 flex shrink-0 flex-col border-slate-800 bg-slate-900 landscape:border-l portrait:absolute portrait:inset-x-2 portrait:bottom-2 portrait:overflow-hidden portrait:rounded-lg portrait:border portrait:border-slate-700/70 portrait:bg-slate-950/80 portrait:backdrop-blur-md ${
            collapsed ? 'landscape:w-12' : 'landscape:w-[min(400px,45vw)]'
          }`}
        >
          {/* Portrait status line: always visible, so the safety notice stays on screen. */}
          <div className="border-b border-slate-800/80 px-3 py-1.5 text-[11px] landscape:hidden">{statusStrip}</div>

          <div className="flex items-stretch border-b border-slate-800 portrait:border-slate-800/80">
            {!collapsed && (
              <div className="hidden min-w-0 flex-1 landscape:flex">
                <ModeMenu tabs={tabs} active={activeTab} onSelect={selectTab} />
              </div>
            )}
            <div className="flex min-w-0 flex-1 overflow-x-auto landscape:hidden" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => (activeTab === tab ? setCollapsed((c) => !c) : selectTab(tab))}
                  className="tab px-2.5 py-2 text-xs"
                >
                  {t(`modes.${tab}`)}
                </button>
              ))}
            </div>
            <button
              className="btn btn-ghost btn-sm shrink-0 rounded-none px-3 portrait:min-h-8"
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
            <div
              className="@container min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 portrait:max-h-[30vh] portrait:px-3 portrait:pb-3 portrait:pt-3 portrait:compact"
              role="tabpanel"
            >
              {panel}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

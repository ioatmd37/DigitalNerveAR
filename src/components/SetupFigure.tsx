import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { appConfig } from '../config/appConfig';
import { useT } from '../i18n/useT';

const SetupScene = lazy(() => import('../explorer/SetupScene').then((m) => ({ default: m.SetupScene })));

/**
 * Landing-page example of the physical set-up: a rotatable 3D scene of the
 * phone on a stand above the mannequin hand, plus the key placement rules.
 * The 3D code loads only when the figure scrolls into view.
 */
export function SetupFigure() {
  const { t, language } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const size = String(appConfig.markerSizeCm);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), {
      rootMargin: '200px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const labels = useMemo(
    () => ({
      operator: t('landing.setupFigure.operator'),
      marker: t('landing.setupFigure.marker', { size }),
      phone: t('landing.setupFigure.phone'),
      stand: t('landing.setupFigure.stand'),
      distance: t('landing.setupFigure.distance'),
    }),
    [t, size],
  );

  const tips = [
    t('landing.setupFigure.tip1'),
    t('landing.setupFigure.tip2', { size }),
    t('landing.setupFigure.tip3'),
    t('landing.setupFigure.tip4'),
  ];

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-10">
      <figure className="overflow-hidden rounded-lg border border-slate-800">
        <div ref={ref} className="relative aspect-[4/3] w-full bg-[#151515]">
          {visible ? (
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">…</div>}>
              <SetupScene language={language} labels={labels} />
            </Suspense>
          ) : null}
          <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-slate-500">{t('landing.setupFigure.hint')}</span>
        </div>
        <figcaption className="flex items-baseline gap-3 border-t border-slate-800 px-4 py-3 text-sm text-slate-500">
          <span className="font-mono text-xs uppercase tracking-wider">Fig. 2</span>
          <span>{t('landing.setupFigure.caption')}</span>
        </figcaption>
      </figure>
      <div>
        <h3 className="text-base font-semibold text-slate-100">{t('landing.setupFigure.title')}</h3>
        <ol className="mt-3 space-y-3">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-300">
              <span className="num mt-px w-5 shrink-0 text-slate-500">{i + 1}</span>
              <span>{tip}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

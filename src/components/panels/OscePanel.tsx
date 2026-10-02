import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { OSCE_RUBRIC } from '../../config/osceRubric';
import { useNeedleEvaluation } from '../../hooks/useNeedle';
import { useT } from '../../i18n/useT';
import type { NeedleSide } from '../../logic/needle';
import { remainingMl, scoreOsce, type OsceLevel } from '../../logic/osce';
import { formatDuration } from '../../logic/timer';
import { useAppStore } from '../../store/useAppStore';
import { Slider } from '../Slider';
import { Toggle } from '../Toggle';
import { NeedleSliders, NeedleStatusCard } from './NeedleControls';

const SIDES: NeedleSide[] = ['radial', 'ulnar'];

const LEVEL_STYLE: Record<OsceLevel, string> = {
  full: 'bg-emerald-600 text-white',
  partial: 'bg-amber-500 text-slate-950',
  none: 'bg-rose-700 text-white',
  pending: 'bg-slate-600 text-white',
};

/** Virtual OSCE station ("Mode A") scored with the faculty rubric (src/config/osceRubric.ts). */
export function OscePanel() {
  const { t, loc, language } = useT();
  const osce = useAppStore((s) => s.osce);
  const attempts = useAppStore((s) => s.osceAttempts);
  const { startOsce, resetOsce, clearOsceAttempts } = useAppStore.getState();

  if (osce.phase === 'idle') {
    return (
      <div className="space-y-3">
        <Disclaimer />
        <p className="text-sm leading-relaxed text-slate-300">{t('osce.intro')}</p>
        <p className="text-xs text-slate-400">{loc(OSCE_RUBRIC.title)}</p>
        <button className="btn btn-primary w-full" onClick={startOsce}>
          ▶ {t('osce.start')}
        </button>
        <section className="rounded-2xl bg-slate-800/70 p-3">
          <h3 className="mb-1 text-sm font-bold text-slate-200">{t('osce.history')}</h3>
          {attempts.length === 0 ? (
            <p className="muted">{t('osce.noHistory')}</p>
          ) : (
            <>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                {attempts.slice(0, 10).map((a) => (
                  <li key={a.id} className="flex justify-between rounded-lg bg-slate-900/70 px-3 py-1.5">
                    <span className="text-slate-300">
                      {new Date(a.completedAt).toLocaleString(language === 'th' ? 'th-TH' : 'en-GB')}
                    </span>
                    <span className="font-bold text-white">
                      {a.autoScore}/{a.autoMax} · {formatDuration(a.elapsedMs)}
                    </span>
                  </li>
                ))}
              </ul>
              <button className="btn btn-ghost btn-sm mt-2" onClick={clearOsceAttempts}>
                {t('osce.clearHistory')}
              </button>
            </>
          )}
        </section>
      </div>
    );
  }

  if (osce.phase === 'finished') {
    return (
      <div className="space-y-3">
        <Disclaimer />
        <Results />
        <button className="btn btn-primary w-full" onClick={() => {
            resetOsce();
            startOsce();
          }}>
          ↻ {t('osce.restart')}
        </button>
        <button className="btn btn-ghost btn-sm w-full" onClick={resetOsce}>
          {t('common.back')}
        </button>
      </div>
    );
  }

  return <Running />;
}

function Disclaimer() {
  const { t } = useT();
  return (
    <p className="rounded-xl bg-amber-400/15 px-3 py-2 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/40">
      ⚠ {t('osce.disclaimer')}
    </p>
  );
}

function Timer() {
  const { t } = useT();
  const startedAt = useAppStore((s) => s.osce.startedAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  const ms = startedAt ? now - startedAt : 0;
  const over = ms > OSCE_RUBRIC.timeLimitMin * 60_000;
  return (
    <p className={`rounded-xl px-3 py-2 text-center font-mono text-lg font-black ${over ? 'bg-rose-900 text-rose-100' : 'bg-slate-800 text-white'}`}>
      ⏱ {t('osce.time', { time: formatDuration(ms), limit: OSCE_RUBRIC.timeLimitMin })}
    </p>
  );
}

function StepCard({ title, done, children }: { title: string; done: boolean; children: ReactNode }) {
  const { t } = useT();
  return (
    <section className={`space-y-2 rounded-2xl p-3 ring-1 ${done ? 'bg-emerald-950/30 ring-emerald-700/60' : 'bg-slate-800/60 ring-slate-700'}`}>
      <h3 className="flex items-center justify-between text-sm font-bold text-white">
        <span>{title}</span>
        {done && <span className="text-xs font-semibold text-emerald-300">✓ {t('osce.confirmed')}</span>}
      </h3>
      {children}
    </section>
  );
}

function Choice<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`btn btn-sm ${value === o.value ? 'btn-primary' : 'btn-secondary'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Running() {
  const { t, language } = useT();
  const osce = useAppStore((s) => s.osce);
  const needle = useAppStore((s) => s.needle);
  const st = useAppStore.getState();
  const e = useNeedleEvaluation();
  const [syringe, setSyringe] = useState<number | null>(osce.syringeMl);
  const [gauge, setGauge] = useState<number | null>(osce.needleG);
  const [drug, setDrug] = useState<string | null>(osce.drugId);
  const [draw, setDraw] = useState(osce.drawnMl || 4);
  const [message, setMessage] = useState<string | null>(null);
  const R = OSCE_RUBRIC;
  const sideName = (s: NeedleSide) => t(`needle.${s}`);

  const inject = () => {
    const err = st.osceInject();
    setMessage(
      err === 'notInserted' ? t('osce.errNotInserted') : err === 'notDrawn' ? t('osce.errNotDrawn') : err === 'notEnoughDrug' ? t('osce.errNotEnough') : null,
    );
  };

  return (
    <div className="space-y-3">
      <Disclaimer />
      <Timer />

      <StepCard title={t('osce.step1')} done={osce.syringeMl !== null}>
        <p className="text-xs text-slate-400">{t('osce.syringe')}</p>
        <Choice label={t('osce.syringe')} value={syringe} onChange={setSyringe} options={R.syringeOptionsMl.map((v) => ({ value: v, label: `${v} ml` }))} />
        <p className="text-xs text-slate-400">{t('osce.needle')}</p>
        <Choice label={t('osce.needle')} value={gauge} onChange={setGauge} options={R.needleOptionsG.map((v) => ({ value: v, label: `${v}G` }))} />
        <button className="btn btn-secondary btn-sm w-full" disabled={syringe === null || gauge === null} onClick={() => st.osceChooseEquipment(syringe!, gauge!)}>
          {t('osce.confirm')}
        </button>
      </StepCard>

      <StepCard title={t('osce.step2')} done={osce.drugId !== null}>
        <div className="grid gap-1.5">
          {R.drugs.map((d) => (
            <button
              key={d.id}
              role="radio"
              aria-checked={drug === d.id}
              onClick={() => setDrug(d.id)}
              className={`btn btn-sm justify-start text-left ${drug === d.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {language === 'th' ? d.th : d.en}
            </button>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm w-full" disabled={drug === null} onClick={() => st.osceChooseDrug(drug!)}>
          {t('osce.confirm')}
        </button>
      </StepCard>

      <StepCard title={t('osce.step3')} done={osce.drawnMl > 0}>
        <Slider label={t('osce.drawVolume')} unit=" ml" min={0} max={osce.syringeMl ?? 10} step={0.5} value={Math.min(draw, osce.syringeMl ?? 10)} onChange={setDraw} />
        <button className="btn btn-secondary btn-sm w-full" disabled={draw <= 0} onClick={() => st.osceDraw(Math.min(draw, osce.syringeMl ?? 10))}>
          {t('osce.confirm')}
        </button>
      </StepCard>

      <StepCard title={t('osce.step4')} done={Object.keys(osce.sides).length === 2}>
        <p className="text-xs text-cyan-200">👆 {t('osce.step4Hint')}</p>
        <div role="radiogroup" aria-label={t('needle.side')} className="grid grid-cols-2 gap-2">
          {SIDES.map((side) => (
            <button
              key={side}
              role="radio"
              aria-checked={needle.side === side}
              onClick={() => st.selectNeedleSide(side)}
              className={`btn btn-sm ${needle.side === side ? 'btn-primary' : 'btn-secondary'}`}
            >
              {osce.sides[side] ? '✓ ' : ''}
              {sideName(side)}
            </button>
          ))}
        </div>
        <NeedleStatusCard />
        <NeedleSliders />
        <p className="text-sm text-slate-300">{t('osce.remaining', { ml: remainingMl(osce).toFixed(1) })}</p>
        <Slider label={t('osce.injectVolume')} unit=" ml" min={0.5} max={3} step={0.5} value={osce.injectVolumeMl} onChange={st.osceSetInjectVolume} />
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-secondary" disabled={!e.inserted} onClick={() => st.osceAspirate()}>
            ⇡ {t('needle.aspirate')}
          </button>
          <button className="btn btn-primary" disabled={!e.inserted || needle.injected} onClick={inject}>
            ◍ {t('needle.inject')}
          </button>
        </div>
        {message && (
          <p role="alert" className="text-sm font-semibold text-rose-300">
            {message}
          </p>
        )}
        {SIDES.filter((s) => osce.sides[s]).map((s) => (
          <p key={s} className="text-xs text-slate-300">
            ✓ {t('osce.sideDone', { side: sideName(s), ml: osce.sides[s]!.injectedMl })}
          </p>
        ))}
        <Toggle label={t('needle.showAnatomy')} icon="👁" color="#94a3b8" checked={needle.showAnatomy} onChange={st.setNeedleShowAnatomy} />
      </StepCard>

      <StepCard title={t('osce.step5')} done={osce.sensationAt !== null}>
        <button className="btn btn-secondary btn-sm w-full" onClick={st.osceSensationTest}>
          ☝ {t('osce.testSensation')}
        </button>
        {osce.sensationAt !== null && <p className="text-xs text-slate-300">{t('osce.sensationDone')}</p>}
      </StepCard>

      <button className="btn btn-success w-full" onClick={st.finishOsce}>
        ✓ {t('osce.finish')}
      </button>
    </div>
  );
}

function Results() {
  const { t, loc } = useT();
  const osce = useAppStore((s) => s.osce);
  const score = useMemo(() => scoreOsce(osce), [osce]);
  const R = OSCE_RUBRIC;
  return (
    <section className="space-y-2">
      <h3 className="panel-title">{t('osce.results')}</h3>
      <p className="text-2xl font-black text-white">{t('osce.autoScore', { score: score.autoScore, max: score.autoMax })}</p>
      <p className="text-sm text-slate-300">{t('osce.elapsed', { time: formatDuration(score.elapsedMs) })}</p>
      <ul className="space-y-1.5">
        {score.items.map((r) => {
          const item = R.items.find((i) => i.id === r.id)!;
          return (
            <li key={r.id} className="rounded-xl bg-slate-800/70 p-2.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-100">
                  {r.id} {loc(item.text)}
                </span>
                <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold ${LEVEL_STYLE[r.level]}`}>
                  {t(`osce.level.${r.level}`)} {r.level === 'pending' ? `/${r.max}` : `${r.points}/${r.max}`}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {loc(r.reason)}
                {r.level === 'partial' && item.partialNote ? ` — ${loc(item.partialNote)}` : ''}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-300">{t('osce.instructorPending', { max: score.instructorMax })}</p>
      <p className="text-xs text-slate-400">{t('osce.passNote', { pass: R.passScore, total: R.totalScore })}</p>
    </section>
  );
}

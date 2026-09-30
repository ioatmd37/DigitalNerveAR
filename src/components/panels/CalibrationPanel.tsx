import { useRef, useState, type ChangeEvent } from 'react';
import { CALIBRATION_LIMITS } from '../../config/appConfig';
import { useT } from '../../i18n/useT';
import { calibrationEquals, exportCalibration, parseCalibration } from '../../logic/calibration';
import { useAppStore } from '../../store/useAppStore';
import { downloadText } from '../../utils/assets';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

function round(v: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return Number(v.toFixed(decimals));
}

/** Slider with large −/+ buttons for precise nudging on a touch screen. */
function Slider({ label, value, min, max, step, unit, onChange }: SliderProps) {
  const set = (v: number) => onChange(round(Math.min(max, Math.max(min, v)), step));
  const nudge = step * (step < 0.05 ? 5 : 1);
  return (
    <div className="rounded-xl bg-slate-800/80 px-3 py-2">
      <div className="flex items-center justify-between text-sm">
        <label className="font-semibold text-slate-200">{label}</label>
        <span className="font-mono tabular-nums text-cyan-200">
          {value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}
          {unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button className="btn btn-secondary btn-sm w-11 px-0" onClick={() => set(value - nudge)} aria-label={`${label} −`}>
          −
        </button>
        <input
          type="range"
          className="min-w-0 flex-1"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(e) => set(Number(e.target.value))}
        />
        <button className="btn btn-secondary btn-sm w-11 px-0" onClick={() => set(value + nudge)} aria-label={`${label} +`}>
          +
        </button>
      </div>
    </div>
  );
}

export function CalibrationPanel({ onStartAssessment }: { onStartAssessment: () => void }) {
  const { t } = useT();
  const c = useAppStore((s) => s.calibration);
  const saved = useAppStore((s) => s.savedCalibration);
  const { updateCalibration, saveCalibration, resetCalibration, revertCalibration, replaceCalibration, setAllLayers, setMode } =
    useAppStore.getState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const L = CALIBRATION_LIMITS;
  const dirty = !calibrationEquals(c, saved);

  const flash = (text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 3500);
  };

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = parseCalibration(await file.text());
    if (result.ok) {
      replaceCalibration(result.value);
      flash(t('calibration.importedToast'));
    } else {
      flash(t('calibration.importError', { error: result.error }), true);
    }
  };

  const showAll = (visible: boolean) => {
    setMode('layers');
    setAllLayers(visible);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">{t('calibration.guide')}</p>

      <section className="space-y-2">
        <h3 className="panel-title">{t('calibration.position')}</h3>
        <Slider label={t('calibration.x')} unit=" cm" {...L.position} value={c.position.x} onChange={(x) => updateCalibration({ position: { ...c.position, x } })} />
        <Slider label={t('calibration.y')} unit=" cm" {...L.position} value={c.position.y} onChange={(y) => updateCalibration({ position: { ...c.position, y } })} />
        <Slider label={t('calibration.z')} unit=" cm" {...L.positionZ} value={c.position.z} onChange={(z) => updateCalibration({ position: { ...c.position, z } })} />
      </section>

      <section className="space-y-2">
        <h3 className="panel-title">{t('calibration.rotation')}</h3>
        <Slider label={t('calibration.rx')} unit="°" {...L.rotation} value={c.rotationDeg.x} onChange={(x) => updateCalibration({ rotationDeg: { ...c.rotationDeg, x } })} />
        <Slider label={t('calibration.ry')} unit="°" {...L.rotation} value={c.rotationDeg.y} onChange={(y) => updateCalibration({ rotationDeg: { ...c.rotationDeg, y } })} />
        <Slider label={t('calibration.rz')} unit="°" {...L.rotation} value={c.rotationDeg.z} onChange={(z) => updateCalibration({ rotationDeg: { ...c.rotationDeg, z } })} />
      </section>

      <section className="space-y-2">
        <h3 className="panel-title">{t('calibration.scale')}</h3>
        <Slider label={t('calibration.scale')} unit="×" {...L.scale} value={c.scale} onChange={(scale) => updateCalibration({ scale })} />
      </section>

      <section className="space-y-2">
        <h3 className="panel-title">{t('calibration.finger')}</h3>
        <Slider label={t('calibration.length')} unit=" cm" {...L.fingerLengthCm} value={c.fingerLengthCm} onChange={(fingerLengthCm) => updateCalibration({ fingerLengthCm })} />
        <Slider label={t('calibration.width')} unit=" cm" {...L.fingerWidthCm} value={c.fingerWidthCm} onChange={(fingerWidthCm) => updateCalibration({ fingerWidthCm })} />
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button
          className={`btn col-span-2 ${dirty ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            saveCalibration();
            flash(t('calibration.savedToast'));
          }}
        >
          💾 {t('calibration.save')} {dirty ? '•' : '✓'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={resetCalibration}>
          ↺ {t('calibration.reset')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={revertCalibration} disabled={!saved || !dirty}>
          ⤺ {t('calibration.revert')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => downloadText('mannequin-calibration.json', exportCalibration(c))}>
          ⇩ {t('calibration.export')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
          ⇧ {t('calibration.import')}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImport} />
      </div>
      {toast && (
        <p
          role="status"
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${toast.error ? 'bg-rose-900 text-rose-100' : 'bg-emerald-900 text-emerald-100'}`}
        >
          {toast.text}
        </p>
      )}

      <section className="space-y-2 border-t border-slate-700 pt-3">
        <h3 className="panel-title">{t('calibration.structures')}</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => showAll(true)}>
            {t('common.showAll')}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => showAll(false)}>
            {t('common.hideAll')}
          </button>
        </div>
        <button className="btn btn-ghost w-full" onClick={onStartAssessment}>
          ⏱ {t('modes.assessment')}
        </button>
      </section>
    </div>
  );
}

import { useRef, useState, type ChangeEvent } from 'react';
import { CALIBRATION_LIMITS } from '../../config/appConfig';
import { getFinger } from '../../config/hand';
import { FingerSelector } from '../FingerSelector';
import { Slider } from '../Slider';
import { useT } from '../../i18n/useT';
import { calibrationEquals, exportCalibration, parseCalibration } from '../../logic/calibration';
import { useAppStore } from '../../store/useAppStore';
import { downloadText } from '../../utils/assets';

export function CalibrationPanel({ onStartAssessment }: { onStartAssessment: () => void }) {
  const { t, language } = useT();
  const c = useAppStore((s) => s.calibration);
  const saved = useAppStore((s) => s.savedCalibration);
  const finger = useAppStore((s) => s.selectedFinger);
  const {
    updateCalibration,
    updateFingerCalibration: updateFinger,
    resetFingerCalibration: resetFinger,
    saveCalibration,
    resetCalibration,
    revertCalibration,
    replaceCalibration,
    setAllLayers,
    setMode,
  } = useAppStore.getState();
  const f = c.fingers[finger];
  const preset = getFinger(finger);
  const fingerName = language === 'th' ? preset.nameTh : preset.nameEn;
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
        <h3 className="panel-title">{t('calibration.marker')}</h3>
        <Slider label={t('calibration.markerSize')} unit=" cm" {...L.markerSizeCm} value={c.markerSizeCm} onChange={(markerSizeCm) => updateCalibration({ markerSizeCm })} />
      </section>

      <section className="space-y-2">
        <h3 className="panel-title">{t('calibration.hand')}</h3>
        <p className="text-xs text-slate-400">{t('calibration.handHint')}</p>
        <Slider label={t('calibration.x')} unit=" cm" {...L.position} value={c.position.x} onChange={(x) => updateCalibration({ position: { ...c.position, x } })} />
        <Slider label={t('calibration.y')} unit=" cm" {...L.position} value={c.position.y} onChange={(y) => updateCalibration({ position: { ...c.position, y } })} />
        <Slider label={t('calibration.z')} unit=" cm" {...L.positionZ} value={c.position.z} onChange={(z) => updateCalibration({ position: { ...c.position, z } })} />
        <Slider label={t('calibration.rx')} unit="°" {...L.rotation} value={c.rotationDeg.x} onChange={(x) => updateCalibration({ rotationDeg: { ...c.rotationDeg, x } })} />
        <Slider label={t('calibration.ry')} unit="°" {...L.rotation} value={c.rotationDeg.y} onChange={(y) => updateCalibration({ rotationDeg: { ...c.rotationDeg, y } })} />
        <Slider label={t('calibration.rz')} unit="°" {...L.rotation} value={c.rotationDeg.z} onChange={(z) => updateCalibration({ rotationDeg: { ...c.rotationDeg, z } })} />
        <Slider label={t('calibration.scale')} unit="×" {...L.scale} value={c.scale} onChange={(scale) => updateCalibration({ scale })} />
      </section>

      <section className="space-y-2">
        <h3 className="panel-title">{t('calibration.fingerSection', { finger: fingerName })}</h3>
        <FingerSelector compact />
        <Slider label={t('calibration.length')} unit=" cm" {...L.fingerLengthCm} value={f.lengthCm} onChange={(lengthCm) => updateFinger(finger, { lengthCm })} />
        <Slider label={t('calibration.width')} unit=" cm" {...L.fingerWidthCm} value={f.widthCm} onChange={(widthCm) => updateFinger(finger, { widthCm })} />
        <Slider label={t('calibration.fx')} unit=" cm" {...L.fingerOffset} value={f.offset.x} onChange={(x) => updateFinger(finger, { offset: { ...f.offset, x } })} />
        <Slider label={t('calibration.fy')} unit=" cm" {...L.fingerOffset} value={f.offset.y} onChange={(y) => updateFinger(finger, { offset: { ...f.offset, y } })} />
        <Slider label={t('calibration.fz')} unit=" cm" {...L.fingerOffset} value={f.offset.z} onChange={(z) => updateFinger(finger, { offset: { ...f.offset, z } })} />
        <Slider label={t('calibration.splay')} unit="°" {...L.splayDeg} value={f.splayDeg} onChange={(splayDeg) => updateFinger(finger, { splayDeg })} />
        <Slider label={t('calibration.flexion')} unit="°" {...L.flexionDeg} value={f.flexionDeg} onChange={(flexionDeg) => updateFinger(finger, { flexionDeg })} />
        <button className="btn btn-ghost btn-sm w-full" onClick={() => resetFinger(finger)}>
          {t('calibration.resetFinger', { finger: fingerName })}
        </button>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button
          className={`btn col-span-2 ${dirty ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            saveCalibration();
            flash(t('calibration.savedToast'));
          }}
        >
          {t('calibration.save')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={resetCalibration}>
          {t('calibration.reset')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={revertCalibration} disabled={!saved || !dirty}>
          {t('calibration.revert')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => downloadText('mannequin-calibration.json', exportCalibration(c))}>
          {t('calibration.export')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
          {t('calibration.import')}
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
          {t('modes.assessment')}
        </button>
      </section>
    </div>
  );
}

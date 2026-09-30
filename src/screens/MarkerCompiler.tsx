import { useEffect, useState } from 'react';
import { clearCustomTarget, getCustomTarget, setCustomTarget } from '../ar/targetStore';
import { useT } from '../i18n/useT';
import { downloadBlob } from '../utils/assets';

/**
 * In-browser MindAR target compiler (no upload): pick an image → compile →
 * download `targets.mind` and/or use it on this device via IndexedDB.
 */
export function MarkerCompiler() {
  const { t } = useT();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasCustom, setHasCustom] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    getCustomTarget().then((b) => setHasCustom(!!b));
  }, []);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const compile = async () => {
    if (!file) return;
    setError(null);
    setResult(null);
    setProgress(0);
    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();
      const { Compiler } = await import('mind-ar/dist/mindar-image.prod.js');
      const compiler = new Compiler();
      await compiler.compileImageTargets([img], (p) => setProgress(Math.round(p)));
      URL.revokeObjectURL(img.src);
      setResult(compiler.exportData());
    } catch (err) {
      setError((err as Error).message ?? String(err));
    } finally {
      setProgress(null);
    }
  };

  const bufferOf = (data: Uint8Array) =>
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;

  return (
    <section className="card space-y-3 p-5">
      <h2 className="panel-title">🖼 {t('instructor.markerTools')}</h2>
      <p className="text-sm text-slate-400">{t('instructor.markerToolsHint')}</p>
      <label className="btn btn-secondary w-full cursor-pointer">
        {t('compiler.choose')}
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
          }}
        />
      </label>
      {preview && <img src={preview} alt="" className="mx-auto max-h-40 rounded-lg ring-1 ring-slate-700" />}
      <button className="btn btn-primary w-full" disabled={!file || progress !== null} onClick={compile}>
        {progress !== null ? t('compiler.compiling', { progress }) : t('compiler.compile')}
      </button>
      {error && <p className="text-sm text-rose-300">{t('compiler.error', { error })}</p>}
      {result && (
        <div className="grid gap-2 sm:grid-cols-2">
          <p className="text-sm font-semibold text-emerald-300 sm:col-span-2">✓ {t('compiler.done')}</p>
          <button className="btn btn-secondary" onClick={() => downloadBlob('targets.mind', new Blob([bufferOf(result)]))}>
            ⇩ {t('compiler.download')}
          </button>
          <button
            className="btn btn-success"
            onClick={async () => {
              await setCustomTarget(bufferOf(result));
              setHasCustom(true);
            }}
          >
            ✓ {t('compiler.useOnDevice')}
          </button>
        </div>
      )}
      {hasCustom && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-800 p-3 text-sm">
          <span className="text-slate-200">{t('compiler.usingCustom')}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              await clearCustomTarget();
              setHasCustom(false);
            }}
          >
            {t('compiler.clearCustom')}
          </button>
        </div>
      )}
    </section>
  );
}

import { useState } from 'react';
import { translate } from '../config/locales';
import { useT } from '../i18n/useT';

/** Persistent one-line safety notice with an expandable bilingual statement. */
export function DisclaimerBanner({ variant = 'ar' }: { variant?: 'ar' | 'landing' }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        className="flex items-center gap-2 bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 sm:text-sm"
        role="note"
        aria-label={t('safety.title')}
      >
        <span aria-hidden className="text-base">
          ⚠
        </span>
        <span className="min-w-0 flex-1 leading-snug">{variant === 'ar' ? t('safety.shortAr') : t('safety.short')}</span>
        <button
          className="shrink-0 rounded-lg bg-slate-950/15 px-2.5 py-1 text-xs font-bold underline-offset-2 hover:bg-slate-950/25"
          onClick={() => setOpen(true)}
        >
          {t('safety.showMore')}
        </button>
      </div>
      {open && <DisclaimerDialog onClose={() => setOpen(false)} />}
    </>
  );
}

export function DisclaimerDialog({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-amber-300">
          <span aria-hidden>⚠</span> {t('safety.title')}
        </h2>
        <DisclaimerText />
        <button className="btn btn-primary mt-5 w-full" onClick={onClose} autoFocus>
          {t('safety.close')}
        </button>
      </div>
    </div>
  );
}

/** The full required disclaimer in BOTH Thai and English, regardless of UI language. */
export function DisclaimerText() {
  return (
    <div className="space-y-3 text-slate-100">
      <p lang="th" className="leading-relaxed">
        {translate('th', 'safety.full')}
      </p>
      <p lang="en" className="leading-relaxed text-slate-300">
        {translate('en', 'safety.full')}
      </p>
      <p className="border-t border-slate-700 pt-3 text-sm text-slate-400">
        {translate('th', 'safety.privacy')}
        <br />
        {translate('en', 'safety.privacy')}
      </p>
    </div>
  );
}

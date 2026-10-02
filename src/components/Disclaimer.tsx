import { useState } from 'react';
import { translate } from '../config/locales';
import { useT } from '../i18n/useT';
import { Icon } from './Icon';

/**
 * Persistent one-line safety notice. `ar` is the compact form used in the
 * viewer status strip; `landing` is a full-width line.
 */
export function DisclaimerBanner({ variant = 'ar' }: { variant?: 'ar' | 'landing' }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <p className={`flex items-center gap-2 text-amber-300 ${variant === 'ar' ? 'text-xs' : 'text-sm'}`} role="note" aria-label={t('safety.title')}>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
        <span>{variant === 'ar' ? t('safety.shortAr') : t('safety.short')}</span>
        <button className="shrink-0 text-slate-300 underline underline-offset-2 hover:text-white" onClick={() => setOpen(true)}>
          {t('safety.showMore')}
        </button>
      </p>
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
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-50">{t('safety.title')}</h2>
          <button className="btn btn-ghost btn-sm -mr-2 -mt-1 px-2" onClick={onClose} aria-label={t('safety.close')}>
            <Icon name="close" />
          </button>
        </div>
        <DisclaimerText />
        <button className="btn btn-primary mt-6 w-full" onClick={onClose} autoFocus>
          {t('safety.close')}
        </button>
      </div>
    </div>
  );
}

/** The full required disclaimer in BOTH Thai and English, regardless of UI language. */
export function DisclaimerText() {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      <p lang="th" className="text-slate-100">
        {translate('th', 'safety.full')}
      </p>
      <p lang="en" className="text-slate-300">
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

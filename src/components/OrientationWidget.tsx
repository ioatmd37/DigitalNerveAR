import { useState } from 'react';
import { useT } from '../i18n/useT';

/**
 * 2D orientation key for the RIGHT index finger seen from the dorsal side
 * with the fingertip pointing up (away from the learner), matching the
 * default AR/explorer set-up. The 3D model also carries an axis gizmo.
 */
export function OrientationWidget() {
  const { t } = useT();
  // Open by default only where there is room (tablets/desktops).
  const [open, setOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 900 && window.innerHeight >= 700,
  );
  if (!open) {
    return (
      <button className="btn btn-secondary btn-sm pointer-events-auto shadow-lg" onClick={() => setOpen(true)}>
        ✥ {t('orientation.title')}
      </button>
    );
  }
  return (
    <div className="card pointer-events-auto max-h-full w-52 overflow-y-auto p-3 text-xs">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-bold text-slate-100">✥ {t('orientation.title')}</span>
        <button className="rounded px-2 text-lg leading-none text-slate-400 hover:text-white" onClick={() => setOpen(false)} aria-label={t('common.close')}>
          ×
        </button>
      </div>
      <svg viewBox="0 0 200 170" className="mx-auto w-40" role="img" aria-label={t('orientation.title')}>
        {/* Hand outline (dorsal view, right hand): thumb on the left. */}
        <path
          d="M70 160 L70 105 Q52 98 40 80 L30 62 Q28 55 35 54 Q42 54 47 64 L60 84 L64 40 Q66 30 76 30 Q86 30 86 40 L86 72 L90 20 Q92 10 102 10 Q112 10 112 20 L110 72 L118 30 Q120 22 128 22 Q137 23 136 32 L130 78 L142 48 Q145 41 152 43 Q158 46 156 54 L144 104 Q140 130 130 140 L130 160 Z"
          fill="#e8b89a"
          fillOpacity="0.25"
          stroke="#e8b89a"
          strokeWidth="2"
        />
        {/* Index finger highlighted. */}
        <rect x="87" y="10" width="24" height="64" rx="12" fill="#22d3ee" fillOpacity="0.25" stroke="#22d3ee" strokeWidth="2" />
        <rect x="93" y="13" width="12" height="11" rx="4" fill="#f7e1dc" opacity="0.9" />
        {/* Arrows */}
        <g stroke="#e2e8f0" strokeWidth="2.5" fill="#e2e8f0">
          <line x1="99" y1="100" x2="99" y2="84" />
          <polygon points="99,78 94,87 104,87" />
          <line x1="40" y1="120" x2="22" y2="120" />
          <polygon points="15,120 24,115 24,125" />
          <line x1="158" y1="120" x2="176" y2="120" />
          <polygon points="183,120 174,115 174,125" />
        </g>
        <text x="99" y="114" textAnchor="middle" fontSize="11" fill="#e2e8f0" fontWeight="700">
          {t('orientation.distal').split(' ')[0]}
        </text>
        <text x="20" y="140" textAnchor="middle" fontSize="11" fill="#e2e8f0" fontWeight="700">
          {t('orientation.radial').split(' ')[0]}
        </text>
        <text x="180" y="140" textAnchor="middle" fontSize="11" fill="#e2e8f0" fontWeight="700">
          {t('orientation.ulnar').split(' ')[0]}
        </text>
      </svg>
      <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] leading-tight text-slate-300">
        <dt className="font-semibold text-slate-100">{t('orientation.dorsal')}</dt>
        <dd>{t('orientation.dorsalHint')}</dd>
        <dt className="font-semibold text-slate-100">{t('orientation.volar')}</dt>
        <dd>{t('orientation.volarHint')}</dd>
        <dt className="font-semibold text-slate-100">{t('orientation.radial')}</dt>
        <dd>{t('orientation.radialHint')}</dd>
        <dt className="font-semibold text-slate-100">{t('orientation.ulnar')}</dt>
        <dd>{t('orientation.ulnarHint')}</dd>
        <dt className="font-semibold text-slate-100">{t('orientation.distal')}</dt>
        <dd>{t('orientation.distalHint')}</dd>
        <dt className="font-semibold text-slate-100">{t('orientation.proximal')}</dt>
        <dd>{t('orientation.proximalHint')}</dd>
      </dl>
    </div>
  );
}

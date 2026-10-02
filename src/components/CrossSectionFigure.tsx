import { useT } from '../i18n/useT';

const NERVE = 'var(--color-nerve)';
const ARTERY = 'var(--color-artery)';

/** Leader start (on the structure) and callout position, in SVG units. */
type FigureKey = 'dorsalBranch' | 'extensor' | 'bone' | 'flexor' | 'volarBundle';

const CALLOUTS: { key: FigureKey; from: [number, number]; to: [number, number]; swatches?: string[] }[] = [
  { key: 'dorsalBranch', from: [203, 121], to: [150, 90], swatches: [NERVE] },
  { key: 'extensor', from: [304, 130], to: [410, 90] },
  { key: 'bone', from: [330, 180], to: [420, 180] },
  { key: 'flexor', from: [318, 256], to: [410, 292] },
  { key: 'volarBundle', from: [196, 248], to: [150, 292], swatches: [NERVE, ARTERY] },
];

/**
 * Static line drawing of a finger cross-section at the proximal phalanx,
 * drawn like a textbook plate. Simplified and for orientation only; the
 * colours match the 3D model (nerve yellow, artery red).
 */
export function CrossSectionFigure() {
  const { t } = useT();
  return (
    <figure className="rounded-lg border border-slate-800 bg-slate-900/40">
      <svg viewBox="110 34 340 316" className="block h-auto w-full" role="img" aria-label={t('landing.figure.caption')}>
        {/* Orientation */}
        <text x="280" y="58" textAnchor="middle" className="eyebrow fill-slate-500">
          {t('landing.figure.dorsal')}
        </text>
        <text x="280" y="332" textAnchor="middle" className="eyebrow fill-slate-500">
          {t('landing.figure.volar')}
        </text>

        {/* Skin and subcutaneous tissue */}
        <ellipse cx="280" cy="190" rx="125" ry="105" className="fill-slate-900 stroke-slate-500" strokeWidth="1.5" />
        <ellipse cx="280" cy="190" rx="117" ry="97" className="fill-none stroke-slate-700" strokeWidth="1" strokeDasharray="2 4" />

        {/* Proximal phalanx: cortex and medulla */}
        <ellipse cx="280" cy="176" rx="50" ry="42" fill="#d9d3c5" />
        <ellipse cx="280" cy="178" rx="31" ry="24" fill="#8f897c" />

        {/* Extensor mechanism over the dorsum of the bone */}
        <path d="M236 146 Q280 112 324 146" fill="none" stroke="#c9c4b8" strokeWidth="6" strokeLinecap="round" />

        {/* Flexor sheath with FDP and the two slips of FDS */}
        <ellipse cx="280" cy="252" rx="38" ry="21" className="fill-none stroke-slate-400" strokeWidth="1.2" strokeDasharray="3 3" />
        <ellipse cx="280" cy="246" rx="24" ry="9" fill="#ebe7de" />
        <ellipse cx="263" cy="261" rx="12" ry="6" fill="#ebe7de" />
        <ellipse cx="297" cy="261" rx="12" ry="6" fill="#ebe7de" />

        {/* Neurovascular structures, both sides */}
        {[1, -1].map((side) => {
          const x = (d: number) => 280 + side * d;
          return (
            <g key={side}>
              <circle cx={x(76)} cy="250" r="7" fill={NERVE} />
              <circle cx={x(87)} cy="237" r="5" fill={ARTERY} />
              <circle cx={x(76)} cy="123" r="3.5" fill={NERVE} />
            </g>
          );
        })}

        {/* Numbered callouts; the key below carries the (translatable) names. */}
        {CALLOUTS.map((c, i) => (
          <g key={c.key}>
            <line x1={c.from[0]} y1={c.from[1]} x2={c.to[0]} y2={c.to[1]} className="stroke-slate-500" />
            <circle cx={c.to[0]} cy={c.to[1]} r="11" className="fill-slate-950 stroke-slate-400" />
            <text x={c.to[0]} y={c.to[1] + 4} textAnchor="middle" className="fill-slate-100 font-mono text-[12px]">
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="border-t border-slate-800 px-4 py-3 text-sm">
        <ol className="grid gap-x-6 gap-y-1.5 text-slate-300 sm:grid-cols-2">
          {CALLOUTS.map((c, i) => (
            <li key={c.key} className="flex items-baseline gap-2.5">
              <span className="num w-4 shrink-0 text-xs text-slate-500">{i + 1}</span>
              <span className="flex items-center gap-1.5">
                {c.swatches?.map((color) => (
                  <span key={color} className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
                ))}
                {t(`landing.figure.${c.key}`)}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex items-baseline gap-3 text-slate-500">
          <span className="font-mono text-xs uppercase tracking-wider">Fig. 1</span>
          <span>{t('landing.figure.caption')}</span>
        </p>
      </figcaption>
    </figure>
  );
}

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
export function Slider({ label, value, min, max, step, unit, onChange }: SliderProps) {
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

interface ToggleProps {
  label: string;
  secondary?: string;
  icon?: string;
  color?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Large switch row with a symbol badge (never color alone). */
export function Toggle({ label, secondary, icon, color, checked, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
        checked ? 'bg-slate-700 ring-1 ring-cyan-500/60' : 'bg-slate-800/70 opacity-80 hover:opacity-100'
      }`}
    >
      {icon && (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-slate-950"
          style={{ backgroundColor: color ?? '#94a3b8', opacity: checked ? 1 : 0.45 }}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight text-slate-100">{label}</span>
        {secondary && <span className="block text-xs leading-tight text-slate-400">{secondary}</span>}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-cyan-500' : 'bg-slate-600'}`}
        aria-hidden
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`}
        />
      </span>
    </button>
  );
}

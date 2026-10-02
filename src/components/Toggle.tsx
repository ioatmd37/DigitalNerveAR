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
      className="flex min-h-12 w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-slate-800"
    >
      {icon && (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-semibold text-slate-950"
          style={{ backgroundColor: color ?? '#94a3b8', opacity: checked ? 1 : 0.35 }}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-medium leading-tight ${checked ? 'text-slate-100' : 'text-slate-400'}`}>{label}</span>
        {secondary && <span className="block text-xs leading-tight text-slate-400">{secondary}</span>}
      </span>
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? 'bg-cyan-500' : 'bg-slate-700'}`}
        aria-hidden
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full transition-all ${checked ? 'left-5 bg-slate-950' : 'left-1 bg-slate-400'}`}
        />
      </span>
    </button>
  );
}

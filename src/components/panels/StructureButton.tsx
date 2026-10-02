import { useT } from '../../i18n/useT';
import { useAppStore } from '../../store/useAppStore';
import type { AnatomyStructure } from '../../types';

/** Legend row: symbol + swatch + bilingual name. Tapping selects the structure. */
export function StructureButton({ structure }: { structure: AnatomyStructure }) {
  const { names } = useT();
  const selected = useAppStore((s) => s.selectedStructure === structure.id);
  const select = useAppStore((s) => s.selectStructure);
  const n = names(structure);
  return (
    <button
      onClick={() => select(selected ? null : structure.id)}
      aria-pressed={selected}
      className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
        selected ? 'bg-cyan-900/70 border border-cyan-400' : 'bg-slate-800 hover:bg-slate-700'
      }`}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-slate-950"
        style={{ backgroundColor: structure.color }}
        aria-hidden
      >
        {structure.icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-tight text-slate-100">{n.primary}</span>
        <span className="block text-xs leading-tight text-slate-400">{n.secondary}</span>
      </span>
    </button>
  );
}

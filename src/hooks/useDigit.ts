import { structureFor } from '../config/anatomy';
import { useAppStore } from '../store/useAppStore';
import { digitFor, type Digit } from '../three/anatomy/layout';
import type { AnatomyStructure, StructureId } from '../types';

/** Layout of the selected digit (finger, little finger or thumb). */
export function useDigit(): Digit {
  return digitFor(useAppStore((s) => s.selectedFinger));
}

/** Structure definitions that exist on the selected digit, with thumb wording applied. */
export function useStructureDefs(ids: StructureId[]): AnatomyStructure[] {
  const digit = useDigit();
  return ids.filter((id) => digit.has(id)).map((id) => structureFor(id, digit.isThumb));
}

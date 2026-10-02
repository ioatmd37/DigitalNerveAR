import { useEffect, useMemo, useState } from 'react';
import type { Vector3 } from 'three';
import { entryFromPoint, evaluateNeedle, RED_STATUSES, sideOfTheta, usesNeedle, type NeedleEvaluation } from '../logic/needle';
import { useAppStore } from '../store/useAppStore';
import type { AnatomyModel } from '../three/anatomy/AnatomyModel';
import { NeedleSim } from '../three/needle/NeedleSim';

/** Current needle evaluation (memoized on the needle state). */
export function useNeedleEvaluation(): NeedleEvaluation {
  const needle = useAppStore((s) => s.needle);
  return useMemo(() => evaluateNeedle(needle), [needle]);
}

/**
 * Attaches a virtual needle to `model`, shows it only in Needle Practice,
 * keeps it in sync with the store and records red/bone events for scoring.
 */
export function useNeedleSim(model: AnatomyModel | null): void {
  const [sim, setSim] = useState<NeedleSim | null>(null);
  const needle = useAppStore((s) => s.needle);
  const mode = useAppStore((s) => s.mode);
  const recordEvents = useAppStore((s) => s.recordNeedleEvents);
  const evaluation = useNeedleEvaluation();

  useEffect(() => {
    if (!model) return;
    const s = new NeedleSim();
    model.addExtension(s); // disposed together with the model
    setSim(s);
  }, [model]);

  useEffect(() => {
    if (!sim) return;
    sim.setVisible(usesNeedle(mode));
    sim.sync(needle, evaluation);
  }, [sim, mode, needle, evaluation]);

  useEffect(() => {
    if (!usesNeedle(mode)) return;
    const events = [evaluation.tipStatus, ...evaluation.pathEvents].filter(
      (s) => RED_STATUSES.includes(s) || s === 'bone',
    );
    if (events.length) recordEvents(events);
  }, [mode, evaluation, recordEvents]);
}

/** Move the needle entry to a tapped skin point (anatomy frame); withdraws the needle. */
export function placeNeedleAt(point: Vector3): void {
  const st = useAppStore.getState();
  const entry = entryFromPoint(point);
  const side = sideOfTheta(entry.entryThetaDeg);
  if (side !== st.needle.side) st.selectNeedleSide(side);
  useAppStore.getState().setNeedle({ ...entry, depthCm: 0 });
}

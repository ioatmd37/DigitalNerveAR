import { useEffect, useState } from 'react';
import { SIMPLE_STEPS, clampSimpleStep } from '../config/simpleSteps';
import { TRANSTHECAL_STEPS, clampTransthecalStep } from '../config/transthecalSteps';
import { useAppStore } from '../store/useAppStore';
import type { AnatomyModel } from '../three/anatomy/AnatomyModel';
import { digitFor } from '../three/anatomy/layout';
import { SimpleOverlay } from '../three/teaching/SimpleOverlay';
import { TransthecalOverlay } from '../three/teaching/TransthecalOverlay';

/** Attaches the teacher-only technique overlays (SIMPLE, transthecal) to `model` and drives them from the store. */
export function useTechniqueOverlays(model: AnatomyModel | null): void {
  const [overlays, setOverlays] = useState<{ simple: SimpleOverlay; transthecal: TransthecalOverlay } | null>(null);
  const mode = useAppStore((s) => s.mode);
  const simpleStep = useAppStore((s) => s.simpleStep);
  const transthecalStep = useAppStore((s) => s.transthecalStep);
  const unlocked = useAppStore((s) => s.instructor.unlocked);
  const nonce = useAppStore((s) => s.injectateNonce);

  useEffect(() => {
    if (!model) return;
    const digit = digitFor(useAppStore.getState().selectedFinger);
    const o = { simple: new SimpleOverlay(digit), transthecal: new TransthecalOverlay(digit) };
    model.addExtension(o.simple); // disposed together with the model
    model.addExtension(o.transthecal);
    setOverlays(o);
  }, [model]);

  useEffect(() => {
    if (!overlays) return;
    const simple = mode === 'simple' && unlocked;
    const transthecal = mode === 'transthecal' && unlocked;
    overlays.simple.setVisible(simple);
    overlays.transthecal.setVisible(transthecal);
    if (simple) overlays.simple.setStep(SIMPLE_STEPS[clampSimpleStep(simpleStep)].overlay);
    if (transthecal) overlays.transthecal.setStep(TRANSTHECAL_STEPS[clampTransthecalStep(transthecalStep)].overlay);
  }, [overlays, mode, simpleStep, transthecalStep, unlocked]);

  useEffect(() => {
    overlays?.simple.restart();
    overlays?.transthecal.restart();
  }, [overlays, nonce]);
}

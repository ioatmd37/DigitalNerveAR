import { useEffect, useState } from 'react';
import { SIMPLE_STEPS, clampSimpleStep } from '../config/simpleSteps';
import { useAppStore } from '../store/useAppStore';
import type { AnatomyModel } from '../three/anatomy/AnatomyModel';
import { digitFor } from '../three/anatomy/layout';
import { SimpleOverlay } from '../three/teaching/SimpleOverlay';

/** Attaches the teacher-only SIMPLE technique overlay to `model` and drives it from the store. */
export function useSimpleOverlay(model: AnatomyModel | null): void {
  const [overlay, setOverlay] = useState<SimpleOverlay | null>(null);
  const mode = useAppStore((s) => s.mode);
  const step = useAppStore((s) => s.simpleStep);
  const unlocked = useAppStore((s) => s.instructor.unlocked);
  const nonce = useAppStore((s) => s.injectateNonce);

  useEffect(() => {
    if (!model) return;
    const o = new SimpleOverlay(digitFor(useAppStore.getState().selectedFinger));
    model.addExtension(o); // disposed together with the model
    setOverlay(o);
  }, [model]);

  useEffect(() => {
    if (!overlay) return;
    const on = mode === 'simple' && unlocked;
    overlay.setVisible(on);
    if (on) overlay.setStep(SIMPLE_STEPS[clampSimpleStep(step)].overlay);
  }, [overlay, mode, step, unlocked]);

  useEffect(() => {
    overlay?.restart();
  }, [overlay, nonce]);
}

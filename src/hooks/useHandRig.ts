import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { HandRig, type HandRigOptions } from '../three/HandRig';
import type { AnatomyModel } from '../three/anatomy/AnatomyModel';

/** Creates a HandRig for `model` and keeps it in sync with calibration and the selected finger. */
export function useHandRig(model: AnatomyModel | null, options: HandRigOptions): HandRig | null {
  const [rig, setRig] = useState<HandRig | null>(null);
  const calibration = useAppStore((s) => s.calibration);
  const finger = useAppStore((s) => s.selectedFinger);
  const side = useAppStore((s) => s.handSide);
  const { markerUnits, showContext, tracked } = options;

  useEffect(() => {
    if (!model) return;
    const r = new HandRig({ markerUnits, showContext, tracked });
    r.attach(model);
    const { calibration: c, selectedFinger, handSide } = useAppStore.getState();
    r.update(c, selectedFinger, handSide);
    setRig(r);
    return () => {
      r.dispose();
      setRig(null);
    };
  }, [model, markerUnits, showContext, tracked]);

  useEffect(() => {
    rig?.update(calibration, finger, side);
  }, [rig, calibration, finger, side]);

  return rig;
}

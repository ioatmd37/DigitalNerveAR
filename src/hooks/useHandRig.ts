import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { HandRig, type HandRigOptions } from '../three/HandRig';
import type { AnatomyModel } from '../three/anatomy/AnatomyModel';

/** Creates a HandRig for `model` and keeps it in sync with calibration and the selected finger. */
export function useHandRig(model: AnatomyModel | null, options: HandRigOptions): HandRig | null {
  const [rig, setRig] = useState<HandRig | null>(null);
  const calibration = useAppStore((s) => s.calibration);
  const finger = useAppStore((s) => s.selectedFinger);
  const { markerUnits, showContext } = options;

  useEffect(() => {
    if (!model) return;
    const r = new HandRig({ markerUnits, showContext });
    r.attach(model);
    const { calibration: c, selectedFinger } = useAppStore.getState();
    r.update(c, selectedFinger);
    setRig(r);
    return () => {
      r.dispose();
      setRig(null);
    };
  }, [model, markerUnits, showContext]);

  useEffect(() => {
    rig?.update(calibration, finger);
  }, [rig, calibration, finger]);

  return rig;
}

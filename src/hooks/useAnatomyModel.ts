import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { createAnatomyModel } from '../three/anatomy/createAnatomyModel';
import type { AnatomyModel } from '../three/anatomy/AnatomyModel';
import { digitFor } from '../three/anatomy/layout';
import { useNeedleSim } from './useNeedle';
import { useSimpleOverlay } from './useSimpleOverlay';
import { useViewState } from './useViewState';

/**
 * Creates the anatomy model for a view, keeps it in sync with the store
 * (mode/layers, language) and disposes it on unmount. Finger size and
 * placement are applied by `useHandRig`.
 */
export function useAnatomyModel(): AnatomyModel | null {
  const [model, setModel] = useState<AnatomyModel | null>(null);
  const language = useAppStore((s) => s.language);
  const injectateNonce = useAppStore((s) => s.injectateNonce);
  // The model is rebuilt when the digit layout changes (finger / little finger / thumb).
  const digit = digitFor(useAppStore((s) => s.selectedFinger));
  const view = useViewState();

  useEffect(() => {
    let disposed = false;
    let created: AnatomyModel | null = null;
    createAnatomyModel(useAppStore.getState().language, digit).then((m) => {
      if (disposed) {
        m.dispose();
        return;
      }
      created = m;
      setModel(m);
    });
    return () => {
      disposed = true;
      if (created) {
        setModel((cur) => (cur === created ? null : cur));
        created.dispose();
      }
    };
  }, [digit]);

  useEffect(() => {
    model?.setLanguage(language);
  }, [model, language]);

  useEffect(() => {
    // Labels are drawn to canvases; redraw once the bundled fonts are ready.
    if (!model || typeof document === 'undefined' || !document.fonts) return;
    let live = true;
    document.fonts.ready.then(() => live && model.refreshLabels());
    return () => {
      live = false;
    };
  }, [model]);

  useEffect(() => {
    model?.applyViewState(view);
  }, [model, view]);

  useEffect(() => {
    // Restart the spread animation whenever it (re)appears or on "replay".
    if (view.animateInjectate) model?.restartInjectate();
  }, [model, view.animateInjectate, injectateNonce]);

  useNeedleSim(model);
  useSimpleOverlay(model);

  return model;
}

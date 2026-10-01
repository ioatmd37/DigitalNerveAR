import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { createAnatomyModel } from '../three/anatomy/createAnatomyModel';
import type { AnatomyModel } from '../three/anatomy/AnatomyModel';
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
  const view = useViewState();

  useEffect(() => {
    let disposed = false;
    let created: AnatomyModel | null = null;
    createAnatomyModel(useAppStore.getState().language).then((m) => {
      if (disposed) {
        m.dispose();
        return;
      }
      created = m;
      setModel(m);
    });
    return () => {
      disposed = true;
      created?.dispose();
    };
  }, []);

  useEffect(() => {
    model?.setLanguage(language);
  }, [model, language]);

  useEffect(() => {
    model?.applyViewState(view);
  }, [model, view]);

  useEffect(() => {
    // Restart the spread animation whenever it (re)appears or on "replay".
    if (view.animateInjectate) model?.restartInjectate();
  }, [model, view.animateInjectate, injectateNonce]);

  return model;
}

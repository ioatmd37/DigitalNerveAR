import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { computeViewState } from '../logic/visibility';
import { useAppStore } from '../store/useAppStore';
import type { ViewState } from '../types';

/** Derived 3D view state for the current mode (memoized). */
export function useViewState(): ViewState {
  const input = useAppStore(
    useShallow((s) => ({
      mode: s.mode,
      userLayers: s.userLayers,
      showLabels: s.showLabels,
      guidedStep: s.guidedStep,
      revealed: s.assessment.revealed,
      selectedStructure: s.selectedStructure,
      feedbackHighlight: s.feedbackHighlight,
    })),
  );
  return useMemo(
    () =>
      computeViewState({
        mode: input.mode,
        userLayers: input.userLayers,
        showLabels: input.showLabels,
        guidedStep: input.guidedStep,
        assessment: { revealed: input.revealed },
        selectedStructure: input.selectedStructure,
        feedbackHighlight: input.feedbackHighlight,
      }),
    [input],
  );
}

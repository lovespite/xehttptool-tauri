import { useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { scheduleSave, initialLoadComplete } from '../services/persistence';

export function useAutoSave(): void {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!initialLoadComplete) return;
    scheduleSave();
  }, [workspaces]);
}

import { useMemo } from 'react';
import { useWorkspaceStore } from './useWorkspaceStore';
import type { VariableContext } from '../utils/variableResolver';

/**
 * Hook that builds a VariableContext from the current active workspace/collection/request.
 */
export function useVariableContext(): VariableContext {
  const request = useWorkspaceStore((s) => s.getActiveRequest());
  const collection = useWorkspaceStore((s) => s.getActiveCollection());
  const workspace = useWorkspaceStore((s) => s.getActiveWorkspace());

  return useMemo(
    () => ({
      request: request ?? null,
      collection: collection ?? null,
      workspace: workspace ?? null,
    }),
    [request, collection, workspace]
  );
}

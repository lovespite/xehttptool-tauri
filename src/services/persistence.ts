import { loadAllWorkspaces, loadWorkspace, saveWorkspace, saveWorkspaceMeta } from './tauri';
import { useWorkspaceStore } from '../store/useWorkspaceStore';

export let initialLoadComplete = false;

export function markInitialLoadComplete() {
  initialLoadComplete = true;
}

export async function loadAllFromDisk(): Promise<void> {
  try {
    const metas = await loadAllWorkspaces();
    const workspaces = await Promise.all(
      metas.map((meta) => loadWorkspace(meta.id))
    );

    useWorkspaceStore.setState({ workspaces });

    if (workspaces.length > 0) {
      useWorkspaceStore.setState({ activeWorkspaceId: workspaces[0].id });
    }
  } catch (err) {
    console.error('Failed to load workspaces from disk:', err);
  } finally {
    markInitialLoadComplete();
  }
}

// === Auto-Save ===

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 500;

async function doSave() {
  const state = useWorkspaceStore.getState();
  const workspaces = state.workspaces;

  if (!initialLoadComplete) return;

  try {
    await Promise.all(workspaces.map((w) => saveWorkspace(w)));
    const metas = workspaces.map((w) => ({ id: w.id, name: w.name }));
    await saveWorkspaceMeta(metas);
  } catch (err) {
    console.error('[AutoSave] Failed to persist workspaces:', err);
  }
}

export function scheduleSave(): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(doSave, SAVE_DEBOUNCE_MS);
}

export async function flushSave(): Promise<void> {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  await doSave();
}

// === Export/Import ===

import { save, open } from '@tauri-apps/plugin-dialog';
import { exportAllWorkspaces, importWorkspacesFromFile } from './tauri';

export async function handleExportWorkspace(wsId: string): Promise<void> {
  const workspaces = useWorkspaceStore.getState().workspaces;
  const ws = workspaces.find((w) => w.id === wsId);
  if (!ws) return;

  try {
    const filePath = await save({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      defaultPath: `${ws.name.replace(/[^a-zA-Z0-9_-]/g, '_')}-export.json`,
    });

    if (!filePath) return;

    await exportAllWorkspaces([ws], filePath);
  } catch (err) {
    console.error('[Export] Failed:', err);
    alert('Export failed: ' + err);
  }
}

export async function handleImport(): Promise<void> {
  try {
    const filePath = await open({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      multiple: false,
    });

    if (!filePath) return;

    const imported = await importWorkspacesFromFile(filePath as string);

    if (!Array.isArray(imported) || imported.length === 0) {
      console.warn('[Import] No workspaces found in file.');
      return;
    }

    const store = useWorkspaceStore.getState();
    const existingIds = new Set(store.workspaces.map((w) => w.id));
    const newWorkspaces = imported.filter((w) => !existingIds.has(w.id));

    if (newWorkspaces.length === 0) {
      console.warn('[Import] All workspaces in file already exist.');
      return;
    }

    useWorkspaceStore.setState({
      workspaces: [...store.workspaces, ...newWorkspaces],
    });
  } catch (err) {
    console.error('[Import] Failed:', err);
    alert('Import failed: ' + err);
  }
}

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Workspace, Collection, Request } from '../types';
import { generateId } from '../utils/idGenerator';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeCollectionId: string | null;
  activeRequestId: string | null;

  setActiveWorkspace: (id: string) => void;
  setActiveCollection: (id: string) => void;
  setActiveRequest: (id: string) => void;

  addWorkspace: (name: string) => string;
  addCollection: (workspaceId: string, name: string) => string;
  addRequest: (workspaceId: string, collectionId: string, name: string) => string;

  deleteWorkspace: (id: string) => void;
  deleteCollection: (id: string) => void;
  deleteRequest: (requestId: string) => void;

  updateWorkspace: (id: string, partial: Partial<Workspace>) => void;
  updateCollection: (id: string, partial: Partial<Collection>) => void;
  updateRequest: (requestId: string, partial: Partial<Request>) => void;

  getActiveRequest: () => Request | undefined;
  getActiveCollection: () => Collection | undefined;
  getActiveWorkspace: () => Workspace | undefined;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  immer((set, get) => ({
    workspaces: [],
    activeWorkspaceId: null,
    activeCollectionId: null,
    activeRequestId: null,

    setActiveWorkspace: (id) => set((s) => { s.activeWorkspaceId = id; s.activeCollectionId = null; s.activeRequestId = null; }),
    setActiveCollection: (id) => set((s) => { s.activeCollectionId = id; s.activeRequestId = null; }),
    setActiveRequest: (id) => set((s) => {
      s.activeRequestId = id;
      for (const ws of s.workspaces) {
        for (const col of ws.collections) {
          if (col.requests.some((r) => r.id === id)) {
            s.activeCollectionId = col.id;
            s.activeWorkspaceId ??= ws.id;
            return;
          }
        }
      }
    }),

    addWorkspace: (name) => {
      const id = generateId();
      set((s) => {
        s.workspaces.push({ id, name, collections: [], variables: [] });
      });
      return id;
    },

    addCollection: (workspaceId, name) => {
      const id = generateId();
      set((s) => {
        const ws = s.workspaces.find((w) => w.id === workspaceId);
        if (ws) ws.collections.push({ id, name, requests: [], variables: [] });
      });
      return id;
    },

    addRequest: (workspaceId, collectionId, name) => {
      const id = generateId();
      set((s) => {
        const ws = s.workspaces.find((w) => w.id === workspaceId);
        if (!ws) return;
        const col = ws.collections.find((c) => c.id === collectionId);
        if (!col) return;
        col.requests.push({
          id,
          name,
          method: 'GET',
          url: '',
          headers: [],
          queryParams: [],
          body: { type: 'none' },
          variables: [],
          scripts: [],
        });
      });
      return id;
    },

    deleteWorkspace: (id) => set((s) => {
      s.workspaces = s.workspaces.filter((w) => w.id !== id);
      if (s.activeWorkspaceId === id) { s.activeWorkspaceId = null; s.activeCollectionId = null; s.activeRequestId = null; }
    }),

    deleteCollection: (id) => set((s) => {
      for (const ws of s.workspaces) {
        const idx = ws.collections.findIndex((c) => c.id === id);
        if (idx !== -1) {
          ws.collections.splice(idx, 1);
          break;
        }
      }
      if (s.activeCollectionId === id) { s.activeCollectionId = null; s.activeRequestId = null; }
    }),

    deleteRequest: (requestId) => set((s) => {
      for (const ws of s.workspaces) {
        for (const col of ws.collections) {
          const idx = col.requests.findIndex((r) => r.id === requestId);
          if (idx !== -1) {
            col.requests.splice(idx, 1);
            if (s.activeRequestId === requestId) s.activeRequestId = null;
            return;
          }
        }
      }
    }),

    updateWorkspace: (id, partial) => set((s) => {
      const ws = s.workspaces.find((w) => w.id === id);
      if (ws) Object.assign(ws, partial);
    }),

    updateCollection: (id, partial) => set((s) => {
      for (const ws of s.workspaces) {
        const col = ws.collections.find((c) => c.id === id);
        if (col) { Object.assign(col, partial); return; }
      }
    }),

    updateRequest: (requestId, partial) => set((s) => {
      for (const ws of s.workspaces) {
        for (const col of ws.collections) {
          const req = col.requests.find((r) => r.id === requestId);
          if (req) { Object.assign(req, partial); return; }
        }
      }
    }),

    getActiveRequest: () => {
      const st = get();
      if (!st.activeRequestId) return undefined;
      for (const ws of st.workspaces) {
        for (const col of ws.collections) {
          const req = col.requests.find((r) => r.id === st.activeRequestId);
          if (req) return req;
        }
      }
      return undefined;
    },

    getActiveCollection: () => {
      const st = get();
      if (!st.activeCollectionId) return undefined;
      for (const ws of st.workspaces) {
        const col = ws.collections.find((c) => c.id === st.activeCollectionId);
        if (col) return col;
      }
      return undefined;
    },

    getActiveWorkspace: () => {
      const st = get();
      if (!st.activeWorkspaceId) return undefined;
      return st.workspaces.find((w) => w.id === st.activeWorkspaceId);
    },
  }))
);

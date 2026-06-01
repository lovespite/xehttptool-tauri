import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { RequestTab } from '../types';

type RightPanel = 'response' | 'variables' | 'history' | 'mock' | 'proxy';

interface UIState {
  selectedRequestTab: RequestTab;
  rightPanel: RightPanel;
  sidebarWidth: number;
  expandedCollectionIds: string[];

  setSelectedRequestTab: (tab: RequestTab) => void;
  setRightPanel: (panel: RightPanel) => void;
  setSidebarWidth: (w: number) => void;
  toggleCollectionExpand: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    selectedRequestTab: 'params',
    rightPanel: 'response',
    sidebarWidth: 280,
    expandedCollectionIds: [],

    setSelectedRequestTab: (tab) => set((s) => { s.selectedRequestTab = tab; }),
    setRightPanel: (panel) => set((s) => { s.rightPanel = panel; }),
    setSidebarWidth: (w) => set((s) => { s.sidebarWidth = w; }),
    toggleCollectionExpand: (id) => set((s) => {
      const idx = s.expandedCollectionIds.indexOf(id);
      if (idx === -1) s.expandedCollectionIds.push(id);
      else s.expandedCollectionIds.splice(idx, 1);
    }),
  }))
);

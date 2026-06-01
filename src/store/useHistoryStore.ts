import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { HistoryEntryMeta, HistoryEntry } from '../services/history';
import { listHistoryEntries, saveHistoryEntry, loadHistoryEntry, deleteHistoryEntry } from '../services/history';

interface HistoryState {
  entries: HistoryEntryMeta[];
  selectedEntry: HistoryEntry | null;
  loading: boolean;

  loadEntries: () => Promise<void>;
  addEntry: (entry: HistoryEntry) => Promise<void>;
  viewEntry: (id: string) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  clearSelectedEntry: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  immer((set) => ({
    entries: [],
    selectedEntry: null,
    loading: false,

    loadEntries: async () => {
      try {
        const entries = await listHistoryEntries();
        set((s) => { s.entries = entries; });
      } catch (err) {
        console.error('[History] Failed to load entries:', err);
      }
    },

    addEntry: async (entry) => {
      try {
        await saveHistoryEntry(entry);
        set((s) => {
          s.entries.unshift({
            id: entry.id,
            timestamp: entry.timestamp,
            method: entry.method,
            url: entry.url,
            status: entry.status,
          });
        });
      } catch (err) {
        console.error('[History] Failed to save entry:', err);
        throw err;
      }
    },

    viewEntry: async (id) => {
      set((s) => { s.loading = true; });
      try {
        const entry = await loadHistoryEntry(id);
        set((s) => { s.selectedEntry = entry; s.loading = false; });
      } catch (err) {
        console.error('[History] Failed to load entry:', err);
        set((s) => { s.loading = false; });
      }
    },

    removeEntry: async (id) => {
      try {
        await deleteHistoryEntry(id);
        set((s) => {
          s.entries = s.entries.filter((e) => e.id !== id);
          if (s.selectedEntry?.id === id) s.selectedEntry = null;
        });
      } catch (err) {
        console.error('[History] Failed to delete entry:', err);
      }
    },

    clearSelectedEntry: () => set((s) => { s.selectedEntry = null; }),
  }))
);

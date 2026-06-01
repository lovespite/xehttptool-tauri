import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { HttpResponse, ConsoleEntry } from '../types';

const MAX_CONSOLE_ENTRIES = 500;

interface HttpState {
  response: HttpResponse | null;
  loading: boolean;
  error: string | null;
  lastRequestUrl: string | null;
  consoleEntries: ConsoleEntry[];

  setResponse: (r: HttpResponse | null) => void;
  setLoading: (l: boolean) => void;
  setError: (e: string | null) => void;
  setLastRequestUrl: (url: string) => void;
  pushConsoleEntries: (entries: ConsoleEntry[]) => void;
  clearConsoleEntries: () => void;
}

export const useHttpStore = create<HttpState>()(
  immer((set) => ({
    response: null,
    loading: false,
    error: null,
    lastRequestUrl: null,
    consoleEntries: [],

    setResponse: (r) => set((s) => { s.response = r; s.loading = false; s.error = null; }),
    setLoading: (l) => set((s) => { s.loading = l; if (l) { s.error = null; s.response = null; } }),
    setError: (e) => set((s) => { s.error = e; s.loading = false; }),
    setLastRequestUrl: (url) => set((s) => { s.lastRequestUrl = url; }),

    pushConsoleEntries: (entries) => set((s) => {
      s.consoleEntries.push(...entries);
      if (s.consoleEntries.length > MAX_CONSOLE_ENTRIES) {
        s.consoleEntries = s.consoleEntries.slice(-MAX_CONSOLE_ENTRIES);
      }
    }),

    clearConsoleEntries: () => set((s) => { s.consoleEntries = []; }),
  }))
);

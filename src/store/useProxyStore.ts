import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ProxyRule } from '../types';
import { generateId } from '../utils/idGenerator';
import * as tauri from '../services/tauri';

interface ProxyState {
  enabled: boolean;
  rules: ProxyRule[];
  fallback: string;

  setEnabled: (e: boolean) => void;
  setFallback: (f: string) => void;
  addRule: () => void;
  updateRule: (id: string, partial: Partial<ProxyRule>) => void;
  deleteRule: (id: string) => void;
  moveRule: (fromIndex: number, toIndex: number) => void;
  loadFromDisk: () => Promise<void>;
  saveToDisk: () => Promise<void>;
}

export const useProxyStore = create<ProxyState>()(
  immer((set, get) => ({
    enabled: false,
    rules: [],
    fallback: 'direct',

    setEnabled: (enabled) => set((s) => { s.enabled = enabled; }),
    setFallback: (fallback) => set((s) => { s.fallback = fallback; }),

    addRule: () => set((s) => {
      s.rules.push({
        id: generateId(),
        pattern: '*',
        proxyUrl: 'http://127.0.0.1:8080',
        enabled: true,
      });
    }),

    updateRule: (id, partial) => set((s) => {
      const rule = s.rules.find((r) => r.id === id);
      if (rule) Object.assign(rule, partial);
    }),

    deleteRule: (id) => set((s) => {
      s.rules = s.rules.filter((r) => r.id !== id);
    }),

    moveRule: (fromIndex, toIndex) => set((s) => {
      if (fromIndex < 0 || fromIndex >= s.rules.length) return;
      if (toIndex < 0 || toIndex >= s.rules.length) return;
      const [removed] = s.rules.splice(fromIndex, 1);
      s.rules.splice(toIndex, 0, removed);
    }),

    loadFromDisk: async () => {
      try {
        const config = await tauri.getProxyConfig();
        set((s) => {
          s.enabled = config.enabled;
          s.rules = config.rules;
          s.fallback = config.fallback;
        });
      } catch (err) {
        console.error('[Proxy] Failed to load config:', err);
      }
    },

    saveToDisk: async () => {
      try {
        const state = get();
        await tauri.saveProxyConfig({
          enabled: state.enabled,
          rules: state.rules,
          fallback: state.fallback,
        });
      } catch (err) {
        console.error('[Proxy] Failed to save config:', err);
      }
    },
  }))
);

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { MockRoute, MockServerStatus } from '../types';
import { generateId } from '../utils/idGenerator';

interface MockState {
  port: number;
  routes: MockRoute[];
  running: boolean;

  setPort: (port: number) => void;
  addRoute: () => void;
  updateRoute: (id: string, partial: Partial<MockRoute>) => void;
  deleteRoute: (id: string) => void;
  setRunning: (r: boolean) => void;
  syncFromStatus: (status: MockServerStatus) => void;
}

export const useMockStore = create<MockState>()(
  immer((set) => ({
    port: 3001,
    routes: [],
    running: false,

    setPort: (port) => set((s) => { s.port = port; }),
    addRoute: () => set((s) => {
      s.routes.push({
        id: generateId(),
        method: 'GET',
        path: '/',
        statusCode: 200,
        headers: [],
        body: '{"message": "ok"}',
        enabled: true,
      });
    }),
    updateRoute: (id, partial) => set((s) => {
      const route = s.routes.find((r) => r.id === id);
      if (route) Object.assign(route, partial);
    }),
    deleteRoute: (id) => set((s) => {
      s.routes = s.routes.filter((r) => r.id !== id);
    }),
    setRunning: (r) => set((s) => { s.running = r; }),
    syncFromStatus: (status) => set((s) => {
      s.running = status.running;
      s.port = status.port;
      s.routes = status.routes;
    }),
  }))
);

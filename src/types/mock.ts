import type { HttpMethod } from './workspace';

export interface MockRoute {
  id: string;
  method: HttpMethod;
  path: string;
  statusCode: number;
  headers: { key: string; value: string; enabled: boolean }[];
  body: string;
  enabled: boolean;
}

export interface MockServerConfig {
  port: number;
  routes: MockRoute[];
}

export interface MockServerStatus {
  running: boolean;
  port: number;
  routes: MockRoute[];
}

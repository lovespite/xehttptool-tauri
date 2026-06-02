import { invoke } from '@tauri-apps/api/core';
import type { HttpResponse, Workspace, MockRoute, MockServerConfig, MockServerStatus, ProxyConfig } from '../types';

// === HTTP Request ===

export async function sendRequest(params: {
  method: string;
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  body: string | null;
  contentType: string;
  timeout?: number;
  proxyUrl?: string | null;
}): Promise<HttpResponse> {
  return invoke('send_request', {
    method: params.method,
    url: params.url,
    headers: params.headers,
    body: params.body,
    contentType: params.contentType,
    timeout: params.timeout ?? 30000,
    proxyUrl: params.proxyUrl ?? null,
  });
}

// === Persistence ===

export interface WorkspaceMeta {
  id: string;
  name: string;
}

export async function loadAllWorkspaces(): Promise<WorkspaceMeta[]> {
  return invoke('load_all_workspaces');
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  return invoke('save_workspace', { workspace });
}

export async function loadWorkspace(workspaceId: string): Promise<Workspace> {
  return invoke('load_workspace', { workspaceId });
}

export async function saveWorkspaceMeta(metas: WorkspaceMeta[]): Promise<void> {
  return invoke('save_workspace_meta', { metas });
}

// === Export/Import ===

export async function exportAllWorkspaces(workspaces: Workspace[], path: string): Promise<void> {
  return invoke('export_all_workspaces', { workspaces, path });
}

export async function importWorkspacesFromFile(path: string): Promise<Workspace[]> {
  return invoke('import_workspaces_from_file', { path });
}

// === Mock Server ===

export async function startMockServer(config: MockServerConfig): Promise<number> {
  return invoke('start_mock_server', { config });
}

export async function stopMockServer(): Promise<void> {
  return invoke('stop_mock_server');
}

export async function getMockServerStatus(): Promise<MockServerStatus> {
  return invoke('get_mock_server_status');
}

export async function updateMockRoutes(routes: MockRoute[]): Promise<void> {
  return invoke('update_mock_routes', { routes });
}

// === Proxy ===

export async function getProxyConfig(): Promise<ProxyConfig> {
  return invoke('get_proxy_config');
}

export async function saveProxyConfig(config: ProxyConfig): Promise<void> {
  return invoke('save_proxy_config', { config });
}

export async function resolveProxy(url: string): Promise<string | null> {
  return invoke('resolve_proxy', { url });
}

export async function exportProxyRules(path: string, config: ProxyConfig): Promise<void> {
  return invoke('export_proxy_rules', { path, config });
}

export async function importProxyRules(path: string): Promise<ProxyConfig> {
  return invoke('import_proxy_rules', { path });
}

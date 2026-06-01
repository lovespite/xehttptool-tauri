import { invoke } from '@tauri-apps/api/core';

export interface HistoryEntryMeta {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status: number;
  status_text: string;
  request_data: unknown;
  response_data: unknown;
}

export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
  return invoke('save_history_entry', { entry });
}

export async function listHistoryEntries(): Promise<HistoryEntryMeta[]> {
  return invoke('list_history_entries');
}

export async function loadHistoryEntry(id: string): Promise<HistoryEntry> {
  return invoke('load_history_entry', { id });
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  return invoke('delete_history_entry', { id });
}

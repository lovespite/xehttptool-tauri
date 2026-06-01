export type ConsoleEntryType = 'log' | 'info' | 'warn' | 'error' | 'assert';

export interface ConsoleEntry {
  id: string;
  type: ConsoleEntryType;
  message: string;
  timestamp: number;
  source: 'pre-request' | 'test' | 'system';
}

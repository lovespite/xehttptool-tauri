export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string[]>;
  body: string;
  contentType: string;
  timing: number;
  size: number;
}

export interface HttpRequestInput {
  method: string;
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  body: string | null;
  contentType: string;
  timeout: number;
}

export type RequestTab = 'params' | 'headers' | 'body' | 'scripts';

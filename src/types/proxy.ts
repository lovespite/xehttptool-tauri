export interface ProxyRule {
  id: string;
  pattern: string;
  proxyUrl: string;
  enabled: boolean;
}

export interface ProxyConfig {
  enabled: boolean;
  rules: ProxyRule[];
  fallback: string;
}

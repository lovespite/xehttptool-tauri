export function detectLanguage(contentType: string): 'json' | 'xml' | 'text' {
  if (contentType.startsWith('application/json') || contentType.startsWith('text/json')) {
    return 'json';
  }
  if (contentType.includes('xml') || contentType.includes('html')) {
    return 'xml';
  }
  return 'text';
}

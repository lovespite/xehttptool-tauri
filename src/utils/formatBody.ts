export function formatJSON(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

export function formatXML(str: string): string {
  const trimmed = str.trim();
  if (!trimmed) return str;

  let formatted = '';
  let indent = '';
  const tab = '  ';

  // Normalize: remove existing whitespace between tags, then re-indent
  const normalized = trimmed.replace(/>\s*</g, '><');

  let i = 0;
  while (i < normalized.length) {
    // Find the next tag boundary
    const tagStart = normalized.indexOf('<', i);
    if (tagStart === -1) {
      formatted += normalized.slice(i);
      break;
    }

    // Add any text content before the tag
    if (tagStart > i) {
      const text = normalized.slice(i, tagStart).trim();
      if (text) {
        formatted += indent + text + '\n';
      }
    }

    const tagEnd = normalized.indexOf('>', tagStart);
    if (tagEnd === -1) {
      formatted += normalized.slice(i);
      break;
    }

    const tag = normalized.slice(tagStart, tagEnd + 1);

    // Check if it's a closing tag
    const isClosing = tag.startsWith('</');
    // Check if it's a self-closing tag or declaration
    const isSelfClosing = tag.endsWith('/>') || tag.startsWith('<?') || tag.startsWith('<!');
    // Check if it's an opening tag
    const isOpening = !isClosing && !isSelfClosing;

    if (isClosing) {
      indent = indent.slice(tab.length);
    }

    formatted += indent + tag + '\n';

    if (isOpening) {
      indent += tab;
    }

    i = tagEnd + 1;
  }

  return formatted.trimEnd();
}

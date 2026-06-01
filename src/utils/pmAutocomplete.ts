import { autocompletion, CompletionContext } from '@codemirror/autocomplete';

const PM_COMPLETIONS = [
  { label: 'pm.variables.get', detail: '(name) → string | undefined', info: 'Get a variable by name from scope chain (request → collection → workspace)' },
  { label: 'pm.variables.set', detail: '(name, value, scope?)', info: 'Set a variable value in the specified scope (default: request)' },
  { label: 'pm.variables.unset', detail: '(name, scope)', info: 'Remove a variable by name from a scope' },
  { label: 'pm.variables.clear', detail: '(scope)', info: 'Clear all variables in a scope' },
  { label: 'pm.response.status', detail: '→ number', info: 'HTTP response status code' },
  { label: 'pm.response.statusText', detail: '→ string', info: 'HTTP response status text' },
  { label: 'pm.response.headers', detail: '→ object', info: 'HTTP response headers as key-value object' },
  { label: 'pm.response.body', detail: '→ string', info: 'HTTP response body as string' },
  { label: 'pm.response.json', detail: '() → object | null', info: 'Parse response body as JSON' },
  { label: 'pm.response.timing', detail: '→ number', info: 'Request timing in milliseconds' },
  { label: 'pm.expect', detail: '(actual).to.equal(expected)', info: 'Assert a value equals expected' },
  { label: 'console.log', detail: '(...args)', info: 'Log a message to the console' },
];

function pmCompletions(context: CompletionContext) {
  const word = context.matchBefore(/\bpm\.\w*$/);
  const consoleWord = context.matchBefore(/\bconsole\.\w*$/);

  if (!word && !consoleWord) return null;

  const from = word ? word.from : consoleWord ? consoleWord.from : context.pos;

  return {
    from,
    options: PM_COMPLETIONS,
    validFor: /^\w+\.\w*$/,
  };
}

export function createPmAutocomplete() {
  return autocompletion({ override: [pmCompletions] });
}

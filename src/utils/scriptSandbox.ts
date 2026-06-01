import type { Variable, VariableScope, HttpResponse } from '../types';

export interface ScriptContext {
  getRequestVariables: () => Variable[];
  setRequestVariables: (vars: Variable[]) => void;
  getCollectionVariables: () => Variable[];
  setCollectionVariables: (vars: Variable[]) => void;
  getWorkspaceVariables: () => Variable[];
  setWorkspaceVariables: (vars: Variable[]) => void;
  response: HttpResponse | null;
}

/**
 * Execute a user script in a sandboxed context with the `pm` API.
 * Returns any modified variables per scope.
 */
export async function executeScript(
  code: string,
  ctx: ScriptContext,
  scriptType: 'pre-request' | 'test'
): Promise<{
  requestVariables: Variable[];
  collectionVariables: Variable[];
  workspaceVariables: Variable[];
  logs: string[];
  errors: string[];
}> {
  const logs: string[] = [];
  const errors: string[] = [];

  const scopeGetters: Record<string, () => Variable[]> = {
    request: ctx.getRequestVariables,
    collection: ctx.getCollectionVariables,
    workspace: ctx.getWorkspaceVariables,
  };

  const scopeSetters: Record<string, (vars: Variable[]) => void> = {
    request: ctx.setRequestVariables,
    collection: ctx.setCollectionVariables,
    workspace: ctx.setWorkspaceVariables,
  };

  // Build the pm object
  const pm: Record<string, unknown> = {
    variables: {
      get: (name: string): string | undefined => {
        for (const scope of ['request', 'collection', 'workspace'] as VariableScope[]) {
          const found = scopeGetters[scope]().find(
            (v: Variable) => v.key === name && v.enabled
          );
          if (found) return found.value;
        }
        return undefined;
      },
      set: (name: string, value: string, scope: VariableScope = 'request') => {
        const vars = scopeGetters[scope]();
        const existing = vars.find((v: Variable) => v.key === name);
        if (existing) {
          scopeSetters[scope](
            vars.map((v: Variable) =>
              v.key === name ? { ...v, value } : v
            )
          );
        } else {
          const newVar: Variable = {
            id: `script-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            key: name,
            value,
            scope,
            enabled: true,
          };
          scopeSetters[scope]([...vars, newVar]);
        }
      },
      unset: (name: string, scope: VariableScope) => {
        scopeSetters[scope](
          scopeGetters[scope]().filter((v: Variable) => v.key !== name)
        );
      },
      clear: (scope: VariableScope) => {
        scopeSetters[scope]([]);
      },
    },
  };

  // Test scripts also get response access
  if (scriptType === 'test' && ctx.response) {
    pm.response = {
      status: ctx.response.status,
      statusText: ctx.response.statusText,
      headers: Object.fromEntries(
        Object.entries(ctx.response.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v])
      ),
      body: ctx.response.body,
      json: () => {
        try {
          return JSON.parse(ctx.response!.body);
        } catch {
          return null;
        }
      },
      timing: ctx.response.timing,
    };

    pm.expect = (actual: unknown) => ({
      to: {
        be: (expected: unknown) => {
          if (actual !== expected) {
            throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
          }
        },
        equal: (expected: unknown) => {
          if (actual !== expected) {
            throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
          }
        },
        include: (substring: string) => {
          if (typeof actual === 'string' && !actual.includes(substring)) {
            throw new Error(`Expected "${actual}" to include "${substring}"`);
          }
        },
        a: (type: string) => {
          const actualType = typeof actual;
          if (actualType !== type) {
            throw new Error(`Expected type ${type}, got ${actualType}`);
          }
        },
      },
      not: {
        equal: (expected: unknown) => {
          if (actual === expected) {
            throw new Error(`Expected ${JSON.stringify(actual)} not to equal ${JSON.stringify(expected)}`);
          }
        },
      },
    });
  }

  // Override console methods to capture output
  const originalConsole: Console = { ...console };
  const capture = (method: "log" | "info" | "warn" | "error" | "assert", args: any[]) => {
    originalConsole[method](...args);
    logs.push(`[${method}] ${args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`);
  };
  console.log = (...args) => capture('log', args);
  console.info = (...args) => capture('info', args);
  console.warn = (...args) => capture('warn', args);
  console.error = (...args) => capture('error', args);
  console.assert = (condition: unknown, ...args: unknown[]) => {
    if (!condition) capture('assert', args);
  };

  const restoreConsole = () => {
    Object.assign(console, originalConsole);
  };

  try {
    // Wrap the user code in an async function that receives pm
    const wrappedCode = `
      (async (pm) => {
        ${code}
      })
    `;
    const fn = eval(wrappedCode) as (pm: Record<string, unknown>) => Promise<void>;
    try {
      await fn(pm);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    } finally {
      restoreConsole();
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    restoreConsole();
  }

  return {
    requestVariables: scopeGetters.request(),
    collectionVariables: scopeGetters.collection(),
    workspaceVariables: scopeGetters.workspace(),
    logs,
    errors,
  };
}

/**
 * Generate a template pre-request script
 */
export function getPreRequestTemplate(): string {
  return `// Pre-request Script
// Access and modify variables before the request is sent
// console.log(pm.variables.get('myVar'));
// pm.variables.set('timestamp', Date.now().toString(), 'request');
`;
}

/**
 * Generate a template test script
 */
export function getTestTemplate(): string {
  return `// Test Script
// Validate the response and modify variables

// Example: check status code
// pm.expect(pm.response.status).to.equal(200);

// Example: check response body
// const json = pm.response.json();
// pm.expect(json.success).to.be(true);

// Example: save response data to a variable
// pm.variables.set('token', json.token, 'collection');
`;
}

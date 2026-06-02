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

// ── Chained assertion class (pm.expect) ──

class PmExpect {
  private actual: unknown;
  private isNegated: boolean;

  constructor(actual: unknown) {
    this.actual = actual;
    this.isNegated = false;
  }

  // Syntactic sugar: .to and .be are no-ops
  get to(): this {
    return this;
  }
  get be(): this {
    return this;
  }

  // Negation: .not flips the assertion
  get not(): PmExpect {
    const neg = new PmExpect(this.actual);
    neg.isNegated = true;
    return neg;
  }

  // ── Matchers ──

  equal(expected: unknown) {
    this.assert(
      this.actual === expected,
      `expected ${this.inspect(this.actual)} to equal ${this.inspect(expected)}`,
    );
  }

  eql(expected: unknown) {
    const match = JSON.stringify(this.actual) === JSON.stringify(expected);
    this.assert(
      match,
      `expected ${this.inspect(this.actual)} to deeply equal ${this.inspect(expected)}`,
    );
  }

  get undefined(): this {
    this.assert(
      this.actual === undefined,
      `expected ${this.inspect(this.actual)} to be undefined`,
    );
    return this;
  }

  get null(): this {
    this.assert(
      this.actual === null,
      `expected ${this.inspect(this.actual)} to be null`,
    );
    return this;
  }

  get empty(): this {
    const isEmpty =
      this.actual === undefined ||
      this.actual === null ||
      (typeof this.actual === 'string' && this.actual === '') ||
      (Array.isArray(this.actual) && this.actual.length === 0) ||
      (typeof this.actual === 'object' &&
        this.actual !== null &&
        Object.keys(this.actual as object).length === 0);
    this.assert(
      isEmpty,
      `expected ${this.inspect(this.actual)} to be empty`,
    );
    return this;
  }

  get ok(): this {
    this.assert(
      !!this.actual,
      `expected ${this.inspect(this.actual)} to be truthy`,
    );
    return this;
  }

  get true(): this {
    this.assert(
      this.actual === true,
      `expected ${this.inspect(this.actual)} to be true`,
    );
    return this;
  }

  get false(): this {
    this.assert(
      this.actual === false,
      `expected ${this.inspect(this.actual)} to be false`,
    );
    return this;
  }

  oneOf(arr: unknown[]) {
    const isIn = Array.isArray(arr) && arr.includes(this.actual);
    this.assert(
      isIn,
      `expected ${this.inspect(this.actual)} to be one of ${this.inspect(arr)}`,
    );
  }

  a(type: string) {
    const actualType = typeof this.actual;
    const pass =
      type === 'array'
        ? Array.isArray(this.actual)
        : actualType === type;
    this.assert(
      pass,
      `expected ${this.inspect(this.actual)} to be of type ${type}, got ${Array.isArray(this.actual) ? 'array' : actualType}`,
    );
  }

  include(substring: string) {
    const includes =
      typeof this.actual === 'string' && this.actual.includes(substring);
    this.assert(
      includes,
      `expected ${this.inspect(this.actual)} to include "${substring}"`,
    );
  }

  property(key: string) {
    const has =
      this.actual !== null &&
      typeof this.actual === 'object' &&
      key in (this.actual as Record<string, unknown>);
    this.assert(
      has,
      `expected ${this.inspect(this.actual)} to have property "${key}"`,
    );
  }

  lengthOf(n: number) {
    const len = (this.actual as { length?: number })?.length;
    this.assert(
      typeof len === 'number' && len === n,
      `expected ${this.inspect(this.actual)} to have length ${n}, got ${len}`,
    );
  }

  above(n: number) {
    const pass = typeof this.actual === 'number' && this.actual > n;
    this.assert(
      pass,
      `expected ${this.inspect(this.actual)} to be above ${n}`,
    );
  }

  below(n: number) {
    const pass = typeof this.actual === 'number' && this.actual < n;
    this.assert(
      pass,
      `expected ${this.inspect(this.actual)} to be below ${n}`,
    );
  }

  match(regexp: RegExp) {
    const pass =
      typeof this.actual === 'string' && regexp.test(this.actual);
    this.assert(
      pass,
      `expected ${this.inspect(this.actual)} to match ${regexp}`,
    );
  }

  private inspect(val: unknown): string {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }

  private assert(pass: boolean, failMsg: string) {
    if (this.isNegated ? pass : !pass) {
      throw new Error(failMsg);
    }
  }
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

  const newVarId = () =>
    `script-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // ── Build the pm object ──

  const pm: Record<string, unknown> = {
    // ── Variables API (multi-scope) ──
    variables: {
      get: (name: string): string | undefined => {
        for (const scope of ['request', 'collection', 'workspace'] as VariableScope[]) {
          const found = scopeGetters[scope]().find(
            (v: Variable) => v.key === name && v.enabled,
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
              v.key === name ? { ...v, value } : v,
            ),
          );
        } else {
          const newVar: Variable = {
            id: newVarId(),
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
          scopeGetters[scope]().filter((v: Variable) => v.key !== name),
        );
      },
      clear: (scope: VariableScope) => {
        scopeSetters[scope]([]);
      },
    },

    // ── Collection-variables shorthand ──
    collectionVariables: {
      get: (name: string): string | undefined => {
        const found = ctx
          .getCollectionVariables()
          .find((v: Variable) => v.key === name && v.enabled);
        return found?.value;
      },
      set: (name: string, value: string) => {
        const vars = ctx.getCollectionVariables();
        const existing = vars.find((v: Variable) => v.key === name);
        if (existing) {
          ctx.setCollectionVariables(
            vars.map((v: Variable) =>
              v.key === name ? { ...v, value } : v,
            ),
          );
        } else {
          const newVar: Variable = {
            id: newVarId(),
            key: name,
            value,
            scope: 'collection',
            enabled: true,
          };
          ctx.setCollectionVariables([...vars, newVar]);
        }
      },
      unset: (name: string) => {
        ctx.setCollectionVariables(
          ctx.getCollectionVariables().filter((v: Variable) => v.key !== name),
        );
      },
    },

    // ── Expect / assertion API (available in both pre-request and test) ──
    expect: (actual: unknown) => new PmExpect(actual),

    // ── Test wrapper ──
    test: (name: string, fn: () => void) => {
      try {
        fn();
        console.log(`✓ ${name}`);
      } catch (e) {
        console.error(
          `✗ ${name}:${e instanceof Error ? ' ' + e.message : ' ' + String(e)}`,
        );
      }
    },
  };

  // ── Response API (test scripts only) ──
  if (scriptType === 'test' && ctx.response) {
    const resp = ctx.response;
    const responseApi: Record<string, unknown> = {
      status: resp.status,
      code: resp.status,
      statusText: resp.statusText,
      headers: Object.fromEntries(
        Object.entries(resp.headers).map(([k, v]) => [
          k,
          Array.isArray(v) ? v.join(', ') : v,
        ]),
      ),
      body: resp.body,
      timing: resp.timing,
      json: () => {
        try {
          return JSON.parse(resp.body);
        } catch {
          return null;
        }
      },
    };
    pm.response = responseApi;
  }

  // ── Console capture ──

  const originalConsole: Partial<Console> = { ...console };
  const capture = (
    method: 'log' | 'info' | 'warn' | 'error' | 'assert',
    args: unknown[],
  ) => {
    (originalConsole[method] as Function)(...args);
    logs.push(
      `[${method}] ${args
        .map((a) =>
          typeof a === 'string' ? a : JSON.stringify(a),
        )
        .join(' ')}`,
    );
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

  // ── Execute ──

  try {
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

// ── Templates ──

export function getPreRequestTemplate(): string {
  return `// Pre-request Script
// Access and modify variables before the request is sent

// Set a variable that will be resolved via {{variable}} in the request
// pm.variables.set("timestamp", Date.now().toString(), "request");
// pm.collectionVariables.set("baseUrl", "https://api.example.com");

// Log variable values
// console.log(pm.variables.get("baseUrl"));
`;
}

export function getTestTemplate(): string {
  return `// Test Script
// Validate the response and manipulate variables

pm.test("Status code is 200", function () {
  pm.expect(pm.response.code).to.equal(200);
});

pm.test("Response has body", function () {
  pm.expect(pm.response.body).to.not.be.empty;
});

// Parse JSON response body
// const json = pm.response.json();
// pm.test("Response has token", function () {
//   pm.expect(json.token).to.not.be.undefined;
// });

// Save a value to a collection variable
// pm.collectionVariables.set("token", json.token);
`;
}

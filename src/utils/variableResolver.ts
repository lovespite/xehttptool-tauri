import type { Request, Collection, Workspace } from '../types';

export interface VariableContext {
  request: Request | null;
  collection: Collection | null;
  workspace: Workspace | null;
}

/**
 * Resolve a single variable name against the scope chain:
 * request -> collection -> workspace
 */
export function resolveVariable(name: string, ctx: VariableContext): string | undefined {
  // 1. Request scope
  if (ctx.request) {
    const found = ctx.request.variables.find(
      (v) => v.key === name && v.enabled
    );
    if (found) return found.value;
  }

  // 2. Collection scope
  if (ctx.collection) {
    const found = ctx.collection.variables.find(
      (v) => v.key === name && v.enabled
    );
    if (found) return found.value;
  }

  // 3. Workspace scope
  if (ctx.workspace) {
    const found = ctx.workspace.variables.find(
      (v) => v.key === name && v.enabled
    );
    if (found) return found.value;
  }

  return undefined;
}

/**
 * Replace all {{variableName}} patterns in a string with resolved values.
 */
export function resolveVariablesInString(
  template: string,
  ctx: VariableContext
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    const value = resolveVariable(name, ctx);
    return value !== undefined ? value : match;
  });
}

/**
 * Recursively resolve variables in all parts of a request before sending.
 */
export function resolveRequestVariables(
  request: Request,
  ctx: VariableContext
): {
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  body: string | null;
} {
  const url = resolveVariablesInString(request.url, ctx);

  const headers = request.headers
    .filter((h) => h.enabled)
    .map((h) => ({
      key: resolveVariablesInString(h.key, ctx),
      value: resolveVariablesInString(h.value, ctx),
      enabled: true,
    }));

  let body: string | null = null;
  if (request.body.raw && request.body.type !== 'none') {
    body = resolveVariablesInString(request.body.raw, ctx);
  }

  return { url, headers, body };
}

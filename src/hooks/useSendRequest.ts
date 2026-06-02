import { useCallback } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useHttpStore } from '../store/useHttpStore';
import { sendRequest as invokeSendRequest, resolveProxy } from '../services/tauri';
import { resolveVariablesInString, type VariableContext } from '../utils/variableResolver';
import { executeScript } from '../utils/scriptSandbox';
import { generateId } from '../utils/idGenerator';
import type { ConsoleEntry } from '../types';

/**
 * Hook that provides the full send-request pipeline:
 * 1. Execute pre-request script (can modify variables)
 * 2. Resolve {{variables}} in URL/headers/body
 * 3. Send HTTP request via Tauri
 * 4. Execute test script (can modify variables, assert on response)
 */
export function useSendRequest() {
  const activeRequest = useWorkspaceStore((s) => s.getActiveRequest());
  const activeCollection = useWorkspaceStore((s) => s.getActiveCollection());
  const activeWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace());
  const updateRequest = useWorkspaceStore((s) => s.updateRequest);
  const updateCollection = useWorkspaceStore((s) => s.updateCollection);
  const updateWorkspace = useWorkspaceStore((s) => s.updateWorkspace);
  const setResponse = useHttpStore((s) => s.setResponse);
  const setLoading = useHttpStore((s) => s.setLoading);
  const setError = useHttpStore((s) => s.setError);
  const setLastRequestUrl = useHttpStore((s) => s.setLastRequestUrl);
  const setLastRequestData = useHttpStore((s) => s.setLastRequestData);
  const pushConsoleEntries = useHttpStore((s) => s.pushConsoleEntries);
  const clearConsoleEntries = useHttpStore((s) => s.clearConsoleEntries);

  const toConsoleEntries = (
    logs: string[],
    errors: string[],
    source: 'pre-request' | 'test'
  ): ConsoleEntry[] => {
    const now = Date.now();
    const entries: ConsoleEntry[] = [];
    for (const log of logs) {
      const type = log.startsWith('[error]') ? 'error'
        : log.startsWith('[warn]') ? 'warn'
        : log.startsWith('[assert]') ? 'assert'
        : 'log';
      entries.push({ id: generateId(), type, message: log.replace(/^\[\w+\]\s*/, ''), timestamp: now, source });
    }
    for (const err of errors) {
      entries.push({ id: generateId(), type: 'error', message: err, timestamp: now, source });
    }
    return entries;
  };

  return useCallback(async () => {
    const req = activeRequest;
    if (!req) return;

    clearConsoleEntries();
    setLoading(true);

    try {
      // Build variable context
      const varCtx: VariableContext = {
        request: req,
        collection: activeCollection ?? null,
        workspace: activeWorkspace ?? null,
      };

      // --- Step 1: Run pre-request script ---
      const preReqScript = req.scripts.find((s) => s.type === 'pre-request');
      if (preReqScript && preReqScript.code.trim()) {
        const preResult = await executeScript(preReqScript.code, {
          getRequestVariables: () => req.variables,
          setRequestVariables: (vars) => updateRequest(req.id, { variables: vars }),
          getCollectionVariables: () => activeCollection?.variables ?? [],
          setCollectionVariables: (vars) => {
            if (activeCollection) updateCollection(activeCollection.id, { variables: vars });
          },
          getWorkspaceVariables: () => activeWorkspace?.variables ?? [],
          setWorkspaceVariables: (vars) => {
            if (activeWorkspace) updateWorkspace(activeWorkspace.id, { variables: vars });
          },
          response: null,
        }, 'pre-request');
        pushConsoleEntries(toConsoleEntries(preResult.logs, preResult.errors, 'pre-request'));
      }

      // --- Step 2: Resolve variables ---
      const resolvedUrl = resolveVariablesInString(req.url, varCtx);

      // Build query params from req.queryParams
      const enabledQueryParams = req.queryParams
        .filter((p) => p.enabled)
        .map((p) => ({
          key: resolveVariablesInString(p.key, varCtx),
          value: resolveVariablesInString(p.value, varCtx),
        }));

      // Append query params to URL
      let finalUrl = resolvedUrl;
      if (enabledQueryParams.length > 0) {
        const urlObj = new URL(resolvedUrl.startsWith('http') ? resolvedUrl : `http://${resolvedUrl}`);
        for (const p of enabledQueryParams) {
          urlObj.searchParams.append(p.key, p.value);
        }
        finalUrl = urlObj.toString();
      }

      const enabledHeaders = req.headers
        .filter((h) => h.enabled)
        .map((h) => ({
          key: resolveVariablesInString(h.key, varCtx),
          value: resolveVariablesInString(h.value, varCtx),
          enabled: true,
        }));

      let bodyStr: string | null = null;
      let contentType = '';
      if (req.body.type === 'json') {
        bodyStr = req.body.raw ? resolveVariablesInString(req.body.raw, varCtx) : null;
        contentType = 'application/json';
      } else if (req.body.type === 'xml') {
        bodyStr = req.body.raw ? resolveVariablesInString(req.body.raw, varCtx) : null;
        contentType = 'application/xml';
      } else if (req.body.type === 'text') {
        bodyStr = req.body.raw ? resolveVariablesInString(req.body.raw, varCtx) : null;
        contentType = 'text/plain';
      } else if (req.body.type === 'form-data' || req.body.type === 'x-www-form-urlencoded') {
        const params = new URLSearchParams();
        (req.body.formData ?? [])
          .filter((f) => f.enabled)
          .forEach((f) => params.append(
            resolveVariablesInString(f.key, varCtx),
            resolveVariablesInString(f.value, varCtx)
          ));
        bodyStr = params.toString();
        contentType = req.body.type === 'form-data' ? 'multipart/form-data' : 'application/x-www-form-urlencoded';
      }

      // --- Step 2.5: Resolve proxy ---
      let proxyUrl: string | null = null;
      try {
        proxyUrl = await resolveProxy(finalUrl);
      } catch (err) {
        console.warn('[Proxy] Failed to resolve proxy, using direct connection:', err);
      }

      // --- Step 3: Send HTTP request ---
      const resp = await invokeSendRequest({
        method: req.method,
        url: finalUrl,
        headers: enabledHeaders,
        body: bodyStr,
        contentType,
        proxyUrl,
      });

      // --- Step 4: Run test script ---
      const testScript = req.scripts.find((s) => s.type === 'test');
      if (testScript && testScript.code.trim()) {
        const testResult = await executeScript(testScript.code, {
          getRequestVariables: () => req.variables,
          setRequestVariables: (vars) => updateRequest(req.id, { variables: vars }),
          getCollectionVariables: () => activeCollection?.variables ?? [],
          setCollectionVariables: (vars) => {
            if (activeCollection) updateCollection(activeCollection.id, { variables: vars });
          },
          getWorkspaceVariables: () => activeWorkspace?.variables ?? [],
          setWorkspaceVariables: (vars) => {
            if (activeWorkspace) updateWorkspace(activeWorkspace.id, { variables: vars });
          },
          response: resp,
        }, 'test');
        pushConsoleEntries(toConsoleEntries(testResult.logs, testResult.errors, 'test'));
      }

      setLastRequestUrl(finalUrl);
      setLastRequestData(enabledHeaders, bodyStr);
      setResponse(resp);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [activeRequest, activeCollection, activeWorkspace, updateRequest, updateCollection, updateWorkspace, setResponse, setLoading, setError, setLastRequestUrl, pushConsoleEntries, clearConsoleEntries]);
}

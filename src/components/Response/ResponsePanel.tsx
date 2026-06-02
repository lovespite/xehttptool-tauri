import { useState, useRef, useEffect, useCallback } from 'react';
import { useHttpStore } from '../../store/useHttpStore';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import MockServerPanel from '../Mock/MockServerPanel';
import VariableExplorer from '../Variable/VariableExplorer';
import ProxyPanel from '../Proxy/ProxyPanel';
import ResponseHeaders from './ResponseHeaders';
import CodeEditor from '../common/CodeEditor';
import { detectLanguage } from '../../utils/contentType';
import { formatJSON, formatXML } from '../../utils/formatBody';
import styles from './Response.module.css';

function generateId(): string {
  return `h${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function ResponsePanel() {
  const [responseTab, setResponseTab] = useState<'response-body' | 'response-headers' | 'request-headers' | 'request-body'>('response-body');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formattedBody, setFormattedBody] = useState<string | null>(null);
  const [showFullBody, setShowFullBody] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const response = useHttpStore((s) => s.response);
  const loading = useHttpStore((s) => s.loading);
  const error = useHttpStore((s) => s.error);
  const lastRequestHeaders = useHttpStore((s) => s.lastRequestHeaders);
  const lastRequestBody = useHttpStore((s) => s.lastRequestBody);
  const rightPanel = useUIStore((s) => s.rightPanel);
  const setRightPanel = useUIStore((s) => s.setRightPanel);
  const activeRequest = useWorkspaceStore((s) => s.getActiveRequest());
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);
  const lastRequestUrl = useHttpStore((s) => s.lastRequestUrl);

  // Auto-format response body when it's structured and ≤ 100KB
  useEffect(() => {
    if (!response) {
      setFormattedBody(null);
      setShowFullBody(false);
      return;
    }
    const lang = detectLanguage(response.contentType);
    if ((lang === 'json' || lang === 'xml') && response.size <= 100 * 1024) {
      const formatted = lang === 'json' ? formatJSON(response.body) : formatXML(response.body);
      setFormattedBody(formatted);
    } else {
      setFormattedBody(null);
    }
    setShowFullBody(false);
  }, [response]);

  const handleFormat = useCallback(() => {
    if (!response) return;
    const lang = detectLanguage(response.contentType);
    if (lang === 'json') {
      setFormattedBody(formatJSON(response.body));
    } else if (lang === 'xml') {
      setFormattedBody(formatXML(response.body));
    }
  }, [response]);
  const renderResponse = () => {
    if (loading) {
      return (
        <div className={styles.center}>
          <div className={styles.spinner} />
          <p>Sending request...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.center}>
          <p className={styles.errorText}>{error}</p>
        </div>
      );
    }

    if (!response) {
      const hasRequestData = lastRequestHeaders !== null || lastRequestBody !== null;
      if (!hasRequestData) {
        return (
          <div className={styles.center}>
            <p className={styles.hint}>Send a request to see the response</p>
          </div>
        );
      }
    }

    const statusClass = response
      ? response.status >= 200 && response.status < 300
          ? styles.statusSuccess
          : response.status >= 400
            ? styles.statusError
            : styles.statusWarning
      : '';

    const handleSave = async () => {
      const req = activeRequest;
      if (!req) {
        setSaveError('No active request selected.');
        setSaveStatus('error');
        return;
      }
      if (!response) return;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      const url = lastRequestUrl ?? req.url;

      setSaveStatus('saving');
      setSaveError(null);

      try {
        await addHistoryEntry({
          id: generateId(),
          timestamp: Math.floor(Date.now() / 1000),
          method: req.method,
          url,
          status: response.status,
          status_text: response.statusText,
          request_data: { ...req, _sentBody: lastRequestBody } as unknown as Record<string, unknown>,
          response_data: response as unknown as Record<string, unknown>,
        });
        setSaveStatus('saved');
        saveTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : String(err));
        setSaveStatus('error');
      }
    };

    return (
      <>
        {response && (
          <div className={styles.header}>
            <span className={`${styles.status} ${statusClass}`}>
              {response.status} {response.statusText}
            </span>
            <span className={styles.meta}>
              {response.timing}ms | {formatSize(response.size)}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <button
                className={`${styles.saveBtn}${saveStatus === 'saving' ? ' ' + styles.saveBtnSaving : ''}${saveStatus === 'saved' ? ' ' + styles.saveBtnSaved : ''}${saveStatus === 'error' ? ' ' + styles.saveBtnError : ''}`}
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                title={!activeRequest ? 'No active request selected' : 'Save to history'}
              >
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
              </button>
              {saveStatus === 'error' && saveError && (
                <span className={styles.saveError}>{saveError}</span>
              )}
            </div>
          </div>
        )}
        <div className={styles.subTabBar}>
          <button
            className={`${styles.subTabBtn} ${responseTab === 'response-body' ? styles.activeSubTab : ''}`}
            onClick={() => setResponseTab('response-body')}
          >
            Response Body
          </button>
          <button
            className={`${styles.subTabBtn} ${responseTab === 'response-headers' ? styles.activeSubTab : ''}`}
            onClick={() => setResponseTab('response-headers')}
          >
            Response Headers
          </button>
          <span className={styles.subTabSeparator} />
          <button
            className={`${styles.subTabBtn} ${responseTab === 'request-headers' ? styles.activeSubTab : ''}`}
            onClick={() => setResponseTab('request-headers')}
          >
            Request Headers
          </button>
          <button
            className={`${styles.subTabBtn} ${responseTab === 'request-body' ? styles.activeSubTab : ''}`}
            onClick={() => setResponseTab('request-body')}
          >
            Request Body
          </button>
        </div>
        {responseTab === 'response-body' ? (
          response ? (() => {
            const lang = detectLanguage(response.contentType);
            const isStructured = lang === 'json' || lang === 'xml';
            const bodySize = response.size;
            const showFormatted = formattedBody !== null;
            const truncated = !showFullBody && bodySize > 1024 * 1024;
            const truncatedSize = truncated ? bodySize - 100 * 1024 : 0;

            if (isStructured) {
              const displayContent = showFormatted ? formattedBody! : response.body;
              const displayTruncated = truncated ? displayContent.slice(0, 100 * 1024) : displayContent;

              return (
                <div className={styles.cmContainer}>
                  <div className={styles.cmToolbar}>
                    {!showFormatted && bodySize <= 1024 * 1024 && (
                      <button className={styles.formatBtn} onClick={handleFormat}>Format</button>
                    )}
                    {truncated && (
                      <span className={styles.truncatedNotice}>
                        Response body is {formatSize(bodySize)}
                        <button className={styles.expandLink} onClick={() => setShowFullBody(true)}>
                          &nbsp;({formatSize(truncatedSize)} more) show full
                        </button>
                      </span>
                    )}
                  </div>
                  <CodeEditor
                    value={displayTruncated}
                    onChange={() => {}}
                    language={lang}
                    readOnly={true}
                    minHeight="200px"
                  />
                </div>
              );
            }

            return (
              <div className={styles.body}>
                <pre className={styles.code}>{response.body}</pre>
              </div>
            );
          })() : (
            <div className={styles.center}>
              <p className={styles.hint}>No response body</p>
            </div>
          )
        ) : responseTab === 'response-headers' ? (
          response ? (
            <ResponseHeaders headers={response.headers} />
          ) : (
            <div className={styles.center}>
              <p className={styles.hint}>No response headers</p>
            </div>
          )
        ) : responseTab === 'request-headers' ? (
          <ResponseHeaders headers={(() => {
            const map: Record<string, string[]> = {};
            if (lastRequestHeaders) {
              for (const h of lastRequestHeaders) {
                if (!h.enabled) continue;
                if (!map[h.key]) map[h.key] = [];
                map[h.key].push(h.value);
              }
            }
            return map;
          })()} />
        ) : (
          <div className={styles.body}>
            <pre className={styles.code}>{lastRequestBody ?? 'No request body'}</pre>
          </div>
        )}
      </>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${rightPanel === 'response' ? styles.activeTab : ''}`}
          onClick={() => setRightPanel('response')}
        >
          Response
        </button>
        <button
          className={`${styles.tabBtn} ${rightPanel === 'variables' ? styles.activeTab : ''}`}
          onClick={() => setRightPanel('variables')}
        >
          Variables
        </button>
        <button
          className={`${styles.tabBtn} ${rightPanel === 'mock' ? styles.activeTab : ''}`}
          onClick={() => setRightPanel('mock')}
        >
          Mock Server
        </button>
        <button
          className={`${styles.tabBtn} ${rightPanel === 'proxy' ? styles.activeTab : ''}`}
          onClick={() => setRightPanel('proxy')}
        >
          Proxy
        </button>
      </div>
      {rightPanel === 'response' ? renderResponse() : rightPanel === 'variables' ? <VariableExplorer /> : rightPanel === 'mock' ? <MockServerPanel /> : <ProxyPanel />}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

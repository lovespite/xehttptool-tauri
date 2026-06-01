import { useState, useRef, useEffect } from 'react';
import { useHttpStore } from '../../store/useHttpStore';
import { useUIStore } from '../../store/useUIStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import MockServerPanel from '../Mock/MockServerPanel';
import VariableExplorer from '../Variable/VariableExplorer';
import ProxyPanel from '../Proxy/ProxyPanel';
import ResponseHeaders from './ResponseHeaders';
import styles from './Response.module.css';

function generateId(): string {
  return `h${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function ResponsePanel() {
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const response = useHttpStore((s) => s.response);
  const loading = useHttpStore((s) => s.loading);
  const error = useHttpStore((s) => s.error);
  const rightPanel = useUIStore((s) => s.rightPanel);
  const setRightPanel = useUIStore((s) => s.setRightPanel);
  const activeRequest = useWorkspaceStore((s) => s.getActiveRequest());
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);
  const lastRequestUrl = useHttpStore((s) => s.lastRequestUrl);
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
      return (
        <div className={styles.center}>
          <p className={styles.hint}>Send a request to see the response</p>
        </div>
      );
    }

    const statusClass =
      response.status >= 200 && response.status < 300
        ? styles.statusSuccess
        : response.status >= 400
          ? styles.statusError
          : styles.statusWarning;

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
          request_data: req as unknown as Record<string, unknown>,
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
        <div className={styles.subTabBar}>
          <button
            className={`${styles.subTabBtn} ${responseTab === 'body' ? styles.activeSubTab : ''}`}
            onClick={() => setResponseTab('body')}
          >
            Body
          </button>
          <button
            className={`${styles.subTabBtn} ${responseTab === 'headers' ? styles.activeSubTab : ''}`}
            onClick={() => setResponseTab('headers')}
          >
            Headers
          </button>
        </div>
        {responseTab === 'body' ? (
          <div className={styles.body}>
            <pre className={styles.code}>{response.body}</pre>
          </div>
        ) : (
          <ResponseHeaders headers={response.headers} />
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

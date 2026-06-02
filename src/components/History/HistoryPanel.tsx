import { useEffect, useState } from 'react';
import { useHistoryStore } from '../../store/useHistoryStore';
import styles from './HistoryPanel.module.css';

const METHOD_COLORS: Record<string, string> = {
  GET: 'var(--success-color)',
  POST: 'var(--accent-color)',
  PUT: 'var(--warning-color)',
  PATCH: 'var(--warning-color)',
  DELETE: 'var(--danger-color)',
  HEAD: 'var(--text-muted)',
  OPTIONS: 'var(--text-muted)',
};

type DetailTab = 'reqHeaders' | 'reqBody' | 'resHeaders' | 'resBody';

function DetailView({ entry, onBack }: { entry: NonNullable<ReturnType<typeof useHistoryStore.getState>['selectedEntry']>; onBack: () => void }) {
  const [detailTab, setDetailTab] = useState<DetailTab>('resHeaders');

  const rd = (entry.request_data ?? {}) as Record<string, unknown>;
  const rs = (entry.response_data ?? {}) as Record<string, unknown>;

  const reqHeaders = Array.isArray(rd.headers) ? (rd.headers as { key: string; value: string; enabled?: boolean }[]) : [];
  const resHeadersRaw = rs.headers as Record<string, string[]> | undefined;
  const resHeaders = resHeadersRaw ? Object.entries(resHeadersRaw) : [];

  const reqBody = rd.body as { type?: string; raw?: string; formData?: { key: string; value: string; enabled: boolean }[] } | undefined;
  const sentBody = rd._sentBody as string | undefined;
  const resBody = typeof rs.body === 'string' ? rs.body : undefined;

  return (
    <div className={styles.detailContainer}>
      <div className={styles.detailHeader}>
        <button className={styles.backBtn} onClick={onBack}>&larr; Back</button>
        <div className={styles.detailMeta}>
          <span className={styles.detailMethod} style={{ color: METHOD_COLORS[entry.method] || 'var(--text-primary)' }}>
            {entry.method}
          </span>
          <span className={styles.detailUrl}>{entry.url}</span>
          <span className={styles.detailStatus}>{entry.status} {entry.status_text}</span>
        </div>
      </div>

      <div className={styles.detailTabBar}>
        {(['resHeaders', 'resBody', 'reqHeaders', 'reqBody'] as DetailTab[]).map((tab) => (
          <button
            key={tab}
            className={`${styles.detailTab} ${detailTab === tab ? styles.detailTabActive : ''}`}
            onClick={() => setDetailTab(tab)}
          >
            {tab === 'resHeaders' ? 'Response Headers' : tab === 'resBody' ? 'Response Body' : tab === 'reqHeaders' ? 'Request Headers' : 'Request Body'}
          </button>
        ))}
      </div>

      <div className={styles.detailContent}>
        {detailTab === 'reqHeaders' && (
          reqHeaders.length > 0 ? (
            <table className={styles.detailTable}>
              <thead>
                <tr><th>Name</th><th>Value</th></tr>
              </thead>
              <tbody>
                {reqHeaders.map((h, i) => (
                  <tr key={i}>
                    <td className={styles.detailKey}>{h.key}</td>
                    <td className={styles.detailValue}>{h.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className={styles.detailEmpty}>No request headers</p>
        )}

        {detailTab === 'reqBody' && (
          sentBody ? (
            <pre className={styles.detailPre}>{sentBody}</pre>
          ) : reqBody?.raw ? (
            <pre className={styles.detailPre}>{reqBody.raw}</pre>
          ) : reqBody?.formData && reqBody.formData.length > 0 ? (
            <pre className={styles.detailPre}>
              {reqBody.formData
                .filter(f => f.enabled !== false)
                .map(f => `${f.key}=${f.value}`)
                .join('&')}
            </pre>
          ) : (
            <p className={styles.detailEmpty}>No request body</p>
          )
        )}

        {detailTab === 'resHeaders' && (
          resHeaders.length > 0 ? (
            <table className={styles.detailTable}>
              <thead>
                <tr><th>Name</th><th>Value</th></tr>
              </thead>
              <tbody>
                {resHeaders.map(([key, values]) => (
                  <tr key={key}>
                    <td className={styles.detailKey}>{key}</td>
                    <td className={styles.detailValue}>{values.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className={styles.detailEmpty}>No response headers</p>
        )}

        {detailTab === 'resBody' && (
          resBody ? (
            <pre className={styles.detailPre}>{resBody}</pre>
          ) : (
            <p className={styles.detailEmpty}>No response body</p>
          )
        )}
      </div>
    </div>
  );
}

export default function HistoryPanel() {
  const entries = useHistoryStore((s) => s.entries);
  const loading = useHistoryStore((s) => s.loading);
  const selectedEntry = useHistoryStore((s) => s.selectedEntry);
  const loadEntries = useHistoryStore((s) => s.loadEntries);
  const viewEntry = useHistoryStore((s) => s.viewEntry);
  const removeEntry = useHistoryStore((s) => s.removeEntry);
  const clearSelectedEntry = useHistoryStore((s) => s.clearSelectedEntry);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  if (selectedEntry) {
    return <DetailView entry={selectedEntry} onBack={clearSelectedEntry} />;
  }

  if (entries.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No history yet</p>
        <p className={styles.hint}>Save a request/response pair to see it here</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>History</h3>
        <span className={styles.count}>{entries.length} entries</span>
      </div>
      <div className={styles.list}>
        {entries.map((entry) => (
          <div key={entry.id} className={styles.item}>
            <button
              className={styles.itemBtn}
              onClick={() => viewEntry(entry.id)}
            >
              <span
                className={styles.method}
                style={{ color: METHOD_COLORS[entry.method] || 'var(--text-primary)' }}
              >
                {entry.method}
              </span>
              <span className={styles.statusBadge}>
                {entry.status}
              </span>
              <div className={styles.itemMeta}>
                <span className={styles.url}>{entry.url}</span>
                <span className={styles.time}>
                  {new Date(entry.timestamp * 1000).toLocaleString()}
                </span>
              </div>
            </button>
            <button
              className={styles.deleteBtn}
              onClick={() => removeEntry(entry.id)}
              title="Delete entry"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      {loading && <div className={styles.loading}>Loading...</div>}
    </div>
  );
}

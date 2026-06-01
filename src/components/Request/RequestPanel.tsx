import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useUIStore } from '../../store/useUIStore';
import { useHttpStore } from '../../store/useHttpStore';
import { useSendRequest } from '../../hooks/useSendRequest';
import type { HttpMethod, RequestTab } from '../../types';
import MethodSelector from './MethodSelector';
import KeyValueTable from '../common/KeyValueTable';
import BodyEditor from './BodyEditor';
import ScriptEditor from '../Script/ScriptEditor';
import styles from './Request.module.css';

const TABS: { key: RequestTab; label: string }[] = [
  { key: 'params', label: 'Params' },
  { key: 'headers', label: 'Headers' },
  { key: 'body', label: 'Body' },
  { key: 'scripts', label: 'Scripts' },
];

export default function RequestPanel() {
  const activeRequest = useWorkspaceStore((s) => s.getActiveRequest());
  const updateRequest = useWorkspaceStore((s) => s.updateRequest);
  const selectedTab = useUIStore((s) => s.selectedRequestTab);
  const setSelectedTab = useUIStore((s) => s.setSelectedRequestTab);
  const loading = useHttpStore((s) => s.loading);
  const handleSend = useSendRequest();

  if (!activeRequest) {
    return (
      <div className={styles.empty}>
        <p>Select a request to start editing</p>
        <p className={styles.hint}>Create a workspace and collection, then add a request.</p>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'params':
        return (
          <KeyValueTable
            items={activeRequest.queryParams}
            onChange={(items) => updateRequest(activeRequest.id, { queryParams: items })}
            keyPlaceholder="Query Parameter"
            valuePlaceholder="Value"
          />
        );
      case 'headers':
        return (
          <KeyValueTable
            items={activeRequest.headers}
            onChange={(items) => updateRequest(activeRequest.id, { headers: items })}
            keyPlaceholder="Header Name"
            valuePlaceholder="Header Value"
          />
        );
      case 'body':
        return (
          <BodyEditor
            body={activeRequest.body}
            onChange={(body) => updateRequest(activeRequest.id, { body })}
          />
        );
      case 'scripts':
        return (
          <ScriptEditor
            scripts={activeRequest.scripts}
            onChange={(scripts) => updateRequest(activeRequest.id, { scripts })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.urlBar}>
        <MethodSelector
          value={activeRequest.method}
          onChange={(method: HttpMethod) => updateRequest(activeRequest.id, { method })}
        />
        <input
          className={styles.urlInput}
          type="text"
          value={activeRequest.url}
          onChange={(e) => updateRequest(activeRequest.id, { url: e.target.value })}
          placeholder="Enter request URL (e.g. https://api.example.com/users)"
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={loading || !activeRequest.url.trim()}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <span
            key={tab.key}
            className={`${styles.tab} ${selectedTab === tab.key ? styles.activeTab : ''}`}
            onClick={() => setSelectedTab(tab.key)}
          >
            {tab.label}
          </span>
        ))}
      </div>

      <div className={styles.editorArea}>
        {renderTabContent()}
      </div>
    </div>
  );
}

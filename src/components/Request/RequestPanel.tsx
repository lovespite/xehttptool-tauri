import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useUIStore } from '../../store/useUIStore';
import { useHttpStore } from '../../store/useHttpStore';
import { useSendRequest } from '../../hooks/useSendRequest';
import { writeTempFile, moveFile, deleteFile } from '../../services/tauri';
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
  const response = useHttpStore((s) => s.response);
  const handleSend = useSendRequest();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pendingSaveRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  // Save response to file after send-and-save
  const handleSendAndSave = useCallback(async () => {
    pendingSaveRef.current = true;
    handleSend();
  }, [handleSend]);

  // Watch for response after "Send & Save" was triggered
  useEffect(() => {
    if (!pendingSaveRef.current || !response) return;
    pendingSaveRef.current = false;

    const saveResponse = async () => {
      const ext = response.contentType.startsWith('application/json') ? 'json'
        : response.contentType.includes('xml') ? 'xml'
        : 'txt';

      let tempPath: string | null = null;
      try {
        tempPath = await writeTempFile(response.body, ext);
        const { save } = await import('@tauri-apps/plugin-dialog');
        const selectedPath = await save({
          filters: ext === 'json'
            ? [{ name: 'JSON', extensions: ['json'] }]
            : ext === 'xml'
              ? [{ name: 'XML', extensions: ['xml'] }]
              : [{ name: 'Text', extensions: ['txt'] }],
          defaultPath: `response.${ext}`,
        });

        if (selectedPath) {
          await moveFile(tempPath, selectedPath);
        } else {
          await deleteFile(tempPath);
        }
      } catch (err) {
        console.error('Failed to save response:', err);
        if (tempPath) {
          try { await deleteFile(tempPath); } catch { /* ignore */ }
        }
      }
    };

    saveResponse();
  }, [response]);

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
        <div className={styles.sendBtnGroup} ref={dropdownRef}>
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={loading || !activeRequest.url.trim()}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
          <button
            className={styles.sendDropdownToggle}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={loading || !activeRequest.url.trim()}
          >
            ▾
          </button>
          {dropdownOpen && (
            <div className={styles.sendDropdown}>
              <button
                onClick={() => {
                  handleSendAndSave();
                  setDropdownOpen(false);
                }}
              >
                Send &amp; Save
              </button>
            </div>
          )}
        </div>
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

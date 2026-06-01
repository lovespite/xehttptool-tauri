import { useEffect, useRef } from 'react';
import { useProxyStore } from '../../store/useProxyStore';
import { useUIStore } from '../../store/useUIStore';
import ProxyRuleEditor from './ProxyRuleEditor';
import * as tauri from '../../services/tauri';
import styles from './Proxy.module.css';

export default function ProxyPanel() {
  const enabled = useProxyStore((s) => s.enabled);
  const rules = useProxyStore((s) => s.rules);
  const fallback = useProxyStore((s) => s.fallback);
  const setEnabled = useProxyStore((s) => s.setEnabled);
  const setFallback = useProxyStore((s) => s.setFallback);
  const addRule = useProxyStore((s) => s.addRule);
  const saveToDisk = useProxyStore((s) => s.saveToDisk);
  const rightPanel = useUIStore((s) => s.rightPanel);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = rightPanel === 'proxy';
  if (!isActive) return null;

  // Auto-save with debounce
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToDisk();
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [enabled, rules, fallback, saveToDisk]);

  const handleExport = async () => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const path = await save({
        filters: [{ name: 'Proxy Rules', extensions: ['json'] }],
        defaultPath: 'proxy-rules.json',
      });
      if (path) {
        const state = useProxyStore.getState();
        await tauri.exportProxyRules(path, {
          enabled: state.enabled,
          rules: state.rules,
          fallback: state.fallback,
        });
      }
    } catch (err) {
      console.error('[Proxy] Export failed:', err);
    }
  };

  const handleImport = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        filters: [{ name: 'Proxy Rules', extensions: ['json'] }],
        multiple: false,
      });
      if (selected) {
        const config = await tauri.importProxyRules(selected);
        useProxyStore.setState({ enabled: config.enabled, rules: config.rules, fallback: config.fallback });
      }
    } catch (err) {
      console.error('[Proxy] Import failed:', err);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Proxy</h3>
        <label className={styles.enabledToggle}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enabled
        </label>
      </div>

      <div className={styles.fallbackRow}>
        <span className={styles.fallbackLabel}>Fallback:</span>
        <input
          type="text"
          className={styles.fallbackInput}
          value={fallback}
          onChange={(e) => setFallback(e.target.value)}
          placeholder='Use "direct" for no fallback proxy, or enter a proxy URL'
          spellCheck={false}
        />
      </div>

      <div className={styles.actionBar}>
        <button className={styles.actionBtn} onClick={handleExport}>
          Export Rules
        </button>
        <button className={styles.actionBtn} onClick={handleImport}>
          Import Rules
        </button>
      </div>

      <div className={styles.ruleList}>
        <div className={styles.ruleHeader}>
          <span className={styles.ruleTitle}>Rules ({rules.length})</span>
          <button className={styles.addRuleBtn} onClick={addRule}>
            + Rule
          </button>
        </div>

        {rules.length === 0 && (
          <div className={styles.empty}>
            No proxy rules configured.
            <br />
            Add a rule above, or import a rule file.
          </div>
        )}

        {rules.map((rule, index) => (
          <ProxyRuleEditor
            key={rule.id}
            rule={rule}
            index={index}
            total={rules.length}
          />
        ))}

        {rules.length > 0 && (
          <div className={styles.hint}>
            Rules are evaluated in order — first match wins.
            Use glob patterns: <code>*</code> matches anything,{' '}
            <code>*.example.com</code> matches subdomains.
          </div>
        )}
      </div>
    </div>
  );
}

import { useProxyStore } from '../../store/useProxyStore';
import type { ProxyRule } from '../../types';
import styles from './Proxy.module.css';

interface Props {
  rule: ProxyRule;
  index: number;
  total: number;
}

export default function ProxyRuleEditor({ rule, index, total }: Props) {
  const updateRule = useProxyStore((s) => s.updateRule);
  const deleteRule = useProxyStore((s) => s.deleteRule);
  const moveRule = useProxyStore((s) => s.moveRule);

  return (
    <div className={styles.ruleCard}>
      <div className={styles.ruleRow}>
        <input
          type="checkbox"
          className={styles.ruleEnableCheck}
          checked={rule.enabled}
          onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
          title="Enable rule"
        />
        <input
          type="text"
          className={styles.patternInput}
          value={rule.pattern}
          onChange={(e) => updateRule(rule.id, { pattern: e.target.value })}
          placeholder="*.example.com"
        />
        <input
          type="text"
          className={styles.proxyUrlInput}
          value={rule.proxyUrl}
          onChange={(e) => updateRule(rule.id, { proxyUrl: e.target.value })}
          placeholder="http://127.0.0.1:8080"
        />
        <div className={styles.ruleActions}>
          <button
            className={styles.moveBtn}
            onClick={() => moveRule(index, index - 1)}
            disabled={index === 0}
            title="Move up"
          >
            &#9650;
          </button>
          <button
            className={styles.moveBtn}
            onClick={() => moveRule(index, index + 1)}
            disabled={index === total - 1}
            title="Move down"
          >
            &#9660;
          </button>
          <button
            className={styles.deleteRuleBtn}
            onClick={() => deleteRule(rule.id)}
            title="Delete rule"
          >
            &times;
          </button>
        </div>
      </div>
    </div>
  );
}

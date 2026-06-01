import type { Script } from '../../types';
import CodeEditor from '../common/CodeEditor';
import styles from './Script.module.css';

interface Props {
  scripts: Script[];
  onChange: (scripts: Script[]) => void;
}

export default function ScriptEditor({ scripts, onChange }: Props) {
  const preReqScript = scripts.find((s) => s.type === 'pre-request');
  const testScript = scripts.find((s) => s.type === 'test');

  const handlePreRequestChange = (code: string) => {
    if (preReqScript) {
      onChange(
        scripts.map((s) =>
          s.id === preReqScript.id ? { ...s, code } : s
        )
      );
    } else {
      onChange([
        ...scripts,
        { id: `script-${Date.now()}`, type: 'pre-request', code },
      ]);
    }
  };

  const handleTestChange = (code: string) => {
    if (testScript) {
      onChange(
        scripts.map((s) =>
          s.id === testScript.id ? { ...s, code } : s
        )
      );
    } else {
      onChange([
        ...scripts,
        { id: `script-${Date.now()}`, type: 'test', code },
      ]);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Pre-request Script</h3>
          <span className={styles.sectionHint}>Runs before the request is sent</span>
        </div>
        <CodeEditor
          value={preReqScript?.code ?? ''}
          onChange={handlePreRequestChange}
          language="javascript"
          placeholder="// Write pre-request script here..."
          minHeight="120px"
        />
      </div>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Test Script</h3>
          <span className={styles.sectionHint}>Runs after the response is received</span>
        </div>
        <CodeEditor
          value={testScript?.code ?? ''}
          onChange={handleTestChange}
          language="javascript"
          placeholder="// Write test script here..."
          minHeight="120px"
        />
      </div>
    </div>
  );
}

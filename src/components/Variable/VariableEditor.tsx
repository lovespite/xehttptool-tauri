import type { Variable } from '../../types';
import { generateId } from '../../utils/idGenerator';
import styles from './Variable.module.css';

interface Props {
  variables: Variable[];
  onChange: (variables: Variable[]) => void;
  scope: 'workspace' | 'collection' | 'request';
}

export default function VariableEditor({ variables, onChange, scope }: Props) {
  const handleChange = (id: string, field: keyof Variable, val: string | boolean) => {
    onChange(
      variables.map((v) => (v.id === id ? { ...v, [field]: val } : v))
    );
  };

  const handleDelete = (id: string) => {
    onChange(variables.filter((v) => v.id !== id));
  };

  const handleAdd = () => {
    onChange([
      ...variables,
      { id: generateId(), key: '', value: '', scope, enabled: true },
    ]);
  };

  return (
    <div className={styles.editor}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.checkCol}></th>
            <th className={styles.keyCol}>Variable</th>
            <th className={styles.valueCol}>Value</th>
            <th className={styles.scopeCol}>Scope</th>
            <th className={styles.actionCol}></th>
          </tr>
        </thead>
        <tbody>
          {variables.map((v) => (
            <tr key={v.id}>
              <td>
                <input
                  type="checkbox"
                  checked={v.enabled}
                  onChange={(e) => handleChange(v.id, 'enabled', e.target.checked)}
                  className={styles.checkbox}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={v.key}
                  onChange={(e) => handleChange(v.id, 'key', e.target.value)}
                  placeholder="Variable name"
                  className={styles.input}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={v.value}
                  onChange={(e) => handleChange(v.id, 'value', e.target.value)}
                  placeholder="Value"
                  className={styles.input}
                />
              </td>
              <td>
                <span className={`${styles.scopeBadge} ${styles[scope]}`}>
                  {scope}
                </span>
              </td>
              <td>
                <button className={styles.deleteBtn} onClick={() => handleDelete(v.id)}>
                  &times;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className={styles.addBtn} onClick={handleAdd}>
        + Add Variable
      </button>
    </div>
  );
}

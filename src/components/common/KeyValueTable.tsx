import { generateId } from '../../utils/idGenerator';
import styles from './Common.module.css';

interface KeyValueItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface Props {
  items: KeyValueItem[];
  onChange: (items: KeyValueItem[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export default function KeyValueTable({ items, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }: Props) {
  const handleChange = (id: string, field: keyof KeyValueItem, val: string | boolean) => {
    onChange(items.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const handleDelete = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleAdd = () => {
    onChange([...items, { id: generateId(), key: '', value: '', enabled: true }]);
  };

  return (
    <div className={styles.keyValueTable}>
      <table>
        <thead>
          <tr>
            <th className={styles.checkCol}></th>
            <th className={styles.keyCol}>{keyPlaceholder}</th>
            <th className={styles.valueCol}>{valuePlaceholder}</th>
            <th className={styles.actionCol}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => handleChange(item.id, 'enabled', e.target.checked)}
                  className={styles.checkbox}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={item.key}
                  onChange={(e) => handleChange(item.id, 'key', e.target.value)}
                  placeholder={keyPlaceholder}
                  className={styles.cellInput}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => handleChange(item.id, 'value', e.target.value)}
                  placeholder={valuePlaceholder}
                  className={styles.cellInput}
                />
              </td>
              <td>
                <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)}>
                  &times;
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className={styles.addRowBtn} onClick={handleAdd}>
        + Add
      </button>
    </div>
  );
}

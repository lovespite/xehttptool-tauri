import type { HttpMethod } from '../../types';
import styles from './Request.module.css';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

interface Props {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

export default function MethodSelector({ value, onChange }: Props) {
  return (
    <select
      className={styles.methodSelect}
      value={value}
      onChange={(e) => onChange(e.target.value as HttpMethod)}
    >
      {METHODS.map((m) => (
        <option key={m} value={m}>{m}</option>
      ))}
    </select>
  );
}

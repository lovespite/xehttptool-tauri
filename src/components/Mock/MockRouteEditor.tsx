import type { MockRoute } from '../../types';
import { useMockStore } from '../../store/useMockStore';
import styles from './Mock.module.css';

interface Props {
  route: MockRoute;
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export default function MockRouteEditor({ route }: Props) {
  const updateRoute = useMockStore((s) => s.updateRoute);
  const deleteRoute = useMockStore((s) => s.deleteRoute);

  return (
    <div className={styles.routeCard}>
      <div className={styles.routeTop}>
        <select
          className={styles.methodSelect}
          value={route.method}
          onChange={(e) => updateRoute(route.id, { method: e.target.value as MockRoute['method'] })}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          className={styles.pathInput}
          value={route.path}
          onChange={(e) => updateRoute(route.id, { path: e.target.value })}
          placeholder="/path"
        />
        <input
          type="number"
          className={styles.statusInput}
          value={route.statusCode}
          onChange={(e) => updateRoute(route.id, { statusCode: Number(e.target.value) })}
          min={100}
          max={599}
        />
        <button className={styles.deleteRouteBtn} onClick={() => deleteRoute(route.id)}>
          &times;
        </button>
      </div>
      <textarea
        className={styles.bodyTextarea}
        value={route.body}
        onChange={(e) => updateRoute(route.id, { body: e.target.value })}
        placeholder="Response body (JSON)"
        rows={3}
        spellCheck={false}
      />
    </div>
  );
}

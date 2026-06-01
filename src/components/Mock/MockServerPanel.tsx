import { useMockStore } from '../../store/useMockStore';
import { useUIStore } from '../../store/useUIStore';
import MockRouteEditor from './MockRouteEditor';
import styles from './Mock.module.css';

export default function MockServerPanel() {
  const port = useMockStore((s) => s.port);
  const routes = useMockStore((s) => s.routes);
  const running = useMockStore((s) => s.running);
  const setPort = useMockStore((s) => s.setPort);
  const addRoute = useMockStore((s) => s.addRoute);
  const setRunning = useMockStore((s) => s.setRunning);
  const rightPanel = useUIStore((s) => s.rightPanel);

  const isActive = rightPanel === 'mock';
  if (!isActive) return null;

  const handleToggle = () => {
    if (running) {
      // In real impl, call stop_mock_server via Tauri
      setRunning(false);
    } else {
      // In real impl, call start_mock_server via Tauri
      if (routes.length === 0) {
        addRoute();
      }
      setRunning(true);
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Mock Server</h3>
        <div className={styles.controls}>
          <label className={styles.portLabel}>
            Port:
            <input
              type="number"
              className={styles.portInput}
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              min={1024}
              max={65535}
              disabled={running}
            />
          </label>
          <button
            className={`${styles.toggleBtn} ${running ? styles.stopBtn : styles.startBtn}`}
            onClick={handleToggle}
          >
            {running ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

      {running && (
        <div className={styles.statusBar}>
          <span className={styles.statusDot} />
          Running on port {port}
        </div>
      )}

      <div className={styles.routeList}>
        <div className={styles.routeHeader}>
          <span className={styles.routeTitle}>Routes ({routes.length})</span>
          <button className={styles.addRouteBtn} onClick={addRoute}>
            + Route
          </button>
        </div>

        {routes.length === 0 && (
          <div className={styles.empty}>No routes configured yet</div>
        )}

        {routes.map((route) => (
          <MockRouteEditor key={route.id} route={route} />
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import './App.css';
import AppLayout from './components/Layout/AppLayout';
import { loadAllFromDisk } from './services/persistence';
import { useProxyStore } from './store/useProxyStore';
import { getVersion } from '@tauri-apps/api/app';
import { getCurrentWindow } from '@tauri-apps/api/window';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      loadAllFromDisk(),
      useProxyStore.getState().loadFromDisk(),
      getVersion().then((v) => getCurrentWindow().setTitle(`xehttptool v${v}`)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-muted)',
        fontSize: '14px',
      }}>
        Loading workspaces...
      </div>
    );
  }

  return <AppLayout />;
}

export default App;

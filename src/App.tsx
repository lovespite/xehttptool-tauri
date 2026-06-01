import { useEffect, useState } from 'react';
import './App.css';
import AppLayout from './components/Layout/AppLayout';
import { loadAllFromDisk } from './services/persistence';
import { useProxyStore } from './store/useProxyStore';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      loadAllFromDisk(),
      useProxyStore.getState().loadFromDisk(),
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

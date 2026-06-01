import { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { handleExportWorkspace, handleImport } from '../../services/persistence';
import TreeItem from './TreeItem';
import styles from './Sidebar.module.css';

export default function WorkspaceTree() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const addCollection = useWorkspaceStore((s) => s.addCollection);
  const updateWorkspace = useWorkspaceStore((s) => s.updateWorkspace);
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace);

  const [showNewWsDialog, setShowNewWsDialog] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ wsId: string; x: number; y: number } | null>(null);
  const [renamingWsId, setRenamingWsId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const handleAddWorkspace = () => {
    setNewWsName('');
    setShowNewWsDialog(true);
  };

  const handleCreateWorkspace = () => {
    const name = newWsName.trim() || 'New Workspace';
    const id = addWorkspace(name);
    setActiveWorkspace(id);
    setShowNewWsDialog(false);
  };

  const handleWsContextMenu = (e: React.MouseEvent, wsId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ wsId, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const close = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', close);
    }
    return () => document.removeEventListener('click', close);
  }, [contextMenu]);

  const handleStartWsRename = (wsId: string, currentName: string) => {
    setRenamingWsId(wsId);
    setRenameValue(currentName);
    setContextMenu(null);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const handleCommitWsRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && renamingWsId) {
      updateWorkspace(renamingWsId, { name: trimmed });
    }
    setRenamingWsId(null);
  };

  const handleCancelWsRename = () => {
    setRenamingWsId(null);
  };

  const handleDeleteWorkspace = (wsId: string) => {
    deleteWorkspace(wsId);
    setContextMenu(null);
  };

  return (
    <div className={styles.tree}>
      <div className={styles.toolbar}>
        <button className={styles.addBtn} onClick={handleAddWorkspace}>
          + Workspace
        </button>
        <div className={styles.toolbarActions}>
          <button className={styles.toolBtn} onClick={handleImport} title="Import workspaces from file">
            Import
          </button>
        </div>
      </div>
      <div className={styles.list}>
        {workspaces.map((ws) => (
          <div key={ws.id}>
            <div
              className={`${styles.wsItem} ${ws.id === activeWorkspaceId ? styles.wsActive : ''}`}
              onClick={() => setActiveWorkspace(ws.id)}
              onContextMenu={(e) => handleWsContextMenu(e, ws.id)}
            >
              <span className={styles.wsIcon}>&#x1f4e6;</span>
              {renamingWsId === ws.id ? (
                <input
                  ref={renameInputRef}
                  className={styles.wsEditInput}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommitWsRename();
                    if (e.key === 'Escape') handleCancelWsRename();
                  }}
                  onBlur={handleCommitWsRename}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={styles.wsName}>{ws.name}</span>
              )}
            </div>

            {ws.id === activeWorkspaceId && (
              <div className={styles.collectionList}>
                <button
                  className={styles.addColBtn}
                  onClick={() => addCollection(ws.id, 'New Collection')}
                >
                  + Collection
                </button>

                {ws.collections.length === 0 && (
                  <div className={styles.empty}>No collections yet</div>
                )}

                {ws.collections.map((col) => (
                  <div key={col.id}>
                    <TreeItem
                      label={col.name}
                      type="collection"
                      id={col.id}
                      workspaceId={ws.id}
                      depth={1}
                    >
                      {col.requests.map((req) => (
                        <TreeItem
                          key={req.id}
                          label={req.name}
                          type="request"
                          id={req.id}
                          workspaceId={ws.id}
                          depth={2}
                        />
                      ))}
                    </TreeItem>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {workspaces.length === 0 && (
          <div className={styles.empty}>No workspaces yet. Click + Workspace to start.</div>
        )}
      </div>

      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className={styles.menuItem}
            onClick={() => handleStartWsRename(contextMenu.wsId, workspaces.find(w => w.id === contextMenu.wsId)?.name ?? '')}
          >
            Rename
          </button>
          <button
            className={styles.menuItem}
            onClick={() => { handleExportWorkspace(contextMenu.wsId); setContextMenu(null); }}
          >
            Export
          </button>
          <button
            className={`${styles.menuItem} ${styles.danger}`}
            onClick={() => handleDeleteWorkspace(contextMenu.wsId)}
          >
            Delete Workspace
          </button>
        </div>
      )}

      {showNewWsDialog && (
        <div className={styles.dialogOverlay} onClick={() => setShowNewWsDialog(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogTitle}>New Workspace</div>
            <input
              className={styles.dialogInput}
              type="text"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder="Workspace name"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
            />
            <div className={styles.dialogActions}>
              <button className={styles.dialogBtn} onClick={() => setShowNewWsDialog(false)}>Cancel</button>
              <button className={styles.dialogBtnPrimary} onClick={handleCreateWorkspace}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import type { TreeNodeType } from '../../types';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useUIStore } from '../../store/useUIStore';
import styles from './TreeItem.module.css';

interface Props {
  label: string;
  type: TreeNodeType;
  id: string;
  workspaceId: string;
  depth: number;
  children?: React.ReactNode;
}

export default function TreeItem({ label, type, id, workspaceId, depth, children }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const activeRequestId = useWorkspaceStore((s) => s.activeRequestId);
  const activeCollectionId = useWorkspaceStore((s) => s.activeCollectionId);
  const setActiveRequest = useWorkspaceStore((s) => s.setActiveRequest);
  const setActiveCollection = useWorkspaceStore((s) => s.setActiveCollection);
  const expandedIds = useUIStore((s) => s.expandedCollectionIds);
  const toggleExpand = useUIStore((s) => s.toggleCollectionExpand);
  const addRequest = useWorkspaceStore((s) => s.addRequest);
  const deleteCollection = useWorkspaceStore((s) => s.deleteCollection);
  const deleteRequestStore = useWorkspaceStore((s) => s.deleteRequest);
  const updateCollection = useWorkspaceStore((s) => s.updateCollection);
  const updateRequest = useWorkspaceStore((s) => s.updateRequest);

  const isExpanded = type === 'collection' ? expandedIds.includes(id) : false;
  const isActive = type === 'request' ? id === activeRequestId : type === 'collection' ? id === activeCollectionId : false;

  const handleClick = () => {
    if (type === 'collection') {
      toggleExpand(id);
      setActiveCollection(id);
    } else if (type === 'request') {
      setActiveRequest(id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  useEffect(() => {
    const handleClickOutside = () => setShowMenu(false);
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  const handleDelete = () => {
    if (type === 'collection') deleteCollection(id);
    else if (type === 'request') deleteRequestStore(id);
    setShowMenu(false);
  };

  const handleStartRename = () => {
    setRenameValue(label);
    setIsRenaming(true);
    setShowMenu(false);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleCommitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== label) {
      if (type === 'collection') updateCollection(id, { name: trimmed });
      else if (type === 'request') updateRequest(id, { name: trimmed });
    }
    setIsRenaming(false);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
  };

  return (
    <div>
      <div
        className={`${styles.item} ${isActive ? styles.active : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {type === 'collection' && (
          <span className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}>
            &#9654;
          </span>
        )}
        <span className={styles.icon}>
          {type === 'collection' ? '📁' : '📄'}
        </span>
        {isRenaming ? (
          <input
            ref={inputRef}
            className={styles.editInput}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCommitRename();
              if (e.key === 'Escape') handleCancelRename();
            }}
            onBlur={handleCommitRename}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={styles.label}>{label}</span>
        )}
      </div>

      {type === 'collection' && isExpanded && children}

      {showMenu && (
        <div
          ref={menuRef}
          className={styles.contextMenu}
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          {type === 'collection' && (
            <>
              <button
                className={styles.menuItem}
                onClick={() => {
                  addRequest(workspaceId, id, 'New Request');
                  setShowMenu(false);
                }}
              >
                + Add Request
              </button>
              <button
                className={styles.menuItem}
                onClick={handleStartRename}
              >
                Rename
              </button>
              <button
                className={`${styles.menuItem} ${styles.danger}`}
                onClick={() => { deleteCollection(id); setShowMenu(false); }}
              >
                Delete Collection
              </button>
            </>
          )}
          {type === 'request' && (
            <>
              <button
                className={styles.menuItem}
                onClick={handleStartRename}
              >
                Rename
              </button>
              <button
                className={`${styles.menuItem} ${styles.danger}`}
                onClick={handleDelete}
              >
                Delete Request
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

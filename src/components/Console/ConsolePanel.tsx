import { useEffect, useRef } from 'react';
import { useHttpStore } from '../../store/useHttpStore';
import type { ConsoleEntryType } from '../../types';
import styles from './Console.module.css';

const TYPE_CLASS: Record<ConsoleEntryType, string> = {
  log: styles.entryLog,
  info: styles.entryInfo,
  warn: styles.entryWarn,
  error: styles.entryError,
  assert: styles.entryAssert,
};

const BADGE_CLASS: Record<ConsoleEntryType, string> = {
  log: styles.typeLog,
  info: styles.typeInfo,
  warn: styles.typeWarn,
  error: styles.typeError,
  assert: styles.typeAssert,
};

const BADGE_LABEL: Record<ConsoleEntryType, string> = {
  log: 'LOG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERR',
  assert: 'ASRT',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export default function ConsolePanel() {
  const consoleEntries = useHttpStore((s) => s.consoleEntries);
  const clearConsoleEntries = useHttpStore((s) => s.clearConsoleEntries);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [consoleEntries.length]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Console</h3>
          {consoleEntries.length > 0 && (
            <span className={styles.entryCount}>{consoleEntries.length}</span>
          )}
        </div>
        {consoleEntries.length > 0 && (
          <button className={styles.clearBtn} onClick={clearConsoleEntries}>
            Clear
          </button>
        )}
      </div>

      <div className={styles.entryList} ref={listRef}>
        {consoleEntries.length === 0 ? (
          <div className={styles.empty}>Script output will appear here</div>
        ) : (
          consoleEntries.map((entry) => (
            <div key={entry.id} className={`${styles.entry} ${TYPE_CLASS[entry.type]}`}>
              <span className={styles.timestamp}>{formatTime(entry.timestamp)}</span>
              <span className={`${styles.typeBadge} ${BADGE_CLASS[entry.type]}`}>
                {BADGE_LABEL[entry.type]}
              </span>
              <span className={styles.message}>{entry.message}</span>
              <span className={styles.sourceTag}>{entry.source}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

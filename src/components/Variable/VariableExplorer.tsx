import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import VariableEditor from './VariableEditor';
import styles from './VariableExplorer.module.css';

export default function VariableExplorer() {
  const activeWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace());
  const activeCollection = useWorkspaceStore((s) => s.getActiveCollection());
  const activeRequest = useWorkspaceStore((s) => s.getActiveRequest());
  const updateWorkspace = useWorkspaceStore((s) => s.updateWorkspace);
  const updateCollection = useWorkspaceStore((s) => s.updateCollection);
  const updateRequest = useWorkspaceStore((s) => s.updateRequest);

  if (!activeWorkspace) {
    return (
      <div className={styles.empty}>
        <p>Select a workspace to manage variables</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Variables</h3>
        <p className={styles.hint}>
          Variables are resolved in order: Request &gt; Collection &gt; Workspace.
          A variable in a narrower scope overrides the same name in wider scopes.
        </p>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={`${styles.scopeBadge} ${styles.workspace}`}>Workspace</span>
          <span className={styles.sectionTitle}>{activeWorkspace.name}</span>
        </div>
        <VariableEditor
          variables={activeWorkspace.variables}
          onChange={(variables) => updateWorkspace(activeWorkspace.id, { variables })}
          scope="workspace"
        />
      </div>

      {activeCollection && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={`${styles.scopeBadge} ${styles.collection}`}>Collection</span>
            <span className={styles.sectionTitle}>{activeCollection.name}</span>
          </div>
          <VariableEditor
            variables={activeCollection.variables}
            onChange={(variables) => updateCollection(activeCollection.id, { variables })}
            scope="collection"
          />
        </div>
      )}

      {activeRequest && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={`${styles.scopeBadge} ${styles.request}`}>Request</span>
            <span className={styles.sectionTitle}>{activeRequest.name}</span>
          </div>
          <VariableEditor
            variables={activeRequest.variables}
            onChange={(variables) => updateRequest(activeRequest.id, { variables })}
            scope="request"
          />
        </div>
      )}
    </div>
  );
}

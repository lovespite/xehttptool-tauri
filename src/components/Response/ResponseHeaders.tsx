import styles from './Response.module.css';

interface Props {
  headers: Record<string, string[]>;
}

export default function ResponseHeaders({ headers }: Props) {
  const entries = Object.entries(headers);

  if (entries.length === 0) {
    return (
      <div className={styles.center}>
        <p className={styles.hint}>No response headers</p>
      </div>
    );
  }

  return (
    <div className={styles.headersContainer}>
      <table className={styles.headersTable}>
        <thead>
          <tr>
            <th className={styles.headerNameCol}>Name</th>
            <th className={styles.headerValueCol}>Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, values]) => (
            <tr key={name}>
              <td className={styles.headerKey}>{name}</td>
              <td className={styles.headerValue}>
                {values.join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

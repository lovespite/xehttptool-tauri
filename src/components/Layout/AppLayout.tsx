import { Group, Panel, Separator } from 'react-resizable-panels';
import WorkspaceTree from '../Sidebar/WorkspaceTree';
import HistoryPanel from '../History/HistoryPanel';
import RequestPanel from '../Request/RequestPanel';
import ResponsePanel from '../Response/ResponsePanel';
import ConsolePanel from '../Console/ConsolePanel';
import { useAutoSave } from '../../hooks/useAutoSave';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  useAutoSave();

  return (
    <div className={styles.container}>
      <Group orientation="horizontal">
        {/* Sidebar */}
        <Panel defaultSize={"28%"} minSize={"15%"} maxSize={"50%"}>
          <Group orientation="vertical">
            <Panel defaultSize={"60%"} minSize={"30%"}>
              <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                  <h2 className={styles.title}>xehttptool</h2>
                </div>
                <WorkspaceTree />
              </div>
            </Panel>

            <Separator className={styles.vSeparator} />

            <Panel defaultSize={"40%"} minSize={"20%"}>
              <div className={styles.sidebar}>
                <HistoryPanel />
              </div>
            </Panel>
          </Group>
        </Panel>

        <Separator className={styles.hSeparator} />

        {/* Center: Request Panel + Console Panel */}
        <Panel defaultSize={"42%"} minSize={"30%"}>
          <Group orientation="vertical">
            <Panel defaultSize={"60%"} minSize={"30%"}>
              <div className={styles.requestPanel}>
                <RequestPanel />
              </div>
            </Panel>

            <Separator className={styles.vSeparator} />

            <Panel defaultSize={"40%"} minSize={"10%"}>
              <div className={styles.consolePanel}>
                <ConsolePanel />
              </div>
            </Panel>
          </Group>
        </Panel>

        <Separator className={styles.hSeparator} />

        {/* Response Panel */}
        <Panel defaultSize={"30%"} minSize={"20%"}>
          <div className={styles.responsePanel}>
            <ResponsePanel />
          </div>
        </Panel>
      </Group>
    </div>
  );
}

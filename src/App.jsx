import React, { useState } from 'react';
import './App.css';
import TopToolbar from './components/TopToolbar';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import StatusPanel from './components/StatusPanel';
import TopRightActions from './components/TopRightActions';
import WarningOverlay from './components/WarningOverlay';
import PdfViewer from './components/PdfViewer';
import FsdSignalStatus from './components/FsdSignalStatus';

function App() {
  const [statusMode, setStatusMode] = useState(false);
  const [fsdSleep, setFsdSleep] = useState(false);
  const [alertType, setAlertType] = useState(null);

  return (
    <div className={`app-container ${statusMode ? 'status-active' : ''}`}>

      {/* Top Toolbar - Overlay/Absolute Position */}
      <TopToolbar
        onToggleStatus={() => setStatusMode(!statusMode)}
        statusActive={statusMode}
        fsdActive={fsdSleep}
        onToggleFsd={() => setFsdSleep((prev) => !prev)}
      />

      <TopRightActions onTrigger={(type) => setAlertType(type)} />
      <WarningOverlay
        alertType={alertType}
        onCancel={() => setAlertType(null)}
        onComplete={() => setAlertType(null)}
      />

      <FsdSignalStatus enabled={fsdSleep} />

      {/* Tesla Status Panel - Full Height (Left) */}
      <div className={`status-panel-shell ${statusMode ? 'open' : 'closed'}`}>
        <StatusPanel fsdSleep={fsdSleep} />
      </div>

      {/* Main Area (Right side when Status Active, or Full Screen) */}
      <div className="main-interface-column">

        <div className="main-content-row">
          {/* Left Sidebar (Only visible if Status Mode is OFF) */}
          {!statusMode && <LeftSidebar />}

          {/* Center Content (PDF Preview) */}
          <div className="center-panel">
            <PdfViewer />
          </div>

          <RightSidebar />
        </div>
      </div>
    </div>
  );
}

export default App;

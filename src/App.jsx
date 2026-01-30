import React, { useState } from 'react';
import './App.css';
import TopToolbar from './components/TopToolbar';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import StatusPanel from './components/StatusPanel';

function App() {
  const [statusMode, setStatusMode] = useState(false);

  return (
    <div className={`app-container ${statusMode ? 'status-active' : ''}`}>

      {/* Top Toolbar - Overlay/Absolute Position */}
      <TopToolbar
        onToggleStatus={() => setStatusMode(!statusMode)}
        statusActive={statusMode}
      />

      {/* Tesla Status Panel - Full Height (Left) */}
      {statusMode && <StatusPanel />}

      {/* Main Area (Right side when Status Active, or Full Screen) */}
      <div className="main-interface-column">

        <div className="main-content-row">
          {/* Left Sidebar (Only visible if Status Mode is OFF) */}
          {!statusMode && <LeftSidebar />}

          {/* Center Content (PDF Preview) */}
          <div className="center-panel">
            <div className="pdf-placeholder">
              <h2>Lecture Material Preview</h2>
              <p>2 / 25</p>
              {statusMode && (
                <div style={{ marginTop: '20px', color: '#8e8e93', fontSize: '14px' }}>
                  Interactive Status Mode
                </div>
              )}
            </div>
          </div>

          <RightSidebar />
        </div>
      </div>
    </div>
  );
}

export default App;

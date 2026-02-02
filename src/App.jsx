import React, { useState } from 'react';
import './App.css';
import TopToolbar from './components/TopToolbar';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import StatusPanel from './components/StatusPanel';
import TopRightActions from './components/TopRightActions';
import WarningOverlay from './components/WarningOverlay';
import PdfViewer from './components/PdfViewer';
import LandingPage from './components/LandingPage';
import ConsentModal from './components/ConsentModal';
import VoiceEnrollModal from './components/VoiceEnrollModal';
import ReadyToast from './components/ReadyToast';
import FsdSignalStatus from './components/FsdSignalStatus';

function App() {
  const [statusMode, setStatusMode] = useState(false);
  const [fsdSleep, setFsdSleep] = useState(false);
  const [gear, setGear] = useState('P');
  const [alertType, setAlertType] = useState(null);
  const [stage, setStage] = useState('landing'); // landing | app
  const [showConsent, setShowConsent] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [showReady, setShowReady] = useState(false);

  if (stage === 'landing') {
    return (
      <LandingPage
        onLogin={() => setStage('app')}
        onSignup={() => {
          setStage('app');
          setShowConsent(true);
        }}
      />
    );
  }

  return (
    <div className={`app-container ${statusMode ? 'status-active' : ''}`}>

      {/* Top Toolbar - Overlay/Absolute Position */}
      <TopToolbar
        onToggleStatus={() => setStatusMode(!statusMode)}
        statusActive={statusMode}
        fsdActive={fsdSleep}
        onToggleFsd={() => {
          setFsdSleep((prev) => {
            const next = !prev;
            if (next && gear === 'P') {
              setGear('D');
            }
            return next;
          });
        }}
      />

      <TopRightActions onTrigger={(type) => setAlertType(type)} />
      <WarningOverlay
        alertType={alertType}
        onCancel={() => setAlertType(null)}
        onComplete={() => setAlertType(null)}
      />
      <ConsentModal
        open={showConsent}
        onClose={() => setShowConsent(false)}
        onAgree={() => {
          setShowConsent(false);
          setShowEnroll(true);
        }}
      />
      <VoiceEnrollModal
        open={showEnroll}
        onClose={() => setShowEnroll(false)}
        onComplete={() => {
          setShowEnroll(false);
          setShowReady(true);
        }}
      />
      <ReadyToast
        open={showReady}
        onDone={() => setShowReady(false)}
      />

      <FsdSignalStatus enabled={fsdSleep} />

      {/* Tesla Status Panel - Full Height (Left) */}
      <div className={`status-panel-shell ${statusMode ? 'open' : 'closed'}`}>
        <StatusPanel
          fsdSleep={fsdSleep}
          gear={gear}
          onGearChange={setGear}
        />
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

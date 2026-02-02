import React, { useRef, useMemo, useState } from 'react';
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
import { useFsdPipeline } from './hooks/useFsdPipeline';

function App() {
  const [statusMode, setStatusMode] = useState(false);
  const [fsdSleep, setFsdSleep] = useState(false);
  const [gear, setGear] = useState('P');
  const [alertType, setAlertType] = useState(null);
  const [stage, setStage] = useState('landing'); // landing | app
  const [showConsent, setShowConsent] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessages, setToastMessages] = useState([]);
  const [toastQueue, setToastQueue] = useState([]);
  const [toastToken, setToastToken] = useState(0);
  const toastActiveRef = useRef(false);

  const enqueueToastGroup = (messages, options = {}) => {
    const normalized = Array.isArray(messages) ? messages.filter(Boolean) : [];
    if (normalized.length === 0) return;
    if (options.replace && toastActiveRef.current) {
      setToastMessages(normalized);
      setShowToast(true);
      setToastQueue([]);
      setToastToken((prev) => prev + 1);
      return;
    }
    if (!toastActiveRef.current) {
      toastActiveRef.current = true;
      setToastMessages(normalized);
      setShowToast(true);
      setToastToken((prev) => prev + 1);
      return;
    }
    setToastQueue((prev) => [...prev, normalized]);
  };

  const enqueueToast = (message, options = {}) => enqueueToastGroup([message], options);

  const handleToastDone = () => {
    setShowToast(false);
    toastActiveRef.current = false;
    setToastQueue((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      toastActiveRef.current = true;
      setToastMessages(next);
      setShowToast(true);
      setToastToken((prev) => prev + 1);
      return rest;
    });
  };

  const handleGearChange = (nextGear, options = {}) => {
    setGear((prev) => {
      if (prev === nextGear) return prev;
      const showToast = options.suppressToast !== true;
      if (nextGear === 'P' && fsdSleep) {
        setFsdSleep(false);
        if (showToast) {
          enqueueToastGroup([
            `${nextGear}단으로 변속했습니다.`,
            'FSD 모드가 비활성화되었습니다.'
          ], { replace: true });
        }
        return nextGear;
      }
      if (showToast) {
        enqueueToast(`${nextGear}단으로 변속했습니다.`, { replace: true });
      }
      return nextGear;
    });
  };

  const mode = useMemo(() => {
    if (gear === 'P') return 'note';
    return fsdSleep ? 'defense' : 'lecture';
  }, [fsdSleep, gear]);

  const ttsConfig = useMemo(() => ({
    refAudioPath: localStorage.getItem('fsd_tts_ref_audio') || '',
    promptText: localStorage.getItem('fsd_tts_prompt_text') || '',
  }), []);

  const {
    sttLines,
    status: sttStatus,
    error: sttError,
    requestSummary,
    clearTranscript,
  } = useFsdPipeline({ mode, ttsConfig });

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
              handleGearChange('D', { suppressToast: true });
              enqueueToastGroup([
                'D단으로 변속했습니다.',
                'FSD 모드가 활성화되었습니다.'
              ], { replace: true });
              return next;
            }
            enqueueToast(
              next
                ? 'FSD 모드가 활성화되었습니다.'
                : 'FSD 모드가 비활성화되었습니다.',
              { replace: true }
            );
            return next;
          });
        }}
        onRequestSummary={requestSummary}
        onClearTranscript={clearTranscript}
        sttStatus={sttStatus}
        sttError={sttError}
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
          enqueueToast('준비가 완료되었습니다!');
        }}
      />
      <ReadyToast
        open={showToast}
        messages={toastMessages}
        token={toastToken}
        onDone={handleToastDone}
      />

      <FsdSignalStatus enabled={fsdSleep} />

      {/* Tesla Status Panel - Full Height (Left) */}
      <div className={`status-panel-shell ${statusMode ? 'open' : 'closed'}`}>
        <StatusPanel
          fsdSleep={fsdSleep}
          gear={gear}
          onGearChange={handleGearChange}
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

          <RightSidebar sttLines={sttLines} />
        </div>
      </div>
    </div>
  );
}

export default App;

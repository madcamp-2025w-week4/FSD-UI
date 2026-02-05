import React, { useRef, useMemo, useState } from 'react';
import './App.css';
import TopToolbar from './components/TopToolbar';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import StatusPanel from './components/StatusPanel';
import WarningOverlay from './components/WarningOverlay';
import PdfViewer from './components/PdfViewer';
import LandingPage from './components/LandingPage';
import ConsentModal from './components/ConsentModal';
import NameInputModal from './components/NameInputModal';
import VoiceEnrollModal from './components/VoiceEnrollModal';
import ReadyToast from './components/ReadyToast';
import FsdSignalStatus from './components/FsdSignalStatus';
import SleepDetector from './components/SleepDetector';
import { useFsdPipeline } from './hooks/useFsdPipeline';
import { usePdf } from './context/PdfContext.jsx';

function App() {
  const [statusMode, setStatusMode] = useState(false);
  const [fsdSleep, setFsdSleep] = useState(false);
  const [gear, setGear] = useState('P');
  const [alertType, setAlertType] = useState(null);
  const [stage, setStage] = useState('landing'); // landing | app
  const [showConsent, setShowConsent] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('fsd_user_name') || '');
  const [showToast, setShowToast] = useState(false);
  const [toastMessages, setToastMessages] = useState([]);
  const [toastQueue, setToastQueue] = useState([]);
  const [toastToken, setToastToken] = useState(0);
  const toastActiveRef = useRef(false);
  const [textToolActive, setTextToolActive] = useState(false);
  const [signalState, setSignalState] = useState('green');
  const { pdfTitle, clearDocument } = usePdf();

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
    downloadTranscript,
    downloadRecording,
  } = useFsdPipeline({
    mode,
    fsdActive: fsdSleep,
    attendanceMode: signalState === 'yellow',  // 노란색일 때만 호명 감지
    ttsConfig,
    pdfTitle,
    onAttendanceStart: () => {
      setAlertType((prev) => (prev ? prev : 'checkin'));
      setSignalState('yellow');  // 출석 시작 시 즉시 노란색
    },
    onRollcallName: () => {
      setAlertType((prev) => (prev ? prev : 'rollcall'));
      setSignalState('red');  // 호명 감지 시 즉시 빨간색
    },
    onAudioEnded: () => {
      // 음성 끝나고 1초 후 초록불 전환
      setTimeout(() => setSignalState('green'), 1000);
    },
    onAttendanceComplete: () => {
      console.log('[App] Attendance complete, setting signal to green after 1s');
      // 출석 완료 후 1초 후 초록불 전환
      setTimeout(() => setSignalState('green'), 1000);
    }
  });

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
        textToolActive={textToolActive}
        onToggleTextTool={() => setTextToolActive((prev) => !prev)}
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
        onDownloadTranscript={downloadTranscript}
        onDownloadRecording={downloadRecording}
        onNewLecture={() => {
          clearTranscript();
          clearDocument();
          setFsdSleep(false);
          handleGearChange('P', { suppressToast: true });
          enqueueToast('새 강의를 시작합니다.', { replace: true });
        }}
        sttStatus={sttStatus}
        sttError={sttError}
      />

      <SleepDetector
        enabled={gear === 'D' && !fsdSleep}
        onDrowsy={() => {
          setAlertType((prev) => (prev ? prev : 'sleep'));
        }}
        onAbsent={() => {
          setAlertType((prev) => (prev ? prev : 'away'));
        }}
      />
      <WarningOverlay
        alertType={alertType}
        onCancel={() => setAlertType(null)}
        onComplete={(type) => {
          setAlertType(null);
          if ((type === 'sleep' || type === 'away') && gear === 'D' && !fsdSleep) {
            setFsdSleep(true);
            enqueueToast('FSD 모드가 활성화되었습니다.');
            return;
          }
          if (type === 'checkin') {
            // 이미 onAttendanceStart에서 yellow로 설정됨
            return;
          }
          if (type === 'rollcall') {
            // 이미 onRollcallName에서 red로 설정됨, 음성 끝나면 green됨
            return;
          }
        }}
      />
      <ConsentModal
        open={showConsent}
        onClose={() => setShowConsent(false)}
        onAgree={() => {
          setShowConsent(false);
          setShowNameInput(true);
        }}
      />
      <NameInputModal
        open={showNameInput}
        initialName={userName}
        onClose={() => setShowNameInput(false)}
        onSubmit={(name) => {
          setUserName(name);
          localStorage.setItem('fsd_user_name', name);
          setShowNameInput(false);
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

      <FsdSignalStatus enabled={fsdSleep} state={signalState} />

      {/* Tesla Status Panel - Full Height (Left) */}
      <div className={`status-panel-shell ${statusMode ? 'open' : 'closed'}`}>
        <StatusPanel
          fsdSleep={fsdSleep}
          gear={gear}
          onGearChange={handleGearChange}
          sttStatus={sttStatus}
          onSttAction={clearTranscript}
        />
      </div>

      {/* Main Area (Right side when Status Active, or Full Screen) */}
      <div className="main-interface-column">

        <div className="main-content-row">
          {/* Left Sidebar (Only visible if Status Mode is OFF) */}
          {!statusMode && <LeftSidebar />}

          {/* Center Content (PDF Preview) */}
          <div className="center-panel">
            <PdfViewer
              textToolActive={textToolActive}
              onTextToolUsed={() => setTextToolActive(false)}
            />
          </div>

          <RightSidebar sttLines={sttLines} />
        </div>
      </div>
    </div>
  );
}

export default App;

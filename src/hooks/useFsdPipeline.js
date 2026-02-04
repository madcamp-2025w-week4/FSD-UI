import { useCallback, useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const DEFAULT_WS_URL = import.meta.env.VITE_FSD_WS_URL || 'ws://127.0.0.1:9000/ws/audio';
const TRANSCRIPT_KEY = 'fsd_transcript_v1';
const STT_MAX_LINES = 500;

const nowTs = () => Date.now();

const downsampleBuffer = (buffer, sampleRate, targetRate) => {
  if (sampleRate === targetRate) {
    return buffer;
  }
  const ratio = sampleRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffset = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffset && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }
    result[offsetResult] = accum / Math.max(1, count);
    offsetResult += 1;
    offsetBuffer = nextOffset;
  }
  return result;
};

const floatTo16BitPCM = (float32) => {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i += 1) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
};

const loadTranscript = () => {
  try {
    const raw = sessionStorage.getItem(TRANSCRIPT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
};

const saveTranscript = (entries) => {
  try {
    sessionStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage overflow
  }
};

export function useFsdPipeline({
  mode,
  wsUrl = DEFAULT_WS_URL,
  ttsConfig,
  pdfTitle,
  onAttendanceStart,
  onRollcallName,
  onAudioEnded
}) {
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const ffmpegRef = useRef(null);
  const ffmpegLoadingRef = useRef(false);
  const transcriptRef = useRef(loadTranscript());
  const pendingRef = useRef('');
  const flushTimerRef = useRef(null);
  const [sttLines, setSttLines] = useState(() => transcriptRef.current.slice(-STT_MAX_LINES));
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const lastAttendanceRef = useRef(0);
  const lastRollcallRef = useRef(0);

  const ensureFfmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    if (ffmpegLoadingRef.current) {
      while (ffmpegLoadingRef.current) {
        await new Promise((r) => setTimeout(r, 200));
      }
      return ffmpegRef.current;
    }
    ffmpegLoadingRef.current = true;
    try {
      const ffmpeg = new FFmpeg();
      // Use ESM core for module worker. /@fs in dev, /ffmpeg in prod.
      const baseURL = import.meta.env.DEV
        ? '/@fs/root/madcamp04/FSD-UI/node_modules/@ffmpeg/core/dist/esm'
        : '/ffmpeg';
      await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });
      ffmpegRef.current = ffmpeg;
      console.log('[ensureFfmpeg] FFmpeg loaded successfully');
      return ffmpeg;
    } catch (e) {
      console.error('[ensureFfmpeg] FFmpeg load error:', e);
      setError('MP3 변환 준비 실패: ffmpeg-core 로드 오류');
      throw e;
    } finally {
      ffmpegLoadingRef.current = false;
    }
  }, []);

  const sanitizeTitle = useCallback((title) => {
    const raw = title || localStorage.getItem('fsd_pdf_title') || 'lecture';
    return String(raw)
      .replace(/\.[^.]+$/, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .trim() || 'lecture';
  }, []);

  const appendTranscript = useCallback((text) => {
    const entry = { ts: nowTs(), text };
    transcriptRef.current = [...transcriptRef.current, entry];
    if (transcriptRef.current.length > STT_MAX_LINES) {
      transcriptRef.current = transcriptRef.current.slice(-STT_MAX_LINES);
    }
    saveTranscript(transcriptRef.current);
    setSttLines(transcriptRef.current);
  }, []);

  const flushPending = useCallback(() => {
    const text = pendingRef.current.trim();
    if (!text) return;
    pendingRef.current = '';
    appendTranscript(text);
  }, [appendTranscript]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
    }
    flushTimerRef.current = setTimeout(() => {
      flushPending();
    }, 2000);
  }, [flushPending]);

  const handleServerText = useCallback((message) => {
    if (message.type === 'stt' && message.text) {
      const fragment = String(message.text).trim();
      if (!fragment) return;
      const combined = `${pendingRef.current} ${fragment}`.trim();
      pendingRef.current = combined;
      scheduleFlush();

      const now = nowTs();
      if (fragment.includes('출석') && now - lastAttendanceRef.current > 2000) {
        lastAttendanceRef.current = now;
        onAttendanceStart?.(fragment);
      }
      if (fragment.includes('이상범') && now - lastRollcallRef.current > 2000) {
        lastRollcallRef.current = now;
        onRollcallName?.(fragment);
      }

      const endsWithPunc = /[.?!。？！…]$/.test(fragment);
      const longEnough = combined.length >= 60;
      if (endsWithPunc || longEnough) {
        flushPending();
      }
    } else if (message.type === 'summary' && message.text) {
      setSummary(message.text);
      const prefix = sanitizeTitle(pdfTitle);
      const blob = new Blob([message.text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}_summary_${new Date().toISOString().slice(0, 19)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (message.type === 'error' && message.error) {
      setError(message.error);
    }
  }, [appendTranscript, onAttendanceStart, onRollcallName, pdfTitle, sanitizeTitle]);

  const handleAudio = useCallback((payload) => {
    const size = payload?.byteLength || payload?.size || 'unknown';
    console.log('[TTS] binary received, bytes:', size);
    const blob = payload instanceof Blob ? payload : new Blob([payload], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.muted = false;
    audio.volume = 1.0;
    audio.onended = () => {
      console.log('[TTS] ended');
      URL.revokeObjectURL(url);
      onAudioEnded?.();
    };
    audio.onerror = (e) => {
      console.error('[TTS] audio error', e);
      URL.revokeObjectURL(url);
    };
    audio.play().then(() => {
      console.log('[TTS] play ok');
    }).catch((e) => {
      console.error('[TTS] play error', e);
    });
  }, [onAudioEnded]);

  const startAudio = useCallback(async () => {
    if (audioCtxRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    recordedChunksRef.current = [];
    const preferredMime = MediaRecorder.isTypeSupported('audio/mpeg') ? 'audio/mpeg' : undefined;
    const recorder = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const downsampled = downsampleBuffer(input, ctx.sampleRate, 16000);
      const pcm = floatTo16BitPCM(downsampled);
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(pcm);
      }
    };
    source.connect(processor);
    processor.connect(ctx.destination);
    processorRef.current = processor;
  }, []);

  const stopAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const sendControl = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    setStatus('connecting');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = async () => {
      setStatus('connected');
      sendControl({
        type: 'control',
        mode: mode === 'defense' ? 'defense' : mode === 'lecture' ? 'lecture' : 'note',
        tts_ref_audio_path: ttsConfig?.refAudioPath || '',
        tts_prompt_text: ttsConfig?.promptText || '',
      });
      await startAudio();
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const json = JSON.parse(event.data);
          handleServerText(json);
        } catch {
          // ignore
        }
        return;
      }
      handleAudio(event.data);
    };

    ws.onerror = () => {
      setError('WebSocket error');
    };

    ws.onclose = () => {
      setStatus('idle');
      wsRef.current = null;
      stopAudio();
    };
  }, [handleAudio, handleServerText, mode, sendControl, startAudio, stopAudio, ttsConfig, wsUrl]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    flushPending();
    stopAudio();
    setStatus('idle');
  }, [flushPending, stopAudio]);

  const requestSummary = useCallback(() => {
    const fullText = transcriptRef.current.map((t) => t.text).join('\n');
    if (!fullText.trim()) {
      setError('요약할 텍스트가 없습니다.');
      return;
    }
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendControl({ type: 'summary', text: fullText });
      return;
    }
    // P 모드 등 WS 미연결 상태에서는 요약만을 위해 임시 연결
    const tempWs = new WebSocket(wsUrl);
    tempWs.onopen = () => {
      tempWs.send(JSON.stringify({ type: 'summary', text: fullText }));
    };
    tempWs.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const json = JSON.parse(event.data);
          handleServerText(json);
          if (json?.type === 'summary' || json?.type === 'error') {
            tempWs.close();
          }
        } catch {
          // ignore
        }
      }
    };
    tempWs.onerror = () => {
      setError('요약 요청 실패: WebSocket error');
      tempWs.close();
    };
  }, [handleServerText, sendControl, wsUrl]);

  const clearTranscript = useCallback(() => {
    transcriptRef.current = [];
    saveTranscript([]);
    setSttLines([]);
  }, []);

  const downloadTranscript = useCallback(() => {
    const fullText = transcriptRef.current.map((t) => t.text).join('\n');
    if (!fullText.trim()) {
      setError('저장할 텍스트가 없습니다.');
      return;
    }
    const prefix = sanitizeTitle(pdfTitle);
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prefix}_${new Date().toISOString().slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pdfTitle, sanitizeTitle]);

  const downloadRecording = useCallback(async () => {
    console.log('[downloadRecording] 시작, chunks:', recordedChunksRef.current.length);
    if (recordedChunksRef.current.length === 0) {
      console.warn('[downloadRecording] 녹음 데이터 없음. D 또는 FSD 모드에서 녹음을 시작하세요.');
      setError('녹음 데이터가 없습니다. D 또는 FSD 모드에서 녹음을 시작해주세요.');
      return;
    }
    if (recorderRef.current?.state === 'recording') {
      console.log('[downloadRecording] 녹음 중, 데이터 요청...');
      recorderRef.current.requestData();
      await new Promise((r) => setTimeout(r, 300));
    }
    const mimeType = recorderRef.current?.mimeType || 'audio/webm';
    console.log('[downloadRecording] mimeType:', mimeType, 'chunks:', recordedChunksRef.current.length);
    const blob = new Blob(recordedChunksRef.current, { type: mimeType });
    console.log('[downloadRecording] blob size:', blob.size);
    const prefix = sanitizeTitle(pdfTitle);
    if (mimeType === 'audio/mpeg') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}_${new Date().toISOString().slice(0, 19)}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    try {
      console.log('[downloadRecording] FFmpeg 로드 중...');
      const ffmpeg = await ensureFfmpeg();
      console.log('[downloadRecording] FFmpeg 로드 완료');
      const inputName = 'input.webm';
      const outputName = 'output.mp3';
      await ffmpeg.writeFile(inputName, await fetchFile(blob));
      console.log('[downloadRecording] 변환 시작...');
      await ffmpeg.exec(['-i', inputName, '-codec:a', 'libmp3lame', '-q:a', '2', outputName]);
      console.log('[downloadRecording] 변환 완료');
      const data = await ffmpeg.readFile(outputName);
      const mp3Blob = new Blob([data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}_${new Date().toISOString().slice(0, 19)}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
      console.log('[downloadRecording] 다운로드 완료');
    } catch (e) {
      console.error('MP3 convert error:', e);
      setError(`MP3 변환 실패: ${e?.message || '다시 시도해주세요.'}`);
    }
  }, [ensureFfmpeg]);

  // 연결 관리: P(note) 모드면 끊기, 그 외에는 연결
  useEffect(() => {
    if (mode === 'note') {
      disconnect();
      return;
    }
    connect();
    return () => {
      disconnect();
    };
  // 의도적으로 mode를 제외: 연결은 note ↔ 비note 전환 시에만 관리
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode === 'note']);

  // 모드 변경 시 서버에 control 메시지 전송 (기존 연결 유지)
  useEffect(() => {
    if (mode === 'note') return;
    // WebSocket이 연결된 상태에서만 모드 업데이트 전송
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('[useFsdPipeline] Sending mode update:', mode);
      sendControl({
        type: 'control',
        mode: mode === 'defense' ? 'defense' : mode === 'lecture' ? 'lecture' : 'note',
        tts_ref_audio_path: ttsConfig?.refAudioPath || '',
        tts_prompt_text: ttsConfig?.promptText || '',
      });
    }
  }, [mode, sendControl, ttsConfig]);

  return {
    sttLines,
    summary,
    status,
    error,
    requestSummary,
    clearTranscript,
    downloadTranscript,
    downloadRecording,
  };
}

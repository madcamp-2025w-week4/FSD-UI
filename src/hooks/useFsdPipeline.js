import { useCallback, useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const DEFAULT_WS_URL = import.meta.env.VITE_FSD_WS_URL || 'ws://127.0.0.1:9000/ws/audio';
const TRANSCRIPT_KEY = 'fsd_transcript_v1';

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
    const raw = localStorage.getItem(TRANSCRIPT_KEY);
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
    localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage overflow
  }
};

export function useFsdPipeline({ mode, wsUrl = DEFAULT_WS_URL, ttsConfig }) {
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
  const [sttLines, setSttLines] = useState(() => transcriptRef.current.slice(-10));
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

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
      const devBase = '/@fs/root/madcamp04/FSD-UI/node_modules/@ffmpeg/core/dist/umd';
      const prodBase = '/ffmpeg';
      const base = import.meta.env.DEV ? devBase : prodBase;
      const coreURL = new URL(`${base}/ffmpeg-core.js`, window.location.origin).toString();
      const wasmURL = new URL(`${base}/ffmpeg-core.wasm`, window.location.origin).toString();
      await ffmpeg.load({ coreURL, wasmURL });
      ffmpegRef.current = ffmpeg;
      return ffmpeg;
    } catch (e) {
      console.error('FFmpeg load error', e);
      setError('MP3 변환 준비 실패: ffmpeg-core 로드 오류');
      throw e;
    } finally {
      ffmpegLoadingRef.current = false;
    }
  }, []);

  const appendTranscript = useCallback((text) => {
    const entry = { ts: nowTs(), text };
    transcriptRef.current = [...transcriptRef.current, entry];
    saveTranscript(transcriptRef.current);
    setSttLines(transcriptRef.current.slice(-10));
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

      const endsWithPunc = /[.?!。？！…]$/.test(fragment);
      const longEnough = combined.length >= 60;
      if (endsWithPunc || longEnough) {
        flushPending();
      }
    } else if (message.type === 'summary' && message.text) {
      setSummary(message.text);
      const blob = new Blob([message.text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fsd_summary_${new Date().toISOString().slice(0, 19)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (message.type === 'error' && message.error) {
      setError(message.error);
    }
  }, [appendTranscript]);

  const handleAudio = useCallback((payload) => {
    const blob = payload instanceof Blob ? payload : new Blob([payload], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play().finally(() => {
      URL.revokeObjectURL(url);
    });
  }, []);

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
    sendControl({ type: 'summary', text: fullText });
  }, [sendControl]);

  const clearTranscript = useCallback(() => {
    transcriptRef.current = [];
    saveTranscript([]);
    setSttLines([]);
  }, []);

  const downloadTranscript = useCallback(() => {
    const fullText = transcriptRef.current.map((t) => t.text).join('\n');
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fsd_transcript_${new Date().toISOString().slice(0, 19)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

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
    if (mimeType === 'audio/mpeg') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fsd_recording_${new Date().toISOString().slice(0, 19)}.mp3`;
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
      a.download = `fsd_recording_${new Date().toISOString().slice(0, 19)}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
      console.log('[downloadRecording] 다운로드 완료');
    } catch (e) {
      console.error('MP3 convert error, falling back to webm:', e);
      // MP3 변환 실패 시 webm으로 폴백 다운로드
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fsd_recording_${new Date().toISOString().slice(0, 19)}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('[downloadRecording] MP3 변환 실패, webm으로 대체 다운로드 완료');
    }
  }, [ensureFfmpeg]);

  useEffect(() => {
    if (mode === 'note') {
      disconnect();
      return;
    }
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect, mode]);

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

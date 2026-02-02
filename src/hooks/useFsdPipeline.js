import { useCallback, useEffect, useRef, useState } from 'react';

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
  const transcriptRef = useRef(loadTranscript());
  const [sttLines, setSttLines] = useState(() => transcriptRef.current.slice(-10));
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const appendTranscript = useCallback((text) => {
    const entry = { ts: nowTs(), text };
    transcriptRef.current = [...transcriptRef.current, entry];
    saveTranscript(transcriptRef.current);
    setSttLines(transcriptRef.current.slice(-10));
  }, []);

  const handleServerText = useCallback((message) => {
    if (message.type === 'stt' && message.text) {
      appendTranscript(message.text);
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
    stopAudio();
    setStatus('idle');
  }, [stopAudio]);

  const requestSummary = useCallback(() => {
    const fullText = transcriptRef.current.map((t) => t.text).join('\n');
    sendControl({ type: 'summary', text: fullText });
  }, [sendControl]);

  const clearTranscript = useCallback(() => {
    transcriptRef.current = [];
    saveTranscript([]);
    setSttLines([]);
  }, []);

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
  };
}

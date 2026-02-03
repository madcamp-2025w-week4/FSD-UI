import React, { useEffect, useMemo, useRef, useState } from 'react';
import './WarningOverlay.css';
import { TriangleAlert } from 'lucide-react';

const DURATION_MS = 3000;
const EXIT_MS = 1200;
const TIMER_PATH_LENGTH = 100;

const ALERT_COPY = {
  sleep: {
    title: '졸음 감지!',
    message: '곧 FSD가 자동 실행됩니다.',
    accent: '#ff3b30',
    glow: 'rgba(255, 59, 48, 0.38)'
  },
  checkin: {
    title: '출석 시작 감지됨!',
    message: '출석 유형 감지를 시작합니다.',
    accent: '#f2b400',
    glow: 'rgba(242, 180, 0, 0.38)'
  },
  away: {
    title: '자리 비움 감지!',
    message: '곧 FSD가 자동 실행됩니다.',
    accent: '#ff3b30',
    glow: 'rgba(255, 59, 48, 0.38)'
  },
  rollcall: {
    title: '호명 출석 감지!',
    message: '곧 자동으로 대답합니다.',
    accent: '#ff3b30',
    glow: 'rgba(255, 59, 48, 0.38)'
  },
  attendance: {
    title: '전자 출석 감지!',
    message: '곧 자동으로 출결 절차를 실행합니다.',
    accent: '#ff3b30',
    glow: 'rgba(255, 59, 48, 0.38)'
  }
};

export default function WarningOverlay({ alertType, onCancel, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(3);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const completeTimerRef = useRef(0);
  const exitTimerRef = useRef(0);
  const exitStartedRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const lastTypeRef = useRef(null);

  const copy = useMemo(() => ALERT_COPY[alertType], [alertType]);

  const startExit = (callback) => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;
    setIsExiting(true);
    clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      exitStartedRef.current = false;
      if (callback) callback();
    }, EXIT_MS);
  };

  useEffect(() => {
    if (!alertType) return;
    lastTypeRef.current = alertType;
    setIsVisible(true);
    setIsExiting(false);
    exitStartedRef.current = false;
    setProgress(0);
    setTimeLeft(3);
    clearTimeout(exitTimerRef.current);
    clearTimeout(completeTimerRef.current);
    cancelAnimationFrame(rafRef.current);
    startRef.current = performance.now();

    const tick = (now) => {
      const elapsed = now - startRef.current;
      const clamped = Math.min(elapsed, DURATION_MS);
      const nextProgress = clamped / DURATION_MS;
      const remaining = Math.max(0, DURATION_MS - clamped);
      setProgress(nextProgress);
      setTimeLeft(Math.max(0, Math.ceil(remaining / 1000)));
      if (elapsed < DURATION_MS) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!exitStartedRef.current) {
        startExit(() => {
          if (onComplete) onComplete(alertType);
        });
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    completeTimerRef.current = setTimeout(() => {
      startExit(() => {
        if (onComplete) onComplete(alertType);
      });
    }, DURATION_MS + 50);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(completeTimerRef.current);
    };
  }, [alertType, onComplete]);

  useEffect(() => {
    if (alertType) return;
    if (!isVisible) return;
    startExit();
    return () => clearTimeout(exitTimerRef.current);
  }, [alertType, isVisible]);

  const activeType = alertType || lastTypeRef.current;
  const activeCopy = ALERT_COPY[activeType];
  if (!isVisible || !activeCopy) return null;

  return (
    <div
      className={`warning-overlay ${isExiting ? 'is-exiting' : 'is-enter'}`}
      style={{
        '--alert-accent': activeCopy.accent,
        '--alert-glow': activeCopy.glow
      }}
    >
      <div className="warning-card">
        <div className="tunnel-timer">
          <svg viewBox="0 0 200 120">
            <path
              className="tunnel-track"
              d="M 10 100 A 90 90 0 1 1 190 100"
              fill="none"
              pathLength={TIMER_PATH_LENGTH}
            />
            <path
              className="tunnel-progress"
              d="M 10 100 A 90 90 0 1 1 190 100"
              fill="none"
              pathLength={TIMER_PATH_LENGTH}
              strokeDasharray={TIMER_PATH_LENGTH}
              strokeDashoffset={TIMER_PATH_LENGTH * progress}
            />
          </svg>
          <div className="tunnel-count">{timeLeft}</div>
        </div>

        <div className="warning-title">
          <span className="warning-icon">
            <TriangleAlert size={16} />
          </span>
          {activeCopy.title}
        </div>
        <div className="warning-message">{activeCopy.message}</div>

        <button
          className="warning-cancel"
          onClick={() => {
            clearTimeout(completeTimerRef.current);
            cancelAnimationFrame(rafRef.current);
            startExit(onCancel);
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}

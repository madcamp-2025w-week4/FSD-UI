import React, { useMemo, useState, useEffect } from 'react';
import './FsdSignalStatus.css';

const STATE_COPY = {
  red: '출석 중...',
  yellow: '출석 대기중...',
  green: '수업 진행중...'
};

export default function FsdSignalStatus({ enabled }) {
  const [state] = useState('green');
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const statusText = useMemo(() => STATE_COPY[state], [state]);

  useEffect(() => {
    if (enabled) {
      setIsVisible(true);
      setIsExiting(false);
      return;
    }
    if (!isVisible) return;
    setIsExiting(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
    }, 680);
    return () => clearTimeout(timer);
  }, [enabled, isVisible]);

  if (!isVisible) return null;

  return (
    <div className={`fsd-signal-shell ${isExiting ? 'is-exiting' : 'is-enter'}`}>
      <div className="fsd-signal-light">
        <span className={`light-dot ${state === 'red' ? 'active red' : 'red'}`} />
        <span className={`light-dot ${state === 'yellow' ? 'active yellow' : 'yellow'}`} />
        <span className={`light-dot ${state === 'green' ? 'active green' : 'green'}`} />
      </div>
      <div className="fsd-signal-label">{statusText}</div>
    </div>
  );
}

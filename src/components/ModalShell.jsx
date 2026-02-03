import React, { useEffect, useState } from 'react';
import './ModalShell.css';

const EXIT_MS = 680;

export default function ModalShell({ open, children, cardClassName = '' }) {
  const [shouldRender, setShouldRender] = useState(open);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsExiting(false);
      return;
    }

    if (shouldRender) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsExiting(false);
      }, EXIT_MS);
      return () => clearTimeout(timer);
    }
  }, [open, shouldRender]);

  if (!shouldRender) return null;
  return (
    <div
      className={`modal-shell ${open && !isExiting ? 'is-enter' : ''} ${
        isExiting ? 'is-exiting' : ''
      }`}
    >
      <div className={`modal-card ${cardClassName}`.trim()}>{children}</div>
    </div>
  );
}

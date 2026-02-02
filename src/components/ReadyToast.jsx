import React, { useEffect } from 'react';
import './ReadyToast.css';

export default function ReadyToast({ open, messages, token, onDone }) {
  useEffect(() => {
    if (!open || !messages || messages.length === 0) return;
    const t = setTimeout(() => onDone(), 1600);
    return () => clearTimeout(t);
  }, [open, messages, token, onDone]);

  if (!open || !messages || messages.length === 0) return null;

  return (
    <div className="ready-toast-stack" key={token}>
      {messages.map((message, index) => (
        <div className="ready-toast-item" key={`${index}-${message}`}>
          {message}
        </div>
      ))}
    </div>
  );
}

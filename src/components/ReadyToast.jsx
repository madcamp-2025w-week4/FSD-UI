import React, { useEffect } from 'react';
import './ReadyToast.css';

export default function ReadyToast({ open, onDone }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onDone(), 1600);
    return () => clearTimeout(t);
  }, [open, onDone]);

  if (!open) return null;

  return (
    <div className="ready-toast">
      준비가 완료되었습니다!
    </div>
  );
}

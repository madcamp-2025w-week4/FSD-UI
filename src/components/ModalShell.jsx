import React from 'react';
import './ModalShell.css';

export default function ModalShell({ open, children }) {
  if (!open) return null;
  return (
    <div className="modal-shell">
      <div className="modal-card">{children}</div>
    </div>
  );
}

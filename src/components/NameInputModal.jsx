import React, { useEffect, useState } from 'react';
import ModalShell from './ModalShell';
import './NameInputModal.css';

export default function NameInputModal({ open, onClose, onSubmit, initialName = '' }) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) {
      setName(initialName || '');
    }
  }, [open, initialName]);

  const trimmed = name.trim();

  return (
    <ModalShell open={open} cardClassName="name-modal-card">
      <div className="name-modal-title">사용자 이름 입력</div>
      <div className="name-modal-body">이름을 입력해주세요.</div>
      <input
        className="name-modal-input"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <div className="name-modal-actions">
        <button className="name-modal-btn ghost" onClick={onClose}>
          취소
        </button>
        <button
          className="name-modal-btn primary"
          onClick={() => trimmed && onSubmit(trimmed)}
          disabled={!trimmed}
        >
          다음
        </button>
      </div>
    </ModalShell>
  );
}

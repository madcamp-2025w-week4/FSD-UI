import React, { useState } from 'react';
import './TopRightActions.css';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const ACTIONS = [
  { id: 'sleep', label: '잠' },
  { id: 'checkin', label: '출석 감지' },
  { id: 'rollcall', label: '호명 출석' },
  { id: 'attendance', label: '전자 출석' }
];

export default function TopRightActions({ onTrigger }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`top-right-actions ${isOpen ? 'open' : 'closed'}`}>
      <button
        className="toggle-actions-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Hide actions" : "Show actions"}
      >
        {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {isOpen && (
        <div className="actions-list">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              className="top-right-action-btn"
              onClick={() => onTrigger(action.id)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

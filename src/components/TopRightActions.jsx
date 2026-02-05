import React, { useState } from 'react';
import './TopRightActions.css';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const ACTIONS = [
  { id: 'sleep', label: '잠' },
  { id: 'away', label: '자리 비움' }
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

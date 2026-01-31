import React from 'react';
import './TopRightActions.css';

const ACTIONS = [
  { id: 'sleep', label: '잠' },
  { id: 'checkin', label: '출석 감지' },
  { id: 'rollcall', label: '호명 출석' },
  { id: 'attendance', label: '전자 출석' }
];

export default function TopRightActions({ onTrigger }) {
  return (
    <div className="top-right-actions">
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
  );
}

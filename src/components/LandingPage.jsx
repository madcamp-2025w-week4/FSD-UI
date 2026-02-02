import React from 'react';
import './LandingPage.css';

export default function LandingPage({ onLogin, onSignup }) {
  return (
    <div className="landing-root">
      <div className="landing-hero">
        <div className="landing-title">Full Self Defense</div>
        <div className="landing-motto">당신의 학점을 방어하는 수업 속 자율주행 서비스.</div>
        <div className="landing-actions">
          <button className="landing-btn primary" onClick={onLogin}>
            로그인
          </button>
          <button className="landing-btn ghost" onClick={onSignup}>
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}

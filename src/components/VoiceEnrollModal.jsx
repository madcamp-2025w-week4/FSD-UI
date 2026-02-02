import React, { useMemo, useState } from 'react';
import ModalShell from './ModalShell';
import './VoiceEnrollModal.css';

const TOTAL = 7;
const SENTENCES = [
  '오늘도 집중해서 강의를 듣고 있습니다.',
  '이 문장은 학습 데이터를 위한 예시 문장입니다.',
  '제 목소리는 빠르고 또렷하게 들릴 수 있어요.',
  '지금부터 문장을 또박또박 읽어주세요.',
  '학습이 진행되는 동안 잠시만 기다려주세요.',
  '이제 거의 다 왔습니다. 조금만 더 힘내요.',
  '마지막 문장입니다. 끝까지 읽어주세요.'
];

export default function VoiceEnrollModal({ open, onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const sentence = useMemo(() => SENTENCES[step - 1], [step]);

  return (
    <ModalShell open={open}>
      <div className="voice-title">학습 데이터 수집({step}/{TOTAL})</div>
      <div className="voice-sentence">{sentence}</div>
      <div className="voice-wave">
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <div className="voice-actions">
        <button className="voice-btn ghost" onClick={onClose}>
          나중에
        </button>
        <button
          className="voice-btn primary"
          onClick={() => {
            if (step < TOTAL) {
              setStep(step + 1);
            } else {
              onComplete();
            }
          }}
        >
          {step < TOTAL ? '다음' : '완료'}
        </button>
      </div>
      {step === TOTAL && (
        <div className="voice-finish">
          학습이 완료되었습니다. 제 목소리가 사용자님과 비슷해졌나요?
        </div>
      )}
    </ModalShell>
  );
}

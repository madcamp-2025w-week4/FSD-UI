import React, { useState } from 'react';
import ModalShell from './ModalShell';
import './ConsentModal.css';

export default function ConsentModal({ open, onClose, onAgree }) {
  const [checked, setChecked] = useState(false);

  return (
    <ModalShell open={open}>
      <div className="consent-title">개인정보(음성 데이터) 수집 및 이용 동의서</div>
      <div className="consent-body">
        <h4>1. 수집 및 이용 목적</h4>
        <p>
          본 프로그램('FSD')은 사용자의 음성을 학습하여 개인화된 텍스트-음성 변환(TTS)
          모델을 생성하기 위해 사용자의 음성 데이터를 수집합니다. 생성된 음성 모델은 다음
          기능을 수행하는 데 사용됩니다.
        </p>
        <ul>
          <li>수업 중 자동 응답 및 질문 생성</li>
          <li>시스템 경고 및 알림 음성 송출</li>
        </ul>
        <h4>2. 수집하는 개인정보의 항목</h4>
        <ul>
          <li>사용자의 육성 녹음 파일 (.wav 형식)</li>
          <li>녹음된 음성에서 추출된 음성 특징 데이터 (Embedding Vector)</li>
        </ul>
        <h4>3. 데이터의 저장 및 보유 기간</h4>
        <p>
          음성 데이터는 TTS 모델을 사용자의 목소리에 맞게 학습시키는 목적으로만 사용하고,
          그 이외의 목적으로는 절대 사용하지 않으며, 제 3자에게 절대 제공하지 않습니다.
        </p>
        <p>
          보유 기간: 사용자가 해당 기능을 해제하거나 프로그램을 삭제할 때까지 보관되며,
          삭제 시 즉시 파기됩니다.
        </p>
        <h4>4. 동의 거부 권리</h4>
        <p>
          사용자는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 단, 동의를
          거부할 경우 TTS를 통한 수업 내 자동 응답 기능을 사용할 수 없습니다.
        </p>
      </div>
      <label className="consent-check">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        위 내용을 확인하였으며, 음성 데이터 수집에 동의합니다.
      </label>
      <div className="consent-actions">
        <button className="consent-btn ghost" onClick={onClose}>
          취소
        </button>
        <button
          className="consent-btn primary"
          onClick={() => checked && onAgree()}
          disabled={!checked}
        >
          동의하고 계속
        </button>
      </div>
    </ModalShell>
  );
}

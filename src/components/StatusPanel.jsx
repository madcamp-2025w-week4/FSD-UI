import React, { useEffect, useMemo, useRef, useState } from 'react';
import BrainView from './BrainView';
import './StatusPanel.css';
import { AudioLines } from 'lucide-react';

export default function StatusPanel({
    fsdSleep,
    gear,
    onGearChange,
    sttStatus,
    onSttAction,
}) {
    const modeLabel =
        gear === 'P'
            ? '휴식 모드'
            : gear === 'D'
                ? (fsdSleep ? 'FSD 모드' : '수업 모드')
                : '';

    const [timeText, setTimeText] = useState('');
    const [elapsedMin, setElapsedMin] = useState(0);
    const driveStartRef = useRef(null);

    const sttLabel = useMemo(() => (
        sttStatus === 'connected' ? 'STT 활성화됨' : 'STT 비활성화됨'
    ), [sttStatus]);

    useEffect(() => {
        const update = () => {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('ko-KR', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Seoul'
            });
            setTimeText(formatter.format(now));
        };
        update();
        const timer = setInterval(update, 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (gear === 'P') {
            driveStartRef.current = null;
            setElapsedMin(0);
            return;
        }
        if (!driveStartRef.current) {
            driveStartRef.current = Date.now();
            setElapsedMin(0);
            return;
        }
    }, [gear]);

    useEffect(() => {
        if (!driveStartRef.current) return undefined;
        const tick = () => {
            const diffMs = Date.now() - driveStartRef.current;
            setElapsedMin(Math.max(0, Math.floor(diffMs / 60000)));
        };
        tick();
        const timer = setInterval(tick, 15000);
        return () => clearInterval(timer);
    }, [gear]);

    return (
        <div className="status-panel-container">
            {/* Top Status Bar (Mini) */}
            <div className="status-top-bar">
                <div className="status-icons-left">
                    <span className="time">{timeText}</span>
                    <span className="temp">-2°C</span>
                </div>
            </div>

            {/* Gear Selector (Large P R N D) */}
            <div className="gear-selector">
                {['P', 'R', 'N', 'D'].map((g) => (
                    <span
                        key={g}
                        className={`gear-item ${gear === g ? 'active' : ''}`}
                        onClick={() => onGearChange(g)}
                    >
                        {g}
                    </span>
                ))}
            </div>

            {/* Speed / Info */}
            <div className="speed-info">
                <div className="battery-info">
                    <span>{gear === 'P' ? '0 min' : `${elapsedMin} min`}</span>
                </div>
            </div>

            {/* 3D Visualization Area (Car/Brain) */}
            <div className="viz-container">
                {modeLabel && <div className="mode-label">{modeLabel}</div>}
                <div className="brain-wrapper">
                    <BrainView gear={gear} fsdSleep={fsdSleep && gear === 'D'} />
                </div>

            </div>

            <div className="stt-status">{sttLabel}</div>
        </div>
    );
}

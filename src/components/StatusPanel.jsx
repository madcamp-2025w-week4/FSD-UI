import React from 'react';
import BrainView from './BrainView';
import './StatusPanel.css';
import { Battery, Lock, Sun, Wifi } from 'lucide-react';

export default function StatusPanel({ fsdSleep, gear, onGearChange }) {
    const modeLabel =
        gear === 'P'
            ? '휴식 모드'
            : gear === 'D'
                ? (fsdSleep ? 'FSD 모드' : '수업 모드')
                : '';

    return (
        <div className="status-panel-container">
            {/* Top Status Bar (Mini) */}
            <div className="status-top-bar">
                <div className="status-icons-left">
                    <Lock size={14} />
                    <span className="time">12:20 PM</span>
                    <span className="temp">24°C</span>
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
                    <Battery size={20} className="battery-icon" />
                    <span>295 mi</span>
                </div>
                <div className="speed-limit">
                    <span>LIMIT</span>
                    <strong>45</strong>
                </div>
            </div>

            {/* 3D Visualization Area (Car/Brain) */}
            <div className="viz-container">
                {modeLabel && <div className="mode-label">{modeLabel}</div>}
                <div className="brain-wrapper">
                    <BrainView gear={gear} fsdSleep={fsdSleep && gear === 'D'} />
                </div>

            </div>

            {/* Bottom Controls / Quick Actions */}
            <div className="status-controls">
                <div className="control-btn">
                    <Sun size={20} />
                </div>
                <div className="control-btn">
                    <Wifi size={20} />
                </div>
            </div>
        </div>
    );
}

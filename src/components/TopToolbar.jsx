import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Activity, AudioLines, FileText, CircleHelp } from 'lucide-react';
import './TopToolbar.css';

export default function TopToolbar({ onToggleStatus, statusActive, fsdActive, onToggleFsd }) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="toolbar-wrapper">
            <div className={`toolbar-container ${expanded ? 'expanded' : 'collapsed'}`}>
                <div className={`toolbar-content ${expanded ? 'visible' : 'hidden'}`}>

                    {/* Status Toggle Button (New) */}
                    <button
                        className={`tool-btn ${statusActive ? 'active-status' : ''}`}
                        onClick={onToggleStatus}
                    >
                        <Activity size={16} />
                        <span>상태</span>
                    </button>

                    <div className="divider-vertical" style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.1)' }}></div>

                    {/* FSD Toggle Button (Central Prominent) */}
                    <button
                        className={`fsd-btn ${fsdActive ? 'active' : ''}`}
                        onClick={onToggleFsd}
                    >
                        FSD
                    </button>

                    <div className="divider-vertical" style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.1)' }}></div>

                    {/* Secondary Buttons */}
                    <button className="tool-btn">
                        <AudioLines size={16} />
                        <span>STT</span>
                    </button>
                    <button className="tool-btn">
                        <FileText size={16} />
                        <span>요약</span>
                    </button>
                    <button className="tool-btn">
                        <CircleHelp size={16} />
                        <span>질문</span>
                    </button>
                </div>
            </div>

            {/* Collapse Handle */}
            <div
                className="toolbar-handle"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
        </div>
    );
}

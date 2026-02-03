import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './RightSidebar.css';

export default function RightSidebar({ sttLines = [] }) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="sidebar-wrapper right">
            {/* Handle (Left Side) */}
            <div
                className="sidebar-handle right-handle"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </div>

            <div className={`sidebar-container right ${expanded ? 'expanded' : 'collapsed'}`}>
                <div className={`sidebar-content ${expanded ? 'visible' : 'hidden'}`}>
                    <div className="pad-header">
                        <h2>작업</h2>
                    </div>

                    <div className="pad-body scroll-area">
                        {sttLines.length === 0 && (
                            <div className="stt-line past">STT 대기 중…</div>
                        )}
                        {sttLines.map((entry, idx) => (
                            <div
                                key={`${entry.ts ?? idx}-${idx}`}
                                className={`stt-line ${idx === sttLines.length - 1 ? 'current' : 'past'}`}
                            >
                                {entry.text ?? entry}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

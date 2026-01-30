import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './RightSidebar.css';

export default function RightSidebar() {
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
                        <div className="divider"></div>
                        <span className="subtitle">STT</span>
                    </div>

                    <div className="pad-body scroll-area">
                        <div className="stt-line">streaming STT text</div>
                        <div className="stt-line">streaming STT text</div>
                        <div className="stt-line">streaming STT text</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './LeftSidebar.css';

export default function LeftSidebar() {
    const [expanded, setExpanded] = useState(true);

    // Dummy slides (25 items)
    const slides = Array.from({ length: 25 }, (_, i) => i + 1);

    return (
        <div className="sidebar-wrapper left">
            <div className={`sidebar-container left ${expanded ? 'expanded' : 'collapsed'}`}>
                <div className={`sidebar-content ${expanded ? 'visible' : 'hidden'}`}>
                    <div className="sidebar-header">
                        <span>Lecture PDF</span>
                        <span className="page-count">2/25</span>
                    </div>

                    <div className="slide-list scroll-area">
                        {slides.map(idx => (
                            <div key={idx} className={`slide-item ${idx === 2 ? 'active' : ''}`}>
                                <div className="slide-thumbnail">
                                    <span>{idx}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Handle */}
            <div
                className="sidebar-handle left-handle"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </div>
        </div>
    );
}

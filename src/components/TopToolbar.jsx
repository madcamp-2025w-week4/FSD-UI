import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Activity, AudioLines, FileText, CircleHelp, FileInput, Car } from 'lucide-react';
import './TopToolbar.css';
import FsdSignalStatus from './FsdSignalStatus';
import { useRef } from 'react';
import { usePdf } from '../context/PdfContext.jsx';
import * as pdfjsLib from 'pdfjs-dist';

export default function TopToolbar({ onToggleStatus, statusActive, fsdActive, onToggleFsd }) {
    const [expanded, setExpanded] = useState(true);
    const fileInputRef = useRef(null);
    const { setDocument } = usePdf();

    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();

    return (
        <div className="toolbar-wrapper">
            <div className="toolbar-row">
                <div className={`toolbar-container ${expanded ? 'expanded' : 'collapsed'}`}>
                    <div className={`toolbar-content ${expanded ? 'visible' : 'hidden'}`}>

                    {/* Status Toggle Button (New) */}
                    <button
                        className={`tool-btn ${statusActive ? 'active-status' : ''}`}
                        onClick={onToggleStatus}
                    >
                        <Activity size={14} />
                        <span>상태</span>
                    </button>

                    <div className="divider-vertical" style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.1)' }}></div>

                    {/* FSD Toggle Button (Central Prominent) */}
                    <button
                        className={`fsd-btn ${fsdActive ? 'active' : ''}`}
                        onClick={onToggleFsd}
                    >
                        <Car size={14} />
                        FSD
                    </button>

                    <div className="divider-vertical" style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.1)' }}></div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const arrayBuffer = await file.arrayBuffer();
                            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                            const doc = await loadingTask.promise;
                            setDocument(doc);
                            e.target.value = '';
                        }}
                    />

                    <button
                        className="tool-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <FileInput size={14} />
                        <span>불러오기</span>
                    </button>

                    {/* Secondary Buttons */}
                    <button className="tool-btn">
                        <AudioLines size={14} />
                        <span>STT</span>
                    </button>
                    <button className="tool-btn">
                        <FileText size={14} />
                        <span>요약</span>
                    </button>
                    <button className="tool-btn">
                        <CircleHelp size={14} />
                        <span>질문</span>
                    </button>

                    </div>
                </div>
                <FsdSignalStatus enabled={fsdActive} />
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

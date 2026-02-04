import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Activity, AudioLines, FileText, CircleHelp, FileInput, FileDown, Car, Type, RotateCcw } from 'lucide-react';
import './TopToolbar.css';
import { useRef } from 'react';
import { usePdf } from '../context/PdfContext.jsx';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

export default function TopToolbar({
    onToggleStatus,
    statusActive,
    fsdActive,
    textToolActive,
    onToggleTextTool,
    onToggleFsd,
    onRequestSummary,
    onClearTranscript,
    onDownloadTranscript,
    onDownloadRecording,
    onNewLecture,
    sttStatus,
    sttError,
}) {
    const [expanded, setExpanded] = useState(true);
    const fileInputRef = useRef(null);
    const { setDocument, pdfDoc, boxes, pdfTitle, pageSizes } = usePdf();

    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();

    const wrapText = (ctx, text, maxWidth) => {
        const lines = [];
        const paragraphs = String(text || '').split('\n');
        paragraphs.forEach((paragraph, index) => {
            let current = '';
            Array.from(paragraph).forEach((ch) => {
                const next = current + ch;
                if (ctx.measureText(next).width > maxWidth && current) {
                    lines.push(current);
                    current = ch;
                } else {
                    current = next;
                }
            });
            if (current) lines.push(current);
            if (index < paragraphs.length - 1) lines.push('');
        });
        return lines;
    };

    const EXPORT_FONT_FAMILY = '"Pretendard", "Apple SD Gothic Neo", "Segoe UI", sans-serif';

    const textBoxToPng = (text, width, height, fontSize, color, pixelRatio = 2) => {
        const canvas = document.createElement('canvas');
        const w = Math.max(1, Math.ceil(width));
        const h = Math.max(1, Math.ceil(height));
        canvas.width = w * pixelRatio;
        canvas.height = h * pixelRatio;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(pixelRatio, pixelRatio);
        ctx.fillStyle = color || '#111111';
        ctx.textBaseline = 'top';
        ctx.font = `600 ${fontSize}px ${EXPORT_FONT_FAMILY}`;
        const lines = wrapText(ctx, text, w);
        const lineHeight = fontSize * 1.2;
        let y = 0;
        lines.forEach((line) => {
            if (y + lineHeight <= h) {
                ctx.fillText(line, 0, y);
                y += lineHeight;
            }
        });
        return canvas.toDataURL('image/png');
    };

    const handleExport = async () => {
        try {
            if (!pdfDoc) {
                alert('먼저 PDF를 불러와주세요.');
                return;
            }
            if (document.fonts?.ready) {
                await document.fonts.ready;
            }
            if (!pdfDoc.getData) {
                alert('PDF 데이터를 읽을 수 없습니다.');
                return;
            }
            const rawData = await pdfDoc.getData();
            const dataBuffer = rawData?.slice ? rawData.slice(0) : rawData;
            if (!dataBuffer) {
                alert('PDF 데이터를 읽을 수 없습니다.');
                return;
            }
            const pdf = await PDFDocument.load(dataBuffer);
            const pages = pdf.getPages();
            for (const [pageKey, list] of Object.entries(boxes || {})) {
                const pageIndex = Number(pageKey) - 1;
                const page = pages[pageIndex];
                if (!page) continue;
                const { width, height } = page.getSize();
                const renderSize = pageSizes?.[Number(pageKey)];
                const renderWidth = renderSize?.width || width;
                const renderHeight = renderSize?.height || height;
                const scaleX = width / renderWidth;
                const scaleY = height / renderHeight;
                for (const box of list) {
                    const text = box.text?.trim();
                    if (!text) continue;
                    const padding = 6;
                    const boxWidthPx = Math.max(10, box.w * renderWidth);
                    const boxHeightPx = Math.max(10, box.h * renderHeight);
                    const innerWidth = Math.max(1, boxWidthPx - padding * 2);
                    const innerHeight = Math.max(1, boxHeightPx - padding * 2);
                    // Match UI sizing: fontSize ~= box.h * 100px, but keep within box height.
                    const uiFontSize = Math.floor(box.h * 100);
                    const fontSize = Math.max(10, Math.min(innerHeight * 0.9, uiFontSize));
                    const dataUrl = textBoxToPng(text, innerWidth, innerHeight, fontSize, box.color, 3);
                    const image = await pdf.embedPng(dataUrl);
                    const x = (box.x * renderWidth + padding) * scaleX;
                    const y = height - (box.y * renderHeight + boxHeightPx - padding) * scaleY;
                    page.drawImage(image, {
                        x,
                        y,
                        width: innerWidth * scaleX,
                        height: innerHeight * scaleY
                    });
                }
            }
            const bytes = await pdf.save();
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${pdfTitle || 'lecture'}-annotated.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDF export failed:', error);
            alert('내보내기 중 오류가 발생했습니다.');
        }
    };

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
                                const safeBuffer = arrayBuffer.slice(0);
                                const loadingTask = pdfjsLib.getDocument({ data: safeBuffer });
                                const doc = await loadingTask.promise;
                                const name = file.name || 'lecture';
                                const base = name.replace(/\.[^.]+$/, '');
                                setDocument(doc, base, safeBuffer);
                                e.target.value = '';
                            }}
                        />

                        <button
                            className="tool-btn"
                            onClick={() => onNewLecture?.()}
                            title="새 강의 시작"
                        >
                            <RotateCcw size={14} />
                            <span>새 강의</span>
                        </button>
                        <button
                            className="tool-btn"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileInput size={14} />
                            <span>불러오기</span>
                        </button>
                        <button
                            className="tool-btn"
                            onClick={handleExport}
                        >
                            <FileDown size={14} />
                            <span>내보내기</span>
                        </button>

                        {/* Secondary Buttons */}
                        <button
                            className={`tool-btn ${textToolActive ? 'active-text' : ''}`}
                            onClick={() => onToggleTextTool?.()}
                            title="텍스트 상자 추가"
                        >
                            <Type size={14} />
                            <span>텍스트</span>
                        </button>
                        <button
                            className="tool-btn"
                            onClick={() => onRequestSummary?.()}
                            title="요약 요청"
                        >
                            <FileText size={14} />
                            <span>요약</span>
                        </button>
                        <button
                            className="tool-btn"
                            onClick={() => onDownloadTranscript?.()}
                            title="전체 텍스트 저장"
                        >
                            <FileText size={14} />
                            <span>텍스트 저장</span>
                        </button>
                        <button
                            className="tool-btn"
                            onClick={() => onDownloadRecording?.()}
                            title="전체 녹음 저장"
                        >
                            <AudioLines size={14} />
                            <span>녹음 저장</span>
                        </button>
                        <button
                            className="tool-btn"
                            onClick={() => {
                                alert('질문 감지는 FSD 모드에서 자동 처리됩니다.');
                            }}
                        >
                            <CircleHelp size={14} />
                            <span>질문</span>
                        </button>

                    </div>
                </div>
            </div>

            {/* Collapse Handle */}
            <div className="toolbar-handle" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {sttError && (
                <div className="toolbar-error">
                    {sttError}
                </div>
            )}
            {sttStatus === 'connecting' && (
                <div className="toolbar-status">
                    STT 연결 중…
                </div>
            )}
        </div>
    );
}

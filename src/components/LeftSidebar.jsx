import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './LeftSidebar.css';
import { usePdf } from '../context/PdfContext.jsx';
import * as pdfjsLib from 'pdfjs-dist';

export default function LeftSidebar() {
    const [expanded, setExpanded] = useState(true);
    const { pdfDoc, pageCount, currentPage, setCurrentPage } = usePdf();
    const [thumbs, setThumbs] = useState([]);
    const listRef = useRef(null);

    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();

    useEffect(() => {
        let cancelled = false;
        async function renderThumbs() {
            if (!pdfDoc) {
                setThumbs([]);
                return;
            }
            const nextThumbs = [];
            for (let i = 1; i <= pageCount; i++) {
                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 0.2 });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: ctx, viewport }).promise;
                if (cancelled) return;
                nextThumbs.push(canvas.toDataURL());
            }
            if (!cancelled) {
                setThumbs(nextThumbs);
            }
        }
        renderThumbs();
        return () => {
            cancelled = true;
        };
    }, [pdfDoc, pageCount]);

    useEffect(() => {
        if (!listRef.current) return;
        const active = listRef.current.querySelector('.slide-item.active');
        if (active) {
            active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [currentPage]);

    return (
        <div className="sidebar-wrapper left">
            <div className={`sidebar-container left ${expanded ? 'expanded' : 'collapsed'}`}>
                <div className={`sidebar-content ${expanded ? 'visible' : 'hidden'}`}>
                    <div className="sidebar-header">
                        <span>Lecture PDF</span>
                        <span className="page-count">
                            {pageCount > 0 ? `${currentPage}/${pageCount}` : '0/0'}
                        </span>
                    </div>

                    <div className="slide-list scroll-area" ref={listRef}>
                        {(thumbs.length
                            ? thumbs
                            : Array.from({ length: Math.max(pageCount, 1) }, (_, i) => null)
                        ).map((thumb, i) => (
                            <div
                                key={i}
                                className={`slide-item ${i + 1 === currentPage ? 'active' : ''}`}
                                onMouseDown={() => setCurrentPage(i + 1)}
                                onTouchStart={() => setCurrentPage(i + 1)}
                                onClick={() => setCurrentPage(i + 1)}
                            >
                                <div className="slide-thumbnail">
                                    {thumb ? <img src={thumb} alt={`Slide ${i + 1}`} /> : i + 1}
                                </div>
                                <div className="slide-number">{i + 1}</div>
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

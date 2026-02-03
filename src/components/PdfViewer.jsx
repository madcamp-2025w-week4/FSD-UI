import React, { useEffect, useRef, useState } from 'react';
import './PdfViewer.css';
import { usePdf } from '../context/PdfContext.jsx';
import * as pdfjsLib from 'pdfjs-dist';

function PdfPage({ pdfDoc, pageNumber }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const cancelRenderRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      if (!pdfDoc || !canvasRef.current || !wrapperRef.current) return;
      const page = await pdfDoc.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = wrapperRef.current.clientWidth;
      const availableHeight = wrapperRef.current.clientHeight;
      if (!availableWidth || !availableHeight) return;
      const scale = Math.min(
        availableWidth / baseViewport.width,
        availableHeight / baseViewport.height
      );
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      if (cancelled) return;
    }
    renderPage();
    const observer = new ResizeObserver(() => {
      // Debounce limit to prevent layout thrashing during animation
      if (cancelRenderRef.current) clearTimeout(cancelRenderRef.current);
      cancelRenderRef.current = setTimeout(() => {
        renderPage();
      }, 300); // Wait for animation (0.6s) to settle mostly
    });
    observer.observe(wrapperRef.current);
    return () => {
      cancelled = true;
      if (cancelRenderRef.current) clearTimeout(cancelRenderRef.current);
      observer.disconnect();
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div className="pdf-page" data-page={pageNumber} ref={wrapperRef}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default function PdfViewer() {
  const containerRef = useRef(null);
  const rafRef = useRef(0);
  const scrollIdleRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const { pdfDoc, currentPage, pageCount, setCurrentPage } = usePdf();
  const { setDocument } = usePdf();

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;
    if (isUserScrollingRef.current) return;
    const target = containerRef.current.querySelector(
      `.pdf-page[data-page="${currentPage}"]`
    );
    if (!target) return;
    const container = containerRef.current;
    requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;
      const targetCenter = targetRect.top + targetRect.height / 2;
      const delta = targetCenter - containerCenter;
      container.scrollTo({
        top: container.scrollTop + delta,
        behavior: 'smooth'
      });
    });
  }, [pdfDoc, currentPage]);

  return (
    <div
      className={`pdf-viewer ${isDragging ? 'dragging' : ''}`}
      ref={containerRef}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (!file || file.type !== 'application/pdf') return;
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        setDocument(doc);
      }}
      onScroll={() => {
        if (!containerRef.current || !pdfDoc) return;
        isUserScrollingRef.current = true;
        clearTimeout(scrollIdleRef.current);
        scrollIdleRef.current = setTimeout(() => {
          isUserScrollingRef.current = false;
        }, 140);
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          const containerRect = containerRef.current.getBoundingClientRect();
          const containerCenter = containerRect.top + containerRect.height / 2;
          const pages = Array.from(
            containerRef.current.querySelectorAll('.pdf-page')
          );
          let bestPage = currentPage;
          let bestDistance = Number.POSITIVE_INFINITY;
          pages.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const pageCenter = rect.top + rect.height / 2;
            const distance = Math.abs(pageCenter - containerCenter);
            const pageNum = Number(el.getAttribute('data-page'));
            if (distance < bestDistance) {
              bestDistance = distance;
              bestPage = pageNum;
            }
          });
          if (bestPage !== currentPage) {
            setCurrentPage(bestPage);
          }
        });
      }}
    >
      {pdfDoc ? (
        <div className="pdf-pages">
          {Array.from({ length: pageCount }, (_, i) => (
            <PdfPage
              key={i + 1}
              pdfDoc={pdfDoc}
              pageNumber={i + 1}
            />
          ))}
        </div>
      ) : (
        <div className="pdf-empty">
          <h2>Lecture Material Preview</h2>
          <p>PDF 파일을 불러오세요</p>
        </div>
      )}
    </div>
  );
}

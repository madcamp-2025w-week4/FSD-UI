import React, { useEffect, useRef } from 'react';
import './PdfViewer.css';
import { usePdf } from '../context/PdfContext.jsx';

function PdfPage({ pdfDoc, pageNumber, scale = 1.2 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      if (!pdfDoc || !canvasRef.current) return;
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      if (cancelled) return;
    }
    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber, scale]);

  return (
    <div className="pdf-page" data-page={pageNumber}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default function PdfViewer() {
  const containerRef = useRef(null);
  const rafRef = useRef(0);
  const { pdfDoc, currentPage, pageCount, setCurrentPage } = usePdf();

  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;
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
      className="pdf-viewer"
      ref={containerRef}
      onScroll={() => {
        if (!containerRef.current || !pdfDoc) return;
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
              scale={1.2}
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

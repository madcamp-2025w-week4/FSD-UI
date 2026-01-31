import React, { useEffect, useRef } from 'react';
import './PdfViewer.css';
import { usePdf } from '../context/PdfContext.jsx';

export default function PdfViewer() {
  const canvasRef = useRef(null);
  const { pdfDoc, currentPage, pageCount, setCurrentPage } = usePdf();
  const lastWheelRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      if (!pdfDoc || !canvasRef.current) return;
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.2 });
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
  }, [pdfDoc, currentPage]);

    return (
    <div
      className="pdf-viewer"
      onWheel={(e) => {
        if (!pdfDoc || pageCount < 1) return;
        const now = performance.now();
        if (now - lastWheelRef.current < 250) return;
        lastWheelRef.current = now;
        if (e.deltaY > 0 && currentPage < pageCount) {
          setCurrentPage(currentPage + 1);
        } else if (e.deltaY < 0 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      }}
    >
      {pdfDoc ? (
        <canvas ref={canvasRef} />
      ) : (
        <div className="pdf-empty">
          <h2>Lecture Material Preview</h2>
          <p>PDF 파일을 불러오세요</p>
        </div>
      )}
    </div>
  );
}

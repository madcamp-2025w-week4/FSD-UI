import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './PdfViewer.css';
import { usePdf } from '../context/PdfContext.jsx';
import * as pdfjsLib from 'pdfjs-dist';

function PdfPage({
  pdfDoc,
  pageNumber,
  annotations,
  onAddBox,
  onUpdateBox,
  onUpdatePageSize,
  textToolActive,
  activeBoxId,
  setActiveBoxId,
  onTextToolUsed,
  onClearSelection
}) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const contentRef = useRef(null);
  const innerRef = useRef(null);
  const cancelRenderRef = useRef(null);
  const renderTaskRef = useRef(null);
  const renderPendingRef = useRef(false);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const [contentScale, setContentScale] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function renderPage() {
      if (!pdfDoc || !canvasRef.current || !wrapperRef.current) return;
      if (renderTaskRef.current) {
        renderPendingRef.current = true;
        return;
      }
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }
      const page = await pdfDoc.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = wrapperRef.current.clientWidth;
      const availableHeight = wrapperRef.current.clientHeight;
      if (!availableWidth || !availableHeight) return;
      const scale = Math.min(
        availableWidth / baseViewport.width,
        availableHeight / baseViewport.height
      );
      const viewport = page.getViewport({ scale: 1 });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const size = { width: viewport.width, height: viewport.height };
      setContentSize(size);
      setContentScale(scale);
      onUpdatePageSize?.(pageNumber, size);
      renderTaskRef.current = page.render({ canvasContext: ctx, viewport });
      try {
        await renderTaskRef.current.promise;
      } catch {
        // cancelled
      }
      renderTaskRef.current = null;
      if (renderPendingRef.current) {
        renderPendingRef.current = false;
        renderPage();
      }
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
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }
      renderPendingRef.current = false;
      observer.disconnect();
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div
      className="pdf-page"
      data-page={pageNumber}
      ref={wrapperRef}
      onMouseDown={(e) => {
        if (textToolActive) return;
        if (e.target.closest('.text-box')) return;
        onClearSelection?.();
      }}
    >
      <div
        className="pdf-page-content"
        ref={contentRef}
        style={{
          width: contentSize.width * contentScale || undefined,
          height: contentSize.height * contentScale || undefined
        }}
      >
        <div
          className="pdf-page-inner"
          ref={innerRef}
          style={{
            width: contentSize.width || undefined,
            height: contentSize.height || undefined,
            transform: `scale(${contentScale})`
          }}
        >
          <canvas ref={canvasRef} />
          <div
            className={`pdf-annotation-layer ${textToolActive ? 'text-mode' : ''}`}
            onMouseDown={(e) => {
              if (!textToolActive) return;
              if (e.target.closest('.text-box')) return;
              const bounds = contentRef.current.getBoundingClientRect();
              const x = (e.clientX - bounds.left) / bounds.width;
              const y = (e.clientY - bounds.top) / bounds.height;
              onAddBox(pageNumber, x, y);
              onTextToolUsed?.();
            }}
            onClick={(e) => {
              if (textToolActive) return;
              if (e.target.closest('.text-box')) return;
              setActiveBoxId(null);
            }}
          >
            {annotations.map((box) => (
              <TextBox
                key={box.id}
                box={box}
                pageNumber={pageNumber}
                onUpdate={onUpdateBox}
                active={activeBoxId === box.id}
                setActive={setActiveBoxId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TextBox({ box, pageNumber, onUpdate, active, setActive }) {
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const contentRef = useRef(null);
  const isComposingRef = useRef(false);
  const boxRef = useRef(box);

  useEffect(() => {
    boxRef.current = box;
  }, [box]);

  const onMove = useCallback((e) => {
    if (dragRef.current) {
      const { startX, startY, startLeft, startTop, bounds } = dragRef.current;
      const dx = (e.clientX - startX) / bounds.width;
      const dy = (e.clientY - startY) / bounds.height;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      const pages = Array.from(document.querySelectorAll('.pdf-page-content'));
      dragRef.current.hoverPage = pages.some((page) => {
        const rect = page.getBoundingClientRect();
        return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      });
      onUpdate(pageNumber, box.id, {
        x: Math.min(0.95, Math.max(0.02, startLeft + dx)),
        y: Math.min(0.95, Math.max(0.02, startTop + dy))
      });
    } else if (resizeRef.current) {
      const { bounds, startLeftPx, startTopPx, offsetX, offsetY } = resizeRef.current;
      const cursorX = e.clientX - bounds.left;
      const cursorY = e.clientY - bounds.top;
      const nextWpx = cursorX - startLeftPx - offsetX;
      const nextHpx = cursorY - startTopPx - offsetY;
      const nextW = Math.min(0.9, Math.max(0.08, nextWpx / bounds.width));
      const nextH = Math.min(0.9, Math.max(0.05, nextHpx / bounds.height));
      onUpdate(pageNumber, box.id, {
        w: nextW,
        h: nextH
      });
    }
  }, [box.id, onUpdate, pageNumber]);

  const stopDrag = useCallback(() => {
    if (dragRef.current) {
      const { startLeft, startTop, hoverPage } = dragRef.current;
      if (!hoverPage) {
        onUpdate(pageNumber, box.id, { x: startLeft, y: startTop });
      }
    }
    dragRef.current = null;
    resizeRef.current = null;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', stopDrag);
  }, [box.id, onMove, onUpdate, pageNumber]);

  const handleMouseDown = (e) => {
    if (e.target.closest('.text-box-resize')) return;
    e.preventDefault();
    e.stopPropagation();
    setActive(box.id);
    const bounds = e.currentTarget.closest('.pdf-page-content').getBoundingClientRect();
    const boxLeftPx = bounds.left + box.x * bounds.width;
    const boxTopPx = bounds.top + box.y * bounds.height;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: box.x,
      startTop: box.y,
      bounds,
      grabOffsetX: e.clientX - boxLeftPx,
      grabOffsetY: e.clientY - boxTopPx,
      lastX: e.clientX,
      lastY: e.clientY,
      hoverPage: true
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stopDrag);
  };

  const handleResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActive(box.id);
    const bounds = e.currentTarget.closest('.pdf-page-content').getBoundingClientRect();
    const startLeftPx = box.x * bounds.width;
    const startTopPx = box.y * bounds.height;
    const handleX = bounds.left + startLeftPx + box.w * bounds.width;
    const handleY = bounds.top + startTopPx + box.h * bounds.height;
    resizeRef.current = {
      bounds,
      startLeftPx,
      startTopPx,
      offsetX: e.clientX - handleX,
      offsetY: e.clientY - handleY
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stopDrag);
  };

  const fontSize = Math.max(12, Math.floor(box.h * 100));

  useEffect(() => {
    if (!contentRef.current) return;
    if (!isComposingRef.current && contentRef.current.textContent !== box.text) {
      contentRef.current.textContent = box.text || '';
    }
    if (active) {
      contentRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [box.text, active]);

  useLayoutEffect(() => {
    if (!active || !box.autoFocus || !contentRef.current) return;
    const el = contentRef.current;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    onUpdate(pageNumber, box.id, { autoFocus: false });
  }, [active, box.autoFocus, box.id, onUpdate, pageNumber]);

  return (
    <div
      className={`text-box ${active ? 'active' : ''}`}
      style={{
        left: `${box.x * 100}%`,
        top: `${box.y * 100}%`,
        width: `${box.w * 100}%`,
        height: `${box.h * 100}%`,
        fontSize: `${fontSize}px`
      }}
      onMouseDown={handleMouseDown}
    >
      {active && (
        <div className="text-color-menu">
          {[
            { id: 'black', color: '#111111' },
            { id: 'red', color: '#ff3b30' },
            { id: 'blue', color: '#007aff' }
          ].map((item) => (
            <button
              key={item.id}
              className={`text-color-dot ${box.color === item.color ? 'selected' : ''}`}
              style={{ backgroundColor: item.color }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(pageNumber, box.id, { color: item.color });
              }}
              type="button"
              aria-label={`${item.id} text`}
            />
          ))}
        </div>
      )}
      <div
        className="text-box-content"
        ref={contentRef}
        data-box-id={box.id}
        contentEditable
        suppressContentEditableWarning
        onMouseDown={() => setActive(box.id)}
        style={{ color: box.color || '#111111' }}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          isComposingRef.current = false;
          onUpdate(pageNumber, box.id, {
            text: e.currentTarget.textContent || ''
          });
        }}
        onInput={(e) => {
          if (isComposingRef.current) return;
          onUpdate(pageNumber, box.id, {
            text: e.currentTarget.textContent || ''
          });
        }}
      />
      <div className="text-box-resize" onMouseDown={handleResize} />
    </div>
  );
}

export default function PdfViewer({ textToolActive = false, onTextToolUsed }) {
  const containerRef = useRef(null);
  const rafRef = useRef(0);
  const scrollIdleRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeBoxId, setActiveBoxId] = useState(null);
  const justCreatedRef = useRef(false);
  const pendingFocusIdRef = useRef(null);
  const { pdfDoc, currentPage, pageCount, setCurrentPage, setDocument, boxes, setBoxes, setPageSize } = usePdf();

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

  useEffect(() => {
    if (!textToolActive) {
      if (justCreatedRef.current) {
        justCreatedRef.current = false;
        return;
      }
      setActiveBoxId(null);
    }
  }, [textToolActive]);

  const pageBoxes = useMemo(
    () => boxes,
    [boxes]
  );

  const addBox = useCallback((pageNumber, x, y) => {
    const id = `${pageNumber}-${Date.now()}`;
    setBoxes((prev) => {
      const next = { ...(prev || {}) };
      const list = next[pageNumber] ? [...next[pageNumber]] : [];
      list.push({
        id,
        x,
        y,
        w: 0.18,
        h: 0.08,
        text: '',
        color: '#111111',
        autoFocus: true
      });
      next[pageNumber] = list;
      return next;
    });
    setActiveBoxId(id);
    justCreatedRef.current = true;
    pendingFocusIdRef.current = id;
  }, []);

  useEffect(() => {
    if (!pendingFocusIdRef.current) return;
    const id = pendingFocusIdRef.current;
    pendingFocusIdRef.current = null;
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector(
        `.text-box-content[data-box-id="${id}"]`
      );
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }, [boxes, activeBoxId]);

  const updateBox = useCallback((pageNumber, id, patch) => {
    setBoxes((prev) => {
      const list = prev[pageNumber] || [];
      const nextList = list.map((box) =>
        box.id === id ? { ...box, ...patch } : box
      );
      return { ...prev, [pageNumber]: nextList };
    });
  }, []);

  const removeBox = useCallback((id) => {
    setBoxes((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((pageKey) => {
        const list = next[pageKey] || [];
        const filtered = list.filter((box) => box.id !== id);
        if (filtered.length === 0) {
          delete next[pageKey];
        } else {
          next[pageKey] = filtered;
        }
      });
      return next;
    });
    setActiveBoxId(null);
  }, []);

  useEffect(() => {
    if (!activeBoxId) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const isEditing = document.activeElement?.classList?.contains('text-box-content');
      if (e.key === 'Backspace' && isEditing) {
        return;
      }
      e.preventDefault();
      removeBox(activeBoxId);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeBoxId, removeBox]);

  const clearSelection = useCallback(() => {
    if (justCreatedRef.current) {
      justCreatedRef.current = false;
      return;
    }
    setActiveBoxId(null);
  }, []);

  return (
    <div
      className={`pdf-viewer ${isDragging ? 'dragging' : ''} ${textToolActive ? 'text-mode' : ''}`}
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
        const safeBuffer = arrayBuffer.slice(0);
        const loadingTask = pdfjsLib.getDocument({ data: safeBuffer });
        const doc = await loadingTask.promise;
        const name = file.name || 'lecture';
        const base = name.replace(/\.[^.]+$/, '');
        setDocument(doc, base, safeBuffer);
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
              annotations={pageBoxes[i + 1] || []}
              onAddBox={addBox}
              onUpdateBox={updateBox}
              onUpdatePageSize={setPageSize}
              textToolActive={textToolActive}
              activeBoxId={activeBoxId}
              setActiveBoxId={setActiveBoxId}
              onTextToolUsed={onTextToolUsed}
              onClearSelection={clearSelection}
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

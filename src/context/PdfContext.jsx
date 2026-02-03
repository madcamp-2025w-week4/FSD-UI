import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PdfContext = createContext(null);

export function PdfProvider({ children }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfTitle, setPdfTitle] = useState(() => localStorage.getItem('fsd_pdf_title') || '');
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const setDocument = useCallback((doc, title = '') => {
    setPdfDoc(doc);
    setPageCount(doc?.numPages || 0);
    setCurrentPage(1);
    setPdfTitle(title);
    if (title) {
      localStorage.setItem('fsd_pdf_title', title);
    }
  }, []);

  const value = useMemo(
    () => ({
      pdfDoc,
      pdfTitle,
      pageCount,
      currentPage,
      setCurrentPage,
      setDocument
    }),
    [pdfDoc, pdfTitle, pageCount, currentPage, setCurrentPage, setDocument]
  );

  return <PdfContext.Provider value={value}>{children}</PdfContext.Provider>;
}

export function usePdf() {
  const ctx = useContext(PdfContext);
  if (!ctx) {
    throw new Error('usePdf must be used within PdfProvider');
  }
  return ctx;
}

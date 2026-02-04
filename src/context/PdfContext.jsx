import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PdfContext = createContext(null);

export function PdfProvider({ children }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfTitle, setPdfTitle] = useState(() => localStorage.getItem('fsd_pdf_title') || '');
  const [pdfData, setPdfData] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [boxes, setBoxes] = useState({});

  const setDocument = useCallback((doc, title = '', data = null) => {
    setPdfDoc(doc);
    setPdfData(data);
    setPageCount(doc?.numPages || 0);
    setCurrentPage(1);
    setPdfTitle(title);
    setBoxes({});
    if (title) {
      localStorage.setItem('fsd_pdf_title', title);
    }
  }, []);

  const clearDocument = useCallback(() => {
    setPdfDoc(null);
    setPdfData(null);
    setPageCount(0);
    setCurrentPage(1);
    setPdfTitle('');
    setBoxes({});
    localStorage.removeItem('fsd_pdf_title');
  }, []);

  const value = useMemo(
    () => ({
      pdfDoc,
      pdfTitle,
      pdfData,
      pageCount,
      currentPage,
      setCurrentPage,
      setDocument,
      clearDocument,
      boxes,
      setBoxes
    }),
    [
      pdfDoc,
      pdfTitle,
      pdfData,
      pageCount,
      currentPage,
      setCurrentPage,
      setDocument,
      clearDocument,
      boxes,
      setBoxes
    ]
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

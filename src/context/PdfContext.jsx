import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PdfContext = createContext(null);

export function PdfProvider({ children }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const setDocument = useCallback((doc) => {
    setPdfDoc(doc);
    setPageCount(doc?.numPages || 0);
    setCurrentPage(1);
  }, []);

  const value = useMemo(
    () => ({
      pdfDoc,
      pageCount,
      currentPage,
      setCurrentPage,
      setDocument
    }),
    [pdfDoc, pageCount, currentPage, setCurrentPage, setDocument]
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

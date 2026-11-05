/// <reference types="vite/client" />

// PDF.js is loaded at runtime from a CDN <script> tag (see PDFViewer.tsx),
// not imported as a module — declare it loosely so TS knows it can exist
// on `window` without pulling in the full pdf.js type package.
interface Window {
  pdfjsLib?: any;
}

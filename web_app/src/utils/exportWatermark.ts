/**
 * Shared "Extracto" branding stamp for PDF exports. The Excel-side
 * equivalent (a locked watermark row, rest of the sheet left editable)
 * moved to src/utils/excelExport.ts once it turned out the xlsx-js-style
 * writer used here couldn't express per-cell protection — see that file's
 * top comment for why.
 */

// Draws a large, low-opacity, diagonal "EXTRACTO" watermark across the
// current PDF page — call from a `didDrawPage` hook (or once per page) so
// it's stamped under jsPDF's own text/table content on every page.
export function stampPdfWatermark(doc, pageWidth, pageHeight) {
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.07 }));
  doc.setFontSize(80);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.setFont("helvetica", "bold");
  doc.text("EXTRACTO", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 35,
  } as any);
  doc.restoreGraphicsState();
}

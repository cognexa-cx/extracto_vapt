/**
 * Export Utilities - Professional Version
 * Supports XLSX (Excel) and PDF formats with enhanced formatting
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { stampPdfWatermark } from "./exportWatermark";
import {
  createWorkbook,
  addStyledSheet,
  stampAndProtect,
  saveWorkbook,
  HEADER_FILLS,
} from "./excelExport";

/**
 * Exports data to professionally formatted XLSX
 * Features:
 * - Separate sheets for Inward and Outward invoices
 * - Auto-sized columns with smart width calculation
 * - Frozen header row
 * - Styled headers with bold text and background color
 * - Formatted dates, numbers, and currency
 * - Alternating row colors for readability
 * - Professional borders
 *
 * @param {Array} data - Array of objects (with Title Case headers)
 * @param {String} filename - Filename without extension
 */
export const exportToExcel = async (data, filename = "export") => {
  if (!data || data.length === 0) {
    console.warn("⚠️ No data to export to Excel");
    alert("No data available to export");
    return false;
  }

  // ✅ SAFETY CHECK: Ensure data is properly formatted (Title Case headers)
  const firstKey = Object.keys(data[0])[0];
  if (firstKey.includes("_")) {
    console.error(
      "❌ Export data contains raw database columns (snake_case). Use mapRawDataForExport first.",
    );
    console.error(
      `❌ Found column: "${firstKey}" - Expected Title Case like "Invoice Number"`,
    );
    alert("Export format error. Data must be formatted before export.");
    return false;
  }

  try {
    console.log(`📊 Exporting ${data.length} records to Excel...`);

    const inwardRecords = data.filter((item) => item["Direction"]?.toLowerCase() === "inward");
    const outwardRecords = data.filter((item) => item["Direction"]?.toLowerCase() === "outward");
    const returnableRecords = data.filter((item) => item["Direction"]?.toLowerCase() === "returnable");

    const workbook = await createWorkbook();
    const colorFor = (name) =>
      name.includes("Inward")
        ? HEADER_FILLS.blue
        : name.includes("Outward")
          ? HEADER_FILLS.orange
          : name.includes("Returnable")
            ? HEADER_FILLS.purple
            : HEADER_FILLS.default;

    // Direction is no longer captured in the UI, so normally every record is
    // one direction -- a single "Records" sheet then, instead of a duplicate
    // "Inward Records" + "All Records". Legacy data with several directions
    // still gets its per-direction sheets.
    const directionSheets = [
      { records: inwardRecords, name: "Inward Records" },
      { records: outwardRecords, name: "Outward Records" },
      { records: returnableRecords, name: "Returnable Records" },
    ].filter((sh) => sh.records.length > 0);
    const sheets =
      directionSheets.length > 1
        ? [...directionSheets, { records: data, name: "All Records" }]
        : [{ records: data, name: "Records" }];

    for (const { records: recs, name } of sheets) {
      if (recs.length === 0) continue;
      const worksheet = addStyledSheet(workbook, recs, name, colorFor(name));
      if (!worksheet) continue;
      const headerCount = Array.from(
        recs.reduce((keys, r) => {
          Object.keys(r).forEach((k) => keys.add(k));
          return keys;
        }, new Set()),
      ).length;
      await stampAndProtect(worksheet, headerCount);
    }

    // ==========================================
    // ADD METADATA SHEET (Summary Information)
    // ==========================================
    const infoSheet = workbook.addWorksheet("Export Info");
    infoSheet.columns = [{ width: 20 }, { width: 60 }];
    const infoRows = [
      ["Export Information"],
      [],
      ["Export Date", new Date().toLocaleString()],
      ["Total Records", data.length],
      ...(directionSheets.length > 1
        ? [
            ["Inward Records", inwardRecords.length],
            ["Outward Records", outwardRecords.length],
            ["Returnable Records", returnableRecords.length],
          ]
        : []),
      ["Filename", `${filename}.xlsx`],
      [],
      ["Note: Empty/null columns are automatically removed for cleaner export"],
    ];
    infoRows.forEach((row) => infoSheet.addRow(row));
    infoSheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    infoSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    infoSheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    ["A3", "A4", "A5", "A6", "A7"].forEach((addr) => {
      infoSheet.getCell(addr).font = { bold: true, size: 11 };
      infoSheet.getCell(addr).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    });

    await saveWorkbook(workbook, filename);

    console.log(`✅ Excel file exported successfully: ${filename}.xlsx`);
    console.log(`   - Total: ${data.length} records`);
    console.log(`   - Inward: ${inwardRecords.length} records`);
    console.log(`   - Outward: ${outwardRecords.length} records`);

    return true;
  } catch (error) {
    console.error("❌ Error exporting to Excel:", error);
    alert(`Failed to export to Excel: ${error.message}`);
    return false;
  }
};

/**
 * Exports data to professionally formatted PDF
 * Features:
 * - Separate sections for Inward and Outward invoices
 * - Smart column selection (only columns with data per section)
 * - Multi-page support with repeated headers
 * - Professional color scheme (Blue for Inward, Orange for Outward)
 * - Formatted dates, numbers, currency
 * - Page numbers and metadata
 * - Automatic text wrapping
 *
 * @param {Array} data - Array of objects (with Title Case headers)
 * @param {String} filename - Filename without extension
 */
export const exportToPDF = (data, filename = "export") => {
  if (!data || data.length === 0) {
    console.warn("⚠️ No data to export to PDF");
    alert("No data available to export");
    return false;
  }

  // ✅ SAFETY CHECK: Ensure data is properly formatted (Title Case headers)
  const firstKey = Object.keys(data[0])[0];
  if (firstKey.includes("_")) {
    console.error(
      "❌ Export data contains raw database columns (snake_case). Use mapRawDataForExport first.",
    );
    console.error(
      `❌ Found column: "${firstKey}" - Expected Title Case like "Invoice Number"`,
    );
    alert("Export format error. Data must be formatted before export.");
    return false;
  }

  try {
    console.log(`📄 Exporting ${data.length} records to PDF...`);

    // ==========================================
    // SPLIT DATA BY DIRECTION
    // ==========================================
    const inwardRecords = data.filter(
      (item) => item["Direction"]?.toLowerCase() === "inward",
    );
    const outwardRecords = data.filter(
      (item) => item["Direction"]?.toLowerCase() === "outward",
    );
    const returnableRecords = data.filter(
      (item) => item["Direction"]?.toLowerCase() === "returnable",
    );

    // ==========================================
    // CREATE PDF DOCUMENT
    // ==========================================
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    stampPdfWatermark(doc, pageWidth, pageHeight);

    // ==========================================
    // PDF HEADER (Title and Metadata)
    // ==========================================
    doc.setFontSize(18);
    doc.setTextColor(31, 41, 55); // slate-800
    doc.setFont("helvetica", "bold");
    doc.text("Invoice Data Export", 14, 15);

    // Metadata
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); // slate-500
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 22);
    doc.text(`Total Records: ${data.length}`, 14, 27);
    doc.text(
      `Inward: ${inwardRecords.length} | Outward: ${outwardRecords.length} | Returnable: ${returnableRecords.length}`,
      100,
      27,
    );

    let currentY = 35; // Track Y position for content
    const sectionInfo = []; // Track section details for summary

    // ==========================================
    // HELPER FUNCTION: Get columns with data
    // ==========================================
    const getColumnsWithData = (records): string[] => {
      const allKeys = new Set<string>();
      records.forEach((record) => {
        Object.keys(record).forEach((key) => {
          // Only include if the column has at least one non-empty value
          const hasData = records.some((r) => {
            const val = r[key];
            return (
              val !== null && val !== undefined && val !== "" && val !== "-"
            );
          });
          if (hasData) allKeys.add(key);
        });
      });

      return Array.from(allKeys);
    };

    // ==========================================
    // HELPER FUNCTION: Format cell value
    // ==========================================
    const formatCellValue = (header, value) => {
      // Handle null/undefined
      if (value === null || value === undefined || value === "") return "-";

      // Format dates
      if (header.toLowerCase().includes("date") && value instanceof Date) {
        return value.toLocaleDateString("en-IN");
      }
      if (header.toLowerCase().includes("date") && typeof value === "string") {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("en-IN");
        }
      }

      // Format currency
      if (
        (header.toLowerCase().includes("amount") ||
          header.toLowerCase().includes("price") ||
          header.toLowerCase().includes("cost")) &&
        typeof value === "number"
      ) {
        return `₹${value.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }

      // Format percentages
      if (
        (header.toLowerCase().includes("accuracy") ||
          header.toLowerCase().includes("percent")) &&
        typeof value === "number"
      ) {
        return `${(value * 100).toFixed(1)}%`;
      }

      // Format numbers
      if (typeof value === "number") {
        return value.toLocaleString("en-IN");
      }

      // Truncate very long text
      const strValue = String(value);
      return strValue.length > 50
        ? strValue.substring(0, 47) + "..."
        : strValue;
    };

    // ==========================================
    // HELPER FUNCTION: Create section table
    // ==========================================
    const createSectionTable = (records, sectionTitle, headerColor, startY) => {
      if (!records || records.length === 0) {
        console.log(`⚠️ No ${sectionTitle} records to export`);
        return { nextY: startY, headers: [], totalColumns: 0 };
      }

      // Get ALL columns with data for this section
      const headers = getColumnsWithData(records);
      const totalColumns = headers.length;

      console.log(
        `📄 ${sectionTitle}: ${records.length} records, ${totalColumns} columns`,
      );

      // Prepare data rows
      const rows = records.map((item) =>
        headers.map((header) => formatCellValue(header, item[header])),
      );

      // Add section header
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      doc.text(sectionTitle, 14, startY);

      // Add record count
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${records.length} records | ${totalColumns} columns`,
        14,
        startY + 5,
      );

      // ==========================================
      // DYNAMIC SIZING BASED ON COLUMN COUNT
      // ==========================================
      let fontSize = 8;
      let cellPadding = 3;
      let headerFontSize = 9;

      if (totalColumns > 20) {
        fontSize = 6;
        cellPadding = 2;
        headerFontSize = 7;
      } else if (totalColumns > 15) {
        fontSize = 7;
        cellPadding = 2.5;
        headerFontSize = 8;
      }

      // Create table
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: startY + 8,

        // ========== STYLING ==========
        styles: {
          fontSize: fontSize,
          cellPadding: cellPadding,
          overflow: "linebreak",
          halign: "left",
          valign: "middle",
          lineColor: [226, 232, 240], // slate-200
          lineWidth: 0.1,
          minCellWidth: 8, // Minimum width to prevent too narrow columns
        },

        // Header styling
        headStyles: {
          fillColor: headerColor,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
          fontSize: headerFontSize,
          cellPadding: cellPadding,
          minCellHeight: 8,
        },

        // Alternating row colors
        alternateRowStyles: {
          fillColor: [248, 250, 252], // slate-50
        },

        // ========== COLUMN CONFIGURATION ==========
        columnStyles: headers.reduce((acc: Record<number, any>, header, index) => {
          // Right-align numbers and currency
          if (
            header.toLowerCase().includes("amount") ||
            header.toLowerCase().includes("price") ||
            header.toLowerCase().includes("cost") ||
            header.toLowerCase().includes("id")
          ) {
            acc[index] = { halign: "right" };
          }
          // Center-align status columns
          else if (
            header.toLowerCase().includes("status") ||
            header.toLowerCase().includes("type")
          ) {
            acc[index] = { halign: "center" };
          }

          return acc;
        }, {}),

        // ========== TABLE LAYOUT ==========
        margin: { top: 10, right: 10, bottom: 25, left: 10 },
        theme: "grid",
        tableWidth: "auto",
        showHead: "everyPage",

        // ========== PAGE HANDLING ==========
        didDrawPage: function (hookData) {
          stampPdfWatermark(doc, pageWidth, pageHeight);

          // Footer with page numbers
          const pageCount = (doc as any).internal.getNumberOfPages();

          doc.setFontSize(8);
          doc.setTextColor(107, 114, 128);
          doc.setFont("helvetica", "normal");

          // Page number (center)
          doc.text(
            `Page ${hookData.pageNumber} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" },
          );

          // Footer left (app name)
          doc.text("Invoice Management System", 14, pageHeight - 10);

          // Footer right (export info)
          doc.text(`${filename}.pdf`, pageWidth - 14, pageHeight - 10, {
            align: "right",
          });
        },
      });

      // Return info about this section
      return {
        nextY: (doc as any).lastAutoTable.finalY + 15,
        headers: headers,
        totalColumns: totalColumns,
      };
    };

    const pdfSections = [
      { records: inwardRecords, title: "Inward Records", color: [37, 99, 235] },
      { records: outwardRecords, title: "Outward Records", color: [234, 88, 12] },
      { records: returnableRecords, title: "Returnable Records", color: [124, 58, 237] },
    ];

    for (const section of pdfSections) {
      if (section.records.length === 0) continue;
      if (currentY > pageHeight - 60) { doc.addPage(); currentY = 15; }
      const info = createSectionTable(section.records, section.title, section.color, currentY);
      currentY = info.nextY;
      sectionInfo.push({
        name: section.title,
        records: section.records.length,
        columnsShown: info.headers.length,
        columnsTotal: info.totalColumns,
        columns: info.headers,
      });
    }

    // ==========================================
    // ADD SUMMARY PAGE
    // ==========================================
    doc.addPage();
    stampPdfWatermark(doc, pageWidth, pageHeight);

    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.text("Export Summary", 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");

    let summaryY = 25;

    doc.text("Export Information:", 14, summaryY);
    summaryY += 7;
    doc.setFontSize(9);
    doc.text(
      `• Export Date: ${new Date().toLocaleString("en-IN")}`,
      20,
      summaryY,
    );
    summaryY += 6;
    doc.text(`• Total Records: ${data.length}`, 20, summaryY);
    summaryY += 6;
    doc.text(`• Inward Records: ${inwardRecords.length}`, 20, summaryY);
    summaryY += 6;
    doc.text(`• Outward Records: ${outwardRecords.length}`, 20, summaryY);
    summaryY += 6;
    doc.text(`• Returnable Records: ${returnableRecords.length}`, 20, summaryY);
    summaryY += 6;
    doc.text(`• Filename: ${filename}.pdf`, 20, summaryY);
    summaryY += 12;

    doc.setFontSize(10);
    doc.text("PDF Structure:", 14, summaryY);
    summaryY += 7;
    doc.setFontSize(9);

    // Display section details
    sectionInfo.forEach((section, idx) => {
      doc.setFont("helvetica", "bold");
      doc.text(`• Section ${idx + 1}: ${section.name}`, 20, summaryY);
      summaryY += 5;
      doc.setFont("helvetica", "normal");
      doc.text(`  - ${section.records} records`, 25, summaryY);
      summaryY += 5;
      doc.text(
        `  - ${section.totalColumns} columns (all columns with data)`,
        25,
        summaryY,
      );
      summaryY += 5;

      // Show first few columns as preview
      const previewCols = section.columns.slice(0, 8).join(", ");
      const remaining =
        section.columns.length > 8
          ? ` ... +${section.columns.length - 8} more`
          : "";
      doc.text(`  - Columns: ${previewCols}${remaining}`, 25, summaryY);
      summaryY += 8;
    });

    summaryY += 2;
    doc.text("• All columns with data are included", 20, summaryY);
    summaryY += 5;
    doc.text("• Empty/null columns automatically removed", 20, summaryY);
    summaryY += 5;
    doc.text(
      "• Font size adjusted for readability based on column count",
      20,
      summaryY,
    );
    summaryY += 12;

    doc.setFontSize(10);
    doc.text("Notes:", 14, summaryY);
    summaryY += 7;
    doc.setFontSize(9);
    doc.text(
      "• PDF includes all data columns (matching Excel export)",
      20,
      summaryY,
    );
    summaryY += 6;
    doc.text(
      "• Smaller fonts used for sections with many columns",
      20,
      summaryY,
    );
    summaryY += 6;
    doc.text(
      "• Landscape orientation optimized for maximum column visibility",
      20,
      summaryY,
    );

    // ==========================================
    // SAVE PDF
    // ==========================================
    doc.save(`${filename}.pdf`);

    console.log(`✅ PDF file exported successfully: ${filename}.pdf`);
    console.log(`   - Total: ${data.length} records`);
    console.log(`   - Inward: ${inwardRecords.length} records`);
    console.log(`   - Outward: ${outwardRecords.length} records`);
    console.log(`   - Pages: ${(doc as any).internal.getNumberOfPages()}`);

    return true;
  } catch (error) {
    console.error("❌ Error exporting to PDF:", error);
    console.error("❌ Error details:", error.message);
    console.error("❌ Error stack:", error.stack);
    alert(`Failed to export to PDF: ${error.message}`);
    return false;
  }
};

/**
 * Helper function to format date stamp for filenames
 * @returns {String} Formatted date string (YYYYMMDD_HHMM)
 */
export const getDateStamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}_${hours}${minutes}`;
};

/**
 * DEPRECATED - Not used anymore
 * Data preparation is now handled in DashboardTable.jsx
 */
export const prepareDataForExport = (data) => {
  console.warn(
    "⚠️ prepareDataForExport is deprecated. Use mapRawDataForExport in DashboardTable instead.",
  );
  return data;
};

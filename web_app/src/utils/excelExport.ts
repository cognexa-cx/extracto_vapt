/**
 * Shared ExcelJS-based Excel writer.
 *
 * Replaces the xlsx-js-style-based sheet building that used to live
 * directly in exportUtils.ts/exportUsersUtils.ts/exportGenericUtils.ts.
 * xlsx-js-style can write real <sheetProtection> XML but — confirmed by
 * inspecting its output — never writes per-cell <protection locked="0"/>
 * from a cell's style, so the only way to "protect the watermark" with it
 * was to lock the entire sheet, which made the exported *data* uneditable
 * too. ExcelJS writes real per-cell protection, so here every data cell is
 * explicitly unlocked and only the watermark row stays locked, then sheet
 * protection is turned on — the watermark can't be edited or deleted, and
 * everything else can.
 */
// Loaded on demand rather than at module scope — same reasoning the old
// xlsx-js-style import used: ExcelJS is a large dependency, and every
// caller here only needs it once someone actually clicks Export, not on
// every page load.
export async function createWorkbook() {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Extracto";
  workbook.lastModifiedBy = "Extracto";
  workbook.company = "Extracto";
  return workbook;
}

const HEADER_FILLS = {
  default: "4F46E5",
  blue: "2563EB",
  orange: "EA580C",
  purple: "7C3AED",
  green: "059669",
  red: "DC2626",
};

// Only the columns that actually have a non-empty value somewhere in the
// data — matches the old xlsx exporters' behavior of dropping all-empty
// columns for a cleaner export.
function columnsWithData(records) {
  const cols: string[] = [];
  const seen = new Set<string>();
  records.forEach((record) => {
    Object.keys(record).forEach((key) => {
      if (seen.has(key)) return;
      const hasData = records.some((r) => {
        const val = r[key];
        return val !== null && val !== undefined && val !== "" && val !== "-";
      });
      if (hasData) {
        seen.add(key);
        cols.push(key);
      }
    });
  });
  return cols;
}

function widthFor(header, records) {
  const headerLower = header.toLowerCase();
  const maxDataLength = Math.max(
    0,
    ...records.map((r) => {
      const v = r[header];
      return v === null || v === undefined ? 0 : Math.max(...String(v).split("\n").map((l) => l.length));
    }),
  );
  const contentWidth = Math.max(header.length, maxDataLength);
  let min = 10;
  let max = 45;
  if (headerLower.includes("id") || headerLower.includes("code")) {
    min = 8;
    max = 15;
  } else if (headerLower.includes("date")) {
    min = 12;
    max = 20;
  } else if (headerLower.includes("amount") || headerLower.includes("price")) {
    min = 14;
    max = 18;
  } else if (headerLower.includes("email")) {
    min = 20;
    max = 35;
  } else if (headerLower.includes("name") || headerLower.includes("description") || headerLower.includes("address")) {
    min = 15;
    max = 40;
  } else if (headerLower.includes("status") || headerLower.includes("type")) {
    min = 12;
    max = 15;
  }
  return Math.min(Math.max(contentWidth + 2, min), max);
}

function numFmtFor(header) {
  const h = header.toLowerCase();
  if (h.includes("amount") || h.includes("price") || h.includes("cost")) return "₹#,##0.00";
  if (h.includes("accuracy") || h.includes("percent") || h.includes("%")) return "0.00%";
  if (h.includes("date")) return "dd/mm/yyyy";
  return undefined;
}

/**
 * Adds a worksheet with a bold colored header row, zebra-striped data rows,
 * auto-sized columns, and a frozen header — same visual language the old
 * xlsx-js-style exports used. `records` keys must already be the Title
 * Case display labels (the safety check every caller already runs before
 * this).
 */
export function addStyledSheet(workbook, records, sheetName, fillColor = HEADER_FILLS.default) {
  const headers = columnsWithData(records);
  if (headers.length === 0) return null;

  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));
  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: widthFor(header, records),
  }));

  records.forEach((record) => {
    const row = {};
    headers.forEach((h) => {
      row[h] = record[h] === "-" || record[h] === undefined ? null : record[h];
    });
    worksheet.addRow(row);
  });

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12, name: "Arial" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${fillColor}` } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });
  headerRow.height = 20;

  headers.forEach((header, colIndex) => {
    const fmt = numFmtFor(header);
    if (!fmt) return;
    worksheet.getColumn(colIndex + 1).numFmt = fmt;
  });

  for (let r = 2; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    const isEven = r % 2 === 0;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: "Arial", size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? "FFF8FAFC" : "FFFFFFFF" } };
      cell.alignment = {
        horizontal: typeof cell.value === "number" ? "right" : "left",
        vertical: typeof cell.value === "string" && cell.value.includes("\n") ? "top" : "middle",
        wrapText: typeof cell.value === "string" && cell.value.includes("\n"),
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  }

  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  return worksheet;
}

/**
 * Adds a single-column "nothing here yet" sheet (used for e.g. an empty
 * Inactive Users sheet that's always shown even with zero rows).
 */
export function addEmptyMessageSheet(workbook, sheetName, message, fillColor = HEADER_FILLS.default) {
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));
  worksheet.columns = [{ width: 60 }];
  const titleRow = worksheet.addRow([sheetName]);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${fillColor}` } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  worksheet.addRow([]);
  worksheet.addRow([message]);
  return worksheet;
}

/**
 * Appends the "Generated by Extracto" watermark row, unlocks every other
 * existing cell, and turns on sheet protection so the watermark itself
 * can't be edited or deleted while the rest of the sheet stays editable.
 * Call this last, after all data/styling is in place.
 */
export async function stampAndProtect(worksheet, colCount) {
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.protection = { locked: false };
    });
  });

  worksheet.addRow([]);
  const watermarkRow = worksheet.addRow(["Generated by Extracto — Smart extraction. Instantly."]);
  const watermarkCell = watermarkRow.getCell(1);
  watermarkCell.font = { italic: true, size: 9, color: { argb: "FF9CA3AF" } };
  watermarkCell.alignment = { horizontal: "center" };
  watermarkCell.protection = { locked: true };
  if (colCount > 1) {
    worksheet.mergeCells(watermarkRow.number, 1, watermarkRow.number, colCount);
  }

  await worksheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    // Only the watermark cell stays locked; everything else on the sheet is
    // editable -- resizing/formatting columns and rows, inserting, deleting,
    // sorting and filtering data.
    formatCells: true,
    formatColumns: true,
    formatRows: true,
    insertColumns: true,
    insertRows: true,
    insertHyperlinks: true,
    deleteColumns: true,
    deleteRows: true,
    sort: true,
    autoFilter: true,
    pivotTables: true,
  });
}

export async function saveWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { HEADER_FILLS };

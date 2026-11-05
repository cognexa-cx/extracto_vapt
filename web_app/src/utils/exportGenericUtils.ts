/**
 * Single-sheet Excel export for pages that just need "export what's on
 * screen right now" — Audit Logs, Blocked Vendors, Reports tabs, and the
 * Master Data CRUD tabs — as opposed to exportUtils.ts/exportUsersUtils.ts,
 * which split gate-pass/user records into multiple sheets by direction or
 * status. Same watermarking (src/utils/excelExport.ts) and Title-Case
 * header convention as those.
 */
import { createWorkbook, addStyledSheet, stampAndProtect, saveWorkbook } from "./excelExport";

/**
 * @param {Array<Record<string, any>>} data - rows with Title Case keys (the
 *   display labels you want as Excel column headers)
 * @param {string} filename - filename without extension
 * @param {string} sheetName - Excel sheet name (max 31 chars, no styling on
 *   the name itself)
 */
export const exportRowsToExcel = async (data, filename = "export", sheetName = "Export") => {
  if (!data || data.length === 0) {
    alert("No data available to export");
    return false;
  }

  const headers = Array.from(
    data.reduce((keys, row) => {
      Object.keys(row).forEach((k) => keys.add(k));
      return keys;
    }, new Set()),
  ) as string[];

  const workbook = await createWorkbook();
  const worksheet = addStyledSheet(workbook, data, sheetName);
  await stampAndProtect(worksheet, headers.length);
  await saveWorkbook(workbook, filename);

  return true;
};

/**
 * One workbook, one sheet per entry — e.g. RBAC Master's "every role in
 * one file" export, where a single sheet per role wouldn't fit the whole
 * picture (each role has a different permission set) but a single row-list
 * export can't show that structure either.
 *
 * @param {Array<{ name: string, rows: Array<Record<string, any>> }>} sheets
 *   - `name` becomes the sheet tab name (max 31 chars); `rows` follow the
 *   same Title Case header convention as exportRowsToExcel. Sheets with no
 *   rows are skipped.
 * @param {string} filename - filename without extension
 */
export const exportMultiSheetToExcel = async (sheets, filename = "export") => {
  const nonEmpty = (sheets || []).filter((s) => s.rows && s.rows.length > 0);
  if (nonEmpty.length === 0) {
    alert("No data available to export");
    return false;
  }

  const workbook = await createWorkbook();
  for (const { name, rows } of nonEmpty) {
    const worksheet = addStyledSheet(workbook, rows, name);
    if (!worksheet) continue;
    const headerCount = Array.from(
      rows.reduce((keys, row) => {
        Object.keys(row).forEach((k) => keys.add(k));
        return keys;
      }, new Set()),
    ).length;
    await stampAndProtect(worksheet, headerCount);
  }
  await saveWorkbook(workbook, filename);

  return true;
};

export const getDateStamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}_${hours}${minutes}`;
};

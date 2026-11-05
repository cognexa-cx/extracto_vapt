/**
 * Tab/column config for the Reports page — mirrors masterDataV2Config.js's
 * shape (one entry per tab, columns drive the table) so the two pages share
 * the exact same look. Each tab maps to a real slice of the same
 * extraction_records / manual_entry_records data the Dashboard already
 * shows (via reportsService -> /history/all), split by direction /
 * entry_type instead of by a separate master table.
 *
 * Each column's `width` is a percentage computed from that column's real
 * content width (typical character count × avg glyph width + the fixed
 * px-4 cell padding), not a round guess — so on a wide screen the leftover
 * space is spread proportionally across every column instead of piling
 * into one. Every tab's columns (plus the trailing Actions column
 * Reports.jsx adds via `actionsWidth`) sum to exactly 100%, used with
 * table-layout:fixed via a <colgroup>.
 */
export const REPORT_TABS = {
  inward: {
    key: "inward",
    label: "Inward",
    direction: "inward",
    entryType: null,
    columns: [
      { key: "invoice_number", label: "Doc / Invoice No", width: "15%" },
      { key: "vendor_name", label: "Vendor", width: "20%" },
      { key: "project_site", label: "Project Site", width: "18%" },
      { key: "vehicle_number", label: "Vehicle No", width: "15%" },
      { key: "invoice_date", label: "Date", type: "date", width: "13%" },
      { key: "approval_status", label: "Status", width: "12%" },
    ],
    actionsWidth: "7%",
    searchPlaceholder: "Vendor, invoice no, vehicle no…",
  },
  outward: {
    key: "outward",
    label: "Outward",
    direction: "outward",
    entryType: null,
    columns: [
      { key: "invoice_number", label: "Doc / Invoice No", width: "15%" },
      { key: "vendor_name", label: "Vendor", width: "20%" },
      { key: "destination_site", label: "Destination", width: "18%" },
      { key: "vehicle_number", label: "Vehicle No", width: "15%" },
      { key: "invoice_date", label: "Date", type: "date", width: "13%" },
      { key: "approval_status", label: "Status", width: "12%" },
    ],
    actionsWidth: "7%",
    searchPlaceholder: "Vendor, invoice no, vehicle no…",
  },
  returnable: {
    key: "returnable",
    label: "Returnable",
    direction: "returnable",
    entryType: null,
    columns: [
      { key: "invoice_number", label: "Doc / Invoice No", width: "15%" },
      { key: "vendor_name", label: "Vendor", width: "22%" },
      { key: "vehicle_number", label: "Vehicle No", width: "15%" },
      { key: "invoice_date", label: "Sent On", type: "date", width: "13%" },
      { key: "return_status", label: "Return Status", type: "returnStatus", width: "15%" },
      { key: "approval_status", label: "Status", width: "13%" },
    ],
    actionsWidth: "7%",
    searchPlaceholder: "Vendor, invoice no, vehicle no…",
  },
  manual: {
    key: "manual",
    label: "Manual Entries",
    direction: null,
    entryType: "manual",
    columns: [
      { key: "invoice_number", label: "Reference", width: "16%" },
      { key: "document_type", label: "Type", width: "18%" },
      { key: "vendor_name", label: "Vendor", width: "25%" },
      { key: "invoice_date", label: "Date", type: "date", width: "16%" },
      { key: "approval_status", label: "Status", width: "16%" },
    ],
    actionsWidth: "9%",
    searchPlaceholder: "Reference, vendor…",
  },
};

export const REPORT_TAB_ORDER = ["inward", "outward", "returnable", "manual"];

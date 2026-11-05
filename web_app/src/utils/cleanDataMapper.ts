/**
 * COMPLETE FIELD MAPPER - Handles Your Exact Database Structure
 *
 * This mapper is specifically designed for your database columns
 * It will clean up ALL the messy field names you're seeing
 */

/**
 * MASTER FIELD MAPPING
 * Maps your exact database columns (with spaces, duplicates) to clean names
 * Left side: What comes from database (lowercase normalized)
 * Right side: Clean display name
 */
const FIELD_MAPPING = {
  // ==================== IDs ====================
  id: "Invoice ID",
  i_d: "Invoice ID", // "I D" with space

  // ==================== CORE INVOICE ====================
  invoice_number: "Invoice Number",
  invoice_no: "Invoice Number", // Duplicate
  invoice_no_duplicate: null, // Skip - obvious duplicate
  invoice_date: "Invoice Date",
  invoice_amount: "Invoice Amount",

  // ==================== TYPE & STATUS ====================
  inward_outward: "Type",
  warehouse: "Warehouse",
  approval_status: "Approval Status",
  accuracy: "Accuracy (%)",

  // ==================== HUMAN INTERVENTION ====================
  human_intervention: "Human Intervention",
  human_investigation: null, // Skip - duplicate of above

  // ==================== COMMENTS & DATES ====================
  comments: "Comments",
  action_date: "Action Date",
  approval_name: "Approved By",

  // ==================== AMOUNTS & PRICING ====================
  basic_price: "Basic Price",
  taxable_amount: "Taxable Amount",
  taxable_value: "Taxable Value",
  tax_rate: "Tax Rate (%)",
  dics: "Discount",

  // ==================== VENDOR INFORMATION ====================
  vendor_name: "Vendor Name",
  vendor_code: "Vendor Code",
  vendor_gstin: "Vendor GSTIN",
  vendor_g_s_t_i_n: "Vendor GSTIN", // Spaced version
  vendor_address: "Vendor Address",

  // ==================== CUSTOMER INFORMATION ====================
  customer_code: "Customer Code",
  customer_gstin: "Customer GSTIN",
  customer_g_s_t_i_n: "Customer GSTIN", // Spaced version
  customer_g_s_t_i_n_bill_too: null, // Skip - typo duplicate
  customer_g_s_t_i_n_ship_to: null, // Skip - covered by ship_to
  consignee_gstin: "Consignee GSTIN",
  consignee_g_s_t_i_n: "Consignee GSTIN", // Spaced version

  // ==================== SHIPPING ====================
  bill_to: "Bill To",
  ship_to: "Ship To",
  state_code_bill_to: "State Code (Bill To)",
  state_code_ship_to: "State Code (Ship To)",
  state_code_bill: null, // Skip - duplicate
  state_code_ship: null, // Skip - duplicate
  state_code: null, // Skip - ambiguous

  // ==================== ITEMS ====================
  item_code_description: "Item Description",
  qty: "Quantity",
  q_t_y: "Quantity", // Spaced version
  uom: "Unit of Measure",
  u_o_m: "Unit of Measure", // Spaced version
  hsc_code: "HSN/SAC Code",
  h_s_c_code: "HSN/SAC Code", // Spaced version

  // ==================== TAX & COMPLIANCE ====================
  gstin: "GSTIN",
  g_s_t_i_n: "GSTIN", // Spaced version
  irn: "IRN",
  i_r_n: "IRN", // Spaced version
  ack_no: "Acknowledgment No",
  a_c_k_no: "Acknowledgment No", // Spaced version
  ack_date: "Acknowledgment Date",
  cin_no: "CIN No",
  c_i_n_no: "CIN No", // Spaced version
  pan_no: "PAN No",

  // ==================== TRANSPORT ====================
  carrier_name_vehicle_no: "Carrier/Vehicle",
  mode_of_transport: "Transport Mode",

  // ==================== BUSINESS INFO (OUTWARD) ====================
  dealer_code: "Dealer Code",
  deler_code: "Dealer Code", // Typo version
  division: "Division",
  commission_rate: "Commission Rate",
  commision_rate: "Commission Rate", // Typo version
  if_code: "IF Code",
  i_f_code: "IF Code", // Spaced version
  range: "Range",
};

/**
 * FIELDS TO EXCLUDE COMPLETELY
 * These will never appear in exports
 */
const EXCLUDED_FIELDS = [
  "created_at",
  "updated_at",
  "deleted_at",
  "created_by",
  "updated_by",
  "is_deleted",
  "is_active",
  "human_investigation", // Duplicate of human_intervention
  "invoice_no_duplicate", // Obvious duplicate
  "customer_g_s_t_i_n_bill_too", // Typo
  "state_code", // Ambiguous
  "state_code_bill", // Covered by state_code_bill_to
  "state_code_ship", // Covered by state_code_ship_to
];

/**
 * TYPE-SPECIFIC FIELDS
 * Some fields should only appear for certain invoice types
 */
const TYPE_SPECIFIC_FIELDS = {
  inward: ["Vendor Name", "Vendor Code", "Vendor GSTIN", "Vendor Address"],
  outward: [
    "Customer Code",
    "Customer GSTIN",
    "Consignee GSTIN",
    "Dealer Code",
    "Division",
    "Commission Rate",
    "IF Code",
    "Range",
  ],
  both: [
    "Invoice ID",
    "Invoice Number",
    "Invoice Date",
    "Invoice Amount",
    "Type",
    "Warehouse",
    "Approval Status",
    "Accuracy (%)",
    "Human Intervention",
    "Comments",
    "Action Date",
    "Approved By",
    "Basic Price",
    "Taxable Amount",
    "Taxable Value",
    "Tax Rate (%)",
    "Discount",
    "Bill To",
    "Ship To",
    "State Code (Bill To)",
    "State Code (Ship To)",
    "Item Description",
    "Quantity",
    "Unit of Measure",
    "HSN/SAC Code",
    "GSTIN",
    "IRN",
    "Acknowledgment No",
    "Acknowledgment Date",
    "CIN No",
    "PAN No",
    "Carrier/Vehicle",
    "Transport Mode",
  ],
};

/**
 * COLUMN DISPLAY ORDER
 * Defines the order columns should appear in exports
 */
const COLUMN_ORDER = [
  // Core Invoice
  "Invoice ID",
  "Invoice Number",
  "Invoice Date",
  "Type",

  // Vendor Info (Inward)
  "Vendor Name",
  "Vendor Code",
  "Vendor GSTIN",
  "Vendor Address",

  // Customer Info (Outward)
  "Customer Code",
  "Customer GSTIN",
  "Consignee GSTIN",

  // Financial
  "Invoice Amount",
  "Basic Price",
  "Taxable Amount",
  "Taxable Value",
  "Tax Rate (%)",
  "Discount",

  // Status
  "Approval Status",
  "Accuracy (%)",
  "Human Intervention",
  "Approved By",
  "Action Date",
  "Comments",

  // Location
  "Warehouse",
  "Bill To",
  "Ship To",
  "State Code (Bill To)",
  "State Code (Ship To)",

  // Items
  "Item Description",
  "Quantity",
  "Unit of Measure",
  "HSN/SAC Code",

  // Business (Outward)
  "Dealer Code",
  "Division",
  "Commission Rate",
  "IF Code",
  "Range",

  // Tax & Compliance
  "GSTIN",
  "IRN",
  "Acknowledgment No",
  "Acknowledgment Date",
  "CIN No",
  "PAN No",

  // Transport
  "Carrier/Vehicle",
  "Transport Mode",
];

/**
 * Normalize database field name to standard format
 * Handles all variations: "Invoice  Number", "Invoice_Number", "INVOICE_NUMBER"
 */
function normalizeFieldName(fieldName) {
  if (!fieldName) return "";

  return (
    fieldName
      .toString()
      .toLowerCase()
      .trim()
      // Replace multiple spaces with single underscore
      .replace(/\s+/g, "_")
      // Remove all non-alphanumeric except underscore
      .replace(/[^\w]/g, "")
      // Replace multiple underscores with single
      .replace(/_+/g, "_")
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, "")
  );
}

/**
 * Detect invoice type from record
 */
function detectInvoiceType(record) {
  // Method 1: Check inward_outward field
  const typeField =
    record.inward_outward || record["Inward outward"] || record.Type;
  if (typeField) {
    const typeValue = String(typeField).toLowerCase();
    if (typeValue.includes("inward")) return "inward";
    if (typeValue.includes("outward")) return "outward";
  }

  // Method 2: Check for type-specific fields
  const outwardIndicators = ["customer_code", "dealer_code", "deler_code"];
  for (const indicator of outwardIndicators) {
    const normalized = normalizeFieldName(indicator);
    if (
      Object.keys(record).some((key) => normalizeFieldName(key) === normalized)
    ) {
      const value =
        record[
          Object.keys(record).find(
            (key) => normalizeFieldName(key) === normalized,
          )
        ];
      if (value !== null && value !== undefined && value !== "") {
        return "outward";
      }
    }
  }

  // Method 3: Check for vendor (default to inward)
  return "inward";
}

/**
 * Format date and time in readable format
 * Returns: "2026-02-10\n10:28 AM" for multi-line display in Excel
 */
function formatDateTime(date) {
  // Get date part (YYYY-MM-DD)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const datePart = `${year}-${month}-${day}`;

  // Get time part (HH:MM AM/PM)
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const timePart = `${hours}:${minutes} ${ampm}`;

  // Return combined format with newline for Excel multi-line display
  return `${datePart}\n${timePart}`;
}

/**
 * Map a single record to clean export format
 */
export function mapRecordForExport(record, invoiceType = null) {
  if (!invoiceType) {
    invoiceType = detectInvoiceType(record);
  }

  const cleanRecord = {};
  const seenFields = new Set();

  // Process each field in the record
  Object.keys(record).forEach((originalKey) => {
    const normalizedKey = normalizeFieldName(originalKey);

    // Skip if already processed
    if (seenFields.has(normalizedKey)) {
      console.log(
        `⚠️ Skipping duplicate field: ${originalKey} (already processed as ${normalizedKey})`,
      );
      return;
    }

    // Skip excluded fields
    if (EXCLUDED_FIELDS.includes(normalizedKey)) {
      console.log(`⚠️ Excluding field: ${originalKey}`);
      return;
    }

    // Get mapped field name
    const mappedName = FIELD_MAPPING[normalizedKey];

    // Skip if mapping says to exclude (null)
    if (mappedName === null) {
      console.log(`⚠️ Skipping mapped-to-null field: ${originalKey}`);
      return;
    }

    // Skip if no mapping found (unknown field)
    if (!mappedName) {
      console.log(`⚠️ Unknown field (no mapping): ${originalKey}`);
      return;
    }

    // Check if field is relevant for this invoice type
    const isTypeRelevant =
      TYPE_SPECIFIC_FIELDS.both.includes(mappedName) ||
      TYPE_SPECIFIC_FIELDS[invoiceType].includes(mappedName);

    if (!isTypeRelevant) {
      console.log(`⚠️ Field not relevant for ${invoiceType}: ${mappedName}`);
      return;
    }

    // Add to clean record
    cleanRecord[mappedName] = record[originalKey];
    seenFields.add(normalizedKey);
  });

  return cleanRecord;
}

/**
 * Map array of records for export
 */
export function mapDataForExport(records) {
  if (!records || !Array.isArray(records) || records.length === 0) {
    console.warn("⚠️ No records to map for export");
    return [];
  }

  console.log(`\n📊 Starting export mapping for ${records.length} records...`);
  console.log(
    `📋 Sample raw fields from first record:`,
    Object.keys(records[0]).slice(0, 10),
  );

  // Detect types
  const types = records.map((r) => detectInvoiceType(r));
  const uniqueTypes = [...new Set(types)];
  const isMixedType = uniqueTypes.length > 1;

  console.log(`📋 Invoice types found: ${uniqueTypes.join(", ")}`);
  if (isMixedType) {
    console.log(`⚠️ Mixed export detected - will include all relevant fields`);
  }

  // Map each record
  const mappedRecords = records.map((record, index) => {
    return mapRecordForExport(record, types[index]);
  });

  // Get all unique column names
  const allColumns = new Set<string>();
  mappedRecords.forEach((record) => {
    Object.keys(record).forEach((key) => allColumns.add(key));
  });

  console.log(`✅ Mapped to ${allColumns.size} unique, clean columns`);
  console.log(`📋 Columns:`, Array.from(allColumns).join(", "));

  // Sort records by column order
  const sortedRecords = mappedRecords.map((record) => {
    const sorted = {};

    // Add columns in defined order
    COLUMN_ORDER.forEach((col) => {
      if (record.hasOwnProperty(col)) {
        sorted[col] = record[col];
      }
    });

    // Add any remaining columns not in order (shouldn't happen)
    Object.keys(record).forEach((col) => {
      if (!sorted.hasOwnProperty(col)) {
        sorted[col] = record[col];
      }
    });

    return sorted;
  });

  // For mixed exports, ensure all records have all columns
  if (isMixedType) {
    return sortedRecords.map((record) => {
      const normalized: Record<string, any> = {};
      allColumns.forEach((col) => {
        normalized[col] = record.hasOwnProperty(col) ? record[col] : null;
      });
      return normalized;
    });
  }

  return sortedRecords;
}

/**
 * Get priority columns for PDF export
 */
export function getPriorityColumnsForPDF(records) {
  if (!records || records.length === 0) return [];

  const invoiceType = detectInvoiceType(records[0]);

  const priorityColumns =
    invoiceType === "outward"
      ? [
          "Invoice ID",
          "Invoice Number",
          "Customer Code",
          "Invoice Date",
          "Invoice Amount",
          "Approval Status",
          "Type",
          "Warehouse",
          "Accuracy (%)",
          "Approved By",
        ]
      : [
          "Invoice ID",
          "Invoice Number",
          "Vendor Name",
          "Invoice Date",
          "Invoice Amount",
          "Approval Status",
          "Type",
          "Warehouse",
          "Accuracy (%)",
          "Approved By",
        ];

  return records.map((record) => {
    const priorityRecord = {};
    priorityColumns.forEach((col) => {
      if (record.hasOwnProperty(col)) {
        priorityRecord[col] = record[col];
      }
    });
    return priorityRecord;
  });
}

/**
 * Format value for export
 */
export function formatValueForExport(value, columnName) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (columnName.toLowerCase().includes("date")) {
    if (value instanceof Date) {
      return formatDateTime(value);
    }
    if (typeof value === "string") {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return formatDateTime(date);
      }
    }
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return value;
  }

  return String(value).trim();
}

/**
 * Diagnostic function - shows what will be mapped
 */
export function diagnoseFields(record) {
  console.log("\n🔍 FIELD DIAGNOSIS");
  console.log("==================");

  Object.keys(record).forEach((key) => {
    const normalized = normalizeFieldName(key);
    const mapped = FIELD_MAPPING[normalized];
    const excluded = EXCLUDED_FIELDS.includes(normalized);

    console.log(`\nRaw: "${key}"`);
    console.log(`  Normalized: "${normalized}"`);
    console.log(`  Mapped to: "${mapped || "NO MAPPING"}"`);
    console.log(`  Excluded: ${excluded}`);
    console.log(
      `  Status: ${excluded ? "❌ SKIP" : mapped ? "✅ INCLUDE" : "⚠️ UNKNOWN"}`,
    );
  });
}

// Legacy compatibility
export function mapRawDataForExport(data) {
  console.log(
    "📊 Using comprehensive field mapper with exact database column support...",
  );
  return mapDataForExport(data);
}

// Export all
export default {
  mapRecordForExport,
  mapDataForExport,
  getPriorityColumnsForPDF,
  formatValueForExport,
  formatDateTime,
  mapRawDataForExport,
  diagnoseFields,
  detectInvoiceType,
  FIELD_MAPPING,
  COLUMN_ORDER,
};

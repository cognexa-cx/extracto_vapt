// ==========================================
// FILE: src/utils/masterDataHelpers.js
// ==========================================

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Validate GSTIN format
 */
export const validateGSTIN = (gstin) => {
  const gstinRegex =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

/**
 * Validate PAN format
 */
export const validatePAN = (pan) => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
};

/**
 * Export data to CSV
 */
export const exportToCSV = (data, filename = "master_data.csv") => {
  const headers = [
    "Sr.No.",
    "Vendor Name",
    "Unique ID",
    "GSTIN Number",
    "PAN Number",
    "Invoice Date",
    "Invoice History",
  ];

  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      [
        row.srNo,
        row.vendorName,
        row.uniqueId,
        row.gstinNumber,
        row.panNumber,
        row.invoiceDate,
        row.invoiceHistory,
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

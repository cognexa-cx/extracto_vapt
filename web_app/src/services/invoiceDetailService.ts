// ============================================
// FILE: src/services/invoiceDetailService.js (UPDATED WITH APPROVER INFO)
// ============================================

// ✅ DYNAMIC - Reads from .env file
const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

console.log("🔗 Invoice Detail Service using backend:", API_BASE_URL);

/**
 * Invoice Detail Service
 * Handles all invoice detail related API calls with real backend
 */
const invoiceDetailService = {
  /**
   * Get invoice details by ID (filename)
   * @param {string} invoiceId - Invoice ID/filename
   * @returns {Promise} Invoice details
   */
  getInvoiceDetail: async (invoiceId) => {
    try {
      console.log(`📥 Fetching invoice detail: ${invoiceId}`);
      const url = `${API_BASE_URL}/invoice/${invoiceId}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Raw backend response:", JSON.stringify(result, null, 2));

      // ✅ Extract the first file's data (backend returns files array)
      const fileData = result.files && result.files[0];

      if (!fileData) {
        console.error("❌ No file data in response");
        throw new Error("No file data found");
      }

      // ✅ CRITICAL: Extract accuracy from files[0].accuracy ONLY
      const backendAccuracy = fileData.accuracy;

      console.log(
        "🎯 Extracted accuracy from files[0].accuracy:",
        backendAccuracy,
      );
      console.log("🎯 Type of accuracy:", typeof backendAccuracy);

      const transformed = {
        id: invoiceId,
        fileName: invoiceId,
        uploadDate: new Date().toISOString(),
        status: fileData?.data?.approval_status || result.status || "pending",
        ocrData: fileData?.data || result.data || result,
        pdfUrl: `${API_BASE_URL}/files/${invoiceId}`,
        rawData: result,
        // ✅ CRITICAL: Use ONLY files[0].accuracy (nothing else)
        accuracy: backendAccuracy,
      };

      console.log("✅ Transformed object accuracy:", transformed.accuracy);

      return transformed;
    } catch (error) {
      console.error("❌ Get invoice detail error:", error);
      throw error;
    }
  },

  /**
   * Update OCR data
   * @param {string} invoiceId - Invoice ID/filename
   * @param {Object} ocrData - Updated OCR data
   * @returns {Promise} Update response
   */
  updateOCRData: async (invoiceId, ocrData) => {
    try {
      console.log(`🔄 Updating OCR data for: ${invoiceId}`);
      const url = `${API_BASE_URL}/invoice/${invoiceId}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: ocrData }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ OCR data updated:", result);

      return {
        id: invoiceId,
        fileName: invoiceId,
        uploadDate: new Date().toISOString(),
        status: "pending",
        ocrData: result.data || ocrData,
      };
    } catch (error) {
      console.error("❌ Update OCR data error:", error);
      throw error;
    }
  },

  /**
   * Approve invoice
   * @param {string} invoiceId - Invoice ID/filename
   * @param {Object} data - Approval data (validations, comments, approver info)
   * @returns {Promise} Approval response
   */
  approveInvoice: async (invoiceId, data: any = {}) => {
    try {
      console.log(`✅ Approving invoice: ${invoiceId}`);
      const url = `${API_BASE_URL}/invoice/${invoiceId}/approve`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          validations: data.validations || [],
          comments: data.comments || "",
          human_intervention: data.human_intervention || false,
          approval_name: data.approval_name || "",
          action_date: data.action_date || new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Invoice approved:", result);
      return result;
    } catch (error) {
      console.error("❌ Approve invoice error:", error);
      throw error;
    }
  },

  /**
   * Reject invoice
   * @param {string} invoiceId - Invoice ID/filename
   * @param {string} reason - Rejection reason
   * @param {string} comments - Additional comments
   * @param {string} approverName - Name of person rejecting
   * @returns {Promise} Rejection response
   */
  rejectInvoice: async (
    invoiceId,
    reason,
    comments = "",
    approverName = "",
  ) => {
    try {
      console.log(`❌ Rejecting invoice: ${invoiceId}`);
      const url = `${API_BASE_URL}/invoice/${invoiceId}/reject`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: reason || "User rejected",
          comments: comments,
          approval_name: approverName,
          action_date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Invoice rejected:", result);
      return result;
    } catch (error) {
      console.error("❌ Reject invoice error:", error);
      throw error;
    }
  },

  /**
   * Get invoice PDF/Image URL
   * @param {string} invoiceId - Invoice ID/filename
   * @returns {string} PDF/Image URL
   */
  getInvoicePDFUrl: (invoiceId) => {
    // Remove extension if present and add appropriate extension
    const baseFileName = invoiceId.replace(/\.[^/.]+$/, "");
    // Try PNG first, your backend might serve converted images
    return `${API_BASE_URL}/files/${baseFileName}.png`;
  },

  /**
   * Get original uploaded file URL
   * @param {string} invoiceId - Invoice ID/filename
   * @returns {string} File URL
   */
  getFileUrl: (invoiceId) => {
    return `${API_BASE_URL}/files/${invoiceId}`;
  },
};

export default invoiceDetailService;

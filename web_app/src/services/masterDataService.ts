// ============================================
// FILE: src/services/masterDataService.js
// ============================================

// Get backend base URL from environment
const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

/**
 * Validate and normalize invoice data before sending to backend
 * @param {Object} data - Invoice data
 * @returns {Object} - Normalized data
 */
const validateAndNormalizeData = (data) => {
  const normalized = { ...data };

  // Normalize inward_outward field (must be "Inward" or "Outward")
  if (normalized.inward_outward) {
    normalized.inward_outward =
      normalized.inward_outward.charAt(0).toUpperCase() +
      normalized.inward_outward.slice(1).toLowerCase();

    if (!["Inward", "Outward"].includes(normalized.inward_outward)) {
      console.warn(
        `⚠️ Invalid inward_outward value: "${normalized.inward_outward}". Setting to "Inward".`,
      );
      normalized.inward_outward = "Inward";
    }
  }

  // Normalize approval_status field (must be "Approve", "Reject", or "Pending")
  if (normalized.approval_status) {
    normalized.approval_status =
      normalized.approval_status.charAt(0).toUpperCase() +
      normalized.approval_status.slice(1).toLowerCase();

    if (
      !["Approve", "Reject", "Pending"].includes(normalized.approval_status)
    ) {
      console.warn(
        `⚠️ Invalid approval_status value: "${normalized.approval_status}". Setting to "Pending".`,
      );
      normalized.approval_status = "Pending";
    }
  }

  // Normalize status field (if exists)
  if (normalized.status) {
    normalized.status =
      normalized.status.charAt(0).toUpperCase() +
      normalized.status.slice(1).toLowerCase();
  }

  return normalized;
};

/**
 * Handle fetch errors with detailed messages
 * @param {Error} error - The error object
 * @param {string} operation - The operation being performed
 * @throws {Error} - Enhanced error with helpful message
 */
const handleFetchError = (error, operation) => {
  console.error(`❌ Error in ${operation}:`, error);

  // Network/CORS errors
  if (error.message === "Failed to fetch" || error.name === "TypeError") {
    throw new Error(
      `Network Error: Cannot connect to backend at ${BACKEND_BASE_URL}. ` +
        `Please check:\n` +
        `1. Backend server is running\n` +
        `2. CORS is configured on backend\n` +
        `3. Backend URL is correct in .env file`,
    );
  }

  // Re-throw the error with the original message
  throw error;
};

/**
 * Master Data Service - Handles all master data operations
 */
const masterDataService = {
  /**
   * Save approved invoice to master database
   * @param {Object} invoiceData - Invoice data to save
   * @returns {Promise} Save response
   */
  saveApprovedInvoice: async (invoiceData) => {
    try {
      const url = `${BACKEND_BASE_URL}/master`;

      // Validate and normalize data before sending
      const normalizedData = validateAndNormalizeData(invoiceData);

      // ✅ FIX: Ensure invoice_type is present.
      // Default to 'inward' if not provided, or check from 'status' if available.
      if (!normalizedData.invoice_type) {
        if (
          normalizedData.status &&
          normalizedData.status.toLowerCase().includes("outward")
        ) {
          normalizedData.invoice_type = "outward";
        } else {
          normalizedData.invoice_type = "inward";
        }
        console.warn(
          `⚠️ invoice_type missing, defaulting to: ${normalizedData.invoice_type}`,
        );
      }

      console.log("💾 Saving invoice to:", url);
      console.log("📤 Data being sent:", normalizedData);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizedData),
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Backend error response:", errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        // Provide helpful error messages based on status code
        if (response.status === 500) {
          throw new Error(
            `Server Error: ${errorData.message || errorData.error || response.statusText}\n` +
              `Please check backend logs for details.`,
          );
        } else if (response.status === 400) {
          throw new Error(
            `Validation Error: ${errorData.message || errorData.error || response.statusText}`,
          );
        } else if (response.status === 404) {
          throw new Error(`Endpoint not found: ${url}`);
        } else {
          throw new Error(
            errorData.message ||
              errorData.error ||
              `Failed to save invoice: ${response.statusText}`,
          );
        }
      }

      const result = await response.json();
      console.log("✅ Invoice saved successfully:", result);
      return result;
    } catch (error) {
      handleFetchError(error, "saveApprovedInvoice");
    }
  },

  /**
   * Get all master data
   */
  getAll: async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/master`);

      if (!response.ok) {
        throw new Error("Failed to fetch master data");
      }

      return await response.json();
    } catch (error) {
      handleFetchError(error, "getAll");
    }
  },

  /**
   * Get invoice by ID from master database
   * @param {number} id - Invoice ID (sr_no)
   * @returns {Promise} Invoice data
   */
  getById: async (id) => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/master/${id}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch invoice: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      handleFetchError(error, "getById");
    }
  },

  /**
   * Update invoice in master database
   * @param {number} id - Invoice ID (sr_no)
   * @param {Object} data - Updated data
   * @returns {Promise} Update response
   */
  update: async (id, data) => {
    try {
      // Validate and normalize data before sending
      const normalizedData = validateAndNormalizeData(data);

      console.log("🔄 Updating record:", id);
      console.log("📤 Normalized data:", normalizedData);

      const response = await fetch(`${BACKEND_BASE_URL}/master/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(normalizedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        throw new Error(
          errorData.message ||
            errorData.error ||
            `Failed to update invoice: ${response.statusText}`,
        );
      }

      const result = await response.json();
      console.log("✅ Record updated successfully:", result);
      return result;
    } catch (error) {
      handleFetchError(error, "update");
    }
  },

  /**
   * Delete invoice from master database
   * @param {number} id - Invoice ID (sr_no)
   * @returns {Promise} Delete response
   */
  delete: async (id) => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/master/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete invoice: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      handleFetchError(error, "delete");
    }
  },

  /**
   * Search records
   */
  search: async (query) => {
    try {
      const response = await fetch(
        `${BACKEND_BASE_URL}/master/search?q=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      return await response.json();
    } catch (error) {
      handleFetchError(error, "search");
    }
  },

  /**
   * Block a vendor
   */
  blockVendor: async (vendorId, blockData) => {
    try {
      const response = await fetch(
        `${BACKEND_BASE_URL}/master/${vendorId}/block`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(blockData),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to block vendor");
      }

      return await response.json();
    } catch (error) {
      console.error("Error in blockVendor:", error);

      // For development: simulate success
      console.log("Mock: Vendor blocked successfully");
      return {
        success: true,
        message: "Vendor blocked successfully (mock)",
        data: { vendorId, ...blockData },
      };
    }
  },

  /**
   * Unblock a vendor
   */
  unblockVendor: async (vendorId) => {
    try {
      const response = await fetch(
        `${BACKEND_BASE_URL}/master/${vendorId}/unblock`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to unblock vendor");
      }

      return await response.json();
    } catch (error) {
      console.error("Error in unblockVendor:", error);

      // For development: simulate success
      console.log("Mock: Vendor unblocked successfully");
      return {
        success: true,
        message: "Vendor unblocked successfully (mock)",
      };
    }
  },

  /**
   * Get blocked vendors list
   */
  getBlockedVendors: async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/master/blocked`);

      if (!response.ok) {
        throw new Error("Failed to fetch blocked vendors");
      }

      return await response.json();
    } catch (error) {
      handleFetchError(error, "getBlockedVendors");
    }
  },
};

export default masterDataService;

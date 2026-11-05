// ==========================================
// FILE: src/services/blockedVendorsService.js
// ==========================================
import api from "./api";

/**
 * Blocked Vendors Service
 * API calls for blocked vendors management
 */
const blockedVendorsService = {
  /**
   * Get all blocked vendors
   */
  getAll: async () => {
    try {
      const response = await api.get("/blocked-vendors");
      return response.data;
    } catch (error) {
      console.error("Error in getAll:", error);

      // Mock data for development
      return [
        {
          id: 1,
          srNo: "01",
          vendorName: "Vijaykumar Rane",
          uniqueId: "Y345HJK48759",
          gstinNumber: "GRN2F-2026-376429",
          panNumber: "JNMPK35B78",
          blockedDate: "2026-01-10",
          blockedReason: "Poor Quality",
          blockedBy: "Admin",
        },
        {
          id: 2,
          srNo: "02",
          vendorName: "Rajesh Kumar",
          uniqueId: "X678ABC12345",
          gstinNumber: "DEL3G-2025-245678",
          panNumber: "ABCDE1234F",
          blockedDate: "2026-01-08",
          blockedReason: "Delayed Deliveries",
          blockedBy: "Admin",
        },
        {
          id: 3,
          srNo: "03",
          vendorName: "Priya Sharma",
          uniqueId: "Z890XYZ67890",
          gstinNumber: "MUM4H-2025-987654",
          panNumber: "PQRST5678G",
          blockedDate: "2026-01-05",
          blockedReason: "Non-Compliance",
          blockedBy: "Admin",
        },
      ];
    }
  },

  /**
   * Get single blocked vendor by ID
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/blocked-vendors/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error in getById:", error);
      throw error;
    }
  },

  /**
   * Block a vendor
   */
  block: async (vendorId, blockData) => {
    try {
      const response = await api.post(`/vendors/${vendorId}/block`, blockData);
      return response.data;
    } catch (error) {
      console.error("Error in block:", error);
      throw error;
    }
  },

  /**
   * Unblock a vendor
   */
  unblock: async (vendorId) => {
    try {
      const response = await api.post(`/vendors/${vendorId}/unblock`);
      return response.data;
    } catch (error) {
      console.error("Error in unblock:", error);

      // For development, simulate success
      return { success: true, message: "Vendor unblocked successfully" };
    }
  },

  /**
   * Search blocked vendors
   */
  search: async (query) => {
    try {
      const response = await api.get(`/blocked-vendors/search?q=${query}`);
      return response.data;
    } catch (error) {
      console.error("Error in search:", error);
      throw error;
    }
  },

  /**
   * Get blocked vendor history
   */
  getHistory: async (vendorId) => {
    try {
      const response = await api.get(`/blocked-vendors/${vendorId}/history`);
      return response.data;
    } catch (error) {
      console.error("Error in getHistory:", error);
      throw error;
    }
  },
};

export default blockedVendorsService;

// ==========================================
// FILE: src/hooks/useBlockedVendors.js
// ==========================================
import { useState, useEffect, useMemo } from "react";
import blockedVendorsService from "../services/blockedVendorsService";

/**
 * Custom hook for managing blocked vendors
 * Handles fetching, searching, and unblocking operations
 */
const useBlockedVendors = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch blocked vendors on mount
  useEffect(() => {
    fetchBlockedVendors();
  }, []);

  /**
   * Fetch all blocked vendors
   */
  const fetchBlockedVendors = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call API to get blocked vendors
      const response = await blockedVendorsService.getAll();
      setData(response);
    } catch (err) {
      setError(err.message || "Failed to fetch blocked vendors");
      console.error("Error fetching blocked vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter data based on search query
   */
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.trim().toLowerCase();
    return data.filter((vendor) =>
      [
        vendor.vendorName, vendor.uniqueId, vendor.gstinNumber, vendor.panNumber,
        vendor.blockReason, vendor.reason, vendor.email, vendor.phone,
      ].some((v) => v != null && String(v).toLowerCase().includes(query)),
    );
  }, [data, searchQuery]);

  /**
   * Handle unblock vendor
   */
  const handleUnblock = async (vendorId) => {
    try {
      // Call API to unblock vendor
      await blockedVendorsService.unblock(vendorId);

      // Remove vendor from local state
      setData((prevData) => prevData.filter((v) => v.id !== vendorId));

      // Show success message (you can use toast here)
      console.log("Vendor unblocked successfully");
    } catch (err) {
      console.error("Error unblocking vendor:", err);
      setError(err.message || "Failed to unblock vendor");
      throw err;
    }
  };

  return {
    data: filteredData,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    handleUnblock,
    refresh: fetchBlockedVendors,
  };
};

export default useBlockedVendors;

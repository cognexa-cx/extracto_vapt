// ==========================================
// FILE: src/hooks/useMasterData.js
// ==========================================
import { useState, useEffect, useMemo } from "react";
import masterDataService from "../services/masterDataService";

/**
 * Custom hook for managing master data
 * Handles fetching, filtering, and CRUD operations
 */
const useMasterData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("month");

  // Fetch data on mount
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Replace with actual API call
      // const response = await masterDataService.getAll();

      // Mock data for demonstration
      const mockData = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        srNo: "01",
        vendorName: "Vijaykumar Rane",
        uniqueId: "Y345HJK48759",
        gstinNumber: "GRN2F-2026-376429",
        panNumber: "JNMPK35B78",
        invoiceDate: "08-01-2026",
        invoiceHistory: "08-01-2026",
      }));

      setData(mockData);
    } catch (err) {
      setError(err.message || "Failed to fetch master data");
      console.error("Error fetching master data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search and month
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.uniqueId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.gstinNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.panNumber.toLowerCase().includes(searchQuery.toLowerCase());

      // Add month filtering logic here if needed
      const matchesMonth = selectedMonth === "month" || true;

      return matchesSearch && matchesMonth;
    });
  }, [data, searchQuery, selectedMonth]);

  const handleEdit = (id) => {
    console.log("Edit row:", id);
    // Implement edit logic or navigate to edit page
  };

  const handleDelete = async (id) => {
    console.log("Delete row:", id);
    try {
      if (window.confirm("Are you sure you want to delete this record?")) {
        // await masterDataService.delete(id);
        setData((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Error deleting record:", err);
    }
  };

  const handleView = (id) => {
    console.log("View row:", id);
    // Implement view logic or navigate to detail page
  };

  return {
    data: filteredData,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedMonth,
    setSelectedMonth,
    handleEdit,
    handleDelete,
    handleView,
    refresh: fetchMasterData,
  };
};

export default useMasterData;

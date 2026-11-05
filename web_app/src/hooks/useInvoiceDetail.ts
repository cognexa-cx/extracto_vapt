// ============================================
// FILE: src/hooks/useInvoiceDetail.js
// ============================================
import { useState, useEffect, useCallback } from "react";
import invoiceDetailService from "../services/invoiceDetailService";
import { useAppContext } from "../context/AppContext";

/**
 * Custom hook for invoice detail functionality
 */
const useInvoiceDetail = (invoiceId) => {
  const { showNotification } = useAppContext();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  /**
   * Fetch invoice details
   */
  const fetchInvoiceDetail = useCallback(async () => {
    if (!invoiceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await invoiceDetailService.getInvoiceDetail(invoiceId);
      setInvoice(data);
    } catch (err) {
      console.error("Fetch invoice detail error:", err);
      setError(err.response?.data?.message || "Failed to load invoice details");
      showNotification("Failed to load invoice details", "error");
    } finally {
      setLoading(false);
    }
  }, [invoiceId, showNotification]);

  /**
   * Update OCR data
   */
  const updateOCRData = useCallback(
    async (updatedData) => {
      try {
        setSaving(true);
        const response = await invoiceDetailService.updateOCRData(
          invoiceId,
          updatedData,
        );
        setInvoice(response);
        showNotification("OCR data updated successfully", "success");
        return response;
      } catch (err) {
        console.error("Update OCR data error:", err);
        showNotification("Failed to update OCR data", "error");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [invoiceId, showNotification],
  );

  /**
   * Approve invoice
   */
  const approveInvoice = useCallback(async () => {
    try {
      setSaving(true);
      await invoiceDetailService.approveInvoice(invoiceId);
      showNotification("Invoice approved successfully", "success");
      await fetchInvoiceDetail();
    } catch (err) {
      console.error("Approve invoice error:", err);
      showNotification("Failed to approve invoice", "error");
      throw err;
    } finally {
      setSaving(false);
    }
  }, [invoiceId, showNotification, fetchInvoiceDetail]);

  /**
   * Reject invoice
   */
  const rejectInvoice = useCallback(
    async (reason) => {
      try {
        setSaving(true);
        await invoiceDetailService.rejectInvoice(invoiceId, reason);
        showNotification("Invoice rejected", "success");
        await fetchInvoiceDetail();
      } catch (err) {
        console.error("Reject invoice error:", err);
        showNotification("Failed to reject invoice", "error");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [invoiceId, showNotification, fetchInvoiceDetail],
  );

  // Fetch on mount
  useEffect(() => {
    fetchInvoiceDetail();
  }, [fetchInvoiceDetail]);

  return {
    invoice,
    loading,
    error,
    saving,
    updateOCRData,
    approveInvoice,
    rejectInvoice,
    refetch: fetchInvoiceDetail,
  };
};

export default useInvoiceDetail;

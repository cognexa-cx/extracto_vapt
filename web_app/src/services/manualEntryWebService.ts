/**
 * Web dashboard service for manual entry records.
 * Mirrors the tab's manualEntryService but uses the shared axios api instance
 * so auth headers (X-User-Name, X-User-Id) are sent automatically.
 */
import api from "./api";

// ─── Map a raw manual record row to display format ───────────────────────────
export const mapManualRecord = (r) => ({
  id: r.id,
  ID: r.id,
  entry_type: "manual",
  fields: r.fields || [],           // [{key, value}, ...]
  image_url: r.image_url || null,   // Azure Blob public URL
  blob_prefix: r.blob_prefix || null,
  created_at: r.created_at || null,
  updated_at: r.updated_at || null,

  // Dashboard display helpers (computed from fields array)
  vendor_name: _fieldValue(r.fields, ["vendor", "supplier", "company", "party", "from"]) || "-",
  document_number: _fieldValue(r.fields, ["invoice no", "invoice number", "challan no", "gate pass no", "doc no", "document no", "receipt no"]) || r.id?.slice(0, 8) || "-",
  document_type: _fieldValue(r.fields, ["document type", "doc type", "type"]) || "Manual Entry",
  invoice_amount: _fieldValue(r.fields, ["amount", "total", "grand total", "net amount", "value"]) || "-",
  inward_outward: _fieldValue(r.fields, ["direction", "inward/outward", "type"]) || "Manual",
  approval_status: "Approve",
});

// ─── Case-insensitive partial key match across the fields array ───────────────
function _fieldValue(fields, possibleKeys) {
  if (!Array.isArray(fields)) return null;
  for (const pk of possibleKeys) {
    const found = fields.find(
      (f) => f.key?.toLowerCase().includes(pk.toLowerCase())
    );
    if (found?.value) return found.value;
  }
  return null;
}

// ─── Service calls ────────────────────────────────────────────────────────────

class ManualEntryWebService {
  /** Fetch paginated manual records for the dashboard */
  async getRecords({ limit = 50, offset = 0 }: any = {}) {
    try {
      const response = await api.get("/manual/history", {
        params: { limit, offset },
      });
      const records = (response.data.records || []).map(mapManualRecord);
      return { data: records, total: records.length };
    } catch (error) {
      console.error("❌ Error fetching manual records:", error);
      return { data: [], total: 0 };
    }
  }

  /** Get a single manual record by ID */
  async getRecordById(id) {
    try {
      const response = await api.get(`/manual/history/${id}`);
      return mapManualRecord(response.data);
    } catch (error) {
      console.error("❌ Error fetching manual record:", error);
      throw error;
    }
  }

  /** Delete a manual record (also removes Azure Blob image) */
  async deleteRecord(id) {
    try {
      const response = await api.delete(`/manual/history/${id}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error deleting manual record:", error);
      throw error;
    }
  }
}

export default new ManualEntryWebService();

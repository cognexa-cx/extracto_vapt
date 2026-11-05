import api from "./api";

// ── Helper: case-insensitive partial match across manual fields array ────────
const resolveFromManualFields = (fields, possibleKeys) => {
  if (!Array.isArray(fields)) return null;
  for (const pk of possibleKeys) {
    const found = fields.find(
      (f) => f.key?.toLowerCase().includes(pk.toLowerCase())
    );
    if (found?.value) return found.value.trim();
  }
  return null;
};

// ── Helper: reject printed form-label artifacts the LLM sometimes echoes
// back as if they were the filled-in value (e.g. a blank "M/s. ______" line
// on a handwritten gate pass extracted as name: "M/s." because nothing was
// actually written there). Any candidate matching one of these, once
// trimmed/lowercased, is treated the same as if the field were empty — the
// caller should fall through to the next candidate, not display it.
const JUNK_VALUES = new Set([
  "m/s", "m/s.", "m / s", "of m/s", "of m/s.",
  "shri", "please allow", "please allow shri",
  "name", "signature", "to", "from", "the security",
  "n/a", "na", "nil", "none", "null", "-", "--", "",
]);

const isJunkValue = (value) => {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase().replace(/\.+$/, "");
  return JUNK_VALUES.has(normalized) || JUNK_VALUES.has(value.trim().toLowerCase());
};

// Pick the first candidate that's a real (non-empty, non-label-artifact) string.
const firstValid = (...candidates) =>
  candidates.find((v) => typeof v === "string" && v.trim() && !isJunkValue(v));

// ── Helper: pull a company/vendor name from any structure Groq might return ─
const resolveSingleVendorName = (extracted_data, manual_fields) => {
  if (manual_fields) {
    const manualVal = resolveFromManualFields(manual_fields, [
      "vendor", "supplier", "company", "party", "from", "issuer"
    ]);
    if (manualVal && !isJunkValue(manualVal)) return manualVal;
  }
  if (!extracted_data) return "-";

  // extracted_data.issuer can itself be a nested object (name/address/gstin/...)
  // rather than a plain string, depending on how the LLM structured this
  // document — never return it directly as a fallback value below.
  const issuer = extracted_data.issuer_details || extracted_data.seller || extracted_data.from_party ||
    (typeof extracted_data.issuer === "object" ? extracted_data.issuer : null) || {};
  const meta = extracted_data.document_metadata || {};
  const src = extracted_data.source_destination || {};

  return (
    firstValid(
      // Flat top-level (new universal prompt outputs)
      extracted_data.supplier_name,
      extracted_data.vendor_name,
      extracted_data.company_name,
      extracted_data.party_name,
      extracted_data.business_name,
      extracted_data.organization_name,
      extracted_data.organisation_name,
      extracted_data.entity_name,
      extracted_data.firm_name,
      extracted_data.name,
      extracted_data.brand_name,
      extracted_data.document_title,
      extracted_data.business_title,
      extracted_data.park_name,
      extracted_data.resort_name,
      extracted_data.hotel_name,
      typeof extracted_data.issuer === "string" ? extracted_data.issuer : null,
      // Nested issuer block (old or new)
      issuer.company_name_printed_on_the_letterhead,
      issuer.company_name,
      issuer.name,
      issuer.vendor_name,
      issuer.party_name,
      issuer.issued_by,
      issuer.issued_to,
      issuer.supplier_name,
      issuer.consignor,
      issuer.consignee,
      issuer.firm_name,
      issuer.organisation_name,
      issuer.organization_name,
      meta.issuer,
      meta.vendor_name,
      meta.company_name,
      meta.party_name,
      meta.supplier_name,
      src.source_site,
    ) || "-"
  );
};

// Sections that hold one extra party each ("Company 1", "company_2", "vendor2"...)
const NUMBERED_PARTY_KEY = /^(company|vendor|supplier|party|firm|issuer|seller)[\s_-]*\d+$/i;
// "company_details", "business_profile", "organization_info" ... hold the party's own fields
const DETAILS_SECTION_KEY =
  /^(company|business|organi[sz]ation|entity|vendor|supplier|firm|party)[\s_-]*(details?|info|information|profile|data)$/i;
const PARTY_LIST_KEY =
  /^(companies|vendors|suppliers|parties|firms|entities|entries|documents|organizations|organisations|businesses|members|listings|sections|records|items_list|profiles)$/i;
const PARTY_NAME_FIELDS = [
  "name", "company_name", "vendor_name", "supplier_name", "party_name",
  "firm_name", "company_name_printed_on_the_letterhead",
  "business_name", "organization_name", "organisation_name", "entity_name",
  "company", "brand_name", "document_title", "business_title", "park_name", "resort_name", "hotel_name",
];

const nameFromPartyObject = (obj) => {
  if (typeof obj === "string") return firstValid(obj);
  if (!obj || typeof obj !== "object") return undefined;
  return firstValid(...PARTY_NAME_FIELDS.map((k) => obj[k]));
};

// Every vendor/company on a record, one per line -- a page can hold more than one
// vendor (extra "Company N" sections, a companies[] list, or the extractor's
// additional_documents), and the Vendor Name column must show all of them
// exactly as read instead of just the first.
const resolveVendorName = (extracted_data, manual_fields) => {
  const names = [];
  const add = (n) => {
    if (typeof n === "string" && n.trim() && n.trim() !== "-" && !names.includes(n.trim())) {
      names.push(n.trim());
    }
  };

  add(resolveSingleVendorName(extracted_data, manual_fields));

  if (extracted_data && typeof extracted_data === "object") {
    Object.entries(extracted_data).forEach(([key, value]) => {
      if (DETAILS_SECTION_KEY.test(key) && value && typeof value === "object" && !Array.isArray(value)) {
        add(nameFromPartyObject(value));
      } else if (NUMBERED_PARTY_KEY.test(key)) {
        add(nameFromPartyObject(value));
      } else if (PARTY_LIST_KEY.test(key) && Array.isArray(value)) {
        value.forEach((v) => add(nameFromPartyObject(v)));
      } else if (key === "additional_documents" && Array.isArray(value)) {
        value.forEach((d) => add(resolveSingleVendorName(d, null)));
      }
    });
  }

  // Catch-all for a name field this code has never seen: any top-level (or
  // one level down, incl. list rows) string key like "<company|business|
  // organization|entity|firm|vendor|supplier|party>*name" -- only used when
  // nothing above matched, so it can't override a known field.
  if (!names.length && extracted_data && typeof extracted_data === "object") {
    const LOOSE_NAME_KEY =
      /^(name|[a-z_ ]*(company|business|organi[sz]ation|entity|firm|vendor|supplier|party|brand)[a-z_ ]*name)$/i;
    const scan = (obj) => {
      if (!obj || typeof obj !== "object") return;
      Object.entries(obj).forEach(([k, v]) => {
        if (typeof v === "string" && LOOSE_NAME_KEY.test(k)) add(firstValid(v));
      });
    };
    scan(extracted_data);
    const PERSON_SECTION = /contact|person|partner|director|represent|signature|sign|staff|employee|authori[sz]ed|personnel|manager/i;
    Object.entries(extracted_data).forEach(([k, v]) => {
      if (PERSON_SECTION.test(k)) return;
      if (Array.isArray(v)) v.forEach(scan);
      else scan(v);
    });
  }

  return names.length ? names.join("\n") : "-";
};

export { resolveVendorName };

// ── Helper: pull document / invoice number ────────────────────────────────────
const resolveDocumentNumber = (extracted_data, fallbackId, manual_fields) => {
  if (manual_fields) {
    const manualVal = resolveFromManualFields(manual_fields, [
      "invoice no", "invoice number", "challan no", "gate pass no", "doc no", "document no", "receipt no"
    ]);
    if (manualVal) return manualVal;
  }
  if (!extracted_data) return fallbackId?.slice(0, 8) || "-";

  // Nested (legacy gate pass format)
  const meta = extracted_data.document_metadata || {};

  return (
    // Flat top-level (new universal prompt)
    extracted_data.document_number ||
    extracted_data.invoice_no ||
    extracted_data.invoice_number ||
    extracted_data.challan_no ||
    extracted_data.gate_pass_no ||
    extracted_data.receipt_no ||
    extracted_data.po_number ||
    // Nested legacy
    meta.gate_pass_number ||
    meta.form_number ||
    meta.mtn_number ||
    meta.document_number ||
    meta.invoice_number ||
    meta.challan_number ||
    meta.lr_number ||
    extracted_data.document_number ||
    fallbackId?.slice(0, 8) ||
    "-"
  );
};

// ─── Helper: pull grand total ────────────────────────────────────────────────
const resolveAmount = (extracted_data, manual_fields) => {
  if (manual_fields) {
    const manualVal = resolveFromManualFields(manual_fields, [
      "amount", "total", "grand total", "net amount", "value", "price"
    ]);
    if (manualVal) return manualVal;
  }
  if (!extracted_data) return "-";

  const totals = extracted_data.totals_and_summary || {};

  return (
    totals.grand_total ||
    totals.total ||
    totals.net_total ||
    totals.amount ||
    extracted_data.grand_total ||
    extracted_data.total_amount ||
    "-"
  );
};

// ── Invoices for the head office print "HO" as the site — display the full
// registered company name instead so it reads consistently on the dashboard.
// Also guards against a non-string value (e.g. a nested object) ever
// reaching a table cell, which would crash the render.
const normalizeProjectSite = (site) => {
  if (typeof site !== "string" || !site || isJunkValue(site)) return "-";
  return site.trim().toUpperCase() === "HO" ? "DAccess Pvt Ltd" : site;
};

// ─── Helper: pull project site ───────────────────────────────────────────────
const resolveProjectSite = (extracted_data, manual_fields) => {
  if (manual_fields) {
    const manualVal = resolveFromManualFields(manual_fields, [
      "project", "site", "project site", "location", "where"
    ]);
    if (manualVal && !isJunkValue(manualVal)) return normalizeProjectSite(manualVal);
  }
  if (!extracted_data) return "-";

  const meta = extracted_data.document_metadata || {};
  const src = extracted_data.source_destination || {};

  return normalizeProjectSite(
    firstValid(meta.project_site, src.source_site, meta.site, extracted_data.project_site)
  );
};

// ── Helper: parse a document's own date string into a real Date ────────────
// The extraction prompt tells the LLM to return dates "exactly as written on
// the document" (e.g. "28/06/2026") rather than reformat them — so this is
// DD/MM/YYYY (or DD-MM-YYYY), NOT the MM/DD/YYYY new Date() assumes.
const parseDocumentDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();

  const dmy = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    let [, d, mo, y] = dmy;
    if (y.length === 2) y = `20${y}`;
    const day = parseInt(d, 10);
    const month = parseInt(mo, 10) - 1;
    const year = parseInt(y, 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  // Fall back to whatever Date() itself can parse (e.g. ISO strings)
  const iso = new Date(trimmed);
  return isNaN(iso.getTime()) ? null : iso;
};

// ── Helper: pull the actual invoice/document date out of extracted_data ────
// Previously the dashboard just showed created_at (when it was uploaded),
// not the date printed on the document — this pulls the real one, checked
// in priority order, and only falls back to the upload timestamp if the
// document genuinely has no date the LLM could read.
const INVOICE_DATE_KEYS = [
  "date", "invoice_date", "challan_date", "dispatch_date", "entry_date",
  "document_date", "bill_date", "receipt_date", "po_date", "transport_date",
];

const resolveInvoiceDate = (extracted_data, manual_fields, fallbackCreatedAt) => {
  if (manual_fields) {
    const manualVal = resolveFromManualFields(manual_fields, ["date"]);
    const parsed = parseDocumentDate(manualVal);
    if (parsed) return parsed.toISOString();
  }

  if (extracted_data) {
    const meta = extracted_data.document_metadata || {};
    const transporter = extracted_data.transporter_details || {};
    for (const key of INVOICE_DATE_KEYS) {
      const parsed = parseDocumentDate(extracted_data[key] || meta[key] || transporter[key]);
      if (parsed) return parsed.toISOString();
    }
  }

  return fallbackCreatedAt || null;
};

// ─── Main record mapper ──────────────────────────────────────────────────────
const mapRecord = (r) => {
  const transporter = r.extracted_data?.transporter_details || {};
  const src_dst = r.extracted_data?.source_destination || {};

  return {
    ID: r.id,
    id: r.id,
    entry_type: r.entry_type || "automatic",
    manual_fields: r.manual_fields || null,
    inward_outward: r.direction
      ? r.direction.charAt(0).toUpperCase() + r.direction.slice(1)
      : resolveFromManualFields(r.manual_fields, ["direction", "type"]) || "-",
    document_type:
      r.document_type ||
      r.extracted_data?.document_metadata?.document_type ||
      "-",
    vendor_name: resolveVendorName(r.extracted_data, r.manual_fields),
    project_site: resolveProjectSite(r.extracted_data, r.manual_fields),
    destination_site: src_dst.destination_site || resolveFromManualFields(r.manual_fields, ["destination", "to"]) || "-",
    invoice_number: resolveDocumentNumber(r.extracted_data, r.id, r.manual_fields),
    invoice_date: resolveInvoiceDate(r.extracted_data, r.manual_fields, r.created_at),
    updated_at: r.updated_at || null,
    invoice_amount: resolveAmount(r.extracted_data, r.manual_fields),
    approval_status: r.success ? "Approve" : "Reject",
    accuracy: r.success ? 100 : 0,
    vehicle_number: transporter.vehicle_number || resolveFromManualFields(r.manual_fields, ["vehicle", "truck", "car", "tempo"]) || "-",
    driver_name: transporter.driver_name || resolveFromManualFields(r.manual_fields, ["driver", "person"]) || "-",
    action_date: r.created_at,
    // Only meaningful when direction === "returnable"; null/undefined otherwise.
    return_status: r.return_status || null,
    returned_at: r.returned_at || null,
    challan_image_url: r.challan_image_url,
    vehicle_front_url: r.vehicle_front_url,
    vehicle_back_url: r.vehicle_back_url,
    extracted_data: r.extracted_data,
    raw: r,
  };
};

// ─── Stats calculator ────────────────────────────────────────────────────────
const calculateStats = (records) => {
  const now = new Date();
  const total = records.length;
  const inward = records.filter(
    (r) => r.inward_outward?.toLowerCase() === "inward",
  ).length;
  const outward = records.filter(
    (r) => r.inward_outward?.toLowerCase() === "outward",
  ).length;
  const returnable = records.filter(
    (r) => r.inward_outward?.toLowerCase() === "returnable",
  ).length;

  const manual = records.filter(
    (r) => r.entry_type?.toLowerCase() === "manual",
  ).length;

  const today = records.filter((r) => {
    if (!r.action_date) return false;
    const d = new Date(r.action_date);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }).length;

  return [
    { label: "Total Records", value: String(total) },
    { label: "Inward", value: String(inward) },
    { label: "Outward", value: String(outward) },
    { label: "Returnable", value: String(returnable) },
    { label: "Manual", value: String(manual) },
    { label: "Today", value: String(today) },
  ];
};

// Maps the /history/stats aggregate response into the same shape calculateStats produces.
const statsFromCounts = (counts) => [
  { label: "Total Records", value: String(counts.total ?? 0) },
  { label: "Inward", value: String(counts.inward ?? 0) },
  { label: "Outward", value: String(counts.outward ?? 0) },
  { label: "Returnable", value: String(counts.returnable ?? 0) },
  { label: "Manual", value: String(counts.manual ?? 0) },
  { label: "Today", value: String(counts.today ?? 0) },
];

// ─── Service class ───────────────────────────────────────────────────────────
class InvoiceService {
  // Caps the table to the 500 most recent records instead of fetching the
  // entire table (/history/all) — that scaled linearly with total record
  // count and got slower (and heavier) as data grew. "Total Records" and
  // the other stat cards are unaffected: they come from /history/stats,
  // a SQL aggregate over the whole table, not from this capped list.
  async _fetchHistory(params: any = {}) {
    // include_urls=false skips server-side SAS-signing of image URLs for
    // every row — the table never shows images, and the view/edit modals
    // refetch the single record by id (which still returns signed URLs).
    const query: Record<string, any> = { limit: 500, offset: 0, include_urls: false };
    if (params.direction) query.direction = params.direction;

    const response = await api.get("/history", { params: query });
    return (response.data.records || []).map(mapRecord);
  }

  async getDashboardStats() {
    try {
      const response = await api.get("/history/stats");
      return statsFromCounts(response.data);
    } catch (error) {
      console.error("❌ Error fetching stats:", error);
      return statsFromCounts({});
    }
  }

  async getRecords(params: any = {}) {
    try {
      const records = await this._fetchHistory(params);
      return { data: records, total: records.length, page: 1, totalPages: 1 };
    } catch (error) {
      console.error("❌ Error fetching records:", error);
      throw error;
    }
  }

  async getRecordById(id) {
    try {
      const response = await api.get(`/history/${id}`);
      return mapRecord(response.data);
    } catch (error) {
      console.error("❌ Error fetching record:", error);
      throw error;
    }
  }

  async updateRecord(id, data: any) {
    try {
      const body: Record<string, any> = {};
      if (data.direction) body.direction = data.direction.toLowerCase();
      if (data.document_type) body.document_type = data.document_type;
      if (data.extracted_data) body.extracted_data = data.extracted_data;
      if (data.manual_fields) body.manual_fields = data.manual_fields;
      if (data.return_status) body.return_status = data.return_status;

      const response = await api.patch(`/history/${id}`, body);
      return response.data;
    } catch (error) {
      console.error("❌ Error updating record:", error);
      throw error;
    }
  }

  async deleteRecord(id) {
    try {
      const response = await api.delete(`/history/${id}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error deleting record:", error);
      throw error;
    }
  }

  async syncData() {
    return {
      success: true,
      message: "Sync completed",
      timestamp: new Date().toISOString(),
    };
  }
  async getSyncStatus() {
    return { lastSync: new Date().toISOString() };
  }
  async uploadInvoice() {
    return { success: false, message: "Use the Tab app to upload invoices" };
  }
  async updateRecordStatus() {
    return { success: false, message: "Not supported" };
  }
  async exportRecords() {
    return new Blob(["No data"], { type: "text/csv" });
  }

  getEmptyStats() {
    return calculateStats([]);
  }
}

export default new InvoiceService();
export { mapRecord };

/**
 * Field/column config per master — drives the tabs, table columns, and
 * add/edit form on the Master Data page. Keys match the backend's
 * routes/masterdata.py `ENTITIES` exactly (entity key, pk field, editable
 * fields), so nothing here needs a separate mapping to stay in sync.
 *
 * Each column's `width` is a percentage computed from that column's real
 * content width (typical character count × avg glyph width + the fixed
 * px-4 cell padding), not a round guess — so on a wide screen the leftover
 * space is spread proportionally across every column instead of piling
 * into one of them. Every entity's columns (plus the trailing Actions
 * column MasterData.jsx adds via `actionsWidth`) sum to exactly 100%,
 * used with table-layout:fixed via a <colgroup>.
 */
export const MASTER_ENTITIES = {
  vendors: {
    key: "vendors",
    label: "Vendors",
    singular: "Vendor",
    pk: "vendor_id",
    nameField: "vendor_name",
    columns: [
      { key: "vendor_id", label: "Vendor ID", width: "10%" },
      { key: "vendor_name", label: "Vendor Name", width: "20%" },
      { key: "gstin", label: "GSTIN", width: "17%" },
      { key: "pan", label: "PAN", width: "13%" },
      { key: "phone", label: "Phone", width: "13%" },
      { key: "status", label: "Status", width: "10%" },
    ],
    actionsWidth: "17%",
    formFields: [
      { key: "vendor_name", label: "Vendor Name", required: true },
      { key: "gstin", label: "GSTIN" },
      { key: "pan", label: "PAN" },
      { key: "address", label: "Address" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
    ],
    searchPlaceholder: "Vendor name, GSTIN, PAN…",
  },
  warehouses: {
    key: "warehouses",
    label: "Warehouses",
    singular: "Warehouse",
    pk: "warehouse_id",
    nameField: "name",
    columns: [
      { key: "warehouse_id", label: "Warehouse ID", width: "12%" },
      { key: "name", label: "Name", width: "22%" },
      { key: "code", label: "Code", width: "9%" },
      { key: "contact_person", label: "Contact Person", width: "22%" },
      { key: "status", label: "Status", width: "13%" },
    ],
    actionsWidth: "22%",
    formFields: [
      { key: "name", label: "Name", required: true },
      { key: "code", label: "Code" },
      { key: "address", label: "Address" },
      { key: "contact_person", label: "Contact Person" },
    ],
    searchPlaceholder: "Warehouse name, code…",
  },
  transporters: {
    key: "transporters",
    label: "Transporters",
    singular: "Transporter",
    pk: "transporter_id",
    nameField: "transporter_name",
    columns: [
      { key: "transporter_id", label: "ID", width: "10%" },
      { key: "vehicle_no", label: "Vehicle No", width: "13%" },
      { key: "transporter_name", label: "Transporter Name", width: "20%" },
      { key: "driver_name", label: "Driver Name", width: "16%" },
      { key: "driver_phone", label: "Driver Phone", width: "13%" },
      { key: "status", label: "Status", width: "10%" },
    ],
    actionsWidth: "18%",
    formFields: [
      { key: "vehicle_no", label: "Vehicle No", required: true },
      { key: "transporter_name", label: "Transporter Name" },
      { key: "driver_name", label: "Driver Name" },
      { key: "driver_phone", label: "Driver Phone" },
    ],
    searchPlaceholder: "Vehicle no, transporter, driver…",
  },
  materials: {
    key: "materials",
    label: "Materials",
    singular: "Material",
    pk: "material_id",
    nameField: "description",
    columns: [
      { key: "material_id", label: "Material ID", width: "11%" },
      { key: "item_code", label: "Item Code", width: "12%" },
      { key: "description", label: "Description", width: "27%" },
      { key: "hsn_sac", label: "HSN/SAC", width: "12%" },
      { key: "unit", label: "Unit", width: "7%" },
      { key: "status", label: "Status", width: "11%" },
    ],
    actionsWidth: "20%",
    formFields: [
      { key: "item_code", label: "Item Code" },
      { key: "description", label: "Description", required: true },
      { key: "hsn_sac", label: "HSN/SAC" },
      { key: "unit", label: "Unit" },
      { key: "category", label: "Category" },
    ],
    searchPlaceholder: "Description, item code, HSN/SAC…",
  },
};

export const MASTER_ENTITY_ORDER = ["vendors", "warehouses", "transporters", "materials"];

// ============================================
// FILE: src/utils/constants.js (COMPLETE - FIXED)
// ============================================

/**
 * Application Constants
 * Central configuration for the entire application
 */

// ============================================
// API Configuration (FIXED with Fallback)
// ============================================
export const API_BASE_URL =
  import.meta.env.VITE_WEB_API_URL || "http://localhost:8000";

// Warn if backend URL is missing in production
if (!import.meta.env.VITE_WEB_API_URL && import.meta.env.PROD) {
  console.warn(
    "⚠️ VITE_WEB_API_URL not found in .env, using fallback: http://localhost:8000",
  );
}

export const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000;

// Log API config in development
if (import.meta.env.DEV) {
  console.log("🔧 API Configuration:", {
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    mode: import.meta.env.MODE,
    mockDataEnabled: import.meta.env.VITE_ENABLE_MOCK_DATA === "true",
  });
}

// ============================================
// App Information
// ============================================
export const APP_NAME = "DACCESS Invoice OCR";
export const APP_VERSION = "1.0.0";

// ============================================
// Menu Items Configuration
// ============================================
export const MENU_ITEMS = [
  { name: "Dashboard", path: "/dashboard", key: "dashboard" },
  { name: "Upload", path: "/upload", key: "upload" },
  { name: "Vender Master", path: "/vender-master", key: "vender" },
  { name: "User Management", path: "/user-management", key: "usermanagement" },
  { name: "Reports", path: "/reports", key: "reports" },
  { name: "Settings", path: "/settings", key: "settings" },
];

// ============================================
// Table Configuration
// ============================================
export const TABLE_HEADERS = [
  "Sr.No.",
  "ID",
  "GTN Date",
  "Unique ID",
  "GTN Number",
  "Invoice Date",
  "Po Po Number",
  "Approve / Not Approve",
  "Action",
];

// ============================================
// Status Constants
// ============================================
export const APPROVAL_STATUS = {
  APPROVED: "yes",
  NOT_APPROVED: "No",
};

export const INVOICE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  PROCESSING: "processing",
  INWARD: "inward",
};

export const INVOICE_STATUS_COLORS = {
  pending: "text-yellow-600 bg-yellow-50",
  approved: "text-green-600 bg-green-50",
  rejected: "text-red-600 bg-red-50",
  processing: "text-blue-600 bg-blue-50",
  inward: "text-cyan-600 bg-cyan-50",
};

// ============================================
// Employee/User Status
// ============================================
export const EMPLOYEE_STATUS = {
  ACTIVE: "Active",
  INACTIVE: "Deactive",
};

export const EMPLOYEE_STATUS_COLORS = {
  Active: "text-green-600 bg-green-50",
  Deactive: "text-red-600 bg-red-50",
};

// ============================================
// Vendor Block Status
// ============================================
export const VENDOR_BLOCK_STATUS = {
  ACTIVE: "active",
  BLOCKED: "blocked",
  PENDING_REVIEW: "pending_review",
};

export const VENDOR_BLOCK_REASONS = [
  "Poor Quality",
  "Delayed Deliveries",
  "Incomplete Documentation",
  "Non-Compliance",
  "Fraud Suspicion",
  "Payment Issues",
  "Contract Violation",
  "Other",
];

export const BLOCK_STATUS_COLORS = {
  active: "text-green-600 bg-green-50",
  blocked: "text-red-600 bg-red-50",
  pending_review: "text-yellow-600 bg-yellow-50",
};

// ============================================
// Warehouse Configuration
// ============================================
export const WAREHOUSES = [
  { id: "WH001", name: "Chennai Warehouse", code: "WH1" },
  // { id: "WH002", name: "Mumbai Warehouse", code: "WH2" },
  // { id: "WH003", name: "Delhi Warehouse", code: "WH3" },
  // { id: "WH004", name: "Kolkata Warehouse", code: "WH4" },
];

export const DEFAULT_WAREHOUSE = "WH001";

// ============================================
// Action Types
// ============================================
export const ACTION_TYPES = {
  VIEW: "view",
  EDIT: "edit",
  DELETE: "delete",
  BLOCK: "block",
  UNBLOCK: "unblock",
  APPROVE: "approve",
  REJECT: "reject",
  ACTIVATE: "activate",
  DEACTIVATE: "deactivate",
};

// ============================================
// Local Storage Keys
// ============================================
export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  REFRESH_TOKEN: "refresh_token",
  USER_DATA: "user_data",
  SIDEBAR_STATE: "sidebar_collapsed",
  ACTIVE_MENU: "active_menu",
  THEME: "app_theme",
  SELECTED_WAREHOUSE: "selected_warehouse",
};

// ============================================
// File Upload Configuration
// ============================================
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_SIZE_MB: 10,
  ALLOWED_TYPES: ["application/pdf"],
  ALLOWED_EXTENSIONS: [".pdf"],
  ACCEPT_STRING: ".pdf,application/pdf",
};

// ============================================
// Notification Types
// ============================================
export const NOTIFICATION_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
  WARNING: "warning",
};

export const NOTIFICATION_DURATION = 3000; // 3 seconds

// ============================================
// Date Formats
// ============================================
export const DATE_FORMATS = {
  DISPLAY: "MMM DD, YYYY",
  API: "YYYY-MM-DD",
  DATETIME: "MMM DD, YYYY HH:mm",
  TIME: "HH:mm",
  FULL: "dddd, MMMM DD, YYYY",
};

// ============================================
// Pagination
// ============================================
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  MAX_PAGE_SIZE: 100,
};

// ============================================
// Dashboard Stats Configuration
// ============================================
export const STATS_CONFIG = [
  {
    key: "total",
    title: "Total Records",
    colorClass: "text-cyan-600",
  },
  {
    key: "approved",
    title: "Approved",
    colorClass: "text-green-600",
  },
  {
    key: "pending",
    title: "Pending",
    colorClass: "text-yellow-600",
  },
  {
    key: "rejected",
    title: "Rejected",
    colorClass: "text-red-600",
  },
  {
    key: "processing",
    title: "Processing",
    colorClass: "text-blue-600",
  },
  {
    key: "inward",
    title: "Inward",
    colorClass: "text-purple-600",
  },
];

// ============================================
// Validation Rules
// ============================================
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[0-9]{10}$/,
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 50,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 30,
  EMP_ID_REGEX: /^USR-\d{3,}$/,
};

// ============================================
// Error Messages
// ============================================
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection.",
  SERVER_ERROR: "Server error. Please try again later.",
  UNAUTHORIZED: "You are not authorized. Please login again.",
  FILE_TOO_LARGE: `File size exceeds ${FILE_UPLOAD.MAX_SIZE_MB}MB limit.`,
  INVALID_FILE_TYPE: "Please upload a PDF file only.",
  UPLOAD_FAILED: "Upload failed. Please try again.",
  GENERIC_ERROR: "Something went wrong. Please try again.",
  BACKEND_UNREACHABLE:
    "Cannot connect to backend server. Please check if it's running.",
};

// ============================================
// Success Messages
// ============================================
export const SUCCESS_MESSAGES = {
  UPLOAD_SUCCESS: "Invoice uploaded successfully!",
  UPDATE_SUCCESS: "Updated successfully!",
  DELETE_SUCCESS: "Deleted successfully!",
  SYNC_SUCCESS: "Sync completed successfully!",
  SAVE_SUCCESS: "Saved successfully!",
  EMPLOYEE_CREATED: "User created successfully!",
  EMPLOYEE_UPDATED: "User updated successfully!",
  EMPLOYEE_DELETED: "User deleted successfully!",
  PASSWORD_CHANGED: "Password changed successfully!",
};

// ============================================
// Vendor Messages
// ============================================
export const VENDOR_MESSAGES = {
  BLOCK_SUCCESS: "Vendor blocked successfully!",
  UNBLOCK_SUCCESS: "Vendor unblocked successfully!",
  BLOCK_ERROR: "Failed to block vendor. Please try again.",
  UNBLOCK_ERROR: "Failed to unblock vendor. Please try again.",
};

// ============================================
// API Endpoints - Invoice
// ============================================
export const API_ENDPOINTS = {
  // Auth
  LOGIN: "/auth/login",
  LOGOUT: "/auth/logout",
  REFRESH_TOKEN: "/auth/refresh",

  // Invoice
  INVOICES: "/invoices",
  INVOICE_UPLOAD: "/invoices/upload",
  INVOICE_DETAIL: "/invoices/:id",
  INVOICE_APPROVE: "/invoices/:id/approve",
  INVOICE_REJECT: "/invoices/:id/reject",
  INVOICE_SYNC: "/invoices/sync",
  AUTO_EXTRACT: "/auto-extract",

  // Master Database
  MASTER: "/master",
  MASTER_DETAIL: "/master/:id",
  MASTER_STATS: "/master/stats",
  MASTER_SEARCH: "/master/search",

  // Vendor
  VENDORS: "/vendors",
  VENDOR_DETAIL: "/vendors/:id",

  // Reports
  REPORTS: "/reports",
  EXPORT_REPORT: "/reports/export",

  // Dashboard
  DASHBOARD_STATS: "/dashboard/stats",
  DASHBOARD_RECORDS: "/dashboard/records",

  // System
  HEALTH: "/health",
};

// ============================================
// API Endpoints - User Management
// ============================================
export const USER_MANAGEMENT_ENDPOINTS = {
  LOGIN: "/api/usermanagement/login",
  REGISTER: "/api/usermanagement/register",
  EMPLOYEES: "/api/usermanagement/employees",
  EMPLOYEE_DETAIL: "/api/usermanagement/employee/:id",
  UPDATE_EMPLOYEE: "/api/usermanagement/employee/:id",
  DELETE_EMPLOYEE: "/api/usermanagement/employee/:id",
  ACTIVATE_EMPLOYEE: "/api/usermanagement/employee/:id/activate",
  DEACTIVATE_EMPLOYEE: "/api/usermanagement/employee/:id/deactivate",
  CHANGE_PASSWORD: "/api/usermanagement/change-password",
  FORGOT_PASSWORD: "/api/usermanagement/forgot-password",
  SEARCH_EMPLOYEES: "/api/usermanagement/search",
  HEALTH: "/api/usermanagement/health",
};

// ============================================
// Vendor Endpoints
// ============================================
export const VENDOR_ENDPOINTS = {
  BLOCK_VENDOR: "/vendors/:id/block",
  UNBLOCK_VENDOR: "/vendors/:id/unblock",
  BLOCKED_VENDORS: "/vendors/blocked",
  BLOCK_HISTORY: "/vendors/:id/block-history",
};

// ============================================
// Theme Configuration
// ============================================
export const THEME = {
  PRIMARY_COLOR: "#0e7490",
  SECONDARY_COLOR: "#bae6f3",
  SUCCESS_COLOR: "#16a34a",
  ERROR_COLOR: "#dc2626",
  WARNING_COLOR: "#ca8a04",
  INFO_COLOR: "#0284c7",
};

// ============================================
// Upload Status
// ============================================
export const UPLOAD_STATUS = {
  IDLE: "idle",
  SELECTING: "selecting",
  SELECTED: "selected",
  UPLOADING: "uploading",
  PROCESSING: "processing",
  SUCCESS: "success",
  ERROR: "error",
};

// ============================================
// WebSocket Events (for real-time updates)
// ============================================
export const WS_EVENTS = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  UPLOAD_PROGRESS: "upload_progress",
  INVOICE_UPDATED: "invoice_updated",
  SYNC_STARTED: "sync_started",
  SYNC_COMPLETED: "sync_completed",
  ERROR: "error",
};

// ============================================
// Debounce/Throttle Delays
// ============================================
export const DELAYS = {
  SEARCH_DEBOUNCE: 500, // 500ms
  AUTOSAVE_DEBOUNCE: 2000, // 2 seconds
  NOTIFICATION_DURATION: 3000, // 3 seconds
  TOOLTIP_DELAY: 500, // 500ms
};

// ============================================
// Feature Flags (for development)
// ============================================
export const FEATURE_FLAGS = {
  ENABLE_REALTIME_UPDATES: true,
  ENABLE_FILE_PREVIEW: true,
  ENABLE_BULK_UPLOAD: false,
  ENABLE_ANALYTICS: true,
  ENABLE_MOCK_DATA: import.meta.env.VITE_ENABLE_MOCK_DATA === "true",
  DEBUG_MODE: import.meta.env.DEV,
};

// ============================================
// Browser Support
// ============================================
export const SUPPORTED_BROWSERS = {
  CHROME: 90,
  FIREFOX: 88,
  SAFARI: 14,
  EDGE: 90,
};

// ============================================
// Export All Constants as Default
// ============================================
export default {
  API_BASE_URL,
  API_TIMEOUT,
  APP_NAME,
  APP_VERSION,
  MENU_ITEMS,
  TABLE_HEADERS,
  APPROVAL_STATUS,
  INVOICE_STATUS,
  INVOICE_STATUS_COLORS,
  EMPLOYEE_STATUS,
  EMPLOYEE_STATUS_COLORS,
  VENDOR_BLOCK_STATUS,
  VENDOR_BLOCK_REASONS,
  BLOCK_STATUS_COLORS,
  WAREHOUSES,
  DEFAULT_WAREHOUSE,
  ACTION_TYPES,
  STORAGE_KEYS,
  FILE_UPLOAD,
  NOTIFICATION_TYPES,
  NOTIFICATION_DURATION,
  DATE_FORMATS,
  PAGINATION,
  STATS_CONFIG,
  VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VENDOR_MESSAGES,
  API_ENDPOINTS,
  USER_MANAGEMENT_ENDPOINTS,
  VENDOR_ENDPOINTS,
  THEME,
  UPLOAD_STATUS,
  WS_EVENTS,
  DELAYS,
  FEATURE_FLAGS,
  SUPPORTED_BROWSERS,
};

// src\web\services\api.js
import axios from "axios";
import { API_BASE_URL, API_TIMEOUT, STORAGE_KEYS } from "../utils/constants";
import authService from "./authService";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // User info headers for approval tracking
    const userStr = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);

        // Try multiple possible field names (case-insensitive)
        const userName =
          user.emp_name ||
          user.Emp_Name ||
          user.name ||
          user.Name ||
          user.username ||
          user.userName ||
          user.UserName ||
          user.employee_name ||
          user.Employee_Name ||
          "Unknown";

        const userId =
          user.emp_id ||
          user.Emp_ID ||
          user.id ||
          user.ID ||
          user.empId ||
          user.EmpId ||
          user.employee_id ||
          user.Employee_ID ||
          "";

        config.headers["X-User-Name"] = userName;
        config.headers["X-User-Id"] = userId;
      } catch (e) {
        console.error("❌ Failed to parse user data:", e);
      }
    }

    // Log request in development
    if (import.meta.env.DEV) {
      console.log("🚀 API Request:", config.method.toUpperCase(), config.url);
    }

    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  },
);

// A 401 now means "access token expired" far more often than "actually
// logged out" — access tokens are short-lived (ACCESS_TOKEN_EXPIRE_MINUTES
// on the backend, default 30 min) by design, with a refresh token meant to
// paper over that silently. Concurrent requests that all 401 around the
// same moment must share ONE refresh call, not each trigger their own —
// isRefreshing + pendingQueue coordinate that.
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function resolvePendingQueue(token: string | null) {
  pendingQueue.forEach((resolve) => resolve(token));
  pendingQueue = [];
}

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log("✅ API Response:", response.config.url, response.status);
    }
    // Return the full response object, not just response.data — this
    // allows invoiceService to access both response.data and handle errors
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      const { status, data } = error.response;

      // Never try to "refresh" the login or refresh calls themselves —
      // a 401 there means the credentials/refresh token are genuinely bad,
      // not that an access token expired mid-session.
      const isAuthEndpoint =
        originalRequest?.url?.includes("/login") || originalRequest?.url?.includes("/refresh");

      if (status === 401 && !isAuthEndpoint && !originalRequest?._retried) {
        originalRequest._retried = true;

        // Retries are always awaited here (not just returned as a bare
        // promise) so that if the retry itself also fails, it's caught by
        // the surrounding try/catch and falls through to the "log out for
        // real" path below, instead of bypassing it as an unhandled
        // rejection the caller sees as a raw 401 with no redirect.
        if (isRefreshing) {
          // A refresh is already in flight (from another concurrent
          // request's 401) — wait for it instead of starting a second one.
          const newToken = await new Promise<string | null>((resolve) => {
            pendingQueue.push(resolve);
          });
          if (newToken) {
            try {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return await api(originalRequest);
            } catch (retryError) {
              // fall through to the logged-out path below
            }
          }
        } else {
          isRefreshing = true;
          try {
            const newToken = await authService.refresh();
            isRefreshing = false;
            resolvePendingQueue(newToken);

            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return await api(originalRequest);
            }
          } catch (refreshError) {
            isRefreshing = false;
            resolvePendingQueue(null);
          }
        }

        // Refresh token itself is invalid/expired — this really is a
        // logged-out state now, not a recoverable one.
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      switch (status) {
        case 401:
          // Reached only for the login/refresh endpoints themselves, or a
          // request that already went through one retry above.
          break;
        case 403:
          console.error("❌ Forbidden:", data?.message);
          break;
        case 404:
          // ✅ FIX: Don't log 404 as error - it's expected for /master/stats
          console.log("ℹ️ Not Found (404):", error.config.url);
          break;
        case 500:
          console.error("❌ Server Error:", data?.message);
          break;
        default:
          console.error("❌ API Error:", data?.message || error.message);
      }
    } else if (error.request) {
      console.error("❌ Network Error: No response received");
    } else {
      console.error("❌ Error:", error.message);
    }

    // ✅ FIX: Always reject to allow service layer to catch and handle
    return Promise.reject(error);
  },
);

export default api;

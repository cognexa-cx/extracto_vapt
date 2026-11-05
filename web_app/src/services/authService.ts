// src/services/authService.js
import { STORAGE_KEYS } from "../utils/constants";

const API_BASE_URL = import.meta.env.VITE_WEB_API_URL
  ? `${import.meta.env.VITE_WEB_API_URL}/api/usermanagement`
  : "http://localhost:8002/api/usermanagement";

class AuthService {
  /**
   * Login user against the real backend. Returns { success, data, message }
   * — the backend always answers 200 with success:false on bad credentials
   * (no user-enumeration signal via status code), so callers must check
   * the success flag rather than HTTP status for login failures.
   */
  async login(identifier, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // The backend sets the refresh token as an httpOnly cookie in the
        // response now (see routes/usermanagement.py's _set_refresh_cookie)
        // instead of returning it in the JSON body — "include" is what
        // makes the browser actually store that Set-Cookie.
        credentials: "include",
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      if (response.status === 429) {
        throw new Error("Too many login attempts. Please wait a minute and try again.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.detail?.message || "Login failed");
      }

      if (!data.success) {
        throw new Error(data.message || "Invalid email or password");
      }

      this.setSession(data.data.token, {
        ...data.data.employee,
        permissions: data.data.permissions || {},
      });

      return {
        success: true,
        data: data.data,
        message: data.message || "Login successful",
      };
    } catch (error) {
      console.error("Login error:", error);

      if (error.name === "TypeError" && error.message === "Failed to fetch") {
        throw new Error("Network error. Please check your connection");
      }

      throw error;
    }
  }

  /**
   * True when the logged-in account is flagged must_change_password by the
   * backend (SCR-02) — it can't reach any other API until it sets a new
   * password via changePassword().
   */
  requiresPasswordChange() {
    return this.getUser()?.must_change_password === true;
  }

  /**
   * Set a new password for the logged-in account (POST /change-password).
   * On success the backend invalidates every session for the account, so
   * local auth state is cleared and the caller must send the user back to
   * the login screen.
   */
  async changePassword(currentPassword, newPassword) {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) {
      throw new Error("Your session has expired. Please log in again.");
    }
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
    } catch {
      throw new Error("Network error. Please check your connection");
    }
    if (response.status === 429) {
      throw new Error("Too many attempts. Please wait a minute and try again.");
    }
    if (response.status === 401) {
      localStorage.clear();
      throw new Error("Your session has expired. Please log in again.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || data.detail || "Could not change password");
    }
    localStorage.clear();
    return data.message || "Password changed. Please log in again.";
  }

  /**
   * Trade the refresh token — held in an httpOnly cookie the browser sends
   * automatically, never read or set by this code — for a new access
   * token. Called by api.ts's response interceptor when a request comes
   * back 401 (access token expired, which happens every
   * ACCESS_TOKEN_EXPIRE_MINUTES). The backend rotates the cookie itself
   * (revokes the one it was sent, sets a new one in the response) — there
   * is nothing for the frontend to store beyond the new access token.
   *
   * Returns the new access token on success, or null if the refresh
   * token itself is invalid/expired/revoked — callers should treat null
   * as "the user needs to log in again", not retry.
   */
  async refresh() {
    try {
      const response = await fetch(`${API_BASE_URL}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // sends + receives the refresh_token cookie
      });
      const data = await response.json();
      if (!response.ok || !data.success) return null;

      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.data.token);
      return data.data.token;
    } catch (error) {
      console.error("Token refresh error:", error);
      return null;
    }
  }

  /**
   * Store the access token and user data returned by /login. The refresh
   * token never passes through this code — it's an httpOnly cookie the
   * backend sets directly, invisible to JavaScript by design (see
   * routes/usermanagement.py's _set_refresh_cookie on the backend).
   */
  setSession(token, userData) {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("isAuthenticated", "true");
  }

  /**
   * Update the stored user profile (e.g. after an edit) without touching
   * the auth token.
   */
  setUser(userData) {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    localStorage.setItem("user", JSON.stringify(userData));
  }

  /**
   * Get stored user data
   */
  getUser() {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("Error retrieving user data:", error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const user = localStorage.getItem("user");

    // Both must exist for valid authentication
    return !!token && user !== null;
  }

  /**
   * Logout user - Clear all auth data. Clearing localStorage happens
   * immediately and synchronously (that's the part that actually matters
   * for "am I still logged in on this device"); revoking the refresh
   * token server-side is fire-and-forget best-effort alongside it — the
   * user is logged out locally either way, and an unreachable backend
   * shouldn't block that. The refresh token itself is sent automatically
   * via the httpOnly cookie (credentials: "include"); the backend also
   * clears that cookie in its response.
   */
  logout() {
    localStorage.clear(); // Clear everything to be safe

    fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }).catch((error) => {
      console.error("Logout revoke error (session is still cleared locally):", error);
    });
  }
}

export default new AuthService();

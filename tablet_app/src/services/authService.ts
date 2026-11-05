import BASE_URL from "./api";

// Real per-operator login, replacing the old shared device-key-only auth.
// Hits the same /api/usermanagement/login endpoint Extracto-Web uses (same
// backend, same accounts) -- the field is labeled "Mobile Number" per the
// UI/UX design, but is sent as `identifier` exactly like Web's email/
// username login. Whoever built the account (email, username, or phone
// number, if the backend is ever extended to accept one) can log in here
// with the same credentials.
const TOKEN_KEY = "extracto_tab_token";
const USER_KEY = "extracto_tab_user";

export async function login(identifier: string, password: string) {
  const response = await fetch(`${BASE_URL}/api/usermanagement/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  if (response.status === 429) {
    throw new Error("Too many login attempts. Please wait a minute and try again.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || data?.detail?.message || "Login failed");
  }

  setSession(data.data.token, data.data.employee);
  return data.data;
}

export function setSession(token: string, user: unknown) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export default { login, setSession, getToken, getUser, isAuthenticated, logout };

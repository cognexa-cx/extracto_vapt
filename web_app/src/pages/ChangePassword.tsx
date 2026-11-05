import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertCircle, Check, X } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import authService from "../services/authService";

// Mirrors the Local Backend's validate_new_password rules
// (auth/security.py) so the checklist reflects what the server will accept.
// The server additionally rejects known placeholder passwords.
const MIN_LENGTH = 12;

const ChangePassword = () => {
  const navigate = useNavigate();
  const { showNotification } = useAppContext();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Needs a (restricted) session from login; otherwise go log in first.
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const rules = [
    { key: "length", label: `At least ${MIN_LENGTH} characters`, passed: newPassword.length >= MIN_LENGTH },
    { key: "letter", label: "At least one letter", passed: /[A-Za-z]/.test(newPassword) },
    { key: "digit", label: "At least one digit", passed: /[0-9]/.test(newPassword) },
    {
      key: "different",
      label: "Different from current password",
      passed: newPassword.length > 0 && newPassword !== currentPassword,
    },
  ];
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 && rules.every((r) => r.passed) && passwordsMatch && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      setError("");
      const message = await authService.changePassword(currentPassword, newPassword);
      showNotification(message, "success");
      navigate("/login", { replace: true });
    } catch (err) {
      const message = err.message || "Could not change password";
      setError(message);
      showNotification(message, "error");
      setSubmitting(false);
      if (!authService.isAuthenticated()) {
        navigate("/login", { replace: true });
      }
    }
  };

  const inputClass =
    "w-full rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm text-[#131b33] focus:border-[#0370F9] focus:outline-none focus:ring-2 focus:ring-[#0370F9]/20";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-2xl font-bold text-[#0B4FCC]">Set a new password</h1>
        <p className="mt-1 text-sm text-slate-500">
          For security, you must replace your current password before you can continue.
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <label htmlFor="cp-current" className="mt-5 block text-sm font-medium text-[#36599F]">
          Current password
        </label>
        <input
          id="cp-current"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={submitting}
          required
          className={inputClass}
        />

        <label htmlFor="cp-new" className="mt-4 block text-sm font-medium text-[#36599F]">
          New password
        </label>
        <input
          id="cp-new"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={submitting}
          required
          className={inputClass}
        />

        <label htmlFor="cp-confirm" className="mt-4 block text-sm font-medium text-[#36599F]">
          Confirm new password
        </label>
        <input
          id="cp-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={submitting}
          required
          className={inputClass}
        />
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="mt-1 text-xs text-rose-600">Passwords don't match</p>
        )}

        <ul className="mt-4 grid grid-cols-1 gap-1.5 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
          {rules.map((r) => (
            <li key={r.key} className="flex items-center gap-1.5 text-xs">
              {r.passed ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <X className="h-3.5 w-3.5 text-slate-300" />
              )}
              <span className={r.passed ? "text-emerald-700" : "text-slate-500"}>{r.label}</span>
            </li>
          ))}
        </ul>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-6 w-full rounded-lg bg-gradient-to-r from-[#02B8FD] to-[#06298A] py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Change password"}
        </button>
        <button
          type="button"
          onClick={() => {
            authService.logout();
            navigate("/login", { replace: true });
          }}
          disabled={submitting}
          className="mt-3 w-full text-sm text-slate-500 hover:underline"
        >
          Log out
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;

import React, { useState } from "react";
import { Lock, Check, X, KeyRound, Send, Info } from "lucide-react";
import userManagementService from "../../services/userManagementService";
import { useAppContext } from "../../context/AppContext";

// Mirrors the backend's _validate_password_strength rules exactly
// (routes/usermanagement.py) so the checklist reflects what will actually
// pass server-side validation.
const RULES = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
  { key: "special", label: "One special character", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

const StrengthChecklist = ({ password }) => {
  const rulesPassed = RULES.map((r) => ({ ...r, passed: r.test(password) }));
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg bg-slate-50 p-3">
      {rulesPassed.map((r) => (
        <div key={r.key} className="flex items-center gap-1.5 text-[11px]">
          {r.passed ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-slate-300" />}
          <span className={r.passed ? "text-emerald-700" : "text-slate-500"}>{r.label}</span>
        </div>
      ))}
    </div>
  );
};

const PasswordInputs = ({ newPassword, setNewPassword, confirmPassword, setConfirmPassword }) => {
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1 text-[11px] text-rose-600">Passwords don't match</p>
          )}
        </div>
      </div>
      <StrengthChecklist password={newPassword} />
    </>
  );
};

/**
 * Change Password — email OTP only. (Phone-based verification was removed;
 * every account is verified/reset by email OTP now.)
 */
const PasswordCard = () => {
  const { user, showNotification } = useAppContext();

  const [email, setEmail] = useState(user?.Emp_Email || "");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  const allRulesPassed = RULES.every((r) => r.test(newPassword));
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canVerify = otp.trim().length === 6 && allRulesPassed && passwordsMatch && !verifying;

  const handleSendOtp = async () => {
    if (!email.trim() || sendingOtp) return;
    setSendingOtp(true);
    try {
      const result = await userManagementService.sendPasswordOtp(email.trim());
      setOtpSent(true);
      showNotification(result.message || "OTP sent", "success");
    } catch (err) {
      showNotification(err.message || "Failed to send OTP", "error");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!canVerify) return;
    setVerifying(true);
    try {
      await userManagementService.verifyPasswordOtp(email.trim(), otp.trim(), newPassword);
      showNotification("Password changed successfully", "success");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setOtpSent(false);
    } catch (err) {
      showNotification(err.message || "Invalid or expired OTP", "error");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <Lock size={16} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 leading-none">Change Password</h3>
          <p className="mt-1 text-[11px] text-gray-400">Verify your email with an OTP, then set a new password</p>
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Email</label>
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Registered email address"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={!email.trim() || sendingOtp}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-slate-800 px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              {sendingOtp ? "Sending…" : otpSent ? "Resend OTP" : "Send OTP"}
            </button>
          </div>
        </div>

        {otpSent && (
          <>
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Email delivery isn't configured yet on this backend — the OTP was generated and is valid, but for now
                it's only visible in the server log, not actually emailed. This will start arriving by email as soon
                as mail credentials are added.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Enter OTP</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                className="w-full max-w-[160px] rounded-md border border-slate-300 px-3 py-2 text-center text-sm tracking-[0.3em] focus:border-blue-500 focus:outline-none"
              />
            </div>

            <PasswordInputs
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
            />

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!canVerify}
                className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                <KeyRound className="h-4 w-4" />
                {verifying ? "Verifying…" : "Verify & Change Password"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default PasswordCard;

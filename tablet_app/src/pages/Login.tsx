import { useState } from "react";
import authService from "../services/authService";
import extractoLoginLogo from "../assets/ExtractoLoginLogo.png";
import cognexaLogo from "../assets/Cognexa.png";

// Kiosk login — replaces the old shared device-key-only auth. Whoever's on
// shift logs in with the same account they'd use on Extracto-Web (User
// Management is the source of truth for these credentials — email or
// username, whatever was set up there), sent as `identifier` to the same
// /api/usermanagement/login endpoint Web uses.
//
// Layout matches the UI/UX team's Figma design exactly (logo -> full-bleed
// hero -> login card overlapping its bottom -> footer), measured directly
// off the provided composite (Frame 1000003442.png, 1200x1916): logo ~8%
// of height, hero ~54%, card ~24% overlapping the hero's bottom, footer
// ~6%.
//
// Every size below is clamp(min, preferred-vh, max) rather than a bare vh
// value — pure vh made every bit of text shrink toward unreadable on a
// short/landscape viewport (a 9px heading at 667x375) and grow past
// sensible on a very tall one. clamp() keeps the exact same Figma-matching
// proportion in the normal tablet range while never going below a
// legible floor or above a sane ceiling.
export default function Login({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Enter your email/mobile number and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const session = await authService.login(identifier.trim(), password);
      onLoginSuccess(session);
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-login flex h-dvh w-full flex-col items-center overflow-y-auto bg-white">
      {/* Logo */}
      <img
        src={extractoLoginLogo}
        alt="Extracto — Smart extraction. Instantly."
        className="w-auto shrink-0"
        style={{ marginTop: "clamp(10px, 2.5vh, 40px)", height: "clamp(38px, 7vh, 76px)" }}
      />

      {/* Hero — full-bleed width, fading to white at the bottom so the
          login card reads as sitting "on" the page. */}
      <div
        className="relative w-full shrink-0"
        style={{ marginTop: "clamp(6px, 1.5vh, 24px)", height: "clamp(140px, 42vh, 520px)" }}
      >
        <img src="/image 168.png" alt="" className="h-full w-full object-cover" />
        <div
          className="tab-login-fade pointer-events-none absolute inset-x-0 bottom-0"
          style={{ height: "clamp(40px, 12vh, 150px)", background: "linear-gradient(to bottom, transparent, white)" }}
        />
      </div>

      {/* Login card — overlaps the hero's faded bottom edge, centered,
          narrower than the hero (~55% of width on a wide screen, same
          ratio as the Figma composite). relative + z-10 so it explicitly
          paints above the hero's own position:relative wrapper (which,
          per CSS stacking rules, would otherwise paint on top of a
          later-but-static-positioned sibling regardless of DOM order). */}
      <form
        onSubmit={handleSubmit}
        className="tab-login-card relative z-10 w-[92vw] max-w-[480px] rounded-2xl border border-blue-100 shadow-lg"
        style={{
          marginTop: "clamp(-70px, -6vh, -20px)",
          padding: "clamp(14px, 2.2vh, 32px)",
          background: "linear-gradient(180deg, #F5F9FF 0%, #EAF2FF 100%)",
        }}
      >
        <h1 className="font-bold leading-tight text-[#0B4FCC]" style={{ fontSize: "clamp(17px, 2.4vh, 30px)" }}>
          Login
        </h1>

        <label
          htmlFor="tab-login-identifier"
          className="block font-medium text-[#0B4FCC]"
          style={{ marginTop: "clamp(8px, 1.6vh, 20px)", fontSize: "clamp(12px, 1.5vh, 16px)" }}
        >
          Email or Mobile Number
        </label>
        <input
          id="tab-login-identifier"
          type="text"
          inputMode="email"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="name@company.com"
          className="w-full rounded-lg border border-blue-200 bg-white px-3.5 text-[#131b33] placeholder:text-slate-400 focus:border-[#0370F9] focus:outline-none focus:ring-2 focus:ring-[#0370F9]/20"
          style={{ marginTop: "clamp(3px, 0.6vh, 8px)", paddingTop: "clamp(7px, 1.2vh, 14px)", paddingBottom: "clamp(7px, 1.2vh, 14px)", fontSize: "clamp(13px, 1.6vh, 17px)" }}
          disabled={loading}
        />

        <label
          htmlFor="tab-login-password"
          className="block font-medium text-[#0B4FCC]"
          style={{ marginTop: "clamp(7px, 1.4vh, 18px)", fontSize: "clamp(12px, 1.5vh, 16px)" }}
        >
          Password<span className="text-rose-500">*</span>
        </label>
        <div className="relative" style={{ marginTop: "clamp(3px, 0.6vh, 8px)" }}>
          <input
            id="tab-login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="XXX XXX"
            className="w-full rounded-lg border border-blue-200 bg-white pl-3.5 pr-11 text-[#131b33] placeholder:text-slate-400 focus:border-[#0370F9] focus:outline-none focus:ring-2 focus:ring-[#0370F9]/20"
            style={{ paddingTop: "clamp(7px, 1.2vh, 14px)", paddingBottom: "clamp(7px, 1.2vh, 14px)", fontSize: "clamp(13px, 1.6vh, 17px)" }}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-[#0370F9]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "clamp(18px, 2.4vh, 24px)", height: "clamp(18px, 2.4vh, 24px)" }}>
              {showPassword ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        </div>

        {error && (
          <p
            className="rounded-lg bg-rose-50 px-3 text-rose-600"
            style={{ marginTop: "clamp(5px, 1vh, 14px)", paddingTop: "clamp(5px, 0.8vh, 10px)", paddingBottom: "clamp(5px, 0.8vh, 10px)", fontSize: "clamp(11px, 1.4vh, 15px)" }}
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="tab-login-btn w-full rounded-lg font-semibold text-white shadow-md transition-opacity disabled:opacity-60"
          style={{
            marginTop: "clamp(10px, 1.8vh, 24px)",
            paddingTop: "clamp(8px, 1.4vh, 18px)",
            paddingBottom: "clamp(8px, 1.4vh, 18px)",
            fontSize: "clamp(13px, 1.6vh, 17px)",
            background: "linear-gradient(180deg, #1E8CF5 0%, #0357C9 100%)",
          }}
        >
          {loading ? "Signing in…" : "Proceed"}
        </button>

        <p className="text-center text-[#0B4FCC]" style={{ marginTop: "clamp(5px, 1vh, 14px)", fontSize: "clamp(10px, 1.3vh, 13px)" }}>
          By continuing, you agree to our Terms of Service
        </p>
      </form>

      {/* Footer */}
      <div className="mt-auto flex shrink-0 items-center justify-center gap-2.5" style={{ marginBottom: "clamp(8px, 1.8vh, 24px)" }}>
        <img src={cognexaLogo} alt="Cognexa" className="w-auto" style={{ height: "clamp(13px, 2vh, 22px)" }} />
        <span className="w-px bg-slate-300" style={{ height: "clamp(10px, 1.4vh, 16px)" }} />
        <span className="text-slate-500" style={{ fontSize: "clamp(9px, 1.2vh, 12px)" }}>
          Powered by DAccess Security Systems Pvt. Ltd
        </span>
      </div>
    </div>
  );
}

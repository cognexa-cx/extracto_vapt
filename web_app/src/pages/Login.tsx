import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import authService from "../services/authService";
import ForgotPasswordModal from "../components/login/ForgotPasswordModal";

// Desktop (lg+) layout reproduces public/Login.svg pixel-for-pixel. The
// coordinates below aren't estimated off a raster export — they're the
// literal <rect>/<mask>/<linearGradient> values read straight out of the
// SVG source (1512x801 canvas): card at (60,207) 658x442 r25, inputs at
// x=110 w=558 h=50, hero diagonal mask path "M786 0L463 806L1512 812.5
// L1512 0Z", button gradient #02B8FD -> #06298A.
//
// Rather than reflowing those numbers responsively (which is what drifted
// from the Figma design last time), the canvas is built at its native
// 1512x801 size and uniformly scaled — same math as CSS `background-size:
// cover` — to exactly fill whatever viewport it's shown on. At the
// requested 1920x1080 this lands as a single scale factor (height-driven,
// 1080/801) with the 1512-wide canvas centered and its edges trimmed by
// the hero photo's own bleed, so nothing stretches or reflows.
//
// Below lg, a fixed 1512-wide canvas has no good cover-fit onto a narrow
// portrait screen, so it falls back to the same stacked layout (logo ->
// hero band -> card) already built for the Tab app's login.
const CANVAS_W = 1512;
const CANVAS_H = 801;

const useCoverScale = () => {
  const [transform, setTransform] = useState({ scale: 1, offsetX: 0 });
  useEffect(() => {
    const compute = () => {
      const scale = Math.max(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H);
      const offsetX = (window.innerWidth - CANVAS_W * scale) / 2;
      setTransform({ scale, offsetX });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return transform;
};

const Login = () => {
  const navigate = useNavigate();
  const { showNotification, setUser } = useAppContext();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [errors, setErrors] = useState<{ general?: string }>({});

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrors({});

      const response = await authService.login(identifier.trim(), password);

      if (response.success) {
        if (response.data?.employee) {
          setUser(response.data.employee);
        }
        if (response.data?.employee?.must_change_password) {
          showNotification("You must set a new password before continuing.", "info");
          setTimeout(() => navigate("/change-password"), 800);
          return;
        }
        showNotification(response.message || "Login successful!", "success");
        setTimeout(() => navigate("/dashboard"), 800);
      }
    } catch (error) {
      const errorMessage = error.message || "Login failed";
      showNotification(errorMessage, "error");
      setErrors({ general: errorMessage });
      setLoading(false);
    }
  };

  // Field markup shared by both layouts; sizing is passed in so the
  // desktop canvas can use exact SVG px (which the parent's cover-scale
  // transform then scales as one unit) while the mobile fallback keeps
  // clamp()-based responsive sizing.
  const renderFormFields = (px) => (
    <>
      <h1 className="font-bold leading-tight text-[#0B4FCC]" style={{ fontSize: px.heading }}>
        Login
      </h1>

      {errors.general && (
        <div
          className="flex items-center gap-2 rounded-lg bg-rose-50 text-rose-600"
          style={{ marginTop: px.errorGap, padding: px.errorPad, fontSize: px.label }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleLogin}>
        <label htmlFor="web-login-identifier" className="block font-medium text-[#36599F]" style={{ marginTop: px.labelGap1, fontSize: px.label }}>
          Email or Mobile Number
        </label>
        <input
          id="web-login-identifier"
          type="text"
          inputMode="email"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="name@company.com"
          disabled={loading}
          required
          className="w-full box-border rounded-lg border border-blue-200 bg-white text-[#131b33] placeholder:text-slate-400 focus:border-[#0370F9] focus:outline-none focus:ring-2 focus:ring-[#0370F9]/20"
          style={{ marginTop: px.inputGap, height: px.inputHeight, padding: px.inputPad, fontSize: px.input }}
        />

        <label htmlFor="web-login-password" className="block font-medium text-[#36599F]" style={{ marginTop: px.labelGap2, fontSize: px.label }}>
          Password<span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            id="web-login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="XXX XXX"
            disabled={loading}
            required
            className="w-full box-border rounded-lg border border-blue-200 bg-white pr-10 text-[#131b33] placeholder:text-slate-400 focus:border-[#0370F9] focus:outline-none focus:ring-2 focus:ring-[#0370F9]/20"
            style={{ marginTop: px.inputGap, height: px.inputHeight, padding: px.inputPad, fontSize: px.input }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            disabled={loading}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-[#0B4FCC] hover:underline"
            style={{ marginTop: px.forgotGap, fontSize: px.small }}
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full box-border rounded-lg font-semibold text-white shadow-md transition-opacity disabled:opacity-60"
          style={{
            marginTop: px.buttonGap,
            height: px.inputHeight,
            fontSize: px.input,
            background: "linear-gradient(180deg, #02B8FD 0%, #06298A 100%)",
          }}
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Processing...
            </span>
          ) : (
            "Proceed"
          )}
        </button>

        <p className="text-center text-[#0B4FCC]" style={{ marginTop: px.tosGap, fontSize: px.small }}>
          By continuing, you agree to our Terms of Service
        </p>
      </form>
    </>
  );

  const desktopPx = {
    heading: "30px",
    label: "14px",
    input: "15px",
    small: "13px",
    errorGap: "10px",
    errorPad: "10px 12px",
    labelGap1: "14px",
    labelGap2: "26px",
    inputGap: "8px",
    inputHeight: "50px",
    inputPad: "0 14px",
    forgotGap: "6px",
    buttonGap: "0px",
    tosGap: "12px",
  };

  const mobilePx = {
    heading: "clamp(20px, 2.6vw, 30px)",
    label: "clamp(12px, 1vw, 14px)",
    input: "clamp(13px, 1vw, 15px)",
    small: "clamp(11px, 0.85vw, 13px)",
    errorGap: "clamp(8px, 1vw, 14px)",
    errorPad: "clamp(8px, 0.9vw, 12px)",
    labelGap1: "clamp(10px, 1.3vw, 20px)",
    labelGap2: "clamp(20px, 2.4vw, 26px)",
    inputGap: "clamp(4px, 0.5vw, 8px)",
    inputHeight: "clamp(38px, 4vw, 50px)",
    inputPad: "0 clamp(10px, 1vw, 14px)",
    forgotGap: "clamp(4px, 0.5vw, 8px)",
    buttonGap: "clamp(8px, 1.1vw, 16px)",
    tosGap: "clamp(6px, 0.8vw, 12px)",
  };

  const { scale, offsetX } = useCoverScale();

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-white">
      {/* Desktop / lg+: the SVG canvas at its native 1512x801 size,
          uniformly scaled (cover-fit) to exactly fill the viewport — see
          useCoverScale above. Every coordinate below is read directly off
          public/Login.svg, not estimated. */}
      <div className="hidden h-full w-full overflow-hidden lg:block">
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: CANVAS_W,
            height: CANVAS_H,
            background: "#FAFEFF",
            transform: `translate(${offsetX}px, 0px) scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {/* hero photo — public/Mask group.png is a pre-clipped 1049x801
              export of the SVG's diagonal mask (path "M786 0L463 806
              L1512 812.5L1512 0Z"), so it drops in at (463, 0) at native
              size with zero further clipping needed. */}
          <img
            src="/Mask group.png"
            alt=""
            className="pointer-events-none absolute"
            style={{ left: 463, top: 0, width: 1049, height: 801 }}
          />

          <img
            src="/finallogo.png"
            alt="Extracto — Smart extraction. Instantly."
            className="pointer-events-none absolute"
            style={{ left: 217.5, top: 109, width: 343, height: 98, objectFit: "contain" }}
          />

          {/* card: rect x=60 y=207 w=658 h=442 rx=25, stroke #026ED4 */}
          <div
            className="absolute rounded-[25px] border bg-white shadow-lg"
            style={{
              left: 60,
              top: 207,
              width: 658,
              height: 442,
              borderColor: "#026ED4",
              padding: "65px 50px 44px",
              boxSizing: "border-box",
            }}
          >
            {renderFormFields(desktopPx)}
          </div>
        </div>
      </div>

      {/* Tablet/mobile fallback: stacked layout — a diagonal split needs
          real width to keep the card clear of the hero's edge. Same hero
          asset, cropped as a plain rectangle biased toward its opaque
          (bottom-right) region so the transparent corner never shows. */}
      <div className="flex h-full w-full flex-col items-center overflow-y-auto lg:hidden">
        <img
          src="/finallogo.png"
          alt="Extracto — Smart extraction. Instantly."
          className="w-auto shrink-0"
          style={{ marginTop: "clamp(10px, 2.5vh, 40px)", height: "clamp(38px, 7vh, 76px)" }}
        />

        <div className="relative w-full shrink-0" style={{ marginTop: "clamp(6px, 1.5vh, 24px)", height: "clamp(140px, 40vh, 480px)" }}>
          <img
            src="/Mask group.png"
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: "90% 90%" }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0"
            style={{ height: "clamp(40px, 12vh, 150px)", background: "linear-gradient(to bottom, transparent, white)" }}
          />
        </div>

        <div
          className="relative z-10 w-[92vw] max-w-[480px] rounded-2xl border border-blue-100 shadow-lg"
          style={{
            marginTop: "clamp(-70px, -6vh, -20px)",
            padding: "clamp(14px, 2.2vh, 32px)",
            background: "linear-gradient(180deg, #EEF6FC 0%, #96C7EE 100%)",
          }}
        >
          {renderFormFields(mobilePx)}
        </div>
      </div>

      <ForgotPasswordModal isOpen={showForgotPassword} onClose={() => setShowForgotPassword(false)} />
    </div>
  );
};

export default Login;

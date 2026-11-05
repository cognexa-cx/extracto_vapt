// Frontend\tab\src\components\InvoiceCard.jsx
import { useRef, useState, useEffect, useId } from "react";
import type { CSSProperties } from "react";
import { Camera, Upload, CheckCircle } from "lucide-react";

// Visually hidden (not display:none) — iOS Safari's native camera/photo
// picker can fail to launch from an input that's display:none when
// triggered via a JS .click() call. Keeping it in-layout at 1x1px avoids
// that WebKit quirk while staying invisible.
const HIDDEN_INPUT_STYLE: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
  opacity: 0,
};

const THEME = {
  bracket: "#086FF9",
  dashedBorder: "#086FF9",
  boxBg: "#F8F9FE",
  circleBg: "#F8F9FE",
  innerCircle: "#EDF3FE",
  labelColor: "#086FF9",
  tickColor: "#086FF9",
};

// pages: array of already-captured invoice page items (1 for a single-page
// invoice, 2-3+ for a multi-page one). onCapture(file) is called once per
// newly selected file and always APPENDS a page — it never replaces the
// existing ones, so re-tapping this card builds up a multi-page invoice.
export default function InvoiceCard({ label = "Invoice", pages = [], onCapture }) {
  const [showChoice, setShowChoice] = useState(false);
  const menuRef = useRef(null);
  const toggleRef = useRef(null);
  const uid = useId();
  const cameraInputId = `${uid}-camera`;
  const fileInputId = `${uid}-file`;
  const captured = pages.length > 0;

  // Inside the Android app the WebView can't reliably hand a camera photo
  // back through <input type=file>, so the app exposes a native picker
  // (flutter_inappwebview handler "pickImage") that returns the chosen
  // photos as base64. In a normal browser this bridge doesn't exist and the
  // regular file inputs below are used unchanged.
  const nativeBridge = () => (window as any).flutter_inappwebview;
  const pickNative = async (source: "camera" | "gallery") => {
    setShowChoice(false);
    try {
      const picked = await nativeBridge().callHandler("pickImage", source);
      (picked || []).forEach((f) => {
        const bin = atob(f.data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        onCapture(new File([bytes], f.name, { type: f.type || "image/jpeg" }));
      });
    } catch (err) {
      console.error("Native image pick failed", err);
    }
  };
  const onChoice = (source: "camera" | "gallery") => (e) => {
    if (nativeBridge()?.callHandler) {
      e.preventDefault();
      pickNative(source);
    } else {
      setTimeout(() => setShowChoice(false), 0);
    }
  };

  const handleFile = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => onCapture(file));
    e.target.value = "";
    setShowChoice(false);
  };

  // Close on outside tap/click — attached only once the menu is open, so
  // the very tap that opened it can't also be read as an outside tap
  // (which previously required several taps before the menu would stick).
  useEffect(() => {
    if (!showChoice) return;
    const handleOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        toggleRef.current &&
        !toggleRef.current.contains(event.target)
      )
        setShowChoice(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [showChoice]);

  return (
    <div className="tab-invoice-card relative w-full" style={{ aspectRatio: "374/493" }}>
      {/* Idle state */}
      {!captured && (
        <img
          src="/InvoiceCardIdle.svg"
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: "fill" }}
        />
      )}

      {/* Captured state — mirrors CaptureCard layout */}
      {captured && (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            background: "rgba(255,255,255,0.76)",
            borderRadius: 20,
            border: `1px solid ${THEME.bracket}`,
          }}
        >
          {/* Top-left L-bracket */}
          <svg
            width="74"
            height="62"
            viewBox="0 0 74 62"
            fill="none"
            style={{ position: "absolute", left: 0, top: 0 }}
          >
            <path
              d="M73.5 24H40C34.4772 24 30 28.4772 30 34V61.5"
              stroke={THEME.bracket}
              strokeWidth="5"
            />
          </svg>

          {/* Circle with captured icon */}
          <div
            style={{
              position: "absolute",
              width: "26.74%",
              aspectRatio: "1",
              left: "36.63%",
              top: "10.95%",
              background: THEME.circleBg,
              border: `1px solid ${THEME.innerCircle}`,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "75%",
                height: "75%",
                background: THEME.innerCircle,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src="/CapturedInvoice.svg"
                alt=""
                style={{
                  width: "66.67%",
                  height: "66.67%",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>

          {/* Dashed box — text only, no duplicate icon */}
          <div
            style={{
              position: "absolute",
              left: "8.02%",
              top: "21.1%",
              width: "83.96%",
              height: "53.75%",
              background: THEME.boxBg,
              border: `1px dashed ${THEME.dashedBorder}`,
              borderRadius: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: "clamp(13px,3.5vw,22px)",
                color: THEME.labelColor,
                textAlign: "center",
              }}
            >
              {pages.length > 1
                ? `${pages.length} Pages Uploaded`
                : "Uploaded"}
            </span>
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 400,
                fontSize: "clamp(10px,2vw,14px)",
                color: "#888",
                textAlign: "center",
              }}
            >
              Tap to add another page
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              position: "absolute",
              left: "8.02%",
              top: "85.8%",
              width: "83.96%",
              borderTop: "1px dashed rgba(0,0,0,0.25)",
            }}
          />

          {/* Bottom label */}
          <div
            style={{
              position: "absolute",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              left: "50%",
              top: "89.86%",
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
            }}
          >
            <img
              src="/UploadInvoiceDownIcon.svg"
              alt=""
              style={{ width: 30, height: 30, objectFit: "contain" }}
            />
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 400,
                fontSize: "clamp(11px,2vw,16px)",
                lineHeight: "19px",
                color: "#000",
              }}
            >
              {label}
            </span>
          </div>

          {/* Tick badge — top-right */}
          <div
            className="absolute flex items-center justify-center rounded-full bg-white shadow-md"
            style={{ top: "4%", right: "4%", width: "16%", aspectRatio: "1" }}
          >
            <CheckCircle
              className="w-full h-full"
              style={{ color: THEME.tickColor }}
              strokeWidth={2}
            />
          </div>
        </div>
      )}

      {/* Transparent click overlay */}
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setShowChoice((v) => !v)}
        className="absolute inset-0 w-full h-full focus:outline-none"
        aria-label="Upload invoice"
      />

      {/* Dropdown */}
      {showChoice && (
        <div
          ref={menuRef}
          className="absolute z-30 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl"
          style={{ left: "8%", top: "88%", minWidth: 180 }}
        >
          <label
            htmlFor={cameraInputId}
            role="button"
            tabIndex={0}
            onClick={onChoice("camera")}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Camera className="h-4 w-4" style={{ color: "#086FF9" }} /> Take
            Photo
          </label>
          <label
            htmlFor={fileInputId}
            role="button"
            tabIndex={0}
            onClick={onChoice("gallery")}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" style={{ color: "#086FF9" }} /> Choose
            File
          </label>
        </div>
      )}

      <input
        id={cameraInputId}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={HIDDEN_INPUT_STYLE}
      />
      <input
        id={fileInputId}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFile}
        style={HIDDEN_INPUT_STYLE}
      />
    </div>
  );
}

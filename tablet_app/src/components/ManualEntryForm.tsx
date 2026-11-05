// Frontend\tab\src\components\ManualEntryForm.jsx
import { useState, useRef, useEffect, useId } from "react";
import type { CSSProperties } from "react";
import { Plus, X, Check, Loader2, Eye, Camera, Upload } from "lucide-react";

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

export default function ManualEntryForm({
  fields,
  onFieldChange,
  onAddField,
  onRemoveField,
  images = [],
  onAddImages,
  onDeleteImage,
  onViewImage,
  applying,
  onApprove,
  onReject,
}) {
  const [confirmId, setConfirmId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // "approve" | "reject" | null
  const [showChoice, setShowChoice] = useState(false);
  const menuRef = useRef(null);
  const toggleRef = useRef(null);
  const uid = useId();
  const cameraInputId = `${uid}-camera`;
  const fileInputId = `${uid}-file`;

  const handleFilesSelected = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onAddImages(files);
    }
    e.target.value = "";
  };

  // Close on outside tap/click — attached only once the menu is open, so
  // the very tap that opened it can't also be read as an outside tap.
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
    <div className="flex flex-col gap-4">
      <div
        className="rounded-[20px] bg-white"
        style={{
          border: "1px solid rgba(0,0,0,0.1)",
          padding: "clamp(16px, 2.5vw, 30px)",
        }}
      >
        <h2
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            fontSize: "clamp(15px, 2vw, 22px)",
            color: "#00194C",
            margin: "0 0 clamp(12px, 2vw, 20px) 0",
          }}
        >
          Manual Entry
        </h2>

        <div className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <input
                type="text"
                value={field.key}
                onChange={(e) => onFieldChange(field.id, "key", e.target.value)}
                placeholder={`Key ${index + 1}`}
                className="w-full sm:w-1/3 rounded-[10px] outline-none"
                style={{
                  height: "clamp(44px, 5.5vw, 56px)",
                  border: "1px solid rgba(0,0,0,0.15)",
                  padding: "0 14px",
                  fontSize: "clamp(13px, 1.6vw, 16px)",
                  color: "#00194C",
                }}
              />
              <input
                type="text"
                value={field.value}
                onChange={(e) =>
                  onFieldChange(field.id, "value", e.target.value)
                }
                placeholder={`Value ${index + 1}`}
                className="w-full flex-1 rounded-[10px] outline-none"
                style={{
                  height: "clamp(44px, 5.5vw, 56px)",
                  border: "1px solid rgba(0,0,0,0.15)",
                  padding: "0 14px",
                  fontSize: "clamp(13px, 1.6vw, 16px)",
                  color: "#00194C",
                }}
              />
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => setConfirmId(field.id)}
                  aria-label="Remove field"
                  className="flex items-center justify-center rounded-[10px] shrink-0 hover:bg-rose-50 transition-colors"
                  style={{
                    width: "clamp(44px, 5.5vw, 56px)",
                    height: "clamp(44px, 5.5vw, 56px)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    color: "#e11d48",
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add field button */}
        <button
          type="button"
          onClick={onAddField}
          className="mt-4 flex items-center justify-center gap-2 mx-auto rounded-full font-semibold transition hover:opacity-90"
          style={{
            height: "clamp(40px, 5vw, 50px)",
            width: "clamp(40px, 5vw, 50px)",
            backgroundColor: "#0370F9",
            color: "#fff",
          }}
          aria-label="Add key value field"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* ── Upload Images ─────────────────────────────────── */}
      <div
        className="rounded-[20px] bg-white"
        style={{
          border: "1px solid rgba(0,0,0,0.1)",
          padding: "clamp(16px, 2.5vw, 30px)",
        }}
      >
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              fontSize: "clamp(15px, 2vw, 22px)",
              color: "#00194C",
              margin: 0,
            }}
          >
            Upload Images
          </h2>

          {/* Add button */}
          <div className="relative">
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setShowChoice((v) => !v)}
              className="flex items-center justify-center rounded-full font-semibold transition hover:opacity-90"
              style={{
                height: "clamp(36px, 4.5vw, 44px)",
                width: "clamp(36px, 4.5vw, 44px)",
                backgroundColor: "#0370F9",
                color: "#fff",
              }}
              aria-label="Add images"
            >
              <Plus className="h-5 w-5" />
            </button>

            {showChoice && (
              <div
                ref={menuRef}
                className="absolute right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl"
                style={{ minWidth: 180 }}
              >
                <label
                  htmlFor={cameraInputId}
                  role="button"
                  tabIndex={0}
                  onClick={() => setTimeout(() => setShowChoice(false), 0)}
                  className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Camera className="h-4 w-4" style={{ color: "#0370F9" }} />{" "}
                  Take Photo
                </label>
                <label
                  htmlFor={fileInputId}
                  role="button"
                  tabIndex={0}
                  onClick={() => setTimeout(() => setShowChoice(false), 0)}
                  className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4" style={{ color: "#0370F9" }} />{" "}
                  Choose File
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail grid — eye icon only, opens PreviewModal */}
        {images.length > 0 ? (
          <div
            className="grid grid-cols-3 sm:grid-cols-4"
            style={{ gap: "clamp(8px, 1.5vw, 16px)" }}
          >
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onViewImage?.(img)}
                className="group relative overflow-hidden bg-white rounded-[14px]"
                style={{
                  aspectRatio: "1",
                  border: "1px solid rgba(0,0,0,0.1)",
                }}
              >
                <img
                  src={img.url}
                  alt={img.label || "Uploaded"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 opacity-0 shadow transition group-hover:opacity-100">
                    <Eye className="h-4 w-4" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "clamp(12px, 1.6vw, 15px)",
              color: "rgba(0,0,0,0.4)",
              margin: 0,
            }}
          >
            No images added yet.
          </p>
        )}

        <input
          id={cameraInputId}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFilesSelected}
          style={HIDDEN_INPUT_STYLE}
        />
        <input
          id={fileInputId}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
          style={HIDDEN_INPUT_STYLE}
        />
      </div>

      {/* ── Approve / Reject ──────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => setConfirmAction("reject")}
          disabled={applying}
          className="flex items-center gap-2 px-5 py-2 rounded-lg border border-rose-300 bg-rose-50 text-sm font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50 transition-colors"
        >
          <X className="h-4 w-4" />
          Reject
        </button>
        <button
          type="button"
          onClick={() => setConfirmAction("approve")}
          disabled={applying}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {applying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {applying ? "Saving..." : "Approve"}
        </button>
      </div>

      {/* ── Remove field confirm modal ──────────────────────── */}
      {confirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setConfirmId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[16px] bg-white p-6"
            style={{ border: "1px solid rgba(0,0,0,0.1)" }}
          >
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 16,
                color: "#00194C",
                margin: "0 0 20px 0",
              }}
            >
              Remove this field?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemoveField(confirmId);
                  setConfirmId(null);
                }}
                className="px-5 py-2 rounded-lg bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve / Reject confirm modal ──────────────────── */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setConfirmAction(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[16px] bg-white p-6"
            style={{ border: "1px solid rgba(0,0,0,0.1)" }}
          >
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: 16,
                color: "#00194C",
                margin: "0 0 20px 0",
              }}
            >
              {confirmAction === "approve"
                ? "Approve and save this entry?"
                : "Reject and discard this entry?"}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  if (action === "approve") onApprove();
                  else onReject();
                }}
                className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                  confirmAction === "approve"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {confirmAction === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

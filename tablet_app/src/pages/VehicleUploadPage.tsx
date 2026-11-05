// Frontend\tab\src\pages\VehicleUploadPage.jsx
import { useState, useRef } from "react";
import Header from "../components/Header";
import InvoiceCard from "../components/InvoiceCard";
import PreviewPanel from "../components/PreviewPanel";
import PreviewModal from "../components/PreviewModal";
import ExtractionResult from "../components/ExtractionResult";
import ManualEntryForm from "../components/ManualEntryForm";
import SuccessPopup from "../components/SuccessPopup";
import ReturnableListPage from "./ReturnableListPage";
import { compressImage } from "../utils/compressImage";
import { setByPath } from "../utils/setByPath";
import { extractChallan } from "../services/extractionService";
import { approveExtraction } from "../services/approveService";
import { rejectExtraction } from "../services/rejectService";
import {
  approveManualEntry,
  rejectManualEntry,
} from "../services/manualEntryService";
import { Loader2, Zap, CheckCircle2 } from "lucide-react";

const EMPTY_FIELDS = () =>
  Array.from({ length: 5 }, (_, i) => ({
    id: `field-${Date.now()}-${i}`,
    key: "",
    value: "",
  }));

// Placeholder mimicking ExtractionResult's layout (header band + section
// panels of key/value rows), shown where the result will appear while the
// extract call is in flight — it runs OCR + LLM and takes tens of seconds,
// during which the only feedback used to be the button's "Extracting..." text.
function ExtractionSkeleton() {
  return (
    <div className="flex flex-col gap-3 pb-8" aria-hidden="true">
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="h-5 w-5 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-4 w-44 rounded bg-gray-200 animate-pulse" />
      </div>
      {[4, 6].map((rows, s) => (
        <div key={s} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
            <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i}>
                <div className="h-2.5 w-24 rounded bg-gray-100 animate-pulse mb-1.5" />
                <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const getFileKind = (file) => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (
    file.type === "application/msword" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "doc";
  return "other";
};

export default function VehicleUploadPage({ onLogout }) {
  const [uploads, setUploads] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const direction = "inward"; // direction selection removed — documents only
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [extractResult, setExtractResult] = useState(null);

  // ── Page mode — "upload" (capture cards), "manual" (key/value form), or
  // "returnable" (the returnable-items list). Persisted so a browser refresh
  // stays on whichever tab the user was on, instead of always resetting to
  // "upload".
  // Automatic / Manual / Returnable switcher removed — documents (automatic
  // extraction) only, so the page is always in "upload" mode.
  const mode: string = "upload";
  const [manualFields, setManualFields] = useState(EMPTY_FIELDS);
  const [manualImages, setManualImages] = useState([]); // [{ id, file, url, kind, label }]
  const [manualApplying, setManualApplying] = useState(false);
  const [manualError, setManualError] = useState(null);

  // ── NEW: tracks whether extraction has already succeeded for the
  // current set of uploads, so the Extract button stays disabled and
  // the "Extracted Successfully" banner stays visible until reset.
  const [extractedSuccessfully, setExtractedSuccessfully] = useState(false);

  // ── NEW: ref to the extraction result section, used to auto-scroll
  // down to it once extraction succeeds.
  const resultRef = useRef(null);

  // ── NEW: success popup shown after approve/reject (both automatic and
  // manual), with an OK button and a 3-2-1 auto-dismiss countdown.
  const [successPopup, setSuccessPopup] = useState({ open: false, message: "" });
  const showSuccessPopup = (message) => setSuccessPopup({ open: true, message });
  const closeSuccessPopup = () => setSuccessPopup((p) => ({ ...p, open: false }));

  // Invoice pages APPEND (a multi-page invoice can have several); vehicle
  // front/back each stay a single upload and get replaced on re-capture.
  const addUpload = async (slot, label, file) => {
    const kind = getFileKind(file);
    // Shrink the photo before it's held in state / uploaded — see
    // compressImage.js for why (avoids a connection reset on slow uploads).
    const compressed = kind === "image" ? await compressImage(file) : file;
    const url = URL.createObjectURL(compressed);
    const newItem = {
      id: `${slot}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      slot,
      label,
      file: compressed,
      url,
      kind,
    };
    setUploads((prev) => [
      ...prev.filter((u) => u.slot !== slot || slot === "invoice"),
      newItem,
    ]);
    setExtractResult(null);
    setError(null);
    setExtractedSuccessfully(false); // new upload invalidates previous extraction
  };

  const removeUploads = (predicate) => {
    setUploads((prev) => prev.filter((u) => !predicate(u)));
    setExtractResult(null);
    setError(null);
    setExtractedSuccessfully(false);
  };

  const deleteInvoicePage = (id) => removeUploads((u) => u.id === id);

  const resetAll = () => {
    setUploads([]);
    setExtractResult(null);
    setApplying(false);
    setError(null);
    setExtractedSuccessfully(false);
  };

  const invoiceItems = uploads.filter((u) => u.slot === "invoice");

  const canExtract = invoiceItems.length > 0;
  // Single required category (invoice) — PreviewPanel shows the exact page count.
  const completed = invoiceItems.length > 0 ? 1 : 0;
  const total = 1;

  const handleExtract = async () => {
    if (!canExtract || extractedSuccessfully) return;
    setLoading(true);
    setError(null);
    setExtractResult(null);
    try {
      const result = await extractChallan(
        invoiceItems.map((i) => i.file),
        direction,
      );
      setExtractResult(result);

      if (result?.success) {
        setExtractedSuccessfully(true);

        // Scroll down to the extraction result section once it renders.
        setTimeout(() => {
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      } else {
        // The API responded 200 OK but couldn't extract (e.g. a transient
        // LLM/OCR failure) — ExtractionResult renders nothing for a failed
        // result, so this error banner is the only thing that tells the
        // user it didn't work instead of the screen just going quiet.
        setError(
          result?.validation_messages?.[0] ||
            "Extraction failed. Please try again.",
        );
      }
    } catch (err) {
      setError(err.message || "Extraction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!extractResult?.session_id) return;
    setApplying(true);
    setError(null);
    try {
      const result = await approveExtraction(
        extractResult.session_id,
        extractResult,
        direction,
      );
      if (result?.success) {
        resetAll();
        showSuccessPopup("Approved & saved successfully!");
      } else {
        setError(result?.validation_messages?.[0] || "Approve failed. Please try again.");
        setApplying(false);
      }
    } catch (err) {
      setError(err.message || "Approve failed. Please try again.");
      setApplying(false);
    }
  };

  // A field edited in the extraction result (pencil icon -> inline input)
  // patches extracted_data in place, so Approve sends the corrected value
  // instead of whatever OCR/the LLM originally read.
  const handleExtractedFieldChange = (path, value) => {
    setExtractResult((prev) => {
      if (!prev) return prev;
      return { ...prev, extracted_data: setByPath(prev.extracted_data || {}, path, value) };
    });
  };

  const handleReject = async () => {
    if (extractResult?.session_id) {
      try {
        await rejectExtraction(extractResult.session_id);
      } catch (_) {}
    }
    resetAll();
    showSuccessPopup("Rejected successfully!");
  };

  // ── Manual entry handlers ─────────────────────────────
  const handleManualFieldChange = (id, prop, val) => {
    setManualFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [prop]: val } : f)),
    );
  };

  const handleAddManualField = () => {
    setManualFields((prev) => [
      ...prev,
      { id: `field-${Date.now()}`, key: "", value: "" },
    ]);
  };

  const handleRemoveManualField = (id) => {
    setManualFields((prev) => prev.filter((f) => f.id !== id));
  };

  // ── Manual image handlers ─────────────────────────────
  const handleManualImagesAdd = async (files: FileList | File[]) => {
    const compressedFiles = await Promise.all(
      Array.from(files).map((file) => compressImage(file)),
    );
    const newItems = compressedFiles.map((file, i) => ({
      id: `manual-img-${Date.now()}-${i}`,
      file,
      url: URL.createObjectURL(file),
      kind: "image",
      label: file.name,
    }));
    setManualImages((prev) => [...prev, ...newItems]);
  };

  const handleManualImageDelete = (id) => {
    setManualImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleManualApprove = async () => {
    setManualApplying(true);
    setManualError(null);
    try {
      // Pass the first image file if one was attached
      const imageFile = manualImages.length > 0 ? manualImages[0].file : null;
      const result = await approveManualEntry(manualFields, imageFile);
      if (!result?.success) {
        setManualError(result?.validation_messages?.[0] || "Nothing to save.");
        return;
      }
      setManualFields(EMPTY_FIELDS());
      setManualImages([]);
      showSuccessPopup("Approved & saved successfully!");
    } catch (err) {
      setManualError(err.message || "Approve failed. Please try again.");
    } finally {
      setManualApplying(false);
    }
  };

  const handleManualReject = async () => {
    setManualError(null);
    try {
      await rejectManualEntry();
    } catch (_) {}
    setManualFields(EMPTY_FIELDS());
    setManualImages([]);
    showSuccessPopup("Rejected successfully!");
  };

  return (
    <div className="tab-app min-h-screen w-full font-body bg-[#F7F9FF]">
      <Header mode={mode} onLogout={onLogout} />

      {mode === "returnable" ? (
        <ReturnableListPage />
      ) : (
      <main className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:gap-5 lg:p-5">
        {/* ── Hero Banner ─────────────────────────────────── */}
        <div
          className="tab-hero relative overflow-hidden rounded-[20px]"
          style={{
            background: "#F4F6FD",
            border: "1px solid rgba(21, 73, 255, 0.1)",
            height: "clamp(180px, 33.1vw, 385px)",
          }}
        >
          {/* Text block — left: 70px, top: 76px, width: 436px */}
          <div
            style={{
              position: "absolute",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "clamp(10px, 1.7vw, 20px)",
              left: "clamp(20px, 6vw, 70px)",
              top: "clamp(20px, 6.5vw, 76px)",
              width: "clamp(180px, 37.6vw, 436px)",
            }}
          >
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: "clamp(11px, 2.07vw, 24px)",
                lineHeight: "29px",
                color: "#23BEB1",
                margin: 0,
                width: "100%",
              }}
            >
              VEHICLE INTAKE
            </p>
            <h1
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 800,
                fontSize: "clamp(18px, 4.14vw, 48px)",
                lineHeight: "1.21",
                color: "#00194C",
                margin: 0,
                maxWidth: "clamp(160px, 34.7vw, 402px)",
              }}
            >
              Capture Vehicle
              <br />
              Documents
            </h1>
            <p
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 400,
                fontSize: "clamp(11px, 1.72vw, 20px)",
                lineHeight: "24px",
                color: "#000000",
                margin: 0,
                width: "100%",
              }}
            >
              Capture the invoice (tap again to add more pages for a
              multi-page invoice) to complete the extraction.
            </p>
          </div>

          {/* Vehicle image — left: calc(50% - 632/2 + 215px), top: 41px */}
          <img
            src="/VehicleNew.png"
            alt="Vehicle"
            style={{
              position: "absolute",
              width: "clamp(120px, 54.5vw, 632px)",
              height: "clamp(65px, 29.7vw, 344px)",
              left: "calc(50% - clamp(60px, 27.2vw, 316px) + clamp(40px, 18.5vw, 215px))",
              top: "clamp(10px, 3.5vw, 41px)",
              objectFit: "contain",
            }}
          />
        </div>

        {mode === "manual" ? (
          <>
            {manualError && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {manualError}
              </div>
            )}
            <ManualEntryForm
              fields={manualFields}
              onFieldChange={handleManualFieldChange}
              onAddField={handleAddManualField}
              onRemoveField={handleRemoveManualField}
              images={manualImages}
              onAddImages={handleManualImagesAdd}
              onDeleteImage={handleManualImageDelete}
              onViewImage={setActiveItem}
              applying={manualApplying}
              onApprove={handleManualApprove}
              onReject={handleManualReject}
            />
          </>
        ) : (
          <>
            {/* ── Capture Card ────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <InvoiceCard
                label="Invoice"
                pages={invoiceItems}
                onCapture={(file) => addUpload("invoice", "Invoice", file)}
              />
            </div>

            {/* ── Preview Panel ───────────────────────────────── */}
            <PreviewPanel
              invoiceItems={invoiceItems}
              onView={setActiveItem}
              onDeleteInvoicePage={deleteInvoicePage}
            />

            {/* ── Info Banner ─────────────────────────────────── */}
            <div
              className="tab-info rounded-[20px] text-center"
              style={{
                backgroundColor: "#DFEBFF",
                border: "1px solid rgba(39,105,226,0.3)",
                padding: "clamp(12px, 2.5vw, 30px) clamp(16px, 3vw, 40px)",
                fontSize: "clamp(12px, 1.8vw, 24px)",
                color: "#2769E2",
                lineHeight: 1.4,
              }}
            >
              Please capture or upload the invoice (all pages, for a
              multi-page invoice) for accurate extraction.
            </div>

            {/* ── Error ───────────────────────────────────────── */}
            {error && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </div>
            )}

            {/* ── Extracted Successfully banner ───────────────── */}
            {extractedSuccessfully && (
              <div className="flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Extracted Successfully
              </div>
            )}

            {/* ── Bottom Bar ──────────────────────────────────── */}
            {/*
          Mobile:   [counter pill]
                    [Inward] [Outward] [Returnable]   ← full-width row
          Tablet+:  [counter pill]  [Inward] [Outward] [Returnable]  ← single row
        */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              {/* Counter pill */}
              <div
                className="tab-pill flex items-center gap-2 self-start sm:self-auto"
                style={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 26,
                  padding: "clamp(6px,1vw,10px) clamp(12px,1.5vw,20px)",
                  height: "clamp(40px, 5.5vw, 66px)",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    fontSize: "clamp(13px, 1.8vw, 22px)",
                    fontWeight: 500,
                    color: "#999",
                  }}
                >
                  {completed}/{total} Captured
                </span>
                <div className="flex items-center gap-2">
                  {Array.from({ length: total }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: "clamp(10px, 1.3vw, 16px)",
                        height: "clamp(10px, 1.3vw, 16px)",
                        borderRadius: "50%",
                        backgroundColor: i < completed ? "#85B3FF" : "#DFEBFF",
                        display: "inline-block",
                      }}
                    />
                  ))}
                </div>
              </div>

            </div>

            {/* ── Extract Button ──────────────────────────────── */}
            <button
              type="button"
              onClick={handleExtract}
              disabled={!canExtract || loading || extractedSuccessfully}
              className="tab-extract w-full flex items-center justify-center gap-2 rounded-[10px] font-semibold transition"
              style={{
                height: "clamp(48px, 6.5vw, 80px)",
                border: "1px solid rgba(0,0,0,0.1)",
                backgroundColor:
                  canExtract && !loading && !extractedSuccessfully
                    ? "#0370F9"
                    : "#e5e7eb",
                color:
                  canExtract && !loading && !extractedSuccessfully
                    ? "#fff"
                    : "#9ca3af",
                fontSize: "clamp(15px, 2.2vw, 26px)",
                cursor:
                  canExtract && !loading && !extractedSuccessfully
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {loading ? (
                <Loader2
                  className="animate-spin"
                  style={{
                    width: "clamp(18px, 2vw, 24px)",
                    height: "clamp(18px, 2vw, 24px)",
                  }}
                />
              ) : extractedSuccessfully ? (
                <CheckCircle2
                  style={{
                    width: "clamp(18px, 2vw, 24px)",
                    height: "clamp(18px, 2vw, 24px)",
                  }}
                />
              ) : (
                <Zap
                  style={{
                    width: "clamp(18px, 2vw, 24px)",
                    height: "clamp(18px, 2vw, 24px)",
                  }}
                />
              )}
              {loading
                ? "Extracting..."
                : extractedSuccessfully
                  ? "Extracted Successfully"
                  : "Extract"}
            </button>

            {/* ── Extraction Result ───────────────────────────── */}
            {loading && <ExtractionSkeleton />}
            {!loading && extractResult && (
              <div ref={resultRef} className="tab-result">
                <ExtractionResult
                  result={extractResult}
                  applying={applying}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onFieldChange={handleExtractedFieldChange}
                />
              </div>
            )}
          </>
        )}
      </main>
      )}

      <PreviewModal item={activeItem} onClose={() => setActiveItem(null)} />
      <SuccessPopup
        open={successPopup.open}
        message={successPopup.message}
        onClose={closeSuccessPopup}
      />
    </div>
  );
}

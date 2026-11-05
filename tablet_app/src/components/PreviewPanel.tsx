// Frontend\tab\src\components\PreviewPanel.jsx
import { Eye, Trash2 } from "lucide-react";

const SLOT_ICONS = {
  invoice: "/CapturedInvoice.svg",
  front: "/CapturedFront.svg",
  back: "/CapturedBack.svg",
};

function Tile({ item, label, onView, onDelete }) {
  const captured = Boolean(item);
  return (
    <div
      className="relative overflow-hidden bg-white flex items-center justify-center rounded-[20px]"
      style={{
        aspectRatio: "314/370",
        border: "1px dashed #999",
      }}
    >
      {captured ? (
        <>
          {item.kind === "image" ? (
            <img
              src={item.url}
              alt={label}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <img
                src={SLOT_ICONS[item.slot]}
                alt={label}
                style={{
                  width: "clamp(20px, 5vw, 50px)",
                  height: "clamp(20px, 5vw, 50px)",
                  objectFit: "contain",
                }}
              />
              <span
                style={{
                  fontSize: "clamp(9px, 2vw, 20px)",
                  color: "#A8BBFF",
                  fontWeight: 500,
                }}
              >
                {item.kind?.toUpperCase()}
              </span>
            </div>
          )}

          {/* Label badge (used for invoice page numbers) */}
          {label && (
            <span
              className="absolute left-1.5 top-1.5 sm:left-2 sm:top-2 z-10 rounded-full bg-black/55 px-2 py-0.5 text-white"
              style={{ fontSize: "clamp(9px, 1.6vw, 13px)", fontWeight: 600 }}
            >
              {label}
            </span>
          )}

          {/* View overlay */}
          <button
            type="button"
            onClick={() => onView(item)}
            className="group absolute inset-0 flex items-center justify-center transition hover:bg-black/30"
          >
            <span className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/90 text-gray-800 opacity-0 shadow transition group-hover:opacity-100">
              <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 z-20 flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow transition hover:bg-rose-500 hover:text-white"
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </>
      ) : (
        <div
          className="flex flex-col items-center"
          style={{ gap: "clamp(6px, 1.5vw, 17px)" }}
        >
          <img
            src={SLOT_ICONS[label?.toLowerCase().includes("invoice") ? "invoice" : label?.toLowerCase().includes("front") ? "front" : "back"]}
            alt={label}
            style={{
              width: "clamp(20px, 5vw, 50px)",
              height: "clamp(20px, 5vw, 50px)",
              objectFit: "contain",
            }}
          />
          <span
            style={{
              fontSize: "clamp(9px, 2vw, 20px)",
              fontWeight: 500,
              color: "#A8BBFF",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

// invoiceItems: array of pages (slot "invoice"), rendered as one tile each so
// a 2-3 page invoice shows all its pages individually with their own
// view/delete controls, instead of a single fixed invoice slot.
export default function PreviewPanel({
  invoiceItems = [],
  onView,
  onDeleteInvoicePage,
}) {
  const totalCaptured = invoiceItems.length;

  return (
    <section
      className="tab-preview rounded-[20px]"
      style={{
        background: "#F4F6FD",
        border: "1px solid rgba(87,37,220,0.3)",
        padding: "clamp(14px, 3vw, 40px) clamp(12px, 4vw, 79px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-5">
        <span
          style={{
            fontSize: "clamp(14px, 2.5vw, 24px)",
            fontWeight: 400,
            color: "#000",
            lineHeight: 1.2,
          }}
        >
          Captured Files
        </span>
        <span
          style={{
            fontSize: "clamp(11px, 2vw, 20px)",
            color: "rgba(0,0,0,0.7)",
            lineHeight: 1.2,
          }}
        >
          {totalCaptured} file{totalCaptured === 1 ? "" : "s"} captured
        </span>
      </div>

      {/* Always 3-col grid — thumbnails scale with container */}
      <div
        className="grid grid-cols-3"
        style={{ gap: "clamp(6px, 1.5vw, 20px)" }}
      >
        {invoiceItems.length > 0 ? (
          invoiceItems.map((item, i) => (
            <Tile
              key={item.id}
              item={item}
              label={
                invoiceItems.length > 1 ? `Invoice p.${i + 1}` : "Invoice"
              }
              onView={onView}
              onDelete={onDeleteInvoicePage}
            />
          ))
        ) : (
          <Tile item={null} label="Invoice" onView={onView} onDelete={() => {}} />
        )}
      </div>
    </section>
  );
}

// Frontend\tab\src\components\PreviewModal.jsx
import { X, File, Download } from "lucide-react";

export default function PreviewModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] rounded-2xl bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink shadow"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="mb-3 font-mono text-xs tracking-wide text-muted">
          {item.label}
        </p>

        {item.kind === "image" && (
          <img
            src={item.url}
            alt={item.label}
            className="max-h-[75vh] max-w-[80vw] rounded-xl object-contain"
          />
        )}
        {item.kind === "pdf" && (
          <iframe
            src={item.url}
            title={item.label}
            className="h-[75vh] w-[70vw] rounded-xl border border-line"
          />
        )}
        {item.kind === "doc" && (
          <div className="flex h-64 w-72 flex-col items-center justify-center gap-3 text-muted">
            <File className="h-12 w-12" />
            <span className="text-center text-sm">
              Word documents can't be previewed inline.
            </span>
            <a
              href={item.url}
              download={item.file.name}
              className="flex items-center gap-1 rounded-lg bg-ink px-4 py-2 text-xs font-medium text-white hover:bg-ink/90"
            >
              <Download className="h-3 w-3" /> Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

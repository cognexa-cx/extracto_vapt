// Frontend\tab\src\components\DatePickerModal.jsx
import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toISODate(y, m, d) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

// Native <input type="date"> pickers are positioned by the browser itself
// (usually flush to the bottom on mobile/tablet), which can't be overridden
// via CSS. This renders a small calendar as a centered modal instead, so it
// always opens in the middle of the screen regardless of device/browser.
export default function DatePickerModal({ title, value, onChange, onClose }) {
  const initial = value ? new Date(value) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const monthLabel = firstOfMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={goPrevMonth}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold text-slate-700">{monthLabel}</p>
          <button
            type="button"
            onClick={goNextMonth}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-slate-400 uppercase">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />;
            const iso = toISODate(viewYear, viewMonth, day);
            const isSelected = value === iso;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onChange(iso);
                  onClose();
                }}
                className={`h-8 rounded-lg text-sm font-medium transition ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "text-slate-700 hover:bg-blue-50"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              onClose();
            }}
            className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            Clear date
          </button>
        )}
      </div>
    </div>
  );
}

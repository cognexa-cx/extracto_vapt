// Frontend\tab\src\components\SuccessPopup.jsx
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

// Shows a success confirmation with a green tick. Clicking OK dismisses it
// instantly; otherwise it auto-dismisses after `seconds`, counting down on
// the button itself (e.g. "OK (3)" -> "OK (2)" -> "OK (1)").
export default function SuccessPopup({ open, message, onClose, seconds = 3 }) {
  const [count, setCount] = useState(seconds);

  // This component stays mounted across every approve/reject (it's never
  // unmounted, only toggled via `open`), so `count` can be left at 0 from
  // the previous cycle. Deciding "time's up" from a *separate* effect that
  // reads that leftover state raced with the effect resetting it — on the
  // next open, the stale count-0 auto-close effect could fire before the
  // reset applied, closing the popup instantly. Tracking the countdown in
  // a local variable inside one effect (not via cross-effect state reads)
  // removes that race entirely.
  useEffect(() => {
    if (!open) return;
    let remaining = seconds;
    setCount(remaining);
    const interval = setInterval(() => {
      remaining -= 1;
      setCount(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seconds]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <p className="mb-6 text-base font-semibold text-slate-900">
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 active:scale-95"
        >
          OK{count > 0 ? ` (${count})` : ""}
        </button>
      </div>
    </div>
  );
}

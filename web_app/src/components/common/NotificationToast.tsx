import React from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// showNotification() (AppContext) has always set `notification` state on
// every save/error across the app (RBAC Master, Master Data, User
// Management, Login, ...), but nothing ever rendered it — the message was
// set and auto-cleared 3s later with no UI ever subscribed to it, so every
// "Saved successfully" call was silently a no-op. Mounted once in App.tsx
// (inside AppProvider, outside <Routes>) so every page gets it for free,
// including Login/OTP which sit outside the main Layout.
const STYLES = {
  success: {
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    iconColor: "text-emerald-500",
  },
  error: {
    icon: XCircle,
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-800",
    iconColor: "text-rose-500",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    iconColor: "text-blue-500",
  },
};

const NotificationToast = () => {
  const { notification, hideNotification } = useAppContext();

  if (!notification) return null;

  const style = STYLES[notification.type] || STYLES.info;
  const Icon = style.icon;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex justify-end pointer-events-none">
      <div
        role="status"
        // Fade-only entrance -- no transform/translate. A slide-in during
        // the transition renders the text on a sub-pixel Y offset for a
        // couple of frames (a well-known Chrome/Windows ClearType artifact),
        // which read as the whole toast looking blurry while it animates in.
        // Opacity alone never moves the text, so it stays crisp throughout.
        className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${style.border} ${style.bg} px-4 py-3 shadow-lg animate-in fade-in duration-150 max-w-sm`}
      >
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${style.iconColor}`} />
        <p className={`text-sm font-medium ${style.text} break-words`}>{notification.message}</p>
        <button
          onClick={hideNotification}
          className={`ml-1 shrink-0 rounded-md p-0.5 ${style.text} opacity-60 hover:opacity-100 transition-opacity`}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;

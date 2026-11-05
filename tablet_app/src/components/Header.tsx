// Frontend\tab\src\components\Header.jsx
import { useState } from "react";
import { LogOut } from "lucide-react";
import extractoLogo from "../assets/Extracto.svg";
import daccessLogo from "../assets/Daccess.svg";
import { useBackendStatus } from "../hooks/useBackendStatus";
import authService from "../services/authService";
import ConfirmDialog from "./ConfirmDialog";

export default function Header({ mode, onSetMode = undefined, onLogout }) {
  const status = useBackendStatus();
  const user = authService.getUser();
  // Cloud Backend's login returns { Emp_Name, ... }, Local Backend's
  // returns { name, ... } -- same login form works against either, so this
  // greeting needs to handle both response shapes.
  const displayName = user?.Emp_Name || user?.name;
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  const dot = {
    checking: "bg-yellow-400 animate-pulse",
    online: "bg-green-400",
    offline: "bg-rose-500",
  }[status];

  const label = {
    checking: "Connecting...",
    online: "Online",
    offline: "Offline",
  }[status];

  return (
    <header
      className="tab-header sticky top-0 z-20 flex flex-wrap items-center justify-between gap-y-3 border-b border-line bg-surface/80 backdrop-blur"
      style={{ padding: "12px 16px" }}
    >
      {/* Left logo — Extracto: 290×69 */}
      <img
        src={extractoLogo}
        alt="Extracto"
        className="shrink-0"
        style={{
          width: "clamp(90px, 20vw, 290px)",
          height: "clamp(22px, 4.8vw, 69px)",
          objectFit: "contain",
          objectPosition: "left",
        }}
      />

      {/* Center — Backend status + Automatic/Manual switch. Drops to its
          own full-width row (order-last, below both logos) once the row
          runs out of horizontal room, instead of clipping/overflowing. */}
      <div className="order-last flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:order-none sm:w-auto sm:flex-nowrap sm:gap-5">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${dot}`} />
          <span className="font-mono text-[9px] sm:text-[11px] tracking-widest text-muted">
            {label}
          </span>
        </div>

        {onSetMode && (
          <div
            className="flex items-center gap-1 rounded-full"
            style={{
              padding: 4,
              border: "1px solid rgba(3,112,249,0.3)",
              backgroundColor: "#EDF3FE",
            }}
          >
            {["upload", "manual", "returnable"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onSetMode(m)}
                className="rounded-full font-semibold transition"
                style={{
                  height: "clamp(28px, 3.6vw, 36px)",
                  padding: "0 clamp(10px, 1.6vw, 18px)",
                  fontSize: "clamp(11px, 1.4vw, 14px)",
                  whiteSpace: "nowrap",
                  backgroundColor: mode === m ? "#0370F9" : "transparent",
                  color: mode === m ? "#fff" : "#0370F9",
                }}
              >
                {m === "upload" ? "Automatic" : m === "manual" ? "Manual" : "Returnable"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {onLogout && (
          <button
            type="button"
            onClick={() => setConfirmLogoutOpen(true)}
            title={displayName ? `Logout (${displayName})` : "Logout"}
            className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 active:scale-95"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        )}

        {/* Right logo — Daccess: 177×68 */}
        <img
          src={daccessLogo}
          alt="Daccess"
          className="shrink-0"
          style={{
            width: "clamp(60px, 12vw, 177px)",
            height: "clamp(21px, 4.7vw, 68px)",
            objectFit: "contain",
            objectPosition: "right",
          }}
        />
      </div>

      <ConfirmDialog
        open={confirmLogoutOpen}
        title="Log out?"
        message={displayName ? `You're signed in as ${displayName}. You'll need to log in again to use this device.` : "You'll need to log in again to use this device."}
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        onConfirm={() => {
          setConfirmLogoutOpen(false);
          onLogout?.();
        }}
        onCancel={() => setConfirmLogoutOpen(false)}
      />
    </header>
  );
}

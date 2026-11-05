import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Eye, Edit, Trash2 } from "lucide-react";

const DashboardActionButton = ({
  record,
  onViewDetails,
  onEdit,
  onDelete,
  isDisabled,
  showView = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, ready: false });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const handleAction = (fn) => () => {
    if (isDisabled) return;
    setIsOpen(false);
    if (fn) fn(record);
  };

  // Measures the menu's real rendered size (varies with zoom/DPI/content)
  // instead of assuming a fixed height, so placement stays correct on any
  // screen resolution or zoom level.
  const calculatePosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0, ready: false };
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth || 180;
    const menuHeight = menuRef.current?.offsetHeight || 150;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const padding = 8;

    let top = rect.bottom + 4;
    let left = rect.right - menuWidth;

    if (top + menuHeight > viewportHeight - padding) {
      top = rect.top - menuHeight - 4;
      if (top < padding) top = viewportHeight - menuHeight - padding;
    }
    if (left < padding) left = rect.left;
    if (left + menuWidth > viewportWidth - padding)
      left = viewportWidth - menuWidth - padding;

    return { top, left, ready: true };
  };

  useLayoutEffect(() => {
    if (isOpen) setPosition(calculatePosition());
    else setPosition({ top: 0, left: 0, ready: false });
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      )
        setIsOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => setPosition(calculatePosition());
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={`p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors focus:outline-none ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label="Actions menu"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-transparent z-[9999]"
              onClick={() => setIsOpen(false)}
            />
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: `${position.top}px`,
                left: `${position.left}px`,
                visibility: position.ready ? "visible" : "hidden",
              }}
              className="z-[10000] w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 overflow-hidden ring-1 ring-black/5"
            >
              {showView && (
                <button
                  onClick={handleAction(onViewDetails)}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" /> View
                </button>
              )}
              <button
                onClick={handleAction(onEdit)}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
              >
                <Edit className="w-3.5 h-3.5 text-slate-400" /> Edit
              </button>
              <div className="my-1 border-t border-slate-100"></div>
              <button
                onClick={handleAction(onDelete)}
                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete
              </button>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};

export default DashboardActionButton;

// ==========================================
// FILE: src/components/masterData/ActionMenu.jsx
// ==========================================
import React, { useState, useRef, useEffect } from "react";
import {
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Ban,
  CheckCircle,
} from "lucide-react";

/**
 * ActionMenu Component
 * Three-dot menu with actions for each row
 * Now includes Block/Unblock Vendor option
 */
const ActionMenu = ({
  rowId,
  vendorData,
  onView,
  onEdit,
  onDelete,
  onBlock,
  onUnblock,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Check if vendor is blocked
  const isBlocked = vendorData?.status === "blocked";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action, callback) => {
    if (callback) {
      callback(rowId, vendorData);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-gray-100 rounded transition-colors"
        aria-label="Actions"
      >
        <MoreVertical className="w-5 h-5 text-gray-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          {/* View Details */}
          <button
            onClick={() => handleAction("view", onView)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>

          {/* Edit */}
          <button
            onClick={() => handleAction("edit", onEdit)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>

          {/* Divider */}
          <div className="border-t border-gray-100 my-1"></div>

          {/* Block/Unblock Vendor */}
          {isBlocked ? (
            <button
              onClick={() => handleAction("unblock", onUnblock)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Unblock Vendor
            </button>
          ) : (
            <button
              onClick={() => handleAction("block", onBlock)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors"
            >
              <Ban className="w-4 h-4" />
              Block Vendor
            </button>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100 my-1"></div>

          {/* Delete */}
          <button
            onClick={() => handleAction("delete", onDelete)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default ActionMenu;

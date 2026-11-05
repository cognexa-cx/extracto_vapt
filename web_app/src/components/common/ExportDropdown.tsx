import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

interface ExportDropdownProps {
  onExportExcel: () => void;
  onExportPDF?: () => void;
  isLoading?: boolean;
}

const ExportDropdown = ({ onExportExcel, onExportPDF, isLoading }: ExportDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (buttonRef.current && isOpen) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 160;

      setPosition({
        top: rect.bottom + 4,
        left: rect.right - dropdownWidth,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleExcelClick = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onExportExcel) onExportExcel();
  };

  const handlePDFClick = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onExportPDF) onExportPDF();
  };

  return (
    <>
      <div className="relative inline-block">
        <button
          ref={buttonRef}
          onClick={handleButtonClick}
          disabled={isLoading}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
          }`}
        >
          <Download
            className={`w-3.5 h-3.5 ${isLoading ? "animate-pulse" : ""}`}
          />
          {isLoading ? "Exporting..." : "Export"}
        </button>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          {createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[9999] w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
              style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleExcelClick}
                disabled={isLoading}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                  isLoading
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                Export to Excel
              </button>

              {/* <button
                onClick={handlePDFClick}
                disabled={isLoading}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                  isLoading
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FileText className="w-4 h-4 text-red-600" />
                Export to PDF
              </button> */}
            </div>,
            document.body,
          )}
        </>
      )}
    </>
  );
};

export default ExportDropdown;

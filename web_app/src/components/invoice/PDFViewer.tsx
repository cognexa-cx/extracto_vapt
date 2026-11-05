import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Download,
  Maximize2,
  RefreshCw,
  FileText,
  AlertCircle,
  Hand,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PDFViewer = ({ fileName = "Invoice.pdf", imageFileName, base64Data }: any) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(null);
  const [isPDF, setIsPDF] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const renderTaskRef = useRef(null);

  const BACKENDURL = import.meta.env.VITE_BACKEND_API_URL || "/api";
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;
  const SCALE_STEP = 0.25;

  // Load PDF.js
  useEffect(() => {
    const loadPdfJs = async () => {
      if (!window.pdfjsLib) {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.async = true;
        document.head.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve;
        });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
    };
    loadPdfJs();
  }, []);

  // URL Loading - FIXED
  useEffect(() => {
    setIsLoading(true);

    const tryUrls = async () => {
      // First try base64 if available
      if (base64Data) {
        console.log("📄 Using base64 PDF data");
        console.log("📄 Base64 length:", base64Data.length);
        console.log("📄 Base64 start:", base64Data.substring(0, 50));

        // Clean and validate base64
        let cleanBase64 = base64Data;

        // Remove any existing data URI prefix
        if (cleanBase64.startsWith("data:")) {
          cleanBase64 = cleanBase64.split(",")[1] || cleanBase64;
        }

        // Remove whitespace
        cleanBase64 = cleanBase64.replace(/\s/g, "");

        // Validate it's actually base64
        if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
          console.error("❌ Invalid base64 data");
          setImageError(true);
          setIsLoading(false);
          return;
        }

        const pdfUrl = `data:application/pdf;base64,${cleanBase64}`;
        console.log("✅ PDF URL created, length:", pdfUrl.length);

        setCurrentUrl(pdfUrl);
        setImageError(false);
        setIsPDF(true);
        setIsLoading(false);
        return;
      }

      // Then try URL-based loading
      const possibleUrls = getPossibleUrls();
      console.log("🔍 Trying URLs:", possibleUrls);

      for (const url of possibleUrls) {
        try {
          const response = await fetch(url, { method: "HEAD" });
          if (response.ok) {
            console.log("✅ Found PDF at:", url);
            setCurrentUrl(url);
            setImageError(false);
            const isPdfFile =
              url.toLowerCase().endsWith(".pdf") ||
              fileName.toLowerCase().endsWith(".pdf");
            setIsPDF(isPdfFile);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.log("❌ Failed:", url);
        }
      }

      console.warn("⚠️ No valid PDF URL found");
      setImageError(true);
      setIsLoading(false);
    };

    if (imageFileName || fileName || base64Data) {
      setIsPDF(fileName?.toLowerCase().endsWith(".pdf"));
      tryUrls();
    } else {
      setIsLoading(false);
    }
  }, [fileName, imageFileName, base64Data]);

  const getPossibleUrls = () => {
    const urls = [];
    if (imageFileName) {
      urls.push(`${BACKENDURL}/files/${imageFileName}`);
      const nameWithoutExt = imageFileName.replace(/\.[^/.]+$/, "");
      urls.push(`${BACKENDURL}/files/${nameWithoutExt}.png`);
      urls.push(`${BACKENDURL}/files/${nameWithoutExt}.jpg`);
    }
    if (fileName) {
      urls.push(`${BACKENDURL}/files/${fileName}`);
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
      urls.push(`${BACKENDURL}/files/${nameWithoutExt}.png`);
      urls.push(`${BACKENDURL}/files/${nameWithoutExt}.jpg`);
    }
    return [...new Set(urls)];
  };

  // Load PDF Document - FIXED with waiting for pdf.js
  useEffect(() => {
    if (!currentUrl || !isPDF) return;

    const loadPdf = async () => {
      // Wait for pdf.js to load
      let attempts = 0;
      while (!window.pdfjsLib && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.pdfjsLib) {
        console.error("❌ PDF.js failed to load");
        setImageError(true);
        return;
      }

      try {
        console.log("📄 Loading PDF document...");
        const loadingTask = window.pdfjsLib.getDocument(currentUrl);
        const pdf = await loadingTask.promise;
        console.log("✅ PDF loaded:", pdf.numPages, "pages");
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      } catch (error) {
        console.error("❌ Error loading PDF:", error);
        setImageError(true);
      }
    };
    loadPdf();
  }, [currentUrl, isPDF]);

  // Render PDF Page
  const renderPage = useCallback(
    async (pageNum) => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        context.clearRect(0, 0, canvas.width, canvas.height);

        // Get base viewport
        const baseViewport = page.getViewport({ scale: 1, rotation });

        // Get container width only
        const container = containerRef.current;
        const containerWidth = container.clientWidth;

        // FIT TO WIDTH (like image 2) - height can overflow with scroll
        const margin = 40;
        const widthScale = (containerWidth - margin) / baseViewport.width;

        // Slightly larger base scale for better readability
        const autoFitScale = widthScale * 1.15;
        const finalScale = autoFitScale * scale;

        // Get final viewport
        const viewport = page.getViewport({ scale: finalScale, rotation });

        // High quality rendering - boost for clarity
        const pixelRatio = window.devicePixelRatio || 2;
        const outputScale = Math.max(pixelRatio, 2) * 1.5; // 1.5x boost for crisp text

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = [outputScale, 0, 0, outputScale, 0, 0];

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        const renderContext = {
          canvasContext: context,
          transform,
          viewport,
        };

        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
        renderTaskRef.current = null;
      } catch (error) {
        if (error.name !== "RenderingCancelledException") {
          console.error("Error rendering page:", error);
        }
      }
    },
    [pdfDoc, scale, rotation],
  );

  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, rotation, renderPage]);

  // Re-render on container resize
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (pdfDoc && currentPage) {
        renderPage(currentPage);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [pdfDoc, currentPage, renderPage]);

  // Pan functionality
  const handleMouseDown = useCallback(
    (e) => {
      if (e.button !== 0 || !canvasRef.current) return;

      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      e.preventDefault();
    },
    [position],
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      setPosition({ x: newX, y: newY });
      e.preventDefault();
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
      setScale((prev) =>
        Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)),
      );
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        handleReset();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        handleZoomIn();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handlers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(MAX_SCALE, prev + SCALE_STEP));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(MIN_SCALE, prev - SCALE_STEP));
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
    setPosition({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setCurrentPage(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleFullscreen = () => {
    if (currentUrl && !imageError) {
      window.open(currentUrl, "_blank");
    }
  };

  const handleDownload = () => {
    if (currentUrl && !imageError) {
      const link = document.createElement("a");
      link.href = currentUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setPosition({ x: 0, y: 0 });
    }
  };

  const getZoomPercentage = () => Math.round(scale * 100);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 bg-teal-50 rounded flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-teal-600" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-gray-900 truncate">
              {fileName}
            </span>
            <span className="text-[10px] font-medium text-gray-500">
              PDF Document
            </span>
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={handleZoomOut}
            disabled={scale <= MIN_SCALE}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors disabled:opacity-30"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <span className="text-[11px] font-bold text-gray-700 w-10 text-center select-none">
            {getZoomPercentage()}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={scale >= MAX_SCALE}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors disabled:opacity-30"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1"></div>

          <button
            onClick={handleRotateLeft}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
            title="Rotate Left"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <button
            onClick={handleRotateRight}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
            title="Rotate Right"
          >
            <RotateCw className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>

          <div className="w-px h-4 bg-gray-200 mx-1"></div>

          <button
            onClick={handleReset}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
            title="Reset View"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <button
            onClick={handleDownload}
            disabled={imageError || !currentUrl}
            className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors disabled:opacity-30"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <button
            onClick={handleFullscreen}
            disabled={imageError || !currentUrl}
            className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors disabled:opacity-30"
            title="Open in New Tab"
          >
            <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Document Display */}
      <div
        ref={viewportRef}
        className="flex-1 bg-gray-50 overflow-y-auto overflow-x-hidden relative"
        onWheel={handleWheel}
        onMouseLeave={handleMouseLeave}
        style={{
          backgroundImage:
            "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 bg-white px-6 py-8 rounded-lg shadow-sm border border-gray-200">
              <div className="w-7 h-7 border-2 border-gray-200 border-t-teal-600 rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-gray-500">
                Loading document...
              </p>
            </div>
          </div>
        ) : imageError || !currentUrl ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-xs text-center shadow-sm">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-xs font-bold text-gray-900 mb-1">
                Preview Unavailable
              </h3>
              <p className="text-[11px] text-gray-500">
                The file could not be loaded.
              </p>
            </div>
          </div>
        ) : isPDF ? (
          <div
            ref={containerRef}
            className="w-full min-h-full flex justify-center py-6"
            onMouseDown={handleMouseDown}
            style={{
              cursor: isDragging ? "grabbing" : "grab",
              userSelect: "none",
            }}
          >
            <canvas
              ref={canvasRef}
              className="bg-white shadow-xl rounded border border-gray-300"
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                transition: isDragging ? "none" : "transform 0.1s ease-out",
                display: "block",
                userSelect: "none",
                WebkitUserSelect: "none",
                pointerEvents: "none",
              }}
            />
          </div>
        ) : (
          <div className="min-h-full flex items-center justify-center p-6">
            <img
              src={currentUrl}
              alt="Document"
              className="bg-white shadow-xl rounded border border-gray-300 max-w-full"
              style={{
                transform: `rotate(${rotation}deg) scale(${scale})`,
                transition: "transform 0.2s ease",
              }}
              onError={() => setImageError(true)}
              draggable={false}
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-3 py-1.5 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
          <span className="flex items-center gap-1 text-emerald-600">
            <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
            Ready
          </span>
          {isPDF && totalPages > 0 && (
            <>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30 transition"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="font-semibold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30 transition"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </>
          )}
          <span className="text-gray-300">•</span>
          <span>Zoom: {getZoomPercentage()}%</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <Hand className="w-3 h-3" />
          <span>Drag to pan</span>
          <span className="text-gray-300">•</span>
          <kbd className="px-1 py-0.5 bg-gray-50 border border-gray-200 rounded text-gray-600 font-mono text-[9px]">
            Ctrl+Scroll
          </kbd>
          <span>to zoom</span>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;

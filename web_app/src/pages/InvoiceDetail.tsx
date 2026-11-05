// ============================================
// FILE: src/pages/InvoiceDetail.jsx (UPDATED WITH APPROVER INFO)
// ============================================

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import authService from "../services/authService"; // ✅ Import authService
import InvoiceHeader from "../components/invoice/InvoiceHeader";
import PDFViewer from "../components/invoice/PDFViewer";
import ValidationSection from "../components/invoice/ValidationSection";
import CommentsSection from "../components/invoice/CommentsSection";
import ActionButtons from "../components/invoice/ActionButtons";
import ApproveRejectDialog from "../components/upload/ApproveRejectDialog";
import invoiceDetailService from "../services/invoiceDetailService";
import masterDataService from "../services/masterDataService";
import { mapInvoiceToMaster } from "../utils/invoiceToMasterMapper";

const InvoiceDetail = ({ invoiceId = "INV-001" }) => {
  const navigate = useNavigate();
  const { showNotification, navigateBack } = useAppContext();

  const [invoiceData, setInvoiceData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedValidations, setEditedValidations] = useState([]);
  const [comments, setComments] = useState("");
  const [invChecked, setInvChecked] = useState(false);

  // Dialog States
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // ✅ GET LOGGED-IN USER INFO
  const loggedInUser = authService.getUser();
  const approverName =
    loggedInUser?.name || loggedInUser?.username || "Unknown User";

  // Calculate stats (excluding Comments field)
  const stats = useMemo(() => {
    if (!invoiceData?.validations) return null;

    const validations = isEditMode
      ? editedValidations
      : invoiceData.validations;
    const relevantValidations = validations.filter(
      (v) => v.label?.toLowerCase() !== "comments",
    );

    return {
      totalFields: relevantValidations.length,
      highConfidence: relevantValidations.filter((v) => v.confidence === "HIGH")
        .length,
      modifiedFields: relevantValidations.filter(
        (v) => v.confidence === "MODIFIED",
      ).length,
      lowConfidence: relevantValidations.filter(
        (v) => v.confidence !== "HIGH" && v.confidence !== "MODIFIED",
      ).length,
      accuracy: invoiceData.accuracy || 0,
    };
  }, [
    invoiceData?.validations,
    editedValidations,
    isEditMode,
    invoiceData?.accuracy,
  ]);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      setLoading(true);
      try {
        const response: any = await invoiceDetailService.getInvoiceDetail(invoiceId);
        const rawResponse = response.data || response;
        const fileData = rawResponse.files?.[0];

        if (!fileData) throw new Error("No file data found");

        const backendAccuracy = fileData.accuracy ?? fileData.data?.accuracy;
        const fieldValues = fileData.data || {};
        const fieldConfidences = fileData.confidence || {};

        const backendValidations = Object.keys(fieldValues).map((key) => ({
          field_name: key,
          value: fieldValues[key],
          confidence: fieldConfidences[key] || "HIGH",
        }));

        const transformedData = {
          id: fileData.data?.Invoice_Number || invoiceId,
          fileName: fileData.filename || "Invoice.pdf",
          status: fileData.data?.approval_status || "Inward",
          flow: fileData.flow || "inward",
          base64Data: fileData.file_base64,
          fileMime: fileData.file_mime,
          accuracy: backendAccuracy,
          validations: transformValidations(backendValidations),
          comments: fileData.data?.comments || "",
          Approval_Name: fileData.data?.Approval_Name,
          Action_Date: fileData.data?.Action_Date,
          metadata: {
            uploadedAt: fileData.meta?.extraction_timestamp,
            totalFields: fileData.meta?.total_fields_extracted,
          },
        };

        setInvoiceData(transformedData);
        setOriginalData(JSON.parse(JSON.stringify(transformedData)));
        setEditedValidations(transformedData.validations);
        setComments(transformedData.comments || "");
      } catch (error) {
        console.error("❌ Error loading invoice:", error);
        showNotification("Failed to load invoice data", "error");
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) fetchInvoiceData();
  }, [invoiceId, showNotification]);

  const transformValidations = (backendValidations) => {
    if (!Array.isArray(backendValidations)) return [];

    return backendValidations.map((item, index) => {
      const transformed: Record<string, any> = {
        id: item.id || index + 1,
        label: item.label || item.field_name || `Field ${index + 1}`,
        isConfirmed: item.is_confirmed ?? item.isConfirmed ?? true,
        confidence: item.confidence || "HIGH",
      };

      const initialValue =
        item.invoiceValue !== undefined
          ? item.invoiceValue
          : item.invoice_value !== undefined
            ? item.invoice_value
            : item.value !== undefined
              ? item.value
              : "";

      transformed.invoiceValue = initialValue;
      transformed.value = item.value || item.invoice_value || initialValue;

      return transformed;
    });
  };

  const handleEditOCR = () => {
    setIsEditMode(true);
    setEditedValidations([...invoiceData.validations]);
    showNotification(
      "Edit mode activated. You can now modify the fields.",
      "info",
    );
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedValidations([...invoiceData.validations]);
    showNotification("Changes discarded", "info");
  };

  const handleValueChange = (itemId, field, value) => {
    setEditedValidations((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const original = originalData?.validations.find(
            (ov) => ov.id === itemId,
          );
          const originalValue = original?.value;

          const normalizedCurrent =
            value === null || value === undefined || value === "" ? "" : value;
          const normalizedOriginal =
            originalValue === null ||
            originalValue === undefined ||
            originalValue === ""
              ? ""
              : originalValue;

          const isModified = normalizedCurrent !== normalizedOriginal;

          return {
            ...item,
            invoiceValue: value,
            confidence: isModified
              ? "MODIFIED"
              : original?.confidence || "HIGH",
          };
        }
        return item;
      }),
    );
  };

  const handleSaveEdit = () => {
    setInvoiceData((prev) => ({ ...prev, validations: editedValidations }));
    setIsEditMode(false);

    const hasChanges = editedValidations.some((v) => {
      const original = invoiceData.validations.find((ov) => ov.id === v.id);
      if (!original) return false;

      const currentValue = v.invoiceValue ?? v.value;
      const originalValue = original.value;

      const normalizedCurrent =
        currentValue === null ||
        currentValue === undefined ||
        currentValue === ""
          ? ""
          : currentValue;
      const normalizedOriginal =
        originalValue === null ||
        originalValue === undefined ||
        originalValue === ""
          ? ""
          : originalValue;

      return normalizedCurrent !== normalizedOriginal;
    });

    if (hasChanges) setInvChecked(true);

    showNotification(
      hasChanges ? "Changes saved. Ready to approve." : "No changes to save.",
      hasChanges ? "success" : "info",
    );
  };

  const handleCommentsChange = (newComments) => setComments(newComments);

  // ==================== ACTION HANDLERS ====================

  const handleCancelClick = () => {
    if (isEditMode) {
      showNotification("Please save or cancel your edits first", "error");
      return;
    }
    setCurrentAction("cancel");
    setShowActionDialog(true);
  };

  const handlePendingClick = () => {
    if (isEditMode) {
      showNotification("Please save or cancel your edits first", "error");
      return;
    }
    setCurrentAction("pending");
    setShowActionDialog(true);
  };

  const handleRejectClick = () => {
    if (isEditMode) {
      showNotification("Please save or cancel your edits first", "error");
      return;
    }
    setCurrentAction("reject");
    setShowActionDialog(true);
  };

  const handleApproveClick = () => {
    if (isEditMode) {
      showNotification("Please save or cancel your edits first", "error");
      return;
    }
    setCurrentAction("approve");
    setShowActionDialog(true);
  };

  const handleActionConfirm = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);
    setProcessing(true);

    try {
      if (currentAction === "cancel") {
        await new Promise((resolve) => setTimeout(resolve, 300));
        setIsActionLoading(false);
        setShowActionDialog(false);
        showNotification("Cancelled. Returning to dashboard.", "info");
        setTimeout(() => {
          if (navigateBack) navigateBack();
          else navigate("/dashboard");
        }, 500);
        return;
      }

      const backendAccuracy =
        invoiceData.accuracy ?? invoiceData.metadata?.accuracy ?? 0;
      const masterData = mapInvoiceToMaster(
        invoiceData,
        comments,
        backendAccuracy,
        originalData,
      );

      const wasAnythingEdited = invoiceData.validations?.some((v) => {
        const original = originalData?.validations?.find(
          (ov) => ov.id === v.id,
        );
        if (!original) return false;

        const currentValue = v.invoiceValue ?? v.value;
        const originalValue = original.value;

        const normalizedCurrent =
          currentValue === null ||
          currentValue === undefined ||
          currentValue === ""
            ? ""
            : currentValue;
        const normalizedOriginal =
          originalValue === null ||
          originalValue === undefined ||
          originalValue === ""
            ? ""
            : originalValue;

        return normalizedCurrent !== normalizedOriginal;
      });

      if (wasAnythingEdited && masterData.human_intervention === "No") {
        masterData.human_intervention = "Yes";
      }

      masterData.inv_verified = invChecked;
      masterData.invoice_type = (invoiceData.status || "Inward").toLowerCase();

      // ✅ ADD APPROVER NAME AND TIMESTAMP
      const currentTimestamp = new Date().toISOString();
      masterData.Approval_Name = approverName;
      masterData.Action_Date = currentTimestamp;

      console.log("✅ Approver Info:", {
        name: approverName,
        timestamp: currentTimestamp,
        action: currentAction,
      });

      if (currentAction === "pending") masterData.approval_status = "Pending";
      else if (currentAction === "reject")
        masterData.approval_status = "Reject";
      else if (currentAction === "approve")
        masterData.approval_status = "Approve";

      await masterDataService.saveApprovedInvoice(masterData);

      setIsActionLoading(false);
      setShowActionDialog(false);

      const messages = {
        pending: `Invoice marked as Pending by ${approverName}! ⏳`,
        reject: `Invoice rejected by ${approverName}! ✗`,
        approve: `Invoice approved by ${approverName}! ✓`,
      };
      const notifTypes = {
        pending: "info",
        reject: "warning",
        approve: "success",
      };

      showNotification(messages[currentAction], notifTypes[currentAction]);

      setTimeout(() => {
        if (navigateBack) navigateBack();
        else navigate("/dashboard");
      }, 1000);
    } catch (error) {
      console.error("❌ Error processing invoice:", error);
      showNotification(error.message || "Failed to save invoice", "error");
      setIsActionLoading(false);
      setProcessing(false);
    }
  };

  // ✅ Show approval info helper
  const getApprovalInfo = () => {
    if (!invoiceData?.Approval_Name && !invoiceData?.Action_Date) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            {invoiceData.Approval_Name && (
              <p className="text-sm font-semibold text-gray-800">
                Approved by:{" "}
                <span className="text-teal-700">
                  {invoiceData.Approval_Name}
                </span>
              </p>
            )}
            {invoiceData.Action_Date && (
              <p className="text-xs text-gray-500 mt-1">
                {new Date(invoiceData.Action_Date).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
          </div>
          <CheckCircle2 className="w-6 h-6 text-teal-600" />
        </div>
      </div>
    );
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-semibold text-gray-500">
            Loading invoice data...
          </p>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200 shadow-sm mt-10">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">
          !
        </div>
        <h3 className="text-lg font-bold text-gray-900">Invoice Not Found</h3>
        <p className="text-gray-500 text-sm mb-6 text-center max-w-xs">
          Invoice ID: {invoiceId}
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Invoice Header */}
      <InvoiceHeader
        fileName={invoiceData.fileName}
        status={invoiceData.status}
        stats={stats}
        accuracy={invoiceData.accuracy}
      />

      {/* Main Content Grid - IMPROVED LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Left Column: PDF Viewer - full height on desktop split view, a
            shorter proportional height on mobile/tablet where the two
            columns stack (a 600px floor per panel here would force ~1200px
            of scroll before the second panel even starts) */}
        <div className="h-[70vh] min-h-[400px] xl:h-[calc(100vh-220px)] xl:min-h-[600px]">
          <PDFViewer
            fileName={invoiceData.fileName}
            imageFileName={invoiceData.imageFileName}
            base64Data={invoiceData.base64Data}
          />
        </div>

        {/* Right Column: Details & Actions - FIXED HEIGHT WITH SCROLL */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-[70vh] min-h-[400px] xl:h-[calc(100vh-220px)] xl:min-h-[600px]">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">
              {/* ✅ Approval Info - if exists */}
              {getApprovalInfo()}

              {/* Extracted Data Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2 sticky top-0 bg-white py-2 z-10">
                  <span className="w-1 h-4 bg-teal-500 rounded-full"></span>
                  Extracted Data
                </h3>
                <ValidationSection
                  validations={
                    isEditMode ? editedValidations : invoiceData.validations
                  }
                  isEditMode={isEditMode}
                  onValueChange={handleValueChange}
                />
              </div>

              {/* Comments Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800">
                    Comments & Notes
                  </h3>
                </div>
                <CommentsSection
                  comments={comments}
                  onCommentsChange={handleCommentsChange}
                  disabled={isEditMode}
                />
              </div>

              {/* Verification Checkbox */}
              <div
                className={`border rounded-xl p-4 flex items-center justify-between transition-all ${
                  invChecked
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      id="inv-checkbox"
                      checked={invChecked}
                      readOnly
                      disabled
                      className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="inv-checkbox"
                      className={`block text-sm font-bold cursor-not-allowed ${
                        invChecked ? "text-emerald-900" : "text-gray-700"
                      }`}
                    >
                      Invoice Verified (INV)
                    </label>
                    <p className="text-xs text-gray-500">
                      {invChecked
                        ? "Data has been reviewed and modified"
                        : "Marked automatically after saving edits"}
                    </p>
                  </div>
                </div>
                {invChecked && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>

          {/* Sticky Footer: Action Buttons */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-4 shadow-sm">
            <ActionButtons
              onEditOCR={handleEditOCR}
              onCancel={handleCancelClick}
              onPending={handlePendingClick}
              onReject={handleRejectClick}
              onApprove={handleApproveClick}
              disabled={processing}
              isEditMode={isEditMode}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        </div>
      </div>

      {/* Processing Overlay */}
      {processing && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 text-center shadow-xl max-w-sm mx-4">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-bold text-gray-900">
              Processing Invoice
            </h3>
            <p className="text-sm text-gray-500 mt-2">Saving to database...</p>
          </div>
        </div>
      )}

      {/* Action Confirmation Dialog */}
      <ApproveRejectDialog
        isOpen={showActionDialog}
        onClose={() => {
          if (!isActionLoading) {
            setShowActionDialog(false);
            setCurrentAction(null);
          }
        }}
        onConfirm={handleActionConfirm}
        action={currentAction}
        isLoading={isActionLoading}
      />
    </div>
  );
};

export default InvoiceDetail;

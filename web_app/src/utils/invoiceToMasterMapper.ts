// ============================================
// FILE: src/utils/invoiceToMasterMapper.js (FIXED - Human Intervention)
// ============================================

/**
 * Map invoice data to master data format for database
 * ✅ FIXED: Ensures comments and human_intervention are NOT overwritten by validation fields
 * ✅ FIXED: Human intervention now ONLY checks for actual edits (not low confidence)
 */
export const mapInvoiceToMaster = (
  invoiceData,
  comments,
  backendAccuracy,
  originalData,
) => {
  console.log("🔄 Mapping invoice to master data format");
  console.log("🎯 Received accuracy parameter:", backendAccuracy);
  console.log("💬 Comments received:", comments);

  // Determine human intervention FIRST
  const humanIntervention = determineHumanIntervention(
    invoiceData,
    originalData,
  );

  console.log("👤 Human Intervention determined:", humanIntervention);

  // ✅ CRITICAL: Create masterData object WITHOUT system fields first
  const masterData: Record<string, any> = {};

  // ✅ Map ALL validation fields FIRST (from invoice data)
  let mappedFieldCount = 0;
  invoiceData.validations?.forEach((validation) => {
    if (!validation.fieldName) {
      console.warn("⚠️ Validation missing fieldName:", validation);
      return;
    }

    // Skip system fields - we'll add them later
    const systemFields = [
      "comments",
      "human_intervention",
      "approval_status",
      "accuracy",
      "inv_verified",
    ];
    if (systemFields.includes(validation.fieldName.toLowerCase())) {
      console.warn(
        `⚠️ Skipping system field from validations: ${validation.fieldName}`,
      );
      return;
    }

    // Use invoiceValue if available (edited), otherwise use original value
    const value =
      validation.invoiceValue !== undefined
        ? validation.invoiceValue
        : validation.value;

    // Store in master data using original field name
    masterData[validation.fieldName] = value;
    mappedFieldCount++;
  });

  // ✅ NOW add system fields AFTER all validation fields (so they won't be overwritten)
  masterData.filename = invoiceData.fileName || invoiceData.imageFileName;
  masterData.invoice_type = invoiceData.flow || "inward";
  masterData.accuracy = backendAccuracy;
  masterData.approval_status = "Pending"; // Will be overridden by caller
  masterData.human_intervention = humanIntervention;
  masterData.comments = comments || ""; // ✅ Use the comments parameter, not from validations
  masterData.inv_verified = false; // Will be overridden by caller
  masterData.created_at = new Date().toISOString();

  console.log("📋 System fields set:", {
    human_intervention: masterData.human_intervention,
    comments: masterData.comments
      ? `"${masterData.comments}"`
      : "(empty string)",
    approval_status: masterData.approval_status,
  });

  console.log("✅ Mapped master data:", {
    filename: masterData.filename,
    accuracy: masterData.accuracy,
    human_intervention: masterData.human_intervention,
    comments: masterData.comments,
    approval_status: masterData.approval_status,
    inv_verified: masterData.inv_verified,
    fieldCount: mappedFieldCount,
    totalKeys: Object.keys(masterData).length,
  });

  return masterData;
};

/**
 * Determine if human intervention occurred
 * ✅ FIXED: Only checks for actual edits, NOT low confidence fields
 */
const determineHumanIntervention = (invoiceData, originalData) => {
  console.log("🔍 Checking for human intervention...");

  if (!originalData?.validations) {
    console.log("⚠️ No original data available, defaulting to 'No'");
    return "No";
  }

  // Check if any fields were edited
  const wasEdited = invoiceData.validations?.some((v) => {
    const original = originalData.validations.find((ov) => ov.id === v.id);
    if (!original) return false;

    const currentValue = v.invoiceValue ?? v.value;
    const originalValue = original.value;

    // Normalize empty values for comparison
    const normalizedCurrent =
      currentValue === null || currentValue === undefined || currentValue === ""
        ? ""
        : currentValue;
    const normalizedOriginal =
      originalValue === null ||
      originalValue === undefined ||
      originalValue === ""
        ? ""
        : originalValue;

    const isModified = normalizedCurrent !== normalizedOriginal;

    if (isModified) {
      console.log(`✏️ Field modified: ${v.label || v.fieldName}`, {
        original: originalValue,
        current: currentValue,
      });
    }

    return isModified;
  });

  // ✅ FIXED: Only return "Yes" if fields were actually edited
  const result = wasEdited ? "Yes" : "No";

  console.log("📊 Human Intervention Result:", {
    wasEdited,
    result,
  });

  return result;
};

/**
 * Calculate accuracy based on confirmed validations
 * ⚠️ This should ONLY be used for UI display, NOT for saving to database
 */
export const calculateAccuracy = (validations) => {
  console.warn(
    "⚠️ calculateAccuracy called - this should NOT be used when saving to DB",
  );

  if (!validations || validations.length === 0) return 0;

  // Exclude Comments field from accuracy calculation
  const relevantValidations = validations.filter(
    (v) => v.label?.toLowerCase() !== "comments",
  );

  if (relevantValidations.length === 0) return 0;

  const highConfidenceCount = relevantValidations.filter(
    (v) => v.confidence === "HIGH" || v.confidence === "MODIFIED",
  ).length;

  const accuracy = Math.round(
    (highConfidenceCount / relevantValidations.length) * 100,
  );

  console.log("📊 Calculated Accuracy (for UI only):", accuracy, "%");
  return accuracy;
};

export default mapInvoiceToMaster;

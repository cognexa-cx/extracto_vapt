import BASE_URL from "./api";

export async function approveExtraction(sessionId, extractResult, direction) {
  const formData = new FormData();
  formData.append("session_id", sessionId);
  formData.append("direction", direction);
  formData.append("document_type", extractResult.document_type || "");
  formData.append("ocr_text", extractResult.ocr_text || "");
  formData.append("extracted_data", JSON.stringify(extractResult.extracted_data || {}));

  const response = await fetch(`${BASE_URL}/approve`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.detail?.[0]?.msg || `Approve error: ${response.status}`,
    );
  }

  return response.json();
}

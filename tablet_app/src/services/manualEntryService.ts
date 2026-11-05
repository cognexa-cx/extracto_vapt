import BASE_URL from "./api";

/**
 * approveManualEntry — sends fields (JSON) + optional image as multipart/form-data
 * Backend: POST /manual/approve (multipart/form-data)
 *   - fields: JSON string  e.g. '[{"key":"Invoice No","value":"123"}]'
 *   - image: File (optional)
 */
export async function approveManualEntry(fields, imageFile = null) {
  const formData = new FormData();

  // Serialise fields as JSON string — backend expects Form field "fields"
  formData.append(
    "fields",
    JSON.stringify(
      fields
        .filter((f) => f.key?.trim())
        .map((f) => ({ key: f.key.trim(), value: f.value || "" }))
    )
  );

  // Attach image if provided
  if (imageFile) {
    formData.append("image", imageFile, imageFile.name);
  }

  const response = await fetch(`${BASE_URL}/manual/approve`, {
    method: "POST",
    // ⚠️ Do NOT set Content-Type — browser sets it with boundary automatically for FormData
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.detail?.[0]?.msg || `Manual approve error: ${response.status}`
    );
  }

  return response.json();
}

export async function rejectManualEntry() {
  const response = await fetch(`${BASE_URL}/manual/reject`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.detail?.[0]?.msg || `Manual reject error: ${response.status}`
    );
  }

  return response.json();
}

/**
 * getManualHistory — fetch all manual entry records
 * Backend: GET /manual/history?limit=50&offset=0
 */
export async function getManualHistory(limit = 50, offset = 0) {
  const response = await fetch(
    `${BASE_URL}/manual/history?limit=${limit}&offset=${offset}`
  );
  if (!response.ok) {
    throw new Error(`Manual history error: ${response.status}`);
  }
  return response.json();
}

/**
 * deleteManualRecord — delete a manual record + its blob from Azure
 * Backend: DELETE /manual/history/{id}
 */
export async function deleteManualRecord(id) {
  const response = await fetch(`${BASE_URL}/manual/history/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Manual delete error: ${response.status}`);
  }
  return response.json();
}

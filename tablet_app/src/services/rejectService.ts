import BASE_URL from "./api";

export async function rejectExtraction(sessionId) {
  const formData = new FormData();
  formData.append("session_id", sessionId);

  const response = await fetch(`${BASE_URL}/reject`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.detail?.[0]?.msg || `Reject error: ${response.status}`,
    );
  }

  return response.json();
}

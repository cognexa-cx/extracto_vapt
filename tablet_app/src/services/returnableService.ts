import BASE_URL from "./api";

// Fetches every "returnable" direction record (Active + Returned) — filtering
// by status/vehicle/vendor/date happens client-side in ReturnableListPage,
// same as how Extracto-Web's dashboard filters its own record list.
export async function getReturnableRecords() {
  const response = await fetch(
    `${BASE_URL}/history/all?direction=returnable`,
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.detail?.[0]?.msg || `Failed to load returnable items: ${response.status}`,
    );
  }

  const data = await response.json();
  return data.records || [];
}

// Flips a record's return_status. The backend stamps/clears `returned_at`
// itself — the client never sends a timestamp.
export async function setReturnStatus(recordId, status) {
  const response = await fetch(`${BASE_URL}/history/${recordId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ return_status: status }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || `Failed to update status: ${response.status}`);
  }

  return data.record;
}

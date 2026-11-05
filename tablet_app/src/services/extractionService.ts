import BASE_URL from "./api";

export async function extractChallan(
  challanFiles,
  direction = "inward",
) {
  const pages = Array.isArray(challanFiles) ? challanFiles : [challanFiles];

  const formData = new FormData();
  pages.forEach((file) => formData.append("challan_images", file));
  formData.append("direction", direction);

  const response = await fetch(`${BASE_URL}/extract`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.detail?.[0]?.msg || `Server error: ${response.status}`,
    );
  }

  return response.json();
}

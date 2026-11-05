import BASE_URL from "./api";

export async function uploadVehiclePhotos(
  frontFile,
  backFile,
  direction = "inward",
) {
  const formData = new FormData();
  formData.append("vehicle_front_image", frontFile);
  formData.append("vehicle_back_image", backFile);
  formData.append("direction", direction);

  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.detail?.[0]?.msg || `Upload error: ${response.status}`,
    );
  }

  return response.json();
}

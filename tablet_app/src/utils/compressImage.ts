// Frontend\tab\src\utils\compressImage.js

// Downscale + re-encode a captured photo before it ever leaves the device.
// Real tablet camera photos run 3000-4000px / several MB each; uploading
// 3-5 of those (multi-page invoice + front + back) over a real WiFi/cellular
// connection can take long enough to hit a proxy-level idle/read timeout,
// which shows up to the user as a bare "fetch failed" with no HTTP response
// at all. Shrinking the file client-side is the most direct fix since it
// cuts the thing that's actually slow — how much has to travel over the
// tablet's network — regardless of the exact timeout value on the way in.
//
// Max edge and quality are kept generous (well above what OCR/LLM need for
// legible text) so this has no meaningful accuracy impact.
const MAX_EDGE = 2400;
const JPEG_QUALITY = 0.9;

export function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type?.startsWith("image/")) {
      resolve(file); // never touch non-image files (shouldn't occur, but safe)
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { width, height } = img;
      const longestEdge = Math.max(width, height);

      if (longestEdge <= MAX_EDGE) {
        resolve(file); // already small enough — don't re-encode for no reason
        return;
      }

      const scale = MAX_EDGE / longestEdge;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file); // encoding failed — fall back to the original
            return;
          }
          resolve(
            new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            }),
          );
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // couldn't decode — fall back to the original rather than blocking capture
    };

    img.src = objectUrl;
  });
}

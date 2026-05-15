const ALLOWED_UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateWinnerProofFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!ALLOWED_UPLOAD_TYPES.has(file.type) || !ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Upload must be a PNG, JPG, or WEBP image.");
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Upload must be smaller than 5 MB.");
  }
}

export function safeUploadExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "jpeg") return "jpg";
  return extension;
}

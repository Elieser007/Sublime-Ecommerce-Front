/**
 * Image Processing — Tarea 2
 * 
 * Processes uploaded images before sending to backend:
 * 1. Validates file type (PNG, JPG, WebP only)
 * 2. Validates file size (max 5MB)
 * 3. Resizes to max 1000x1000 maintaining aspect ratio
 * 4. Converts to WebP at 80% quality
 * 5. Returns Blob ready for fetch() (multipart/form-data)
 * 
 * Uses native <canvas> API — no external dependencies.
 * Critical parts are commented for maintainability.
 */

export const IMAGE_CONFIG = {
  MAX_WIDTH: 1000,
  MAX_HEIGHT: 1000,
  OUTPUT_TYPE: "image/webp",
  QUALITY: 0.8, // 80% quality — good balance of size vs quality
  MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ["image/png", "image/jpeg", "image/webp"],
} as const;

/**
 * Process an image file for upload.
 * 
 * @param file - The original image file from <input type="file">
 * @returns Promise<Blob> - Processed WebP blob ready for upload
 * @throws Error if file type is invalid, too large, or processing fails
 */
export async function processImage(file: File): Promise<Blob> {
  // --- VALIDATION ---

  // Validate file type
  if (!IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `Formato no soportado: ${file.type}. Usa PNG, JPG o WebP.`
    );
  }

  // Validate file size
  if (file.size > IMAGE_CONFIG.MAX_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `La imagen es muy grande (${sizeMB}MB). Máximo 5MB.`
    );
  }

  // --- LOAD IMAGE ---

  // Create image element to load the file
  const img = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Error al cargar la imagen"));
      img.src = objectUrl;
    });

    // --- CALCULATE DIMENSIONS ---
    // Maintain aspect ratio, never exceed max dimensions

    let { width, height } = img;

    if (width > IMAGE_CONFIG.MAX_WIDTH || height > IMAGE_CONFIG.MAX_HEIGHT) {
      // Calculate scale ratio to fit within max bounds
      const ratio = Math.min(
        IMAGE_CONFIG.MAX_WIDTH / width,
        IMAGE_CONFIG.MAX_HEIGHT / height
      );
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // --- DRAW TO CANVAS ---

    // Create canvas with calculated dimensions
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    // Get 2D context and draw resized image
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("No se pudo crear el contexto del canvas");
    }

    // High-quality downsampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw image scaled to fit canvas
    ctx.drawImage(img, 0, 0, width, height);

    // --- CONVERT TO WEBP ---

    // Convert canvas to WebP blob at 80% quality
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Error al convertir a WebP"));
          }
        },
        IMAGE_CONFIG.OUTPUT_TYPE,
        IMAGE_CONFIG.QUALITY
      );
    });

    return blob;
  } finally {
    // Clean up object URL to prevent memory leak
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Get a preview URL for an image file.
 * Useful for showing preview before upload.
 */
export function getPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

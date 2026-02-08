import { ExternalBlob } from '../backend';

/**
 * Validates if a file is a JPEG image
 */
export function isValidJpegFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg'];
  return validTypes.includes(file.type.toLowerCase());
}

/**
 * Converts a File to Uint8Array for ExternalBlob creation
 */
export async function fileToBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      resolve(new Uint8Array(arrayBuffer));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Creates a preview URL for a File object
 */
export function createFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Gets the display URL for an ExternalBlob
 */
export function getExternalBlobUrl(blob: ExternalBlob): string {
  return blob.getDirectURL();
}

/**
 * Creates an ExternalBlob from a File with optional upload progress tracking
 */
export async function createExternalBlobFromFile(
  file: File,
  onProgress?: (percentage: number) => void
): Promise<ExternalBlob> {
  const bytes = await fileToBytes(file);
  // Cast to the specific type expected by ExternalBlob.fromBytes
  const typedBytes = new Uint8Array(bytes.buffer as ArrayBuffer);
  const blob = ExternalBlob.fromBytes(typedBytes);
  
  if (onProgress) {
    return blob.withUploadProgress(onProgress);
  }
  
  return blob;
}

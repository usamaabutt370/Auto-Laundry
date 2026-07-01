import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

export type PreparedImageUpload = {
  bytes: ArrayBuffer;
  ext: string;
  contentType: string;
};

function shouldFetchUri(uri: string): boolean {
  return (
    Platform.OS === "web" ||
    uri.startsWith("blob:") ||
    uri.startsWith("data:") ||
    uri.startsWith("http://") ||
    uri.startsWith("https://")
  );
}

export function needsJpegConversion(uri: string, mimeType?: string | null): boolean {
  const m = (mimeType ?? "").toLowerCase();
  const lower = uri.toLowerCase();
  return (
    m.includes("heic") ||
    m.includes("heif") ||
    m.includes("avif") ||
    lower.endsWith(".heic") ||
    lower.endsWith(".heif") ||
    lower.endsWith(".avif")
  );
}

/** Read a picked image URI into bytes for Supabase storage upload. */
export async function readLocalImageBytes(localUri: string): Promise<ArrayBuffer> {
  if (shouldFetchUri(localUri)) {
    const response = await fetch(localUri);
    if (!response.ok) {
      throw new Error("Could not read the selected image.");
    }
    return response.arrayBuffer();
  }

  const file = new FileSystem.File(localUri);
  return file.arrayBuffer();
}

export function imageExtAndContentType(
  uri: string,
  mimeType?: string | null,
): { ext: string; contentType: string } {
  const m = (mimeType ?? "").toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (m.includes("png")) return { ext: "png", contentType: "image/png" };
  if (m.includes("webp")) return { ext: "webp", contentType: "image/webp" };

  const lower = uri.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (lower.endsWith(".png")) return { ext: "png", contentType: "image/png" };
  if (lower.endsWith(".webp")) return { ext: "webp", contentType: "image/webp" };
  return { ext: "jpg", contentType: "image/jpeg" };
}

async function convertHeicToJpegWeb(uri: string): Promise<ArrayBuffer> {
  const heic2any = (await import("heic2any")).default;
  const input = await fetch(uri).then((response) => {
    if (!response.ok) {
      throw new Error("Could not read the selected image.");
    }
    return response.blob();
  });
  const converted = await heic2any({
    blob: input,
    toType: "image/jpeg",
    quality: 0.85,
  });
  const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
  return jpegBlob.arrayBuffer();
}

async function convertToJpegNative(uri: string): Promise<ArrayBuffer> {
  const ImageManipulator = await import("expo-image-manipulator");
  const result = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return readLocalImageBytes(result.uri);
}

async function convertToJpeg(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === "web") {
    return convertHeicToJpegWeb(uri);
  }
  return convertToJpegNative(uri);
}

/** Normalize picked images to a storage-safe format (JPEG when HEIC/HEIF/AVIF). */
export async function prepareImageForUpload(
  uri: string,
  mimeType?: string | null,
): Promise<PreparedImageUpload> {
  if (needsJpegConversion(uri, mimeType)) {
    return {
      bytes: await convertToJpeg(uri),
      ext: "jpg",
      contentType: "image/jpeg",
    };
  }

  const { ext, contentType } = imageExtAndContentType(uri, mimeType);
  return {
    bytes: await readLocalImageBytes(uri),
    ext,
    contentType,
  };
}

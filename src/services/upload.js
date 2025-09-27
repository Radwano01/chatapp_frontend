import api from "./api";

export const MESSAGE_TYPES = {
  TEXT: "TEXT",
  AUDIO: "AUDIO",
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
  FILE: "FILE",
};

// Maximum file size: 5GB (S3 PutObject limit)
export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB in bytes

/**
 * Format file size in bytes to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Infer backend UploadType (IMAGE|VIDEO|AUDIO|FILE) from MIME type
 * @param {File} file
 * @returns {"IMAGE"|"VIDEO"|"AUDIO"|"FILE"}
 */
export function inferBackendUploadType(file) {
  const mime = file?.type || "";
  const name = file?.name || "";
  
  // Check MIME type first
  if (mime.startsWith("image/")) return MESSAGE_TYPES.IMAGE;
  if (mime.startsWith("video/")) return MESSAGE_TYPES.VIDEO;
  if (mime.startsWith("audio/")) return MESSAGE_TYPES.AUDIO;
  
  // Fallback to file extension for cases where MIME type might be incorrect
  const lowerName = name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(lowerName)) return MESSAGE_TYPES.IMAGE;
  if (/\.(mp4|mov|avi|mkv)$/.test(lowerName)) return MESSAGE_TYPES.VIDEO;
  if (/\.(mp3|wav|ogg|m4a|webm|aac|flac)$/.test(lowerName)) return MESSAGE_TYPES.AUDIO;
  
  return MESSAGE_TYPES.FILE;
}

/**
 * Upload a file via POST /upload and return filename + messageType.
 * Backend returns plain string filename (S3 key) or { filename }.
 * @param {File} file
 * @param {"IMAGE"|"VIDEO"|"AUDIO"|"FILE"} [explicitType]
 * @param {(progress:number)=>void} [onProgress]
 */
export async function uploadToBackend(file, explicitType, onProgress) {
  if (!file) throw new Error("uploadToBackend: file is required");
  
  // Validate file size before upload
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size allowed is ${formatFileSize(MAX_FILE_SIZE)}. Your file is ${formatFileSize(file.size)}.`);
  }
  
  const type = explicitType || inferBackendUploadType(file);

  const formData = new FormData();
  formData.append("file", file);

  let response;
  try {
    const user = JSON.parse(sessionStorage.getItem("currentUser")) || {};
    const token = user.token;
    response = await api.post(`/s3/upload`, formData, {
      params: { type },
      // Let Axios set Content-Type with boundary automatically
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      onUploadProgress: (evt) => {
        if (!onProgress || !evt.total) return;
        const pct = Math.round((evt.loaded * 100) / evt.total);
        onProgress(pct);
      },
    });
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error("Upload error", status, data);
    throw err;
  }

  const data = response?.data;
  const filename = typeof data === "string" ? data : data?.filename || data?.key || data?.name;
  if (!filename) throw new Error("uploadToBackend: backend did not return filename");
  return { filename, messageType: type };
}

/**
 * Delete a file from S3 using the filename parameter
 * @param {string} filename - The S3 key/filename to delete
 * @returns {Promise<boolean>} - Returns true if deletion was successful
 */
export async function deleteFromS3(filename) {
  if (!filename) {
    console.warn("deleteFromS3: filename is required");
    return false;
  }

  // Don't delete default images
  const defaultImages = [
    "images/user-blue.jpg",
    "images/user-group.png"
  ];
  
  if (defaultImages.some(defaultImg => filename.includes(defaultImg))) {
    return false;
  }

  try {
    const user = JSON.parse(sessionStorage.getItem("currentUser")) || {};
    const token = user.token;
    
    await api.delete(`/s3/delete`, {
      params: { filename },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    
    return true;
  } catch (err) {
    console.error("S3 delete error:", err?.response?.status, err?.response?.data);
    // Don't throw error, just log it - deletion failure shouldn't break the flow
    return false;
  }
}


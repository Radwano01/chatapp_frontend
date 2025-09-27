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

// Maximum media file size: 50MB (for better performance and user experience)
export const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB in bytes

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
  
  const type = explicitType || inferBackendUploadType(file);
  
  // Check if it's a media file (image, video, audio)
  const isMediaFile = type === MESSAGE_TYPES.IMAGE || type === MESSAGE_TYPES.VIDEO || type === MESSAGE_TYPES.AUDIO;
  
  // Validate file size based on file type
  if (isMediaFile && file.size > MAX_MEDIA_SIZE) {
    throw new Error(`Media file too large! Maximum size for media files is ${formatFileSize(MAX_MEDIA_SIZE)}. Your file is ${formatFileSize(file.size)}. Please compress your media or choose a smaller file.`);
  } else if (!isMediaFile && file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large! Maximum size allowed is ${formatFileSize(MAX_FILE_SIZE)}. Your file is ${formatFileSize(file.size)}.`);
  }

  const formData = new FormData();
  formData.append("file", file);

  let response;
  try {
    const user = JSON.parse(sessionStorage.getItem("currentUser")) || {};
    const token = user.token;
    
    
    response = await api.post(`/s3/upload`, formData, {
      params: { type },
      headers: token ? { 
        Authorization: `Bearer ${token}`
      } : {},
      onUploadProgress: (evt) => {
        if (!onProgress || !evt.total) return;
        const pct = Math.round((evt.loaded * 100) / evt.total);
        onProgress(pct);
      },
    });
  } catch (err) {
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
    // Don't throw error, just log it - deletion failure shouldn't break the flow
    return false;
  }
}


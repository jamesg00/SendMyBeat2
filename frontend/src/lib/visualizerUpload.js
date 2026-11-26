import axios from "axios";

export const MAX_VISUAL_BYTES = 200 * 1024 * 1024;

export function visualizerBitrate(fps, duration) {
  const target = fps > 30 ? 7_000_000 : 4_500_000;
  return Math.round(Math.min(target, (170 * 1024 * 1024 * 8) / Math.max(1, duration)));
}

// Retry only the transfer, never the expensive render or the YouTube publish request.
export async function uploadVisualizer({ url, blob, name, type, signal, onUploadProgress }) {
  if (blob.size > MAX_VISUAL_BYTES) {
    throw new Error("The rendered video exceeds the 200 MB upload limit. Try 30 FPS.");
  }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (signal?.aborted) throw new DOMException("Upload cancelled", "AbortError");
    const data = new FormData();
    data.append("file", new File([blob], name, { type }));
    try {
      const response = await axios.post(url, data, { signal, timeout: 20 * 60_000, onUploadProgress });
      if (!response.data?.file_id) throw new Error("The server did not return a video file ID.");
      return response.data.file_id;
    } catch (error) {
      if (signal?.aborted || axios.isCancel(error)) throw error;
      const status = error.response?.status;
      const transient = error.code === "ERR_NETWORK" || error.code === "ECONNABORTED" || [502, 503, 504].includes(status);
      if (attempt === 0 && transient) continue;
      const size = (blob.size / 1048576).toFixed(1);
      const detail = error.response?.data?.detail;
      console.error("Visualizer transfer failed", { status, code: error.code, bytes: blob.size, type });
      throw new Error(status === 413
        ? `The server or proxy rejected the ${size} MB video as too large. Try 30 FPS; the upload limit needs checking.`
        : `The visualizer rendered, but its ${size} MB video could not be uploaded. ${typeof detail === "string" ? detail : error.message} Try uploading again; if this persists, the server connection and upload limits need checking.`);
    }
  }
}

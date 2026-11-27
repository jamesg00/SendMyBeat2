import axios from "axios";
import { MAX_VISUAL_BYTES, uploadVisualizer, visualizerBitrate } from "../visualizerUpload";

jest.mock("axios", () => ({ post: jest.fn(), isCancel: jest.fn(() => false) }));

const options = () => ({ url: "/api/upload/image", blob: new Blob(["video"]), name: "visualizer.mp4", type: "video/mp4" });
beforeEach(() => jest.clearAllMocks());

test("two-minute 60 FPS recording fits the upload budget", () => {
  expect(visualizerBitrate(60, 120)).toBe(12_000_000);
  expect(visualizerBitrate(60, 120) * 120 / 8).toBeLessThan(MAX_VISUAL_BYTES);
  expect(visualizerBitrate(60, 900) * 900 / 8).toBeLessThan(MAX_VISUAL_BYTES);
  expect(visualizerBitrate(30, 120)).toBe(8_000_000);
});

test("network failure retries the same video and returns its file ID", async () => {
  axios.post.mockRejectedValueOnce({ code: "ERR_NETWORK", message: "Network Error" })
    .mockResolvedValueOnce({ data: { file_id: "video-id" } });
  await expect(uploadVisualizer(options())).resolves.toBe("video-id");
  expect(axios.post).toHaveBeenCalledTimes(2);
  for (const call of axios.post.mock.calls) expect(call[1].get("file").size).toBe(5);
});

test("proxy size rejection is explained without retrying", async () => {
  axios.post.mockRejectedValueOnce({ response: { status: 413 } });
  await expect(uploadVisualizer(options())).rejects.toThrow("server or proxy rejected");
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test("persistent network failure reports transfer failure after one retry", async () => {
  axios.post.mockRejectedValue({ code: "ERR_NETWORK", message: "Network Error" });
  await expect(uploadVisualizer(options())).rejects.toThrow("visualizer rendered");
  expect(axios.post).toHaveBeenCalledTimes(2);
});

test("oversized output is rejected before transfer", async () => {
  await expect(uploadVisualizer({ ...options(), blob: { size: MAX_VISUAL_BYTES + 1 } })).rejects.toThrow("200 MB");
  expect(axios.post).not.toHaveBeenCalled();
});

test("cancellation prevents a retry", async () => {
  const controller = new AbortController();
  axios.post.mockImplementationOnce(() => {
    controller.abort();
    return Promise.reject({ code: "ERR_NETWORK" });
  });
  await expect(uploadVisualizer({ ...options(), signal: controller.signal })).rejects.toEqual({ code: "ERR_NETWORK" });
  expect(axios.post).toHaveBeenCalledTimes(1);
});

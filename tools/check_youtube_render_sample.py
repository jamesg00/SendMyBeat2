import asyncio
import os
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def _write_silent_wav(path: Path, seconds: float = 2.0, sample_rate: int = 44100) -> None:
    frame_count = int(seconds * sample_rate)
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(2)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(b"\x00\x00\x00\x00" * frame_count)


def _ffprobe_value(path: Path, stream_selector: str, entries: str) -> str:
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        raise RuntimeError("ffprobe is required for this check.")
    command = [
        ffprobe,
        "-v",
        "error",
        "-select_streams",
        stream_selector,
        "-show_entries",
        entries,
        "-of",
        "csv=p=0",
        str(path),
    ]
    completed = subprocess.run(command, capture_output=True, text=True, check=True)
    return completed.stdout.strip()


async def main() -> int:
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        print("ffmpeg and ffprobe are required.")
        return 1

    os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
    os.environ.setdefault("JWT_SECRET_KEY", "sample_render_secret")
    os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_sample")
    os.environ.setdefault("GOOGLE_CLIENT_ID", "sample")
    os.environ.setdefault("GOOGLE_CLIENT_SECRET", "sample")

    from backend import server

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        image_path = temp_path / "artwork_16x9.png"
        audio_path = temp_path / "audio.wav"
        Image.new("RGB", (1280, 720), "#d946ef").save(image_path)
        _write_silent_wav(audio_path, seconds=2.0)

        payload = server._normalize_upload_render_settings(
            aspect_ratio="16:9",
            image_scale=1.0,
            image_scale_x=1.0,
            image_scale_y=1.0,
            image_pos_x=0.0,
            image_pos_y=0.0,
            image_rotation=0.0,
            background_color="black",
        )
        payload["remove_watermark"] = True
        output_path = await server._render_youtube_video(
            audio_upload={"id": "sample_audio", "file_path": str(audio_path), "file_type": "audio"},
            image_upload={"id": "sample_image", "file_path": str(image_path), "file_type": "image"},
            payload=payload,
        )
        try:
            width_height = _ffprobe_value(output_path, "v:0", "stream=width,height")
            duration_raw = _ffprobe_value(output_path, "a:0", "format=duration")
            if width_height != "1280,720":
                raise AssertionError(f"Expected 1280x720, got {width_height}")
            duration = float(duration_raw.splitlines()[0])
            if not 1.8 <= duration <= 2.2:
                raise AssertionError(f"Expected ~2s duration, got {duration:.3f}s")

            frame_path = temp_path / "first_frame.png"
            subprocess.run(
                [shutil.which("ffmpeg"), "-y", "-i", str(output_path), "-frames:v", "1", str(frame_path)],
                capture_output=True,
                text=True,
                check=True,
            )
            frame = Image.open(frame_path).convert("RGB")
            edge_pixels = [
                frame.getpixel((0, 0)),
                frame.getpixel((1279, 0)),
                frame.getpixel((0, 719)),
                frame.getpixel((1279, 719)),
            ]
            if any(pixel == (0, 0, 0) for pixel in edge_pixels):
                raise AssertionError("Unexpected black border detected on true 16:9 sample.")

            print(f"Sample render passed: {output_path} {width_height} duration={duration:.3f}s")
            return 0
        finally:
            try:
                output_path.unlink(missing_ok=True)
            except Exception:
                pass


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

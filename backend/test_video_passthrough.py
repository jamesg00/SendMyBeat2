"""Exercise the production render builder, including real FFmpeg packet/frame checks."""
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.test_youtube_upload_unit import server
from backend.storage import LocalMediaStorage


def payload(**overrides):
    return {"target_w": 320, "target_h": 180, "render_fps": 60,
            "image_scale_x": 1, "image_scale_y": 1, "image_pos_x": 0,
            "image_pos_y": 0, "image_rotation": 0, "background_color": "black",
            "remove_watermark": True, **overrides}


class TestVideoEligibility(unittest.TestCase):
    def test_only_verified_compatible_video_is_eligible(self):
        good = {"codec_name": "h264", "pix_fmt": "yuv420p", "width": 320, "height": 180,
                "sample_aspect_ratio": "1:1", "field_order": "progressive",
                "avg_frame_rate": "60/1", "r_frame_rate": "60/1", "start_time": "0",
                "duration": "2"}
        cases = [{}, {"codec_name": "vp9"}, {"width": 640}, {"duration": "1"},
                 {"avg_frame_rate": "30/1"}, {"r_frame_rate": "120/1"},
                 {"pix_fmt": "yuv444p"}, {"sample_aspect_ratio": "2:1"},
                 {"field_order": "tt"}, {"start_time": "1"},
                 {"tags": {"rotate": "90"}}, {"side_data_list": [{"rotation": 90}]},
                 {"duration": "N/A"}, {"avg_frame_rate": "0/0"}]
        for changed in cases:
            with self.subTest(changed=changed), patch.object(server.subprocess, "run") as probe:
                probe.return_value = subprocess.CompletedProcess([], 0, json.dumps({"streams": [{**good, **changed}]}))
                self.assertEqual(server._video_matches_output(Path("video.mp4"), payload(), 2), not changed)
        for ok in [{"field_order": "unknown"}, {"field_order": None},
                   {"side_data_list": [{"side_data_type": "Display Matrix"}]}]:
            with self.subTest(ok=ok), patch.object(server.subprocess, "run") as probe:
                probe.return_value = subprocess.CompletedProcess([], 0, json.dumps({"streams": [{**good, **ok}]}))
                self.assertTrue(server._video_matches_output(Path("video.mp4"), payload(), 2))
        for changed in [{"image_scale_x": 0.5}, {"image_pos_y": 0.2}, {"image_rotation": 90},
                        {"image_flip_h": True}, {"blurred_background_input": True}]:
            with self.subTest(changed=changed), patch.object(server.subprocess, "run") as probe:
                self.assertFalse(server._video_matches_output(Path("video.mp4"), payload(**changed), 2))
                probe.assert_not_called()

    def test_probe_failure_uses_normal_render(self):
        for error in [subprocess.TimeoutExpired("ffprobe", 10), OSError("missing ffprobe")]:
            with patch.object(server.subprocess, "run", side_effect=error):
                self.assertFalse(server._video_matches_output(Path("video.mp4"), payload(), 2))


@unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "FFmpeg and ffprobe required")
class TestRealVideoRender(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.video = self.root / "visual.mp4"
        self.audio = self.root / "beat.wav"
        self.ffmpeg = shutil.which("ffmpeg")
        self.ffprobe = shutil.which("ffprobe")
        self.run_ffmpeg(["-f", "lavfi", "-i", "testsrc2=size=320x180:rate=60", "-t", "2",
                         "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", str(self.video)])
        self.run_ffmpeg(["-f", "lavfi", "-i", "sine=frequency=880:sample_rate=48000", "-t", "2", str(self.audio)])
        for name, value in [("media_storage", LocalMediaStorage(self.root)),
                            ("_resolve_ffmpeg_binary", lambda: self.ffmpeg),
                            ("_resolve_ffprobe_binary", lambda: self.ffprobe),
                            ("YOUTUBE_WATERMARK_FONT_FILE", "__missing_font__"), ("YOUTUBE_RENDER_MAX_HEIGHT", 1080)]:
            mock = patch.object(server, name, value)
            mock.start()
            self.addCleanup(mock.stop)

    def run_ffmpeg(self, args):
        return subprocess.run([self.ffmpeg, "-nostdin", "-y", "-v", "error", *args],
                              capture_output=True, check=True, timeout=30)

    def frame_hashes(self, path):
        data = self.run_ffmpeg(["-i", str(path), "-map", "0:v:0", "-f", "framemd5", "-"]).stdout.decode()
        return [line.split(",")[-1].strip() for line in data.splitlines() if line and not line.startswith("#")]

    async def render(self, settings):
        commands = []
        def run(command, **kwargs):
            commands.append(command)
            return subprocess.run(command, capture_output=True, text=True, timeout=30)
        with patch.object(server, "_run_ffmpeg_command_with_progress", side_effect=run):
            result = await server._render_youtube_video(
                audio_upload={"file_path": str(self.audio)},
                image_upload={"file_path": str(self.video), "media_kind": "video"}, payload=settings)
        return result, commands[0]

    async def test_copy_preserves_every_frame_and_adds_audio(self):
        self.run_ffmpeg(["-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=60", "-t", "2",
                         "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", str(self.video)])
        settings = payload(target_w=1920, target_h=1080)
        output, command = await self.render(settings)
        self.assertEqual(command[command.index("-c:v") + 1], "copy")
        self.assertNotIn("-filter_complex", command)
        self.assertNotIn("-r", command)
        self.assertNotIn("-stream_loop", command)
        self.assertEqual(self.frame_hashes(self.video), self.frame_hashes(output))
        info = json.loads(subprocess.check_output([self.ffprobe, "-v", "error", "-show_streams", "-of", "json", str(output)]))
        self.assertEqual([s["codec_name"] for s in info["streams"]], ["h264", "aac"])
        self.assertAlmostEqual(float(info["streams"][1]["duration"]), 2, delta=0.05)
        self.assertTrue(settings["_media_debug"]["video_stream_copied"])

    async def test_watermark_is_encoded_without_recompositing_artwork(self):
        settings = payload(remove_watermark=False)
        output, command = await self.render(settings)
        self.assertEqual(command[command.index("-c:v") + 1], "libx264")
        self.assertEqual(command[command.index("-crf") + 1], "18")
        self.assertEqual(command[command.index("-preset") + 1], "fast")
        graph = command[command.index("-filter_complex") + 1]
        self.assertIn("drawtext", graph)
        self.assertNotIn("[art]", graph)
        self.assertNotIn("scale=", graph)
        self.assertNotEqual(self.frame_hashes(self.video), self.frame_hashes(output))
        self.assertEqual(len(self.frame_hashes(output)), 120)
        self.assertFalse(settings["_media_debug"]["video_stream_copied"])
        self.assertEqual(settings["_media_debug"]["crf"], "18")

    async def test_transform_keeps_existing_layout_encode(self):
        output, command = await self.render(payload(image_scale_x=0.5))
        self.assertEqual(command[command.index("-c:v") + 1], "libx264")
        self.assertIn("[art]", command[command.index("-filter_complex") + 1])
        self.assertTrue(output.stat().st_size > 0)

    async def test_frame_rate_change_keeps_existing_encode(self):
        output, command = await self.render(payload(render_fps=30))
        self.assertIn("-stream_loop", command)
        self.assertEqual(command[command.index("-c:v") + 1], "libx264")
        self.assertEqual(len(self.frame_hashes(output)), 60)

    async def test_short_video_still_loops_to_cover_audio(self):
        self.run_ffmpeg(["-f", "lavfi", "-i", "sine=frequency=880:sample_rate=48000", "-t", "3", str(self.audio)])
        output, command = await self.render(payload())
        self.assertIn("-stream_loop", command)
        self.assertEqual(command[command.index("-c:v") + 1], "libx264")
        self.assertEqual(len(self.frame_hashes(output)), 180)

"""Phase 1: the deterministic description builder (services/description_builder.py)."""

import re

from services import description_builder as db_


def build(**kw):
    base = dict(artist="Ken Carson", beat_name="neon", tags=["ken carson type beat", "dark trap beat", "rage beat", "opium type beat"], top_keyword="dark trap")
    base.update(kw)
    return db_.build_description(**base)


def test_keyword_line_leads_with_the_artist_and_beat_name():
    out = build()
    first = out["content"].split("\n")[0]
    assert first.startswith("Ken Carson type beat | dark trap beat | rage beat")
    assert first.endswith('"NEON"')


def test_hashtags_are_three_to_five_without_spaces():
    for tags in ([], ["a"], ["ken carson type beat", "dark trap", "rage", "opium", "ambient", "pluggnb", "jerk"]):
        out = build(tags=tags, top_keyword="")
        assert 3 <= len(out["hashtags"]) <= 5, out["hashtags"]
        for tag in out["hashtags"]:
            assert tag.startswith("#") and " " not in tag and re.fullmatch(r"#[0-9a-z]+", tag)
    assert build()["hashtags"][:2] == ["#kencarsontypebeat", "#kencarson"]


def test_hashtags_end_the_description():
    out = build()
    assert out["content"].rstrip().split("\n")[-1] == " ".join(out["hashtags"])


def test_stays_within_5000_bytes():
    out = build(template_text="Contact me 🎹 " * 900)
    assert out["bytes"] <= db_.DESCRIPTION_MAX_BYTES
    assert len(out["content"].encode("utf-8")) == out["bytes"]
    assert any("5000" in w for w in out["warnings"])
    assert out["content"].endswith(" ".join(out["hashtags"]))


def test_buy_link_bpm_and_key():
    out = build(buy_link="https://beatstars.com/me", bpm=142.4, key="C minor")
    assert "Buy or lease: https://beatstars.com/me" in out["content"]
    assert "BPM: 142 | Key: C minor" in out["content"]


def test_chapters_only_when_valid():
    good = [{"t": 0, "label": "Intro"}, {"t": 20, "label": "Hook"}, {"t": 45, "label": "Verse"}]
    out = build(chapters=good)
    assert "00:00 Intro\n00:20 Hook\n00:45 Verse" in out["content"]
    assert out["warnings"] == []

    not_zero = [{"t": 5, "label": "Intro"}, {"t": 20, "label": "Hook"}, {"t": 45, "label": "Verse"}]
    too_few = [{"t": 0, "label": "Intro"}, {"t": 30, "label": "Hook"}]
    too_close = [{"t": 0, "label": "Intro"}, {"t": 8, "label": "Hook"}, {"t": 45, "label": "Verse"}]
    for chapters, word in ((not_zero, "00:00"), (too_few, "at least 3"), (too_close, "10 seconds")):
        out = build(chapters=chapters)
        assert "Intro" not in out["content"]
        assert any(word in w for w in out["warnings"]), out["warnings"]

    assert "00:00" not in build(chapters=good, include_chapters=False)["content"]


def test_long_beats_use_hours_in_timestamps():
    assert db_.format_timestamp(3725) == "1:02:05"
    assert db_.format_timestamp(65) == "01:05"


def test_template_hashtags_over_15_warn():
    out = build(template_text=" ".join(f"#tag{i}" for i in range(13)))
    assert any("15" in w for w in out["warnings"])


def test_angle_brackets_are_removed():
    out = build(template_text="Free <for profit> use")
    assert "<" not in out["content"] and ">" not in out["content"]
    assert any("<" in w for w in out["warnings"])


def test_no_artist_still_builds():
    out = db_.build_description(artist="", beat_name="", tags=["dark trap beat"])
    assert out["content"]
    assert 3 <= len(out["hashtags"]) <= 5

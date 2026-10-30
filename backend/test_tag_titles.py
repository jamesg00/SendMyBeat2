"""Title suggestions from a tag run."""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from services.tag_titles import PLACEHOLDER_BEAT, YOUTUBE_TITLE_LIMIT, suggest_titles

TAGS = [
    {'tag': 'future type beat', 'score': 90},
    {'tag': 'future x gunna type beat', 'score': 70},
    {'tag': 'mask off type beat', 'score': 78},
    {'tag': 'dark trap', 'score': 65},
    {'tag': 'future type beat 2026', 'score': 50},
]


def test_titles_lead_with_the_artist_and_carry_the_beat_name():
    titles = suggest_titles(artist='future', scored_tags=TAGS, beat_name='moonwalk', year=2026)
    assert titles
    for t in titles:
        assert t['title'].startswith('Future ')
        assert '"MOONWALK"' in t['title']
        assert t['length'] <= YOUTUBE_TITLE_LIMIT


def test_titles_use_the_runs_other_keywords_and_rank_by_coverage():
    titles = [t['title'] for t in suggest_titles(artist='future', scored_tags=TAGS, beat_name='moonwalk', year=2026)]
    assert 'Future Type Beat - "MOONWALK" | Mask Off Type Beat' in titles
    assert 'Future x Gunna Type Beat - "MOONWALK"' in titles
    assert 'Future Type Beat - "MOONWALK" | Dark Trap Instrumental' in titles
    assert 'Future Type Beat 2026 - "MOONWALK"' in titles
    # The one covering "future type beat" and "mask off type beat" (90 + 78) comes first.
    assert titles[0] == 'Future Type Beat - "MOONWALK" | Mask Off Type Beat'


def test_without_a_beat_name_there_is_a_placeholder_and_no_artist_means_no_titles():
    assert f'"{PLACEHOLDER_BEAT}"' in suggest_titles(artist='future', scored_tags=TAGS)[0]['title']
    assert suggest_titles(artist='', scored_tags=TAGS) == []


def test_never_over_youtubes_limit():
    long_tags = [{'tag': 'an extremely long related artist name that goes on and on type beat', 'score': 99}]
    for t in suggest_titles(artist='future', scored_tags=long_tags, beat_name='x' * 60):
        assert t['length'] <= YOUTUBE_TITLE_LIMIT

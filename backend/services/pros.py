"""Pros: profiles of producers who made it from YouTube type beats, and plans to copy their moves.

Profile text (story, notable work, moves) is written by us from press sources and lives here.
Photos, banners, subscriber counts and latest uploads come from each producer's own YouTube
channel through the API (refreshed daily, about 22 quota units for all ten), linked back to the
channel. A plan is the moves a user picked, as steps; steps about uploads tick themselves off
from the user's SendMyBeat uploads.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

CHANNEL_CACHE = "pro_channel_cache"
PLANS = "style_plans"
# Admin-set per producer: a press photo (with permission) + credit, and/or a pinned channel id.
OVERRIDES = "pro_overrides"
CHANNEL_TTL = timedelta(hours=24)
UPLOADS_KEPT = 50

# kind: "uploads" (N uploads within `days`), "title_formula" (N titles led by "<Artist> Type Beat"),
# "title_pair" (N titles pairing two artists, "A x B"), "manual" (the user ticks it).
PROS: list[dict[str, Any]] = [
    {
        "id": "taz-taylor",
        "name": "Taz Taylor",
        "group": "Internet Money",
        # He has no personal channel; Internet Money's (@InternetMoneyRecords) is the one he founded.
        "channel_id": "UCYj2GvOHcLTPvcyLpgw_PsQ",
        "handles": ["@internetmoney", "@InternetMoneyRecords"],
        "search": "Internet Money Taz Taylor",
        "tagline": "Turned type beats into a label: cheap leases, sold to many artists at once.",
        "why": "Cheap leases sold the same beat to many artists, so income didn't wait on one hit.",
        "sound": ["leases", "collective", "trap"],
        "story": [
            "Started selling beats to help with his mother's medical bills; his first sale was $250.",
            "Sold over Twitter and PayPal first, then moved to YouTube type beats and says he earned over $500,000 a year from online leases.",
            "Co-founded Internet Money with Nick Mira and DT, and signed a publishing deal with Warner Chappell, APG and Atlantic in 2017.",
        ],
        "notable": [
            {"year": "2017", "text": "Over $500K a year from online leases (his own figure)"},
            {"year": "2017", "text": "Publishing deal with Warner Chappell, APG and Atlantic"},
            {"year": "", "text": "Placements with Gucci Mane, Kodak Black and Big Sean"},
        ],
        "moves": [
            {"id": "leases", "title": "Lease, don't sell", "body": "Cheap non-exclusive leases to many artists, keeping the copyright.",
             "steps": [{"kind": "manual", "text": "Add non-exclusive lease terms to your description template", "link": "descriptions"}]},
            {"id": "tiers", "title": "Tiered prices", "body": "Separate prices for MP3 leases, WAV leases and trackouts.",
             "steps": [{"kind": "manual", "text": "List MP3, WAV and trackout prices in your description", "link": "descriptions"}]},
            {"id": "series", "title": "Series around one sound", "body": "Several uploads for one artist's sound, so one search finds many of your beats.",
             "steps": [{"kind": "uploads", "text": "Upload 3 beats for one artist's sound in 14 days", "target": 3, "days": 14}]},
            {"id": "crew", "title": "Build a crew", "body": "A collective shares one channel and one brand.",
             "steps": [{"kind": "manual", "text": "Make one beat with another producer and credit them in the title"}]},
        ],
        "sources": [
            {"label": "Complex", "url": "https://complex.com/music/2018/06/internet-money-records-taz-taylor-nick-mira-interview"},
            {"label": "DJBooth", "url": "https://djbooth.net/features/2017-06-29-taz-taylor-interview/"},
        ],
    },
    {
        "id": "nick-mira",
        "name": "Nick Mira",
        "group": "Internet Money",
        # His own channel (confirmed by James), not the shared Internet Money one.
        "channel_id": "UC0__rMNmefKfxeB-82fuCWA",
        "handles": ["@nickmira", "@NickMiraBeats"],
        "search": "Nick Mira producer",
        "tagline": "Produced \"Lucid Dreams\" from a beat pack sent straight to Juice WRLD.",
        "why": "He sent packs straight to artists, and one loop became a hit.",
        "sound": ["melodic", "guitar loops", "bouncy"],
        "story": [
            "Sold beats online under the type-beat label until around 2017, then co-founded Internet Money.",
            "Calls his sound melodic, spacious and bouncy; built \"Lean Wit Me\" from scratch, playing guitar live.",
            "When his credit on \"Lucid Dreams\" was questioned, he posted a video showing how he made it.",
        ],
        "notable": [
            {"year": "2018", "text": "Juice WRLD, \"Lucid Dreams\" (Hot 100 #2)"},
            {"year": "2018", "text": "Juice WRLD, \"Lean Wit Me\""},
            {"year": "", "text": "XXXTentacion and Trippie Redd placements"},
        ],
        "moves": [
            {"id": "packs", "title": "Send beat packs", "body": "Packs of beats emailed straight to artists; \"Lucid Dreams\" came from one.",
             "steps": [{"kind": "manual", "text": "Send a 5-beat pack to 3 artists with your Spotlight profile link"}]},
            {"id": "signature", "title": "A signature sound", "body": "Melodic loops people recognise as his.",
             "steps": [{"kind": "manual", "text": "Pick 3 sounds you'll use on every beat this month"}]},
            {"id": "make-first", "title": "Make what you like first", "body": "The type label is only for selling.",
             "steps": [{"kind": "uploads", "text": "Upload 2 beats you made for yourself in 7 days", "target": 2, "days": 7}]},
            {"id": "teach", "title": "Show how you made it", "body": "\"How I made it\" videos built the channel before the hits.",
             "steps": [{"kind": "manual", "text": "Post a \"how I made it\" video for your top beat"}]},
        ],
        "sources": [
            {"label": "The FADER", "url": "https://www.thefader.com/2019/05/15/nick-mira-taz-taylor-internet-money-interview"},
            {"label": "XXL", "url": "https://www.xxlmag.com/nick-mira-interview-internet-money-lucid-dreams/"},
        ],
    },
    {
        "id": "mjnichols",
        "name": "MjNichols",
        "group": "Type-beat YouTuber",
        "channel_id": "UCVVUVArPU2zhTJzLWxEafSQ",
        "handles": ["@mjnichols", "@MjNicholsBeats"],
        "search": "mjNichols type beats",
        "tagline": "Uploads since 2012, titled for search; quit his day job by 2015.",
        "why": "Years of steady uploads, each titled the way buyers search.",
        "sound": ["artist titles", "consistency", "beat store"],
        "story": [
            "First upload in April 2012 was a Kendrick Lamar type beat; he kept naming beats after rising artists.",
            "Every description links to his beat store, so views turn into sales.",
            "By 2015 his store paid enough to quit his job at Starbucks; in 2020 his channel drew millions of views a month.",
        ],
        "notable": [
            {"year": "2012", "text": "First type beat upload"},
            {"year": "2015", "text": "Full-time from beat sales"},
            {"year": "2020", "text": "Millions of views a month (The Ringer)"},
        ],
        "moves": [
            {"id": "artist-titles", "title": "Title for search", "body": "\"<Rising artist> Type Beat\" catches artists while they're searched.",
             "steps": [{"kind": "title_formula", "text": "Lead 3 titles with \"<Artist> Type Beat\"", "target": 3}]},
            {"id": "store-link", "title": "Store link everywhere", "body": "Every description links to the store.",
             "steps": [{"kind": "manual", "text": "Put your store link at the top of your description template", "link": "descriptions"}]},
            {"id": "rhythm", "title": "Steady rhythm", "body": "Years of regular uploads, not one viral hit.",
             "steps": [{"kind": "uploads", "text": "Upload 4 beats in 14 days", "target": 4, "days": 14}]},
            {"id": "moods", "title": "Try mood searches", "body": "Soulker grew on mood and theme searches instead of artist names.",
             "steps": [{"kind": "manual", "text": "Title one upload by mood (\"dark piano type beat\")"}]},
        ],
        "sources": [{"label": "The Ringer", "url": "https://www.theringer.com/2020/07/17/music/type-beats-youtube-beatstars-mjnichols-soulker"}],
    },
    {
        "id": "cashmoneyap",
        "name": "CashMoneyAP",
        "group": "Guadeloupe producer",
        "channel_id": "UCsVTRE0hRlbo6Obo-qkYxaw",
        "handles": ["@CashMoneyAP"],
        "search": "CashMoneyAP type beat",
        "tagline": "Named every beat after the rapper he wanted on it. The rappers found them.",
        "sound": ["rising-artist titles", "type beats", "trap"],
        "story": [
            "Alex Petit started in high school in Guadeloupe, remaking Waka Flocka beats with no local scene to sell to.",
            "Put type beats on YouTube and BeatStars, each title naming the rapper he hoped would use it, with beats from $50.",
            "His beats reached rappers on the rise: Lil Tjay's \"None of Your Love\" and NLE Choppa's \"Jumpin\" with Polo G.",
            "In 2020 he co-produced Pop Smoke's \"For the Night\", a Billboard Hot 100 top-ten hit, and \"Gangstas\".",
        ],
        "why": "He titled beats for rappers on the rise, so they found his beats before they were famous.",
        "notable": [
            {"year": "2018", "text": "Forbes profile: beats from $50 on YouTube and BeatStars"},
            {"year": "2020", "text": "Pop Smoke, \"For the Night\" (Hot 100 top ten)"},
            {"year": "2020", "text": "Pop Smoke, \"Gangstas\""},
            {"year": "2022", "text": "NLE Choppa, \"Slut Me Out\""},
            {"year": "", "text": "Lil Tjay, \"None of Your Love\"; NLE Choppa feat. Polo G, \"Jumpin\""},
        ],
        "moves": [
            {"id": "name-the-rapper", "title": "Name the rapper", "body": "Put the artist you want on the beat at the front of the title.",
             "steps": [{"kind": "title_formula", "text": "Lead 3 titles with \"<Artist> Type Beat\"", "target": 3}]},
            {"id": "rising-artists", "title": "Rising artists, not stars", "body": "Pair two rappers on the way up; fewer producers compete for their names.",
             "steps": [{"kind": "title_pair", "text": "Title 2 uploads with two rising rappers (\"A x B Type Beat\")", "target": 2}]},
            {"id": "low-entry", "title": "Easy to say yes to", "body": "Low lease prices and a free download for tagged use let new artists try your beats.",
             "steps": [{"kind": "manual", "text": "Add a low lease price and your free-download terms to your description", "link": "descriptions"}]},
            {"id": "steady", "title": "Steady uploads", "body": "Show up in those rappers' searches every week.",
             "steps": [{"kind": "uploads", "text": "Upload 6 beats in 14 days", "target": 6, "days": 14}]},
        ],
        "sources": [
            {"label": "Forbes", "url": "https://www.forbes.com/sites/ogdenpayne/2018/06/26/meet-cashmoneyap-hip-hops-newest-entrepreneurial-producer/"},
            {"label": "Producergrind", "url": "https://producergrind.com/blogs/blog/the-rise-of-a-young-legend-cashmoneyap-cash-gang-records"},
            {"label": "Wikipedia", "url": "https://en.wikipedia.org/wiki/CashMoneyAP"},
        ],
    },
    {
        "id": "guala",
        "name": "Guala Beatz",
        "group": "YouTube producer",
        "channel_id": "UCszZ1qpf2ZSVwQBNZXZrixw",
        "handles": ["@GualaBeatz", "@gualabeatz", "@Guala"],
        "search": "Guala Beatz producer",
        "tagline": "Started posting beats on YouTube in 2018 and grew past 100K subscribers.",
        "why": "He kept posting beats and production videos on YouTube, and the channel grew past 100K subscribers.",
        "sound": ["chill rap", "steady uploads", "production videos"],
        "story": [
            "His channel dates back to 2011; he started posting beats and production videos as Guala Beatz in March 2018.",
            "Kept uploading until the channel passed 100,000 subscribers and 31 million views.",
            "Artists credit him on their songs as \"prod. Guala Beatz\".",
        ],
        "notable": [
            {"year": "2018", "text": "First beats on YouTube as Guala Beatz"},
            {"year": "", "text": "100K+ YouTube subscribers, 31M+ channel views"},
        ],
        "moves": [
            {"id": "steady", "title": "Show up every week", "body": "A steady stream of beats keeps you in front of the same artists.",
             "steps": [{"kind": "uploads", "text": "Upload 4 beats in 14 days", "target": 4, "days": 14}]},
            {"id": "show-process", "title": "Show how you make it", "body": "Production videos give viewers a reason to subscribe, not just buy.",
             "steps": [{"kind": "manual", "text": "Post one video showing how you made a beat"}]},
            {"id": "artist-titles", "title": "Name the artist", "body": "Lead the title with the artist your beat is for, so the right buyers find it.",
             "steps": [{"kind": "title_formula", "text": "Lead 2 titles with \"<Artist> Type Beat\"", "target": 2}]},
        ],
        "sources": [
            {"label": "His YouTube channel", "url": "https://www.youtube.com/@GualaBeatz/about"},
            {"label": "Famous Birthdays", "url": "https://www.famousbirthdays.com/people/guala.html"},
            {"label": "SoundCloud credit", "url": "https://m.soundcloud.com/ghentley/overnight-prod-guala-beatz"},
        ],
    },
    {
        "id": "menace",
        "name": "Menace",
        "group": "YouTube producer",
        "channel_id": "UC4QdZB8sNx2K3EJfUTsymoA",
        "handles": ["@BeatMenace"],
        "search": "BeatMenace producer",
        "tagline": "A type beat on YouTube became Desiigner's \"Panda\", a Billboard number one.",
        "why": "He titled a beat for the artists it sounded like, and the right rapper found it by searching YouTube.",
        "sound": ["dark trap", "artist-named titles", "UK producer"],
        "story": [
            "A producer from Rochdale, England, he uploaded the beat to YouTube as a \"Meek Mill / Ace Hood Type Beat\".",
            "Desiigner found it on YouTube and made \"Panda\" (2015), which hit number one on the Billboard Hot 100 in May 2016.",
            "Kanye West sampled \"Panda\" for \"Pt. 2\" on The Life of Pablo (2016).",
        ],
        "notable": [
            {"year": "2015", "text": "Desiigner \"Panda\", from his YouTube type beat"},
            {"year": "2016", "text": "\"Panda\" reaches number one on the Billboard Hot 100"},
            {"year": "2016", "text": "Sampled by Kanye West on The Life of Pablo"},
        ],
        "moves": [
            {"id": "search-titles", "title": "Title it the way artists search", "body": "Artists search for the sound they want; name the artists your beat sounds like.",
             "steps": [{"kind": "title_formula", "text": "Lead 3 titles with \"<Artist> Type Beat\"", "target": 3}]},
            {"id": "two-artists", "title": "Name two artists", "body": "\"A x B Type Beat\" shows up in searches for either artist.",
             "steps": [{"kind": "title_pair", "text": "Title 2 beats \"<Artist> x <Artist> Type Beat\"", "target": 2}]},
            {"id": "keep-posting", "title": "Keep the catalog growing", "body": "One upload can be found years later; the more beats are up, the more chances.",
             "steps": [{"kind": "uploads", "text": "Upload 3 beats in 14 days", "target": 3, "days": 14}]},
        ],
        "sources": [
            {"label": "Vice: type beat producers, with Menace", "url": "https://www.vice.com/en/article/type-beat-producers-interview-menace"},
            {"label": "Wikipedia: Panda (Desiigner song)", "url": "https://en.wikipedia.org/wiki/Panda_(Desiigner_song)"},
        ],
    },
    {
        "id": "murda-beatz",
        "name": "Murda Beatz",
        "group": "YouTube producer",
        "channel_id": "UCWz4zK-Oal6uIiVxVuRWh8A",
        "handles": ["@MurdaBeatz"],
        "search": "Murda Beatz",
        "tagline": "Promoted his beats on YouTube as a teenager, then made hits for Migos and Drake.",
        "why": "He used YouTube to get his beats to rising rappers, then moved to where they were and kept working with them.",
        "sound": ["trap", "Migos", "producer tag"],
        "story": [
            "Shane Lindstrom, from Fort Erie, Ontario, started making beats in FL Studio at 17 and picked the name Murda Beatz to promote them on YouTube.",
            "At 18 he moved to Chicago to work with Chief Keef and Lil Durk, then moved in with Migos and produced their music.",
            "He produced Migos' \"MotorSport\" and Travis Scott's \"Butterfly Effect\" (2017), and Drake's \"Nice for What\" (2018), a Hot 100 number one.",
        ],
        "notable": [
            {"year": "2017", "text": "Travis Scott \"Butterfly Effect\" and Migos \"MotorSport\""},
            {"year": "2018", "text": "Drake \"Nice for What\", Billboard Hot 100 number one"},
            {"year": "2018", "text": "6ix9ine \"Fefe\" with Nicki Minaj, Hot 100 number three"},
        ],
        "moves": [
            {"id": "tag", "title": "Make your name stick", "body": "A short, memorable producer tag tells every listener who made the beat.",
             "steps": [{"kind": "manual", "text": "Record a producer tag and put it on your next beat"}]},
            {"id": "rising-artists", "title": "Aim at rising artists", "body": "Title beats for artists who are coming up now; they're the ones searching.",
             "steps": [{"kind": "title_formula", "text": "Lead 3 titles with a rising artist's \"<Artist> Type Beat\"", "target": 3}]},
            {"id": "volume", "title": "Make a lot of beats", "body": "He made beats constantly as a teenager; volume is how you find your sound.",
             "steps": [{"kind": "uploads", "text": "Upload 4 beats in 14 days", "target": 4, "days": 14}]},
        ],
        "sources": [
            {"label": "Wikipedia: Murda Beatz", "url": "https://en.wikipedia.org/wiki/Murda_Beatz"},
            {"label": "DJBooth: Murda Beatz and type beats", "url": "https://djbooth.net/features/2018-08-24-murda-beatz-type-beat-producer/"},
        ],
    },
    {
        "id": "kenny-beats",
        "name": "Kenny Beats",
        "group": "The Cave",
        "channel_id": "UCApPPpJ4d3ueW38lArwiWoA",
        "handles": ["@KennyBeats"],
        "search": "Kenny Beats The Cave",
        "tagline": "Turned making beats into a YouTube show, The Cave, and built a following on it.",
        "why": "He filmed himself making beats with rappers in his studio, so people came for the show, not just the beats.",
        "sound": ["hip-hop", "punk", "video series"],
        "story": [
            "Kenneth Blume studied at Berklee and made EDM in the duo Loudpvck before switching to hip-hop production.",
            "In March 2019 he launched The Cave on YouTube: guests come to his studio, he makes a beat, they freestyle on it.",
            "He has produced albums for Rico Nasty, Vince Staples, Freddie Gibbs and IDLES.",
        ],
        "notable": [
            {"year": "2018", "text": "Vince Staples FM! and Freddie Gibbs Freddie"},
            {"year": "2019", "text": "Launched The Cave on YouTube; Rico Nasty Anger Management"},
            {"year": "2021", "text": "IDLES Crawler"},
        ],
        "moves": [
            {"id": "series", "title": "Make it a series", "body": "A repeating video format with one name gives people a reason to come back.",
             "steps": [{"kind": "manual", "text": "Post a beat video with a series name and an episode number"}]},
            {"id": "film-sessions", "title": "Film the session", "body": "Making a beat on camera, with an artist if you can, is content on its own.",
             "steps": [{"kind": "manual", "text": "Film yourself making a beat from scratch and post it"}]},
            {"id": "schedule", "title": "Post on a schedule", "body": "The Cave came out on a set schedule; viewers knew when to look.",
             "steps": [{"kind": "uploads", "text": "Upload 2 beats in 14 days", "target": 2, "days": 14}]},
        ],
        "sources": [
            {"label": "Wikipedia: Kenny Beats", "url": "https://en.wikipedia.org/wiki/Kenny_Beats"},
            {"label": "The Fader: Kenny Beats", "url": "https://www.thefader.com/2019/12/17/how-kenny-beats-became-a-go-to-for-hip-hops-new-generation"},
        ],
    },
    {
        "id": "kyle-beats",
        "name": "Kyle Beats",
        "group": "YouTube producer",
        "channel_id": "UCfYEdvKQekP7RiemXC0o92w",
        "handles": ["@KyleBeats_"],
        "search": "Kyle Beats producer",
        "tagline": "Grew a beat channel past a million subscribers by making videos for other producers.",
        "why": "His channel shows how he makes beats and works with artists, so producers subscribe to learn, not just to buy.",
        "sound": ["melodic rap", "FL Studio", "producer videos"],
        "story": [
            "Started his YouTube channel in 2014, after teaching himself piano from online tutorials and making beats in FL Studio.",
            "His videos follow how he makes beats and works with artists; the channel passed one million subscribers.",
            "He has worked with independent artists including Russ, Nic D and Powfu, and says he never chased major labels.",
        ],
        "notable": [
            {"year": "2014", "text": "Started his YouTube channel"},
            {"year": "", "text": "1M+ YouTube subscribers"},
            {"year": "", "text": "Worked with Russ, Nic D and Powfu"},
        ],
        "moves": [
            {"id": "teach", "title": "Teach what you know", "body": "Videos for other producers bring subscribers who stick around.",
             "steps": [{"kind": "manual", "text": "Post one video explaining how you made a beat"}]},
            {"id": "independents", "title": "Work with independent artists", "body": "Independent artists can say yes fast, and you can film the work.",
             "steps": [{"kind": "manual", "text": "Send a beat to one independent artist you'd like to work with"}]},
            {"id": "consistency", "title": "Keep the channel moving", "body": "Regular uploads keep you in viewers' feeds.",
             "steps": [{"kind": "uploads", "text": "Upload 3 beats in 14 days", "target": 3, "days": 14}]},
        ],
        "sources": [
            {"label": "Image-Line: Kyle Beats", "url": "https://www.image-line.com/artists/kyle-beats"},
            {"label": "His YouTube channel", "url": "https://www.youtube.com/@KyleBeats_/about"},
        ],
    },
    {
        "id": "chuki-beats",
        "name": "Chuki Beats",
        "group": "YouTube producer",
        "channel_id": "UCSyBSyLk4ZvXd2Fj-tLojag",
        "handles": ["@ChukiBeatz"],
        "search": "Chuki Beats producer",
        "tagline": "Uploaded beats to YouTube from Belgium, topped BeatStars, then started a label.",
        "why": "His YouTube beats sold well on BeatStars, and a second channel of producer videos grew his name further.",
        "sound": ["afro", "drill", "BeatStars"],
        "story": [
            "Grew up in a small town in Belgium and started by uploading his beats to YouTube (the channel dates to 2013).",
            "His beats became top sellers on BeatStars, and his videos passed 100 million views.",
            "He co-founded the label 32WORLDWIDE and has gold and platinum records with Belgian artists.",
        ],
        "notable": [
            {"year": "2013", "text": "Started his YouTube beat channel"},
            {"year": "", "text": "Top seller on BeatStars; 100M+ video views"},
            {"year": "", "text": "Co-founded the label 32WORLDWIDE"},
        ],
        "moves": [
            {"id": "store", "title": "Sell from every video", "body": "Put your beat store link and lease options in every description.",
             "steps": [{"kind": "manual", "text": "Add your beat store link and lease prices to your description", "link": "descriptions"}]},
            {"id": "second-channel", "title": "Talk to producers too", "body": "Producer-focused videos reach a second audience and keep your name around.",
             "steps": [{"kind": "manual", "text": "Post one video for producers: a tip, a breakdown or a cook-up"}]},
            {"id": "artist-titles", "title": "Name the artist", "body": "Lead the title with the artist your beat is for, so the right buyers find it.",
             "steps": [{"kind": "title_formula", "text": "Lead 2 titles with \"<Artist> Type Beat\"", "target": 2}]},
        ],
        "sources": [
            {"label": "Live Nation: Chuki Beats", "url": "https://agency.livenation.be/roster/chuki-beats"},
            {"label": "His YouTube channel", "url": "https://www.youtube.com/@ChukiBeatz/about"},
        ],
    },
]
BY_ID = {pro["id"]: pro for pro in PROS}


# ---- reading titles


_LEAD_ARTIST = re.compile(r"^\s*[\w$.'&\s]{2,40}?\s+type\s+beat\b", re.IGNORECASE)
_PAIR = re.compile(r"\b\w[\w$.'&\s]*\s+x\s+\w[\w$.'&\s]*\s+type\s+beat\b", re.IGNORECASE)


def leads_with_artist(title: str) -> bool:
    return bool(_LEAD_ARTIST.match(title or ""))


def pairs_artists(title: str) -> bool:
    return bool(_PAIR.search(title or ""))


def _when(value: Any) -> Optional[datetime]:
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if not isinstance(value, datetime):
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def title_patterns(uploads: list[dict[str, Any]]) -> dict[str, Any]:
    """Share of titles led by the artist, with quotes, a year, or two artists; pace and weekdays."""
    titles = [str(u.get("title") or "") for u in uploads if u.get("title")]
    dates = sorted(d for d in (_when(u.get("published_at")) for u in uploads) if d)
    n = len(titles)
    share = lambda hits: round(100 * hits / n) if n else None  # noqa: E731
    weekdays = [0] * 7
    # heatmap[weekday][part of day, UTC]: night 0-6, morning 6-12, afternoon 12-18, evening 18-24.
    heatmap = [[0] * 4 for _ in range(7)]
    for d in dates:
        weekdays[d.weekday()] += 1
        heatmap[d.weekday()][d.hour // 6] += 1
    span_weeks = max(1.0, (dates[-1] - dates[0]).days / 7) if len(dates) > 1 else None
    return {
        "uploads": n,
        "lead_artist_pct": share(sum(leads_with_artist(t) for t in titles)),
        "quotes_pct": share(sum('"' in t for t in titles)),
        "year_pct": share(sum(bool(re.search(r"\b20\d\d\b", t)) for t in titles)),
        "pair_pct": share(sum(pairs_artists(t) for t in titles)),
        "per_week": round(len(dates) / span_weeks, 1) if span_weeks else None,
        "weekdays": weekdays,
        "heatmap": heatmap,
    }


def _video_still(video_id: str) -> str:
    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"


def breakdown(uploads: list[dict[str, Any]]) -> dict[str, Any]:
    """Views per upload (oldest first), and the few uploads that carried the channel."""
    ordered = sorted(uploads, key=lambda u: _when(u.get("published_at")) or datetime.min.replace(tzinfo=timezone.utc))
    views = [int(u.get("views") or 0) for u in ordered]
    total = sum(views)
    top = sorted(ordered, key=lambda u: int(u.get("views") or 0), reverse=True)[:3]
    top_ids = {u.get("video_id") for u in top}
    middle = sorted(views)[len(views) // 2] if views else 0
    return {
        "views": views,
        "breakout_index": [i for i, u in enumerate(ordered) if u.get("video_id") in top_ids],
        "top_share_pct": round(100 * sum(int(u.get("views") or 0) for u in top) / total) if total else None,
        "median_views": middle,
        "breakouts": [
            {"video_id": u["video_id"], "title": u.get("title") or "", "views": int(u.get("views") or 0),
             "times_median": round(int(u.get("views") or 0) / middle, 1) if middle else None}
            for u in top if u.get("video_id")
        ],
    }


# trait id -> (label, read from title_patterns, top of the scale, plan step kind that closes the gap)
TRAITS: list[tuple[str, str, str, float, Optional[str]]] = [
    ("per_week", "Uploads a week", "per_week", 7.0, "uploads"),
    ("lead_artist", "Artist named first", "lead_artist_pct", 100.0, "title_formula"),
    ("pair", "Two artists paired", "pair_pct", 100.0, "title_pair"),
    ("quotes", "Beat name in quotes", "quotes_pct", 100.0, None),
]


def style_match(pro: dict[str, Any], them: dict[str, Any], you: dict[str, Any]) -> dict[str, Any]:
    """How close your uploads are to theirs, trait by trait (0..1 on a shared scale), and your biggest gaps."""
    traits = []
    for trait_id, label, key, top, kind in TRAITS:
        a, b = you.get(key), them.get(key)
        if b is None:
            continue
        traits.append({
            "id": trait_id, "label": label, "you": a, "them": b,
            "you_pos": min(1.0, (a or 0) / top), "them_pos": min(1.0, b / top), "kind": kind,
        })
    if not traits or not you.get("uploads"):
        match = None
    else:
        match = round(100 * (1 - sum(abs(t["you_pos"] - t["them_pos"]) for t in traits) / len(traits)))
    gaps = []
    for t in sorted(traits, key=lambda t: t["them_pos"] - t["you_pos"], reverse=True):
        if t["them_pos"] - t["you_pos"] < 0.15:
            break
        move = next((m for m in pro["moves"] if any(st["kind"] == t["kind"] for st in m["steps"])), None) if t["kind"] else None
        gaps.append({"trait": t["id"], "label": t["label"], "move_id": move["id"] if move else None, "move": move["title"] if move else None})
    for t in traits:
        t.pop("kind")
    return {"match": match, "traits": traits, "gaps": gaps[:3]}


# ---- plans


def build_plan(pro_id: str, move_ids: list[str], *, user_id: str, now: datetime | None = None) -> dict[str, Any]:
    pro = BY_ID[pro_id]
    chosen = [m for m in pro["moves"] if m["id"] in set(move_ids)] or pro["moves"][:1]
    steps = []
    for move in chosen:
        for i, step in enumerate(move["steps"]):
            steps.append({**step, "id": f"{move['id']}-{i}", "move": move["title"], "done": False})
    return {
        "user_id": user_id,
        "pro_id": pro_id,
        "pro_name": pro["name"],
        "created_at": now or datetime.now(timezone.utc),
        "steps": steps,
    }


def plan_progress(plan: dict[str, Any], my_uploads: list[dict[str, Any]], now: datetime | None = None) -> dict[str, Any]:
    """Fill in each step's count from uploads since the plan started; manual steps keep their tick."""
    now = now or datetime.now(timezone.utc)
    start = _when(plan.get("created_at")) or now
    since = [u for u in my_uploads if (_when(u.get("published_at")) or start) >= start]
    steps = []
    for step in plan.get("steps") or []:
        step = dict(step)
        kind = step.get("kind")
        if kind == "uploads":
            window = now - timedelta(days=int(step.get("days") or 14))
            count = sum(1 for u in since if (_when(u.get("published_at")) or start) >= max(start, window))
            step.update(count=min(count, step["target"]), done=count >= step["target"])
        elif kind in ("title_formula", "title_pair"):
            test = leads_with_artist if kind == "title_formula" else pairs_artists
            count = sum(1 for u in since if test(str(u.get("title") or "")))
            step.update(count=min(count, step["target"]), done=count >= step["target"])
        steps.append(step)
    done = sum(1 for s in steps if s.get("done"))
    upcoming = next((s for s in steps if not s.get("done")), None)
    return {**plan, "steps": steps, "done": done, "total": len(steps), "next": upcoming}


# ---- channels


def _resolve_channel_id(youtube: Any, pro: dict[str, Any]) -> tuple[Optional[str], int]:
    """(channel id, quota units spent): handles first (1 unit each), one search as a fallback (100)."""
    units = 0
    for handle in pro.get("handles") or []:
        units += 1
        try:
            items = youtube.channels().list(part="id", forHandle=handle).execute().get("items") or []
        except Exception as exc:
            logger.warning("Handle lookup failed for %s: %s", handle, exc)
            items = []
        if items:
            return items[0].get("id"), units
    units += 100
    try:
        items = youtube.search().list(part="snippet", q=pro["search"], type="channel", maxResults=1).execute().get("items") or []
    except Exception as exc:
        logger.warning("Channel search failed for %s: %s", pro["id"], exc)
        return None, units
    return ((items[0].get("id") or {}).get("channelId") if items else None), units


def _fetch_channel(youtube: Any, channel_id: str) -> dict[str, Any]:
    payload = youtube.channels().list(part="snippet,statistics,brandingSettings,contentDetails", id=channel_id).execute()
    items = payload.get("items") or []
    if not items:
        return {}
    item = items[0]
    snippet, stats = item.get("snippet") or {}, item.get("statistics") or {}
    thumbs = snippet.get("thumbnails") or {}
    photo = (thumbs.get("high") or thumbs.get("medium") or thumbs.get("default") or {}).get("url")
    banner = ((item.get("brandingSettings") or {}).get("image") or {}).get("bannerExternalUrl")
    uploads_list = ((item.get("contentDetails") or {}).get("relatedPlaylists") or {}).get("uploads")
    uploads: list[dict[str, Any]] = []
    if uploads_list:
        playlist = youtube.playlistItems().list(part="snippet,contentDetails", playlistId=uploads_list, maxResults=UPLOADS_KEPT).execute()
        for it in playlist.get("items") or []:
            sn = it.get("snippet") or {}
            vid = (it.get("contentDetails") or {}).get("videoId")
            if vid:
                uploads.append({
                    "video_id": vid,
                    "title": sn.get("title") or "",
                    "published_at": (it.get("contentDetails") or {}).get("videoPublishedAt") or sn.get("publishedAt"),
                    "thumbnail": ((sn.get("thumbnails") or {}).get("medium") or {}).get("url"),
                })
        if uploads:
            views = youtube.videos().list(part="statistics", id=",".join(u["video_id"] for u in uploads)).execute()
            by_id = {v.get("id"): int((v.get("statistics") or {}).get("viewCount") or 0) for v in views.get("items") or []}
            for u in uploads:
                u["views"] = by_id.get(u["video_id"], 0)
    return {
        "channel_id": channel_id,
        "channel_title": snippet.get("title"),
        "channel_url": f"https://www.youtube.com/channel/{channel_id}",
        "photo": photo,
        "banner": banner,
        "subscribers": None if stats.get("hiddenSubscriberCount") else int(stats.get("subscriberCount") or 0),
        "total_views": int(stats.get("viewCount") or 0),
        "video_count": int(stats.get("videoCount") or 0),
        "uploads": uploads,
    }


def is_stale(channel: dict[str, Any] | None, now: datetime | None = None) -> bool:
    fetched = _when((channel or {}).get("fetched_at"))
    return not fetched or (now or datetime.now(timezone.utc)) - fetched >= CHANNEL_TTL


def wrong_channel(pro: dict[str, Any], cached: dict[str, Any] | None, override: dict[str, Any] | None = None) -> bool:
    """The cache holds a different channel than the one pinned (in PROS or by an admin): refetch now."""
    pinned = (override or {}).get("channel_id") or pro.get("channel_id")
    return bool(pinned and cached and cached.get("channel_id") and cached.get("channel_id") != pinned)


_refreshing = asyncio.Lock()


async def refresh_channels(
    db: Any, youtube: Any, *, force: bool = False, only: str | None = None, now: datetime | None = None
) -> dict[str, int]:
    """Bring every pro's channel data up to date (once a day). Never raises."""
    now = now or datetime.now(timezone.utc)
    stats = {"refreshed": 0, "units": 0}
    if youtube is None:
        return stats
    async with _refreshing:
        for pro in PROS:
            if only and pro["id"] != only:
                continue
            cached = await db[CHANNEL_CACHE].find_one({"pro_id": pro["id"]}, {"_id": 0}) or {}
            try:
                override = await db[OVERRIDES].find_one({"pro_id": pro["id"]}, {"_id": 0}) or {}
                if not force and not is_stale(cached, now) and not wrong_channel(pro, cached, override):
                    continue
                # An admin-pinned id, then the one in PROS, then the one we found by handle or search.
                channel_id = override.get("channel_id") or pro.get("channel_id") or cached.get("channel_id")
                if not channel_id:
                    channel_id, units = await asyncio.to_thread(_resolve_channel_id, youtube, pro)
                    stats["units"] += units
                if not channel_id:
                    continue
                data = await asyncio.to_thread(_fetch_channel, youtube, channel_id)
                stats["units"] += 3
                if not data:
                    continue
                await db[CHANNEL_CACHE].update_one(
                    {"pro_id": pro["id"]}, {"$set": {"pro_id": pro["id"], **data, "fetched_at": now}}, upsert=True
                )
                stats["refreshed"] += 1
            except Exception as exc:
                logger.warning("Refreshing %s's channel failed: %s", pro["id"], exc)
    return stats


async def channels_by_pro(db: Any) -> dict[str, dict[str, Any]]:
    docs = await db[CHANNEL_CACHE].find({}, {"_id": 0}).to_list(len(PROS) * 2)
    return {doc["pro_id"]: doc for doc in docs if doc.get("pro_id")}


async def overrides_by_pro(db: Any) -> dict[str, dict[str, Any]]:
    docs = await db[OVERRIDES].find({}, {"_id": 0}).to_list(len(PROS) * 2)
    return {doc["pro_id"]: doc for doc in docs if doc.get("pro_id")}


def _picture(pro: dict[str, Any], channel: dict[str, Any], override: dict[str, Any]) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """(photo, credit, source): a press photo used with permission, else their YouTube channel picture,
    else the still from their most-viewed upload, so every card has a picture once the channel is found."""
    for src in (override, pro):
        if src.get("photo"):
            return src["photo"], src.get("photo_credit"), "press"
    if channel.get("photo"):
        return channel["photo"], None, "youtube"
    top = max(channel.get("uploads") or [], key=lambda u: int(u.get("views") or 0), default=None)
    if top and top.get("video_id"):
        return _video_still(top["video_id"]), None, "video"
    return None, None, None


def card(pro: dict[str, Any], channel: dict[str, Any] | None, override: dict[str, Any] | None = None) -> dict[str, Any]:
    channel = channel or {}
    photo, credit, source = _picture(pro, channel, override or {})
    top = max(channel.get("uploads") or [], key=lambda u: int(u.get("views") or 0), default=None)
    return {
        "id": pro["id"],
        "name": pro["name"],
        "group": pro["group"],
        "tagline": pro["tagline"],
        "sound": pro["sound"],
        "photo": photo,
        "photo_credit": credit,
        "photo_source": source,
        "cover": _video_still(top["video_id"]) if top and top.get("video_id") else None,
        "banner": channel.get("banner"),
        "subscribers": channel.get("subscribers"),
        "channel_url": channel.get("channel_url") or f"https://www.youtube.com/{(pro.get('handles') or [''])[0]}",
        "channel_title": channel.get("channel_title"),
        # Verified: SendMyBeat confirmed which YouTube channel is theirs (pinned by channel ID).
        "verified": bool(pro.get("channel_id") or (override or {}).get("channel_id")),
        # Their SendMyBeat user id, once they claimed this profile and an admin approved it.
        "claimed_by": (override or {}).get("claimed_by"),
    }


def _uploads_in_14_days(move: dict[str, Any]) -> int:
    """How many uploads the move asks for over two weeks (title steps count as uploads too)."""
    n = 0
    for st in move["steps"]:
        if st["kind"] == "uploads":
            n = max(n, round(st["target"] * 14 / int(st.get("days") or 14)))
        elif st["kind"] in ("title_formula", "title_pair"):
            n = max(n, int(st["target"]))
    return n


def detail(pro: dict[str, Any], channel: dict[str, Any] | None, override: dict[str, Any] | None = None) -> dict[str, Any]:
    channel = channel or {}
    uploads = channel.get("uploads") or []
    return {
        **card(pro, channel, override),
        "story": pro["story"],
        "why": pro.get("why"),
        "notable": pro["notable"],
        "moves": [{**{k: m[k] for k in ("id", "title", "body")}, "steps": [st["text"] for st in m["steps"]],
                   "uploads": _uploads_in_14_days(m)} for m in pro["moves"]],
        "sources": pro["sources"],
        "total_views": channel.get("total_views"),
        "latest_uploads": uploads[:10],
        "patterns": title_patterns(uploads),
        "breakdown": breakdown(uploads),
    }


# ---- plan agent: does a plan step for you (drafts it, you approve it)

ASSIST_MODES = ("description", "titles", "help")


def assist_mode(step: dict[str, Any]) -> Optional[str]:
    """What the agent can do for a step: rewrite your description, write titles, or draft the rest.
    Upload steps have nothing to draft; they tick themselves off from your uploads."""
    kind = step.get("kind")
    if kind in ("title_formula", "title_pair"):
        return "titles"
    if kind == "uploads":
        return None
    if step.get("link") == "descriptions":
        return "description"
    return "help"


def assist_prompt(
    mode: str,
    step: dict[str, Any],
    pro: dict[str, Any],
    *,
    their_titles: list[str],
    your_titles: list[str],
    your_searches: list[str],
    description: str,
) -> tuple[str, str]:
    """(system, user) messages for the agent. Everything it needs is in the prompt; it answers in JSON."""
    move = next((m for m in pro["moves"] if m["title"] == step.get("move")), None)
    lines = [
        f"Producer to learn from: {pro['name']} ({pro.get('tagline') or ''}).",
        f"The move: {step.get('move')}: {(move or {}).get('body') or ''}",
        f"The step to do now: {step.get('text')}",
    ]
    if their_titles:
        lines.append("Their recent YouTube titles:\n" + "\n".join(f"- {t}" for t in their_titles[:8]))
    if your_titles:
        lines.append("The user's recent upload titles:\n" + "\n".join(f"- {t}" for t in your_titles[:8]))
    if your_searches:
        lines.append("Artists/vibes the user makes beats for: " + ", ".join(your_searches[:6]))
    if mode == "description":
        lines.append("The user's current YouTube description template:\n<<<\n" + (description or "(empty)") + "\n>>>")
        lines.append(
            'Rewrite the template so it does the step, keeping everything else the user wrote. Use placeholders like '
            '[YOUR STORE LINK] or [PRICE] for facts you don\'t know; never invent prices, links or contacts. '
            'Answer JSON: {"summary": "<one sentence on what changed>", "title": "<short template name>", "content": "<the full new template>"}'
        )
    elif mode == "titles":
        rule = "two artists paired" if step.get("kind") == "title_pair" else "one artist name first, then \"Type Beat\""
        lines.append(
            f"Write 5 YouTube titles for the user's next beats in the producer's style ({rule}). Use artists the user "
            "already makes beats for. Under 70 characters each. "
            'Answer JSON: {"summary": "<one sentence on the pattern>", "titles": ["...", "...", "...", "...", "..."]}'
        )
    else:
        lines.append(
            "Draft what the user needs to do this step themselves: a message to send, a short checklist, or a script. "
            "Practical and specific to a beat producer, under 180 words. Use placeholders for names and links. "
            'Answer JSON: {"summary": "<one sentence on what this is>", "content": "<the draft>"}'
        )
    system = (
        "You help beat producers grow on YouTube by doing one step of a plan for them. "
        "You only output valid JSON, with no markdown around it."
    )
    return system, "\n\n".join(lines)


def parse_assist(mode: str, data: Any) -> dict[str, Any]:
    """Keep only the fields the app shows, trimmed; raises ValueError if the answer is unusable."""
    if not isinstance(data, dict):
        raise ValueError("The agent's answer wasn't readable. Try again.")
    summary = str(data.get("summary") or "").strip()[:240]
    if mode == "titles":
        titles = [str(t).strip()[:100] for t in data.get("titles") or [] if str(t).strip()][:5]
        if not titles:
            raise ValueError("The agent didn't write any titles. Try again.")
        return {"mode": mode, "summary": summary, "titles": titles}
    content = str(data.get("content") or "").strip()[:5000]
    if not content:
        raise ValueError("The agent's draft came back empty. Try again.")
    result = {"mode": mode, "summary": summary, "content": content}
    if mode == "description":
        result["title"] = str(data.get("title") or "").strip()[:80] or "Plan description"
    return result

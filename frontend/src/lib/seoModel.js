// Everything search engines read about SendMyBeat's public pages: titles, descriptions,
// page copy, tag sets, FAQs and structured data. The React pages render from this file,
// and scripts/prerender-seo.js turns the same data into static HTML and the sitemap at
// build time, so what Google reads matches what visitors see.
//
// Keep this file free of imports: the build script loads it outside webpack.

export const SITE = "https://www.sendmybeat.com";

// Titles and copy can say "{year}"; it's filled in with the current year when shown.
export const withYear = (text, year) => String(text).split("{year}").join(String(year));

export const TAG_HUB_PATH = "/type-beat-tags";
export const tagSetPath = (slug) => `${TAG_HUB_PATH}/${slug}`;
export const freeTagLink = (query) => `/free-tag-generator?q=${encodeURIComponent(query)}`;

export const STATIC_PAGES = {
  "/": {
    title: "SendMyBeat: tags, video and upload for type-beat producers",
    description:
      "SendMyBeat turns a finished beat into a YouTube upload: tags that rank, a description, a visualizer video and the upload itself. Try it free, no card needed.",
    priority: "1.0",
    changefreq: "weekly",
  },
  "/spotlight": {
    title: "Producer Spotlight: trending type-beat producers | SendMyBeat",
    description: "See which beat producers are trending on SendMyBeat this week, who's new, and who's featured.",
    priority: "0.6",
    changefreq: "daily",
  },
  "/about": {
    title: "About SendMyBeat: YouTube tools for beat producers",
    description: "Why SendMyBeat exists and what it does: YouTube tags, descriptions, visualizer videos and uploads for type-beat producers.",
    priority: "0.5",
    changefreq: "monthly",
  },
  "/privacy-policy": {
    title: "Privacy Policy | SendMyBeat",
    description: "How SendMyBeat collects, uses and protects your data.",
    priority: "0.2",
    changefreq: "yearly",
  },
  "/terms": {
    title: "Terms and Conditions | SendMyBeat",
    description: "The terms for using SendMyBeat.",
    priority: "0.2",
    changefreq: "yearly",
  },
};

export const FREE_TAG_PAGE = {
  path: "/free-tag-generator",
  title: "Free Type Beat Tag Generator for YouTube ({year}) | SendMyBeat",
  description:
    "Free YouTube tag generator for type beats, no sign-up. Type an artist and get tags from live YouTube searches, sized for the 500-character limit. Copy and paste.",
  h1: "Free YouTube tag generator for type beats",
  lede:
    'Type an artist or a vibe, like "future type beat" or "dark trap". You get YouTube tags pulled from what people search and the tags on videos that already rank, sized for YouTube\'s 500-character limit. One free run, no sign-up.',
  how: [
    [
      "How the tags are picked",
      "SendMyBeat reads YouTube's own search suggestions and the tags on type beats that already rank for your artist. AI adds close variations, then every tag is scored on search demand and competition, and the weakest are cut so the set fits in YouTube's tag box.",
    ],
    [
      "Why it beats a generic tag generator",
      "General tag tools are built for vlogs and gaming. Type beat buyers search differently: the artist's name, the year, \"free\", the style and common misspellings. This generator is built around those searches and leaves out broad one-word tags that put your beat up against millions of videos.",
    ],
  ],
  featured: ["drake", "ken-carson", "travis-scott", "future", "playboi-carti", "central-cee"],
  faq: [
    [
      "Is the tag generator really free?",
      "Yes. You get one full run without an account. Sign up free for 3 more AI generations and 3 YouTube uploads, no card needed. After that, Plus is $5 a month for 50 of each.",
    ],
    [
      "How many tags should a type beat have?",
      "YouTube gives you 500 characters of tags. Most type beats fit 15 to 30 focused tags in that space. Relevance matters more than count, so cut anything that doesn't describe your beat.",
    ],
    [
      "Do YouTube tags still matter?",
      "YouTube says tags play a small role next to your title, thumbnail and description, and mostly help with misspellings. Type beats are the exception where that small role counts: buyers search exact artist names, years and spellings, and tags cover the variations your title can't.",
    ],
    [
      "Should I put the year in my type beat tags?",
      "Yes. Buyers often search \"type beat {year}\", so add the year to your main artist tag and update it each January.",
    ],
    [
      "Where do I paste the tags?",
      "In YouTube Studio, open your video's details, scroll to Tags (under Show more) and paste. The tags here are already comma-separated, so they split into separate tags on paste.",
    ],
    [
      "Is this a producer tag maker?",
      "No. These are YouTube search tags, the keywords that help buyers find your upload. A producer tag is the voice drop inside your beat. The Tag my beat page explains the difference.",
    ],
  ],
};

// ---- Free tool pages ----------------------------------------------------------------
// One page per tool producers search for. "tool" picks the widget (pages/tools/). "tags"
// is the AI tag generator (one free run, shared with /free-tag-generator); the rest run in
// the browser from lib/seoTools.js, with no sign-up and no limit. "example" fills the tool
// before a visitor types and is what the prerendered page shows as sample output; "cta" is
// the prerendered button that leads to the tool.
export const TOOL_PAGES = {
  "/tag-my-beat": {
    tool: "tags",
    cta: "Generate my tags",
    nav: "Tag my beat",
    appName: "SendMyBeat Tag My Beat",
    eyebrow: "Free tool, no account",
    title: "Tag My Beat: Free YouTube Tag Generator for Your Beat ({year}) | SendMyBeat",
    description:
      "Tag your beat for YouTube free, no sign-up: type the artist it sounds like and get scored search tags that fit the 500-character limit. Not a voice tag maker.",
    h1: "Tag my beat: free YouTube tags in one click",
    lede: 'Type the artist or sound your beat goes for, like "travis scott type beat". You get YouTube tags from live searches, each with a score so you can see which ones pull their weight. One free run, no sign-up.',
    how: [
      [
        "How to tag a beat for YouTube",
        'Lead with the artist plus "type beat" and the year, add the style and mood, then the spellings buyers use. Keep the whole set under YouTube\'s 500 characters, then paste it into the Tags box in YouTube Studio.',
      ],
      [
        "What the colours mean",
        "Each tag gets a score out of 100 from search demand, competition and how close it is to your search. Green is 60 or more, amber 45 to 59, red under 45. Swap red tags for something closer to your beat.",
      ],
    ],
    extra: [
      [
        "Looking for a producer voice tag?",
        "A producer tag, or voice tag, is the short audio drop inside your beat, like \"you're now listening to...\". SendMyBeat doesn't make those. It makes YouTube search tags, the keywords that decide which searches your upload shows up in. Record your drop or use a voice tag tool, put it in the first bars, bounce the beat, then tag the upload here.",
      ],
    ],
    faq: [
      [
        "Is it free to tag my beat here?",
        "Yes. You get one full tag run without an account. Sign up free for 3 more AI generations and 3 YouTube uploads, no card needed. The title, description, hashtag and tag counter tools on this site run in your browser and are free with no limit.",
      ],
      [
        "Does this make a producer tag or voice tag?",
        "No. This makes YouTube search tags, the keywords you paste into YouTube Studio. A producer tag is a voice drop in the audio, which you record yourself or make with a voice tag tool.",
      ],
      [
        "How many tags should I put on a beat?",
        "As many focused tags as fit in YouTube's 500 characters, usually 15 to 30 for a type beat. Cut anything that doesn't describe the beat: relevance counts more than the number of tags.",
      ],
      [
        "Why does each tag have a score?",
        "So you can see which tags are worth the space. The score weighs how much a tag is searched against how many videos already compete for it, and how close it is to what you typed.",
      ],
      [
        "Should I tag other artists?",
        "Only artists your beat really sounds like. Tags for unrelated big names bring viewers who leave quickly, which does your video no good.",
      ],
    ],
  },
  "/type-beat-title-generator": {
    tool: "title",
    cta: "Make my titles",
    nav: "Title generator",
    appName: "SendMyBeat Type Beat Title Generator",
    eyebrow: "Free tool, no sign-up, no limit",
    title: "Type Beat Title Generator for YouTube ({year}), free | SendMyBeat",
    description:
      "Free type beat title generator: enter the artist, beat name, style and BPM and get YouTube titles in the formats that rank, each with a character count. No sign-up.",
    h1: "Type beat title generator",
    lede: 'Enter the artist your beat is for, the beat name and the sound. You get YouTube titles in the formats type beat buyers search, like Drake Type Beat {year} - "Name" | Dark R&B Instrumental, each with a character count and a copy button. Free, with no sign-up and no limit.',
    how: [
      [
        "What makes a type beat title work",
        'Buyers search the artist\'s name with "type beat", so the title starts with exactly that. The beat name goes in quotes so it reads as a name. The rest of the space goes to the year, a second artist or the sound, the searches next to the obvious one.',
      ],
      [
        "Keep it short enough to read",
        "YouTube allows 100 characters, but search results and phones often cut a title after about 70. Every title here shows its length and is flagged when the end may get cut off.",
      ],
      [
        "Collabs and free beats",
        'Type two artists with an "x", like "Drake x Future", for crossover titles. Turn on [FREE] if anyone can use the beat for free, since many buyers search for "free type beat".',
      ],
    ],
    faq: [
      [
        "What is the best title format for a type beat?",
        'Artist plus "Type Beat" first, then the year or the beat name in quotes, then a second keyword such as the style: Drake Type Beat {year} - "Name" | Dark R&B Instrumental. Searchers see the artist straight away, and the title still reads as yours.',
      ],
      [
        "How long can a YouTube title be?",
        "100 characters. Aim for about 70 or less so the important part shows in search results and on phones.",
      ],
      [
        "Should I put [FREE] in my type beat title?",
        'Only if the beat really is free to use. "Free type beat" is a big search, but putting [FREE] on a beat you sell brings in people who won\'t buy and makes for awkward messages.',
      ],
      [
        "Should the year be in the title?",
        "It helps: buyers often search \"type beat {year}\". Update it on your best uploads each January.",
      ],
      [
        "What do the scores mean?",
        "They're the same title checks SendMyBeat runs in the app: the artist and \"type beat\" lead the title, it fits 100 characters, it uses your style keyword, the beat name is in quotes, and it has no characters YouTube rejects.",
      ],
    ],
    example: { artists: "Drake x Future", beatName: "Midnight", style: "dark r&b", bpm: "140" },
  },
  "/beat-description-generator": {
    tool: "description",
    cta: "Write my description",
    nav: "Description generator",
    appName: "SendMyBeat Beat Description Generator",
    eyebrow: "Free tool, no sign-up, no limit",
    title: "YouTube Description Generator for Beats ({year}), free | SendMyBeat",
    description:
      "Free YouTube description generator for type beats: purchase link on top, BPM and key, credits, contact and 3 to 5 hashtags, ready to copy. No sign-up, no limit.",
    h1: "YouTube description generator for beats",
    lede: "Fill in the beat's details and get a description ready to paste into YouTube: a keyword line and your purchase link at the top, BPM and key, credits and contact, and hashtags at the end. Free, with no sign-up and no limit.",
    how: [
      [
        "What goes at the top",
        'YouTube shows the first lines above "...more". The description opens with a keyword line that matches your title, then the link to buy or download, so buyers see it without tapping.',
      ],
      [
        "Credits and terms",
        "Add your producer name and say whether the beat is free for profit. Clear terms save you messages asking whether someone can use the beat.",
      ],
      [
        "Hashtags at the end",
        "3 to 5 hashtags, starting with the artist's type beat tag. YouTube shows the first three above your title. Over 15 and YouTube ignores all of them.",
      ],
    ],
    faq: [
      [
        "What should a type beat description include?",
        "How to get the beat (a purchase or download link), BPM and key, credits and terms, a way to reach you, and a few hashtags. Put the link near the top, where people see it.",
      ],
      [
        "Do keywords in the description help?",
        'A little. YouTube reads the description for context, so one natural line with "artist type beat" and the style helps. Repeating keywords over and over can get the video flagged as spam.',
      ],
      [
        "How long can a YouTube description be?",
        "5,000 bytes, which is about 5,000 characters of plain English text. YouTube also rejects the < and > characters, so this tool leaves them out.",
      ],
      [
        "Is this the same description the app writes?",
        "Yes, it uses the same layout. With an account, SendMyBeat also fills in the keywords from your tag run, saves your contact block as a template and puts the description into the upload for you.",
      ],
    ],
    example: {
      beatName: "Midnight",
      artist: "Drake",
      style: "dark r&b",
      bpm: "140",
      musicKey: "C minor",
      buyLink: "https://your-store.example/midnight",
      producer: "Your Name",
      email: "",
      instagram: "@yourname",
    },
  },
  "/youtube-hashtag-generator": {
    tool: "hashtags",
    cta: "Get my hashtags",
    nav: "Hashtag generator",
    appName: "SendMyBeat YouTube Hashtag Generator for Beats",
    eyebrow: "Free tool, no sign-up, no limit",
    title: "YouTube Hashtag Generator for Beats and Type Beats ({year}) | SendMyBeat",
    description:
      "Free YouTube hashtag generator for beats: enter the artist and style and get 3 to 5 hashtags for your description, in the right order. No sign-up, no limit.",
    h1: "YouTube hashtag generator for beats",
    lede: "Enter the artist your beat is for and its style. You get 3 to 5 hashtags for the end of your description, in the order that matters, with a copy button. Free, with no sign-up and no limit.",
    how: [
      [
        "Why only 3 to 5",
        "YouTube shows the first three hashtags from your description above the title. A few focused ones do the job. More than 15 and YouTube ignores every hashtag in the description.",
      ],
      [
        "The order matters",
        "The artist's type beat hashtag comes first, since that's what buyers search, then the artist, then the style. Those first three are the ones people see.",
      ],
    ],
    faq: [
      [
        "How many hashtags should a YouTube video have?",
        "3 to 5 is plenty for a beat. YouTube shows the first three above the title, and ignores all of them if there are more than 15.",
      ],
      [
        "Where do I put hashtags on YouTube?",
        "At the end of the description. You can put them in the title too, but they take space the artist and beat name need.",
      ],
      [
        "Are hashtags the same as tags?",
        "No. Hashtags sit in the description and show above the title. Tags go in the Tags box in YouTube Studio and viewers don't see them. Use both: generate tags with the free tag generator.",
      ],
      [
        "Why don't hashtags have spaces?",
        "A hashtag ends at the first space, so #drake type beat would only tag \"drake\". The tool joins the words: #draketypebeat.",
      ],
    ],
    example: { artists: "Drake", style: "dark r&b" },
  },
  "/youtube-tag-counter": {
    tool: "counter",
    cta: "Count my tags",
    nav: "Tag counter",
    appName: "SendMyBeat YouTube Tag Counter",
    eyebrow: "Free tool, no sign-up, no limit",
    title: "YouTube Tag Counter: check the 500-character limit, free | SendMyBeat",
    description:
      "Paste your YouTube tags and see the count YouTube uses against its 500-character limit, quote marks included. Finds repeats and long tags and trims the list to fit.",
    h1: "YouTube tag counter",
    lede: "Paste your tags, separated by commas. You see the count YouTube uses against its 500-character limit, the length of each tag, repeats and over-long tags, and you can trim the list to fit in one tap. Free, with no sign-up and no limit.",
    how: [
      [
        "How YouTube counts tags",
        'YouTube counts every character of every tag plus the commas between them, and a tag with a space in it costs two more for the quote marks YouTube puts around it. So "drake type beat" costs 17, not 15. That\'s why a list that looks short can still be rejected.',
      ],
      [
        "What trim to fit does",
        "It keeps your tags in order, drops repeats and tags over 100 characters, and skips any tag that would push the list over 500. Put your most important tags first.",
      ],
    ],
    faq: [
      [
        "What is the YouTube tag limit?",
        "500 characters in total. Commas count, and a tag with spaces counts two extra characters for the quote marks around it.",
      ],
      [
        "Why does YouTube say my tags are too long when they're under 500?",
        "Most likely the quote marks. Every tag with a space costs two extra characters, and a set of 25 multi-word tags adds 50 characters you can't see.",
      ],
      [
        "Do repeated tags help?",
        "No. A repeat, even with different capitals, only uses up space. The counter flags them and trim to fit removes them.",
      ],
      [
        "Can I use < or > in tags?",
        "No, YouTube doesn't accept them. The counter takes them out of the cleaned list.",
      ],
    ],
    example: {
      tags: "drake type beat, drake type beat {year}, free drake type beat, Drake Type Beat, drake instrumental, dark r&b type beat, future type beat, drake x future type beat",
    },
  },
};
export const TOOL_PATHS = Object.keys(TOOL_PAGES);

// Guide pages, one per thing producers search for. Each answers it and points to the
// free tag generator or sign-up.
export const GUIDES = {
  "/youtube-tag-generator": {
    title: "YouTube Tag Generator for Beat Producers | SendMyBeat",
    description: "Generate YouTube tags for your type beats from real search data, scored on demand and competition and sized for the 500-character limit.",
    h1: "YouTube tag generator for beat producers",
    lede: "Tags decide which searches your beat shows up in. SendMyBeat builds them from what people actually type into YouTube, not a generic keyword list.",
    sections: [
      ["Where the tags come from", "YouTube's own search suggestions for your artist, plus the tags on type beats that already rank. AI adds close variations, then each tag is scored on search demand and competition."],
      ["Why fewer, better tags win", "YouTube's tag box holds 500 characters. Filling it with broad tags like \"beat\" or \"rap\" puts you up against millions of videos. A tight set of artist and style tags gives your upload a real chance."],
      ["How to use them", "Copy the tags into YouTube Studio, or connect your channel and SendMyBeat fills them in when it uploads your beat for you."],
    ],
  },
  "/type-beat-tags": {
    title: "Type Beat Tags ({year}): copy-paste YouTube tags by artist | SendMyBeat",
    description: "Copy-paste YouTube tags for type beats by artist and style, plus how to build your own set and a free generator that pulls tags from live YouTube searches.",
    h1: "Type beat tags that people actually search",
    lede: "A good type beat tag set mixes the artist, the style and the way buyers phrase their search. Pick an artist or style below for a ready set, or read how to build one.",
    sections: [
      ["Start with the artist", "Use the artist's name with \"type beat\", the year, and the common spellings. These are the searches buyers type first."],
      ["Add the sound", "Add the genre and mood, like dark trap, pluggnb or melodic drill, together with the artist, so you show up in the searches next to the obvious one."],
      ["Skip what hurts", "Leave out other artists your beat doesn't sound like and one-word tags that compete with the artist's own songs. They bring the wrong viewers or none."],
    ],
  },
  "/upload-beats-to-youtube": {
    title: "Upload Beats to YouTube with a Video, Tags and Description | SendMyBeat",
    description: "Turn a beat and cover art into a YouTube video with a visualizer, then upload it to your channel with tags and a description filled in.",
    h1: "Upload your beats to YouTube in one step",
    lede: "YouTube needs a video, not an MP3. SendMyBeat turns your beat and cover art into one and uploads it to your own channel.",
    sections: [
      ["Beat plus artwork becomes a video", "Pick a layout, add an audio visualizer and preview it before anything goes live."],
      ["Tags and description filled in", "Generate tags and write a description from a template, and they go into the upload with your title."],
      ["Your channel, your settings", "Connect your Google account once. Uploads go to your channel as public, unlisted or private videos."],
    ],
  },
};

// Tag set pages: one per artist or style that producers make type beats for.
// "sound" and "bpm" are what buyers expect from that type beat; keep them short and honest.
export const ARTISTS = {
  drake: { name: "Drake", aliases: ["drizzy"], styles: ["r&b", "melodic trap"], related: ["future", "21-savage", "the-weeknd", "travis-scott"], sound: "Moody R&B and melodic trap: filtered samples, soft pads, sparse drums and plenty of space for vocals.", bpm: "often slow, around 70 to 90 BPM, with faster drill and Jersey club flips too" },
  "travis-scott": { name: "Travis Scott", aliases: ["travis"], styles: ["dark trap", "psychedelic trap"], related: ["don-toliver", "metro-boomin", "playboi-carti", "kanye-west"], sound: "Dark, atmospheric trap: wide reverb-soaked synths, distorted 808s and beat switches.", bpm: "usually 130 to 160 BPM" },
  future: { name: "Future", aliases: [], styles: ["dark trap", "trap"], related: ["metro-boomin", "young-thug", "21-savage", "lil-baby"], sound: "Hard, dark trap with heavy 808s, eerie melodies and fast hi-hats.", bpm: "usually 130 to 150 BPM" },
  "ken-carson": { name: "Ken Carson", aliases: [], styles: ["rage", "hyperpop"], related: ["destroy-lonely", "playboi-carti", "yeat", "osamason"], sound: "Rage: loud distorted synth leads, blown-out 808s and punchy drums.", bpm: "usually 140 to 170 BPM" },
  "playboi-carti": { name: "Playboi Carti", aliases: ["carti"], styles: ["rage", "plugg"], related: ["ken-carson", "destroy-lonely", "lil-uzi-vert", "travis-scott"], sound: "Rage and minimal trap: bright or distorted synth loops over booming 808s.", bpm: "usually 140 to 170 BPM" },
  "lil-uzi-vert": { name: "Lil Uzi Vert", aliases: ["uzi"], styles: ["melodic trap", "rage"], related: ["playboi-carti", "juice-wrld", "nettspend", "future"], sound: "Bouncy, melodic trap with bright synth leads and energetic drums.", bpm: "usually 140 to 160 BPM" },
  "destroy-lonely": { name: "Destroy Lonely", aliases: [], styles: ["rage", "dark trap"], related: ["ken-carson", "playboi-carti", "osamason", "yeat"], sound: "Hazy rage and dark trap: washed-out synths, pitched vocal chops and heavy 808s.", bpm: "usually 140 to 165 BPM" },
  yeat: { name: "Yeat", aliases: [], styles: ["rage", "bells"], related: ["ken-carson", "playboi-carti", "osamason", "destroy-lonely"], sound: "Rage with bells, glossy synths and booming 808s.", bpm: "usually 140 to 170 BPM" },
  gunna: { name: "Gunna", aliases: [], styles: ["melodic trap", "guitar"], related: ["young-thug", "lil-baby", "future", "travis-scott"], sound: "Smooth, melodic trap: guitars, flutes and airy pads over bouncing 808s.", bpm: "usually 130 to 160 BPM" },
  "young-thug": { name: "Young Thug", aliases: ["thugger"], styles: ["melodic trap", "trap"], related: ["gunna", "future", "lil-baby", "lil-uzi-vert"], sound: "Playful, melodic trap with quirky melodies and bouncy drums.", bpm: "usually 130 to 160 BPM" },
  "lil-baby": { name: "Lil Baby", aliases: [], styles: ["melodic trap", "piano"], related: ["gunna", "lil-durk", "future", "21-savage"], sound: "Melodic street trap: piano or guitar melodies, rolling hi-hats and steady 808s.", bpm: "usually 140 to 160 BPM" },
  "21-savage": { name: "21 Savage", aliases: [], styles: ["dark trap", "trap"], related: ["metro-boomin", "drake", "future", "lil-baby"], sound: "Dark, minimal trap: eerie melodies, sparse drums and deep 808s.", bpm: "usually 130 to 150 BPM" },
  "metro-boomin": { name: "Metro Boomin", aliases: ["metro"], styles: ["dark trap", "orchestral"], related: ["future", "21-savage", "travis-scott", "young-thug"], sound: "Cinematic dark trap: orchestral or horror-film melodies with big 808s.", bpm: "usually 130 to 150 BPM" },
  "nba-youngboy": { name: "NBA YoungBoy", aliases: ["youngboy", "yb"], styles: ["pain", "piano"], related: ["rod-wave", "lil-durk", "lil-baby", "juice-wrld"], sound: "Emotional, aggressive Southern trap: pianos and strings over hard 808s.", bpm: "usually 140 to 160 BPM" },
  "juice-wrld": { name: "Juice WRLD", aliases: ["juice world"], styles: ["emo", "guitar"], related: ["lil-uzi-vert", "rod-wave", "nettspend", "the-weeknd"], sound: "Emo rap: guitar loops and soft keys over melodic trap drums.", bpm: "usually 140 to 170 BPM, often felt in half time" },
  "pop-smoke": { name: "Pop Smoke", aliases: [], styles: ["brooklyn drill", "ny drill"], related: ["central-cee", "lil-durk", "21-savage", "future"], sound: "Brooklyn drill: sliding 808s, hard snares and dark melodies.", bpm: "usually 140 to 145 BPM" },
  "central-cee": { name: "Central Cee", aliases: ["cench"], styles: ["uk drill", "melodic drill"], related: ["pop-smoke", "drake", "lil-durk", "21-savage"], sound: "UK drill and melodic UK rap, often over flipped R&B or pop samples.", bpm: "usually 140 to 145 BPM" },
  "don-toliver": { name: "Don Toliver", aliases: [], styles: ["psychedelic trap", "melodic trap"], related: ["travis-scott", "the-weeknd", "gunna", "metro-boomin"], sound: "Psychedelic, melodic trap with spacey synths and smooth grooves.", bpm: "usually 120 to 150 BPM" },
  "kanye-west": { name: "Kanye West", aliases: ["kanye", "ye"], styles: ["soul sample", "experimental"], related: ["j-cole", "kendrick-lamar", "travis-scott", "metro-boomin"], sound: "Chopped soul samples, big drums and gospel or synth-heavy production, depending on the era.", bpm: "anywhere from 80 to 150 BPM depending on the era" },
  "j-cole": { name: "J. Cole", aliases: ["j cole", "cole"], styles: ["boom bap", "soul sample"], related: ["kendrick-lamar", "kanye-west", "drake", "21-savage"], sound: "Soulful, sample-based hip hop with warm keys and boom-bap or laid-back trap drums.", bpm: "usually 80 to 95 BPM" },
  "kendrick-lamar": { name: "Kendrick Lamar", aliases: ["kendrick"], styles: ["west coast", "jazz"], related: ["j-cole", "kanye-west", "21-savage", "metro-boomin"], sound: "West Coast and jazz-tinged hip hop, from soulful samples to minimal bounce.", bpm: "usually 80 to 100 BPM" },
  "rod-wave": { name: "Rod Wave", aliases: [], styles: ["soul trap", "guitar"], related: ["nba-youngboy", "lil-durk", "juice-wrld", "lil-baby"], sound: "Soul trap: emotional piano and guitar melodies with trap drums.", bpm: "usually 70 to 90 BPM in half time" },
  "lil-durk": { name: "Lil Durk", aliases: ["durk"], styles: ["melodic drill", "chicago drill"], related: ["lil-baby", "nba-youngboy", "rod-wave", "pop-smoke"], sound: "Chicago melodic drill and street trap: dark keys and sliding 808s.", bpm: "usually 130 to 160 BPM" },
  nettspend: { name: "Nettspend", aliases: [], styles: ["plugg", "pluggnb"], related: ["osamason", "ken-carson", "lil-uzi-vert", "destroy-lonely"], sound: "Plugg and new-wave underground: airy, glitchy synths and light drums.", bpm: "usually 140 to 160 BPM" },
  osamason: { name: "OsamaSon", aliases: [], styles: ["rage", "underground"], related: ["nettspend", "ken-carson", "destroy-lonely", "yeat"], sound: "Distorted underground rage with lo-fi, glitchy synths.", bpm: "usually 150 to 170 BPM" },
  "the-weeknd": { name: "The Weeknd", aliases: ["weeknd"], styles: ["r&b", "synthwave"], related: ["drake", "don-toliver", "juice-wrld", "travis-scott"], sound: "Dark R&B and synth-pop: 80s synths, big reverb and moody chords.", bpm: "from slow R&B up to about 120 BPM for the synth-pop side" },
};

export const STYLES = {
  trap: { name: "Trap", related: ["future", "lil-baby", "21-savage"], sound: "Rolling hi-hats, heavy 808s and dark or melodic loops.", bpm: "usually 130 to 160 BPM" },
  "dark-trap": { name: "Dark Trap", related: ["metro-boomin", "21-savage", "travis-scott"], sound: "Minor-key, cinematic loops with eerie melodies and deep 808s.", bpm: "usually 130 to 150 BPM" },
  drill: { name: "Drill", related: ["pop-smoke", "lil-durk", "central-cee"], sound: "Sliding 808s, syncopated hi-hats and dark melodies, from Chicago to New York.", bpm: "usually 140 to 145 BPM" },
  "uk-drill": { name: "UK Drill", related: ["central-cee", "pop-smoke"], sound: "Sliding 808s, offbeat snares and skippy hi-hats, often over sampled melodies.", bpm: "usually 140 to 145 BPM" },
  rage: { name: "Rage", related: ["ken-carson", "playboi-carti", "yeat", "destroy-lonely"], sound: "Loud distorted synth leads, blown-out 808s and punchy drums.", bpm: "usually 140 to 170 BPM" },
  pluggnb: { name: "Pluggnb", related: ["nettspend", "lil-uzi-vert"], sound: "Plugg drums under R&B chords: soft bells, airy pads and light 808s.", bpm: "usually 140 to 160 BPM" },
  rnb: { name: "R&B", related: ["the-weeknd", "drake", "don-toliver"], sound: "Smooth chords, soft drums and room for vocals.", bpm: "usually 60 to 100 BPM" },
  "boom-bap": { name: "Boom Bap", related: ["j-cole", "kendrick-lamar", "kanye-west"], sound: "Dusty sampled loops with hard-hitting kicks and snares.", bpm: "usually 85 to 95 BPM" },
  "jersey-club": { name: "Jersey Club", related: ["drake"], sound: "Fast, bouncy kick patterns, bed-squeak sounds and chopped vocals.", bpm: "usually 130 to 145 BPM" },
  afrobeats: { name: "Afrobeats", related: ["drake"], sound: "Syncopated percussion, warm chords and a bouncy, danceable groove.", bpm: "usually 95 to 115 BPM" },
  lofi: { name: "Lofi", related: ["j-cole"], sound: "Mellow, dusty keys and soft swung drums.", bpm: "usually 70 to 90 BPM" },
};

export const TAG_SETS = {
  ...Object.fromEntries(Object.entries(ARTISTS).map(([slug, a]) => [slug, { ...a, kind: "artist" }])),
  ...Object.fromEntries(Object.entries(STYLES).map(([slug, s]) => [slug, { ...s, kind: "style" }])),
};
export const TAG_SET_SLUGS = Object.keys(TAG_SETS);

// YouTube counts the characters of every tag, a comma between tags, and two quote marks
// around any tag with a space in it, against a 500-character limit.
export const youtubeTagChars = (tags) =>
  tags.reduce((sum, t) => sum + t.length + (t.includes(" ") ? 2 : 0), 0) + Math.max(0, tags.length - 1);

const TAG_LIMIT = 470;

const fitTags = (candidates) => {
  const out = [];
  candidates.forEach((raw) => {
    const t = raw.toLowerCase().replace(/\s+/g, " ").trim();
    if (!t || out.includes(t)) return;
    if (youtubeTagChars([...out, t]) > TAG_LIMIT) return;
    out.push(t);
  });
  return out;
};

// A starting tag set for a type beat page, built from the artist's name, spellings,
// styles and close artists. The live generator goes further with today's search data.
export const tagsFor = (slug, year) => {
  const set = TAG_SETS[slug];
  if (!set) return [];
  const n = set.name.toLowerCase();
  const rel = (set.related || []).map((r) => (ARTISTS[r] ? ARTISTS[r].name.toLowerCase() : "")).filter(Boolean);
  if (set.kind === "artist") {
    return fitTags([
      `${n} type beat`,
      `${n} type beat ${year}`,
      `free ${n} type beat`,
      `${n} type beat free`,
      `${n} instrumental`,
      ...set.aliases.map((a) => `${a} type beat`),
      `${n} type instrumental`,
      `${n} x ${rel[0]} type beat`,
      ...set.styles.map((s) => `${n} ${s} type beat`),
      ...set.styles.map((s) => `${s} type beat`),
      `${n} beat`,
      ...rel.slice(0, 3).map((r) => `${r} type beat`),
      `free type beat ${year}`,
      `type beat ${year}`,
      `${n} x ${rel[1]} type beat`,
      ...set.styles.map((s) => `free ${s} type beat`),
    ]);
  }
  return fitTags([
    `${n} type beat`,
    `${n} type beat ${year}`,
    `free ${n} type beat`,
    `${n} beat`,
    `${n} instrumental`,
    `${n} beats`,
    `hard ${n} beat`,
    `dark ${n} type beat`,
    ...rel.slice(0, 3).map((r) => `${r} ${n} type beat`),
    ...rel.slice(0, 3).map((r) => `${r} type beat`),
    `free type beat ${year}`,
    `type beat ${year}`,
    `${n} type beat free for profit`,
    `melodic ${n} type beat`,
  ]);
};

export const tagSetPage = (slug) => {
  const set = TAG_SETS[slug];
  if (!set) return null;
  const n = set.name;
  const artist = set.kind === "artist";
  const query = `${n.toLowerCase()} type beat`;
  return {
    slug,
    kind: set.kind,
    name: n,
    query,
    path: tagSetPath(slug),
    title: `${n} Type Beat Tags ({year}): copy-paste YouTube tags | SendMyBeat`,
    description: `Free YouTube tags for ${artist ? `${n} type beats` : `${n.toLowerCase()} type beats`}, ready to copy and paste and sized for the 500-character limit. Or generate a fresh set from live YouTube searches.`,
    h1: `${n} type beat tags`,
    lede: `Copy these tags into YouTube Studio for your next ${query}. They're sized for YouTube's 500-character tag limit. For tags pulled from today's YouTube searches for your exact beat, run the free generator.`,
    sound: set.sound,
    bpm: set.bpm,
    howTo: `Paste them into the Tags box in YouTube Studio. Keep the ${artist ? "artist" : "style"} tags, then swap a few for what makes your beat different, like the mood, the key or a second artist it sounds like. Put "${n} type beat" in your title too, since the title counts more than tags.`,
    related: (set.related || []).filter((r) => TAG_SETS[r]),
    faq: [
      [
        `How many tags should a ${query} have?`,
        `Use the 500 characters YouTube gives you, but only with tags that fit the beat. A ${query} usually needs the artist with "type beat" and the year, ${artist ? "the spellings buyers use, " : ""}the style, and two or three close ${artist ? "artists" : "artists who use the sound"}.`,
      ],
      [
        `What should a ${query} sound like?`,
        `${set.sound} Tempo is ${set.bpm}. Tag the sound you actually made: if your beat leans another way, tag that style too.`,
      ],
      [
        "Can I use these tags on every upload?",
        "Use them as a starting point, then change a few for each beat: the key, the mood, a second artist. Uploading many videos with the exact same tags makes them compete with each other.",
      ],
    ],
  };
};

const pageMeta = (path) => {
  if (STATIC_PAGES[path]) return STATIC_PAGES[path];
  if (path === FREE_TAG_PAGE.path) return { ...FREE_TAG_PAGE, priority: "0.9", changefreq: "weekly" };
  if (GUIDES[path]) return { ...GUIDES[path], priority: path === TAG_HUB_PATH ? "0.8" : "0.7", changefreq: "monthly" };
  if (TOOL_PAGES[path]) return { ...TOOL_PAGES[path], priority: "0.8", changefreq: "monthly" };
  if (path.startsWith(`${TAG_HUB_PATH}/`)) {
    const page = tagSetPage(path.slice(TAG_HUB_PATH.length + 1));
    if (page) return { ...page, priority: "0.6", changefreq: "monthly" };
  }
  return null;
};

export const PUBLIC_PATHS = [
  ...Object.keys(STATIC_PAGES),
  FREE_TAG_PAGE.path,
  ...TOOL_PATHS,
  ...Object.keys(GUIDES),
  ...TAG_SET_SLUGS.map(tagSetPath),
];

// Title and description for a public path, with the year filled in. Null for anything
// that isn't a public page (those stay out of search).
export const publicPage = (path, year) => {
  const meta = pageMeta(path);
  if (!meta) return null;
  return {
    path,
    title: withYear(meta.title, year),
    description: withYear(meta.description, year),
    priority: meta.priority,
    changefreq: meta.changefreq,
  };
};

const breadcrumbs = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({
    "@type": "ListItem",
    position: i + 1,
    name,
    item: `${SITE}${path}`,
  })),
});

const faqPage = (faq, year) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map(([q, a]) => ({
    "@type": "Question",
    name: withYear(q, year),
    acceptedAnswer: { "@type": "Answer", text: withYear(a, year) },
  })),
});

// Structured data for a public page: what the page is, where it sits, and its FAQ.
export const jsonLdFor = (path, year) => {
  const meta = publicPage(path, year);
  if (!meta || STATIC_PAGES[path]) return [];
  if (path === FREE_TAG_PAGE.path) {
    return [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "SendMyBeat Free Type Beat Tag Generator",
        url: `${SITE}${path}`,
        description: meta.description,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: "SendMyBeat", url: SITE },
      },
      breadcrumbs([["SendMyBeat", "/"], ["Free tag generator", path]]),
      faqPage(FREE_TAG_PAGE.faq, year),
    ];
  }
  if (TOOL_PAGES[path]) {
    const tool = TOOL_PAGES[path];
    return [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: tool.appName,
        url: `${SITE}${path}`,
        description: meta.description,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: "SendMyBeat", url: SITE },
      },
      breadcrumbs([["SendMyBeat", "/"], [tool.nav, path]]),
      faqPage(tool.faq, year),
    ];
  }
  if (GUIDES[path]) {
    return [breadcrumbs([["SendMyBeat", "/"], [GUIDES[path].h1, path]])];
  }
  const page = tagSetPage(path.slice(TAG_HUB_PATH.length + 1));
  return [
    breadcrumbs([["SendMyBeat", "/"], ["Type beat tags", TAG_HUB_PATH], [page.h1, path]]),
    faqPage(page.faq, year),
  ];
};

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

// The homepage's copy. LandingPage.js renders its steps, features, plans and FAQ from
// here, and scripts/prerender-seo.js writes the same copy into build/index.html, so the
// homepage's HTML has real words in it before JavaScript runs.
export const HOME = {
  eyebrow: "For beat producers on YouTube",
  h1: "SendMyBeat generates tags, renders your beat video and uploads to YouTube.",
  lede: "Start with your beat and artwork. Generate tags, write a description, pick a layout and add a visualizer. Preview the video, publish to your own YouTube channel, then see what to fix next.",
  ticks: ["No card to start", "Uploads to your own channel", "Works on your phone too"],
  steps: [
    { id: "generate", title: "Generate tags", body: "Type an artist or a vibe. Get tag suggestions from YouTube videos, then use the meter to stay under YouTube's 500-character limit." },
    { id: "review", title: "Review the ranking", body: "Every tag gets a score from real search demand and competition. See them best to worst, open one to read why, and cut the weak ones." },
    { id: "upload", title: "Upload from the studio", body: "Drop in your beat and cover art. Upload Studio renders the video and publishes it to your channel with the title, tags and description filled in." },
    { id: "grow", title: "See what's working", body: "Analytics compares each upload with your own average and suggests better titles. Pros shows how the biggest producers grew, with moves you can copy." },
  ],
  features: [
    { id: "studio", title: "Upload Studio", body: "Beat plus artwork becomes a video. Pick the layout, add a visualizer, preview it and publish to your channel without leaving the page." },
    { id: "tags", title: "Tags that rank", body: "A scored tag set that fills YouTube's 500 characters: up to 50 tags per run, each ranked on search demand and competition." },
    { id: "descriptions", title: "Descriptions", body: "Start from a template for type beats, beat sales or free-for-profit, then save your own to reuse on every upload." },
    { id: "analytics", title: "Channel analytics", pro: true, body: "Views per upload against your average, the title patterns that win and lose, and a better title for each weak upload." },
    { id: "pros", title: "Pros", pro: true, body: "Why the biggest type-beat producers blew up, how their channels work, how close your style is, and a 14-day plan to close the gap." },
    { id: "spotlight", title: "Spotlight", body: "A public profile with your top beat, a leaderboard driven by upload streaks, and other producers to follow." },
  ],
  plans: [
    { id: "trial", name: "Free", price: "$0", per: "no card", limit: 3, unit: "in total", lines: ["3 AI generations to try it", "3 YouTube uploads to try it", "One-time credits that don't renew", "Then Plus at $5/mo. Cancel anytime"] },
    { id: "plus", name: "Plus", price: "$5", per: "/mo", limit: 50, unit: "a month", lines: ["50 AI generations a month", "50 YouTube uploads a month", "Tags, descriptions and Upload Studio", "No watermark"] },
    { id: "pro", name: "Pro", price: "$10", per: "/mo", limit: 100, unit: "a month", lines: ["100 AI generations a month", "100 YouTube uploads a month", "Copy a pro producer's style", "Pro breakdowns and channel analytics", "Run several jobs at once"] },
  ],
  faq: [
    ["Do I need a card to try it?", "No. A free account comes with 3 AI generations and 3 YouTube uploads, no card needed. They don't renew, so after that you pick Plus or Pro."],
    ["Where do the tags come from?", "From YouTube itself: what people type into search, and the tags on videos that already rank for your artist. AI adds variations, then every tag is scored."],
    ["Does it upload to my own channel?", "Yes. You connect your Google account once, and uploads go to that YouTube channel as public, unlisted or private videos."],
    ["What can I do without a plan?", "Use your 3 free generations and 3 free uploads, browse Spotlight and read the Pros stories. After the free credits, generating, uploading and analytics need a plan."],
    ["Is there a phone app?", "An Android app with the same account and features is on the way."],
  ],
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
      "No. These are YouTube search tags, the keywords that help buyers find your upload. A producer tag is the voice drop inside your beat. See the guide on YouTube tags vs producer tags for the difference.",
    ],
  ],
};

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
  "/beat-description-generator": {
    title: "YouTube Description Generator for Beats | SendMyBeat",
    description: "Write YouTube descriptions for type beats: purchase links, credits, BPM and contact info, from templates you save and reuse.",
    h1: "YouTube descriptions for your beats",
    lede: "A beat description has a job: tell buyers how to get the beat and how to reach you, and give YouTube a few words of context.",
    sections: [
      ["Start from a template", "Templates for type beats, beat sales and free-for-profit beats, with places for your links, BPM, key and contact."],
      ["Save your own", "Keep the description you use on every upload and fill in only what changes."],
      ["Keep it readable", "Put the purchase link and the credit line at the top, where people see them without tapping \"more\"."],
    ],
  },
  "/tag-my-beat": {
    title: "Tag My Beat: YouTube tags vs producer tags, and how to do both | SendMyBeat",
    description: "\"Tag my beat\" can mean two things: YouTube search tags or a producer voice tag. Here's the difference, and a free tool for the YouTube tags.",
    h1: "Tag your beat: YouTube tags or a producer tag?",
    lede: "Producers say \"tag my beat\" for two different jobs. One gets your beat found on YouTube. The other puts your name inside the beat.",
    sections: [
      ["Two kinds of tag", "A producer tag is a short voice drop in the audio, like \"you're now listening to...\", that marks the beat as yours. YouTube tags are keywords in YouTube Studio that tell YouTube which searches your upload belongs in."],
      ["Tagging your beat for YouTube", "Start with the artist plus \"type beat\" and the year, add the style, then the spellings buyers use. Keep it under YouTube's 500 characters. The free generator builds this set for you from live YouTube searches."],
      ["Adding a producer tag", "SendMyBeat doesn't record voice tags. Record your own or use a voice tag tool, drop it into the first few bars, and bounce the beat before you upload. Then tag the upload for YouTube here."],
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

  // US trap, Atlanta, Memphis and the South
  "lil-wayne": { name: "Lil Wayne", aliases: ["weezy"], styles: ["trap", "southern rap"], related: ["drake", "nicki-minaj", "gucci-mane", "kanye-west"], sound: "Southern rap and trap, from bouncy 808 beats to big piano and guitar loops.", bpm: "anywhere from 70 to 160 BPM depending on the era" },
  "gucci-mane": { name: "Gucci Mane", aliases: ["guwop"], styles: ["trap", "southern trap"], related: ["young-dolph", "future", "lil-wayne", "migos"], sound: "Classic Atlanta trap: hard 808s, simple synth or bell melodies and rolling hi-hats.", bpm: "usually 130 to 150 BPM" },
  migos: { name: "Migos", aliases: [], styles: ["trap", "bouncy trap"], related: ["offset", "young-thug", "future", "gucci-mane"], sound: "Bouncy Atlanta trap: punchy 808s, catchy synth loops and hi-hats that leave room for triplet flows.", bpm: "usually 130 to 150 BPM" },
  offset: { name: "Offset", aliases: [], styles: ["trap", "dark trap"], related: ["migos", "metro-boomin", "21-savage", "cardi-b"], sound: "Hard Atlanta trap with dark melodies, heavy 808s and fast hi-hats.", bpm: "usually 130 to 150 BPM" },
  "lil-yachty": { name: "Lil Yachty", aliases: ["yachty", "lil boat"], styles: ["melodic trap", "psychedelic"], related: ["playboi-carti", "lil-uzi-vert", "young-thug", "drake"], sound: "Bright, playful melodic trap, and spacier, live-band sounds on later work.", bpm: "usually 130 to 160 BPM" },
  "young-nudy": { name: "Young Nudy", aliases: ["nudy"], styles: ["trap", "plugg"], related: ["pierre-bourne", "21-savage", "young-thug", "key-glock"], sound: "Laid-back Atlanta trap with quirky, bouncy melodies and heavy 808s.", bpm: "usually 130 to 160 BPM" },
  "moneybagg-yo": { name: "Moneybagg Yo", aliases: ["bagg"], styles: ["memphis", "trap"], related: ["key-glock", "nba-youngboy", "lil-baby", "young-dolph"], sound: "Memphis street trap: dark piano or synth loops, heavy 808s and steady hi-hats.", bpm: "usually 130 to 160 BPM" },
  "key-glock": { name: "Key Glock", aliases: ["glock"], styles: ["memphis", "trap"], related: ["young-dolph", "moneybagg-yo", "est-gee", "gucci-mane"], sound: "Memphis trap: dark, bass-heavy beats with simple, menacing melodies.", bpm: "usually 130 to 160 BPM" },
  "young-dolph": { name: "Young Dolph", aliases: ["dolph"], styles: ["memphis", "trap"], related: ["key-glock", "gucci-mane", "moneybagg-yo", "est-gee"], sound: "Laid-back Memphis trap: smooth or eerie loops over heavy 808s.", bpm: "usually 130 to 160 BPM" },
  "est-gee": { name: "EST Gee", aliases: [], styles: ["trap", "dark trap"], related: ["moneybagg-yo", "key-glock", "lil-baby", "pooh-shiesty"], sound: "Dark, aggressive street trap with heavy 808s and grim melodies.", bpm: "usually 130 to 160 BPM" },
  "pooh-shiesty": { name: "Pooh Shiesty", aliases: ["shiesty"], styles: ["memphis", "trap"], related: ["moneybagg-yo", "key-glock", "lil-durk", "est-gee"], sound: "Memphis trap with dark, bouncy melodies and heavy bass.", bpm: "usually 130 to 160 BPM" },
  glorilla: { name: "GloRilla", aliases: [], styles: ["memphis", "trap"], related: ["moneybagg-yo", "sexyy-red", "latto", "megan-thee-stallion"], sound: "Loud Memphis trap with punchy drums, heavy 808s and room for chant-style hooks.", bpm: "usually 130 to 160 BPM" },
  "sexyy-red": { name: "Sexyy Red", aliases: ["sexy red"], styles: ["trap", "bouncy trap"], related: ["glorilla", "nicki-minaj", "latto", "cardi-b"], sound: "Bouncy, minimal trap with heavy 808s and short, catchy loops.", bpm: "usually 130 to 160 BPM" },
  latto: { name: "Latto", aliases: [], styles: ["trap", "pop rap"], related: ["glorilla", "megan-thee-stallion", "cardi-b", "nicki-minaj"], sound: "Bouncy trap and pop rap with hard 808s.", bpm: "usually 120 to 160 BPM" },
  "cardi-b": { name: "Cardi B", aliases: ["cardi"], styles: ["trap", "pop rap"], related: ["megan-thee-stallion", "nicki-minaj", "offset", "latto"], sound: "Hard, bouncy trap and pop rap, sometimes with Latin touches.", bpm: "usually 120 to 160 BPM" },
  "megan-thee-stallion": { name: "Megan Thee Stallion", aliases: ["megan", "meg thee stallion"], styles: ["southern trap", "houston"], related: ["cardi-b", "glorilla", "latto", "nicki-minaj"], sound: "Hard Houston-style trap: booming 808s, punchy drums and bouncy grooves.", bpm: "usually 120 to 160 BPM" },
  "nicki-minaj": { name: "Nicki Minaj", aliases: ["nicki"], styles: ["pop rap", "trap"], related: ["cardi-b", "lil-wayne", "drake", "megan-thee-stallion"], sound: "Anything from hard trap to bright pop rap, with big hooks and heavy 808s.", bpm: "usually 120 to 160 BPM" },
  "doja-cat": { name: "Doja Cat", aliases: ["doja"], styles: ["pop rap", "r&b"], related: ["sza", "megan-thee-stallion", "the-weeknd", "nicki-minaj"], sound: "Pop rap and R&B: groovy basslines, disco and funk touches, or hard trap drums.", bpm: "anywhere from 90 to 160 BPM" },
  "kodak-black": { name: "Kodak Black", aliases: ["kodak"], styles: ["florida", "piano"], related: ["nba-youngboy", "lil-baby", "rod-wave", "kevin-gates"], sound: "Florida street rap: emotional piano or guitar loops over trap drums.", bpm: "usually 130 to 160 BPM" },
  "bossman-dlow": { name: "BossMan Dlow", aliases: [], styles: ["florida", "trap"], related: ["kodak-black", "lil-baby", "moneybagg-yo"], sound: "Florida street rap: simple, bouncy loops and hard 808s.", bpm: "usually 130 to 160 BPM" },
  "kevin-gates": { name: "Kevin Gates", aliases: [], styles: ["southern rap", "r&b"], related: ["kodak-black", "nba-youngboy", "rod-wave", "lil-durk"], sound: "Emotional Southern rap with melodic keys and hard trap drums.", bpm: "usually 130 to 160 BPM" },
  "nle-choppa": { name: "NLE Choppa", aliases: ["choppa"], styles: ["drill", "trap"], related: ["nba-youngboy", "pooh-shiesty", "pop-smoke", "kodak-black"], sound: "High-energy Memphis trap and drill with aggressive 808s.", bpm: "usually 130 to 160 BPM" },
  dababy: { name: "DaBaby", aliases: ["da baby"], styles: ["trap", "bouncy trap"], related: ["megan-thee-stallion", "roddy-ricch", "lil-baby", "jack-harlow"], sound: "Punchy, bouncy trap with hard kicks and short, catchy loops.", bpm: "usually 130 to 170 BPM" },

  // Melodic rap, emo and pop rap
  "lil-tecca": { name: "Lil Tecca", aliases: ["tecca"], styles: ["melodic trap", "pluggnb"], related: ["lil-tjay", "lil-uzi-vert", "polo-g", "juice-wrld"], sound: "Bright, melodic trap with bouncy plucks and light 808s.", bpm: "usually 140 to 170 BPM" },
  "polo-g": { name: "Polo G", aliases: [], styles: ["piano", "melodic drill"], related: ["lil-tjay", "lil-durk", "rod-wave", "juice-wrld"], sound: "Emotional melodic rap: piano and guitar melodies over trap or drill drums.", bpm: "usually 130 to 160 BPM" },
  "lil-tjay": { name: "Lil Tjay", aliases: ["tjay"], styles: ["melodic drill", "r&b"], related: ["polo-g", "a-boogie", "lil-tecca", "pop-smoke"], sound: "Melodic New York rap: R&B-leaning melodies over drill or trap drums.", bpm: "usually 130 to 150 BPM" },
  "a-boogie": { name: "A Boogie wit da Hoodie", aliases: ["a boogie"], styles: ["melodic trap", "r&b"], related: ["lil-tjay", "don-toliver", "roddy-ricch", "pop-smoke"], sound: "Melodic trap and R&B: smooth guitar or keys over bouncy 808s.", bpm: "usually 120 to 150 BPM" },
  "roddy-ricch": { name: "Roddy Ricch", aliases: ["roddy"], styles: ["melodic trap", "west coast"], related: ["a-boogie", "gunna", "nba-youngboy", "lil-baby"], sound: "Melodic trap with piano or synth melodies and smooth, bouncing 808s.", bpm: "usually 130 to 160 BPM" },
  "jack-harlow": { name: "Jack Harlow", aliases: [], styles: ["pop rap", "sample"], related: ["drake", "dababy", "j-cole", "post-malone"], sound: "Smooth pop rap over sampled loops, soft keys and laid-back drums.", bpm: "usually 80 to 100 BPM, with faster bouncy trap too" },
  "post-malone": { name: "Post Malone", aliases: ["posty"], styles: ["pop rap", "guitar"], related: ["swae-lee", "the-weeknd", "juice-wrld", "travis-scott"], sound: "Pop rap and melodic trap with guitar, airy pads and big hooks.", bpm: "anywhere from 70 to 160 BPM" },
  "swae-lee": { name: "Swae Lee", aliases: ["swae"], styles: ["melodic trap", "r&b"], related: ["post-malone", "travis-scott", "don-toliver", "a-boogie"], sound: "Airy, melodic trap and R&B with soft synths and spacey pads.", bpm: "usually 120 to 150 BPM" },
  "trippie-redd": { name: "Trippie Redd", aliases: ["trippie"], styles: ["melodic trap", "rage"], related: ["juice-wrld", "lil-uzi-vert", "xxxtentacion", "playboi-carti"], sound: "Melodic, emotional trap and rock-leaning rage, with big synths and heavy 808s.", bpm: "usually 130 to 170 BPM" },
  xxxtentacion: { name: "XXXTentacion", aliases: ["xxx"], styles: ["emo", "sad piano"], related: ["ski-mask", "juice-wrld", "lil-peep", "trippie-redd"], sound: "From soft, sad piano and guitar to distorted, aggressive trap.", bpm: "anywhere from 70 to 160 BPM" },
  "ski-mask": { name: "Ski Mask the Slump God", aliases: ["ski mask"], styles: ["trap", "underground"], related: ["xxxtentacion", "denzel-curry", "trippie-redd", "juice-wrld"], sound: "Hyper, bass-heavy trap with quirky melodies and fast hi-hats.", bpm: "usually 140 to 170 BPM" },
  "lil-peep": { name: "Lil Peep", aliases: ["peep"], styles: ["emo", "guitar"], related: ["juice-wrld", "xxxtentacion", "suicideboys", "trippie-redd"], sound: "Emo rap: sad guitar loops and lo-fi textures over trap drums.", bpm: "usually 130 to 160 BPM, often felt in half time" },
  "the-kid-laroi": { name: "The Kid LAROI", aliases: ["kid laroi", "laroi"], styles: ["melodic trap", "pop"], related: ["juice-wrld", "lil-tecca", "post-malone"], sound: "Pop-leaning melodic trap and emo rap with guitar and synth melodies.", bpm: "usually 130 to 170 BPM" },
  toosii: { name: "Toosii", aliases: [], styles: ["r&b", "melodic trap"], related: ["rod-wave", "lil-tjay", "kevin-gates"], sound: "Heartfelt R&B and melodic rap: soft guitar or piano over trap drums.", bpm: "usually 120 to 160 BPM" },

  // Dark, underground and phonk-adjacent
  suicideboys: { name: "$uicideboy$", aliases: ["suicideboys", "suicide boys"], styles: ["dark trap", "phonk"], related: ["ghostemane", "denzel-curry", "lil-peep", "ski-mask"], sound: "Dark Southern underground rap: Memphis-style samples, eerie loops and distorted 808s.", bpm: "usually 120 to 160 BPM" },
  ghostemane: { name: "Ghostemane", aliases: [], styles: ["dark trap", "metal"], related: ["suicideboys", "denzel-curry", "ski-mask", "xxxtentacion"], sound: "Dark, heavy trap that can lean into metal and industrial sounds.", bpm: "usually 130 to 170 BPM" },
  "denzel-curry": { name: "Denzel Curry", aliases: [], styles: ["trap", "boom bap"], related: ["jid", "ski-mask", "kendrick-lamar", "suicideboys"], sound: "Aggressive trap and harder hip hop, from dark 808 beats to sample-based boom bap.", bpm: "anywhere from 80 to 150 BPM" },

  // Rage, plugg, cloud rap and the underground
  "lancey-foux": { name: "Lancey Foux", aliases: [], styles: ["rage", "uk"], related: ["ken-carson", "destroy-lonely", "playboi-carti"], sound: "Dark, distorted rage with heavy synths and a UK edge.", bpm: "usually 140 to 170 BPM" },
  summrs: { name: "Summrs", aliases: [], styles: ["pluggnb", "plugg"], related: ["autumn", "kankan", "nettspend", "lucki"], sound: "Pluggnb: airy R&B chords, soft bells and light plugg drums.", bpm: "usually 140 to 160 BPM" },
  autumn: { name: "Autumn!", aliases: ["autumn"], styles: ["pluggnb", "plugg"], related: ["summrs", "kankan", "lucki", "nettspend"], sound: "Pluggnb with soft, glossy synths, bells and light 808s.", bpm: "usually 140 to 160 BPM" },
  kankan: { name: "Kankan", aliases: [], styles: ["plugg", "pluggnb"], related: ["summrs", "autumn", "pierre-bourne", "nettspend"], sound: "Bright, bouncy plugg with glossy synths and light 808s.", bpm: "usually 140 to 160 BPM" },
  lucki: { name: "Lucki", aliases: [], styles: ["dark plugg", "plugg"], related: ["summrs", "future", "autumn", "kankan"], sound: "Dark plugg: hazy, washed-out loops over plugg drums.", bpm: "usually 140 to 160 BPM" },
  "pierre-bourne": { name: "Pi'erre Bourne", aliases: ["pierre bourne"], styles: ["plugg", "melodic trap"], related: ["playboi-carti", "lil-uzi-vert", "kankan", "young-nudy"], sound: "Bright, bouncy plugg-style trap: catchy synth loops and big, simple 808s.", bpm: "usually 140 to 160 BPM" },
  sofaygo: { name: "SoFaygo", aliases: [], styles: ["melodic trap", "pluggnb"], related: ["travis-scott", "don-toliver", "lil-tecca", "nettspend"], sound: "Bright, melodic trap with airy synths and bouncy drums.", bpm: "usually 140 to 160 BPM" },
  bladee: { name: "Bladee", aliases: [], styles: ["cloud rap", "drain"], related: ["yung-lean", "lil-peep", "nettspend"], sound: "Cloud rap and drain: dreamy, glossy synths and soft trap drums.", bpm: "anywhere from 120 to 160 BPM" },
  "yung-lean": { name: "Yung Lean", aliases: [], styles: ["cloud rap", "sad boy"], related: ["bladee", "lil-peep", "asap-rocky"], sound: "Cloud rap: dreamy synths, washed-out pads and slow trap drums.", bpm: "usually 120 to 150 BPM" },
  "earl-sweatshirt": { name: "Earl Sweatshirt", aliases: [], styles: ["lofi", "abstract"], related: ["tyler-the-creator", "mf-doom", "mac-miller"], sound: "Abstract, lo-fi hip hop: dusty, off-kilter samples and loose drums.", bpm: "usually 70 to 90 BPM" },

  // Lyrical and alternative
  jid: { name: "JID", aliases: ["j.i.d"], styles: ["boom bap", "jazz"], related: ["j-cole", "kendrick-lamar", "denzel-curry", "baby-keem"], sound: "Lyrical hip hop: soulful or jazzy samples with bouncy, off-kilter drums.", bpm: "usually 80 to 100 BPM, with faster trap tracks too" },
  "baby-keem": { name: "Baby Keem", aliases: ["keem"], styles: ["experimental", "trap"], related: ["kendrick-lamar", "travis-scott", "tyler-the-creator", "jid"], sound: "Playful, experimental trap with odd melodies and beat switches.", bpm: "anywhere from 70 to 160 BPM" },
  "tyler-the-creator": { name: "Tyler the Creator", aliases: ["tyler"], styles: ["neo soul", "experimental"], related: ["frank-ocean", "asap-rocky", "kanye-west", "baby-keem"], sound: "Lush synth chords with jazz and soul touches, or loud, distorted drums, depending on the album.", bpm: "anywhere from 70 to 150 BPM" },
  "asap-rocky": { name: "A$AP Rocky", aliases: ["asap rocky", "asap"], styles: ["cloud rap", "trap"], related: ["tyler-the-creator", "travis-scott", "playboi-carti", "kanye-west"], sound: "Hazy cloud rap and trap: dreamy samples, deep bass and slowed textures.", bpm: "anywhere from 70 to 150 BPM" },
  "mac-miller": { name: "Mac Miller", aliases: [], styles: ["jazz", "soul"], related: ["kid-cudi", "earl-sweatshirt", "j-cole"], sound: "Mellow hip hop: jazzy keys, a live-band feel and soft drums.", bpm: "usually 70 to 95 BPM" },
  "kid-cudi": { name: "Kid Cudi", aliases: ["cudi"], styles: ["psychedelic", "alternative"], related: ["kanye-west", "travis-scott", "mac-miller"], sound: "Spacey, moody hip hop: hums, big synth pads and slow drums.", bpm: "usually 70 to 140 BPM" },
  logic: { name: "Logic", aliases: [], styles: ["boom bap", "lyrical"], related: ["nf", "j-cole", "eminem"], sound: "Lyrical hip hop: soulful samples or big, cinematic beats.", bpm: "usually 80 to 100 BPM" },
  nf: { name: "NF", aliases: [], styles: ["dark piano", "cinematic"], related: ["eminem", "logic"], sound: "Dark, cinematic hip hop: piano, strings and big, hard drums.", bpm: "usually 80 to 100 BPM" },

  // Chicago and New York drill, Jersey club and jerk
  "chief-keef": { name: "Chief Keef", aliases: ["sosa"], styles: ["chicago drill", "drill"], related: ["king-von", "g-herbo", "lil-durk"], sound: "Original Chicago drill: brassy or bell melodies, hard 808s and simple, menacing loops.", bpm: "usually 130 to 150 BPM" },
  "king-von": { name: "King Von", aliases: ["von"], styles: ["chicago drill", "drill"], related: ["lil-durk", "chief-keef", "g-herbo", "polo-g"], sound: "Chicago drill with dark piano or string melodies and hard 808s.", bpm: "usually 130 to 150 BPM" },
  "g-herbo": { name: "G Herbo", aliases: ["herbo"], styles: ["chicago drill", "drill"], related: ["lil-durk", "king-von", "chief-keef", "polo-g"], sound: "Chicago drill and street rap: dark, emotional loops and hard drums.", bpm: "usually 130 to 150 BPM" },
  "fivio-foreign": { name: "Fivio Foreign", aliases: ["fivio"], styles: ["ny drill", "brooklyn drill"], related: ["pop-smoke", "kay-flock", "dd-osama", "central-cee"], sound: "Brooklyn drill: sliding 808s, choppy drums and big, dark melodies.", bpm: "usually 140 to 145 BPM" },
  "kay-flock": { name: "Kay Flock", aliases: [], styles: ["ny drill", "bronx drill"], related: ["dd-osama", "fivio-foreign", "pop-smoke", "sleepy-hallow"], sound: "Bronx drill, often over flipped R&B or pop samples with sliding 808s.", bpm: "usually 140 to 145 BPM" },
  "dd-osama": { name: "DD Osama", aliases: [], styles: ["ny drill", "melodic drill"], related: ["kay-flock", "sleepy-hallow", "ice-spice", "fivio-foreign"], sound: "Melodic New York drill: sampled melodies over sliding 808s and choppy drums.", bpm: "usually 140 to 145 BPM" },
  "sleepy-hallow": { name: "Sleepy Hallow", aliases: [], styles: ["ny drill", "melodic drill"], related: ["kay-flock", "pop-smoke", "dd-osama", "fivio-foreign"], sound: "Melodic Brooklyn drill: moody guitar or piano over sliding 808s.", bpm: "usually 140 to 145 BPM" },
  "ice-spice": { name: "Ice Spice", aliases: [], styles: ["ny drill", "jersey club"], related: ["cash-cobain", "central-cee", "nicki-minaj", "pop-smoke"], sound: "Bouncy New York drill with sampled melodies and sliding 808s.", bpm: "usually 140 to 150 BPM" },
  "cash-cobain": { name: "Cash Cobain", aliases: [], styles: ["sexy drill", "ny drill"], related: ["ice-spice", "kay-flock", "bandmanrill", "central-cee"], sound: "Sexy drill: chopped R&B samples over bouncy drill drums.", bpm: "usually 140 to 150 BPM" },
  bandmanrill: { name: "Bandmanrill", aliases: [], styles: ["jersey club", "drill"], related: ["cash-cobain", "ice-spice", "kay-flock", "dd-osama"], sound: "Jersey club drill: fast club kicks and bed-squeak sounds mixed with drill 808s.", bpm: "usually 140 to 150 BPM" },
  "kyle-richh": { name: "Kyle Richh", aliases: [], styles: ["jerk", "ny drill"], related: ["cash-cobain", "bandmanrill", "ice-spice", "dd-osama"], sound: "New York jerk and drill: fast, bright synths, bouncy drums and chant-style hooks.", bpm: "usually fast, 140 BPM and up" },

  // Detroit
  babytron: { name: "BabyTron", aliases: ["baby tron"], styles: ["detroit", "scam rap"], related: ["veeze", "sada-baby", "tee-grizzley"], sound: "Detroit rap: punchy, offbeat drums, sampled melodies and heavy bass.", bpm: "often fast and bouncy" },
  veeze: { name: "Veeze", aliases: [], styles: ["detroit", "underground"], related: ["babytron", "sada-baby", "tee-grizzley"], sound: "Detroit rap with spacey, laid-back loops and minimal drums.", bpm: "varies, often laid-back" },
  "sada-baby": { name: "Sada Baby", aliases: [], styles: ["detroit", "trap"], related: ["babytron", "tee-grizzley", "veeze"], sound: "Detroit trap: bouncy, offbeat piano or synth loops over hard bass.", bpm: "often fast and bouncy" },
  "tee-grizzley": { name: "Tee Grizzley", aliases: [], styles: ["detroit", "trap"], related: ["sada-baby", "babytron", "veeze"], sound: "Detroit street rap with piano or orchestral loops and hard drums.", bpm: "usually 130 to 160 BPM" },

  // R&B
  sza: { name: "SZA", aliases: [], styles: ["r&b", "alt r&b"], related: ["summer-walker", "brent-faiyaz", "frank-ocean", "doja-cat"], sound: "Alt R&B: warm chords, lo-fi textures and loose, laid-back drums.", bpm: "usually 60 to 100 BPM" },
  "brent-faiyaz": { name: "Brent Faiyaz", aliases: [], styles: ["r&b", "alt r&b"], related: ["partynextdoor", "giveon", "bryson-tiller", "sza"], sound: "Moody, minimal R&B with soft keys, deep bass and lots of space.", bpm: "usually 60 to 100 BPM" },
  "bryson-tiller": { name: "Bryson Tiller", aliases: [], styles: ["trapsoul", "r&b"], related: ["partynextdoor", "drake", "brent-faiyaz", "summer-walker"], sound: "Trapsoul: R&B samples and chords over slow trap drums.", bpm: "usually 60 to 90 BPM" },
  partynextdoor: { name: "PartyNextDoor", aliases: ["party next door", "pnd"], styles: ["r&b", "dancehall"], related: ["drake", "bryson-tiller", "brent-faiyaz", "the-weeknd"], sound: "Dark, moody R&B with atmospheric pads and some dancehall bounce.", bpm: "usually 60 to 110 BPM" },
  "summer-walker": { name: "Summer Walker", aliases: [], styles: ["r&b", "trapsoul"], related: ["sza", "bryson-tiller", "brent-faiyaz", "chris-brown"], sound: "Soft, soulful R&B over slow trap-influenced drums.", bpm: "usually 60 to 90 BPM" },
  "frank-ocean": { name: "Frank Ocean", aliases: [], styles: ["alt r&b", "neo soul"], related: ["tyler-the-creator", "sza", "brent-faiyaz", "giveon"], sound: "Alt R&B: warm keys, guitar and sparse, soft drums.", bpm: "usually 60 to 100 BPM" },
  "chris-brown": { name: "Chris Brown", aliases: ["breezy"], styles: ["r&b", "dance"], related: ["the-weeknd", "drake", "summer-walker"], sound: "R&B from smooth slow jams to upbeat dance and afro-leaning grooves.", bpm: "anywhere from 60 to 120 BPM" },
  giveon: { name: "Giveon", aliases: [], styles: ["r&b", "soul"], related: ["brent-faiyaz", "frank-ocean", "sza"], sound: "Soulful, slow R&B with lush chords and soft drums.", bpm: "usually 60 to 90 BPM" },

  // UK rap, drill and grime
  dave: { name: "Dave", aliases: ["santan dave"], styles: ["uk rap", "piano"], related: ["central-cee", "stormzy", "j-hus", "headie-one"], sound: "UK rap with emotional piano and strings over drill or trap drums.", bpm: "anywhere from 70 to 145 BPM" },
  stormzy: { name: "Stormzy", aliases: [], styles: ["grime", "uk rap"], related: ["dave", "skepta", "aitch", "j-hus"], sound: "Grime and UK rap: punchy, synth-heavy beats with gospel touches.", bpm: "grime is usually around 140 BPM" },
  skepta: { name: "Skepta", aliases: [], styles: ["grime", "uk rap"], related: ["stormzy", "dave", "central-cee"], sound: "Grime: raw, square-wave synths and punchy, sparse drums.", bpm: "usually around 140 BPM" },
  "digga-d": { name: "Digga D", aliases: [], styles: ["uk drill", "drill"], related: ["headie-one", "central-cee", "dave"], sound: "UK drill: sliding 808s, skippy hi-hats and dark melodies.", bpm: "usually 140 to 145 BPM" },
  "headie-one": { name: "Headie One", aliases: [], styles: ["uk drill", "melodic drill"], related: ["digga-d", "central-cee", "dave"], sound: "UK drill with melodic, sometimes guitar-led loops over sliding 808s.", bpm: "usually 140 to 145 BPM" },
  aitch: { name: "Aitch", aliases: [], styles: ["uk rap", "bouncy"], related: ["central-cee", "stormzy", "dave"], sound: "Bouncy UK rap with catchy, upbeat loops.", bpm: "usually 90 to 145 BPM" },
  "j-hus": { name: "J Hus", aliases: [], styles: ["afroswing", "uk rap"], related: ["burna-boy", "dave", "stormzy"], sound: "Afroswing: afro-leaning percussion and warm chords with a UK rap edge.", bpm: "usually 95 to 110 BPM" },

  // Afrobeats
  "burna-boy": { name: "Burna Boy", aliases: ["burna"], styles: ["afrobeats", "afrofusion"], related: ["wizkid", "davido", "rema", "asake"], sound: "Afrofusion: afrobeats percussion with reggae, dancehall and R&B touches.", bpm: "usually 95 to 115 BPM" },
  wizkid: { name: "Wizkid", aliases: [], styles: ["afrobeats", "afro r&b"], related: ["burna-boy", "tems", "davido", "rema"], sound: "Smooth afrobeats with warm chords, light percussion and a relaxed groove.", bpm: "usually 95 to 115 BPM" },
  rema: { name: "Rema", aliases: [], styles: ["afrobeats", "afro rave"], related: ["burna-boy", "wizkid", "asake"], sound: "Melodic afrobeats with bouncy percussion and catchy synth or guitar lines.", bpm: "usually 95 to 115 BPM" },
  asake: { name: "Asake", aliases: [], styles: ["amapiano", "afrobeats"], related: ["burna-boy", "rema", "davido"], sound: "Afrobeats and amapiano: log drums, chants and percussion-heavy grooves.", bpm: "usually 105 to 115 BPM" },
  davido: { name: "Davido", aliases: [], styles: ["afrobeats", "afropop"], related: ["burna-boy", "wizkid", "asake"], sound: "Upbeat afropop: bright percussion, catchy hooks and a danceable groove.", bpm: "usually 95 to 115 BPM" },
  tems: { name: "Tems", aliases: [], styles: ["afro r&b", "r&b"], related: ["wizkid", "sza", "burna-boy"], sound: "Soulful afro R&B with deep, warm grooves.", bpm: "usually 80 to 105 BPM" },

  // West Coast
  "snoop-dogg": { name: "Snoop Dogg", aliases: ["snoop"], styles: ["west coast", "g-funk"], related: ["dr-dre", "nipsey-hussle", "2pac"], sound: "West Coast G-funk: smooth synth leads, funky basslines and laid-back drums.", bpm: "usually 85 to 100 BPM" },
  "dr-dre": { name: "Dr. Dre", aliases: ["dr dre", "dre"], styles: ["west coast", "g-funk"], related: ["snoop-dogg", "eminem", "2pac"], sound: "West Coast hip hop: hard drums, piano or synth leads and a big, clean low end.", bpm: "usually 85 to 100 BPM" },
  "2pac": { name: "2Pac", aliases: ["tupac"], styles: ["west coast", "g-funk"], related: ["dr-dre", "snoop-dogg", "the-notorious-big", "nas"], sound: "90s West Coast: soulful samples, G-funk synths and boom-bap drums.", bpm: "usually 85 to 100 BPM" },
  "nipsey-hussle": { name: "Nipsey Hussle", aliases: ["nipsey"], styles: ["west coast", "soulful"], related: ["snoop-dogg", "kendrick-lamar", "blxst", "yg"], sound: "Soulful West Coast rap: smooth keys, funk basslines and laid-back bounce.", bpm: "usually 85 to 100 BPM" },
  yg: { name: "YG", aliases: [], styles: ["west coast", "ratchet"], related: ["nipsey-hussle", "blxst", "kendrick-lamar"], sound: "West Coast bounce: snappy claps, deep bass and simple synth riffs.", bpm: "usually 90 to 105 BPM" },
  blxst: { name: "Blxst", aliases: [], styles: ["west coast", "r&b"], related: ["nipsey-hussle", "yg", "roddy-ricch"], sound: "Smooth West Coast R&B and rap with soft keys and bouncy drums.", bpm: "usually 85 to 105 BPM" },
  "larry-june": { name: "Larry June", aliases: [], styles: ["west coast", "soul sample"], related: ["nipsey-hussle", "blxst", "freddie-gibbs"], sound: "Laid-back West Coast rap over smooth soul and jazz samples.", bpm: "usually 80 to 95 BPM" },

  // Latin trap, reggaeton and corridos
  "bad-bunny": { name: "Bad Bunny", aliases: ["benito"], styles: ["reggaeton", "latin trap"], related: ["anuel-aa", "feid", "rauw-alejandro", "eladio-carrion"], sound: "Reggaeton and Latin trap: dembow rhythms, dark trap 808s and moody synths.", bpm: "around 90 BPM for reggaeton, 130 to 150 for trap" },
  "anuel-aa": { name: "Anuel AA", aliases: ["anuel"], styles: ["latin trap", "reggaeton"], related: ["bad-bunny", "eladio-carrion", "ozuna", "myke-towers"], sound: "Dark Latin trap with heavy 808s, plus reggaeton.", bpm: "130 to 150 BPM for trap, around 90 for reggaeton" },
  "eladio-carrion": { name: "Eladio Carrion", aliases: ["eladio"], styles: ["latin trap", "trap"], related: ["bad-bunny", "anuel-aa", "myke-towers", "quevedo"], sound: "Latin trap with hard 808s and US trap influences.", bpm: "usually 130 to 150 BPM" },
  "myke-towers": { name: "Myke Towers", aliases: [], styles: ["latin trap", "reggaeton"], related: ["anuel-aa", "rauw-alejandro", "eladio-carrion"], sound: "Latin trap and reggaeton with smooth melodies and heavy bass.", bpm: "around 90 BPM for reggaeton, 130 to 150 for trap" },
  ozuna: { name: "Ozuna", aliases: [], styles: ["reggaeton", "latin trap"], related: ["anuel-aa", "bad-bunny", "j-balvin"], sound: "Melodic reggaeton and Latin trap with smooth, romantic melodies.", bpm: "usually 85 to 100 BPM" },
  feid: { name: "Feid", aliases: ["ferxxo"], styles: ["reggaeton", "latin pop"], related: ["karol-g", "bad-bunny", "rauw-alejandro", "j-balvin"], sound: "Smooth, melodic reggaeton with soft synths.", bpm: "usually 85 to 100 BPM" },
  "karol-g": { name: "Karol G", aliases: [], styles: ["reggaeton", "latin pop"], related: ["feid", "bad-bunny", "j-balvin"], sound: "Reggaeton and Latin pop: dembow drums, bright melodies and big hooks.", bpm: "usually 85 to 100 BPM" },
  "rauw-alejandro": { name: "Rauw Alejandro", aliases: ["rauw"], styles: ["reggaeton", "latin r&b"], related: ["bad-bunny", "feid", "myke-towers"], sound: "Reggaeton with R&B and dance-pop touches.", bpm: "usually 85 to 110 BPM" },
  "j-balvin": { name: "J Balvin", aliases: ["balvin"], styles: ["reggaeton", "latin pop"], related: ["bad-bunny", "karol-g", "feid", "ozuna"], sound: "Colorful reggaeton: dembow drums, catchy synths and a clean, poppy mix.", bpm: "usually 85 to 100 BPM" },
  quevedo: { name: "Quevedo", aliases: [], styles: ["reggaeton", "latin pop"], related: ["bad-bunny", "feid", "eladio-carrion"], sound: "Moody reggaeton and Latin pop with synth-heavy production.", bpm: "usually 85 to 110 BPM" },
  "peso-pluma": { name: "Peso Pluma", aliases: [], styles: ["corridos tumbados", "regional mexican"], related: ["natanael-cano", "junior-h"], sound: "Corridos tumbados: acoustic guitars and tuba or bass with a trap attitude.", bpm: "varies with the guitar strumming pattern" },
  "natanael-cano": { name: "Natanael Cano", aliases: [], styles: ["corridos tumbados", "regional mexican"], related: ["peso-pluma", "junior-h"], sound: "Corridos tumbados: acoustic guitars and bass with trap influences.", bpm: "varies with the guitar strumming pattern" },
  "junior-h": { name: "Junior H", aliases: [], styles: ["corridos tumbados", "regional mexican"], related: ["natanael-cano", "peso-pluma"], sound: "Moody corridos tumbados: acoustic guitars, bass and a sad, laid-back feel.", bpm: "varies with the guitar strumming pattern" },

  // Classic and boom bap
  eminem: { name: "Eminem", aliases: ["slim shady"], styles: ["hard", "boom bap"], related: ["dr-dre", "nf", "50-cent", "logic"], sound: "Hard-hitting hip hop: dramatic piano or strings, big drums and dark, intense loops.", bpm: "usually 80 to 100 BPM, with faster tracks too" },
  "jay-z": { name: "Jay-Z", aliases: ["jay z", "hov"], styles: ["soul sample", "boom bap"], related: ["kanye-west", "nas", "the-notorious-big"], sound: "Soul-sample hip hop with punchy drums, from classic boom bap to polished, big-room production.", bpm: "usually 85 to 100 BPM" },
  nas: { name: "Nas", aliases: [], styles: ["boom bap", "soul sample"], related: ["jay-z", "the-notorious-big", "mobb-deep", "2pac"], sound: "Classic East Coast boom bap: dusty samples, jazzy loops and hard drums.", bpm: "usually 85 to 95 BPM" },
  "the-notorious-big": { name: "The Notorious B.I.G.", aliases: ["biggie", "biggie smalls"], styles: ["boom bap", "90s"], related: ["2pac", "nas", "jay-z", "mobb-deep"], sound: "90s East Coast: soulful samples and boom-bap drums, from gritty to smooth.", bpm: "usually 85 to 100 BPM" },
  "mobb-deep": { name: "Mobb Deep", aliases: [], styles: ["boom bap", "dark"], related: ["nas", "the-notorious-big", "jay-z"], sound: "Dark East Coast boom bap: eerie piano samples and hard drums.", bpm: "usually 85 to 95 BPM" },
  "50-cent": { name: "50 Cent", aliases: [], styles: ["east coast", "hard"], related: ["eminem", "dr-dre", "jay-z"], sound: "2000s East Coast rap: hard drums, simple piano or synth hooks and heavy bass.", bpm: "usually 85 to 100 BPM" },
  "mf-doom": { name: "MF DOOM", aliases: [], styles: ["boom bap", "lofi"], related: ["j-dilla", "earl-sweatshirt", "westside-gunn"], sound: "Quirky, sample-heavy boom bap: odd loops and dusty, swung drums.", bpm: "usually 85 to 95 BPM" },
  "j-dilla": { name: "J Dilla", aliases: ["dilla"], styles: ["boom bap", "lofi"], related: ["mf-doom", "kanye-west", "earl-sweatshirt"], sound: "Soulful, swung hip hop: off-grid drums and warm, chopped samples.", bpm: "usually 80 to 95 BPM" },
  "westside-gunn": { name: "Westside Gunn", aliases: [], styles: ["griselda", "boom bap"], related: ["mf-doom", "mobb-deep", "nas"], sound: "Griselda-style boom bap: dark, dusty loops, sometimes with barely any drums.", bpm: "usually 80 to 95 BPM" },
  "freddie-gibbs": { name: "Freddie Gibbs", aliases: [], styles: ["soul sample", "boom bap"], related: ["larry-june", "westside-gunn", "kendrick-lamar"], sound: "Gritty street rap over soul samples, from boom bap to slower trap.", bpm: "usually 80 to 100 BPM" },
};

export const STYLES = {
  trap: { name: "Trap", related: ["future", "lil-baby", "21-savage"], sound: "Rolling hi-hats, heavy 808s and dark or melodic loops.", bpm: "usually 130 to 160 BPM" },
  "dark-trap": { name: "Dark Trap", related: ["metro-boomin", "21-savage", "travis-scott"], sound: "Minor-key, cinematic loops with eerie melodies and deep 808s.", bpm: "usually 130 to 150 BPM" },
  drill: { name: "Drill", related: ["pop-smoke", "lil-durk", "central-cee"], sound: "Sliding 808s, syncopated hi-hats and dark melodies, from Chicago to New York.", bpm: "usually 140 to 145 BPM" },
  "uk-drill": { name: "UK Drill", related: ["central-cee", "digga-d", "headie-one"], sound: "Sliding 808s, offbeat snares and skippy hi-hats, often over sampled melodies.", bpm: "usually 140 to 145 BPM" },
  rage: { name: "Rage", related: ["ken-carson", "playboi-carti", "yeat", "destroy-lonely"], sound: "Loud distorted synth leads, blown-out 808s and punchy drums.", bpm: "usually 140 to 170 BPM" },
  pluggnb: { name: "Pluggnb", related: ["nettspend", "lil-uzi-vert"], sound: "Plugg drums under R&B chords: soft bells, airy pads and light 808s.", bpm: "usually 140 to 160 BPM" },
  rnb: { name: "R&B", related: ["the-weeknd", "drake", "sza"], sound: "Smooth chords, soft drums and room for vocals.", bpm: "usually 60 to 100 BPM" },
  "boom-bap": { name: "Boom Bap", related: ["j-cole", "kendrick-lamar", "kanye-west"], sound: "Dusty sampled loops with hard-hitting kicks and snares.", bpm: "usually 85 to 95 BPM" },
  "jersey-club": { name: "Jersey Club", related: ["bandmanrill", "ice-spice", "drake"], sound: "Fast, bouncy kick patterns, bed-squeak sounds and chopped vocals.", bpm: "usually 130 to 145 BPM" },
  afrobeats: { name: "Afrobeats", related: ["burna-boy", "wizkid", "rema"], sound: "Syncopated percussion, warm chords and a bouncy, danceable groove.", bpm: "usually 95 to 115 BPM" },
  lofi: { name: "Lofi", related: ["j-dilla", "mf-doom", "earl-sweatshirt"], sound: "Mellow, dusty keys and soft swung drums.", bpm: "usually 70 to 90 BPM" },
  plugg: { name: "Plugg", related: ["pierre-bourne", "kankan", "nettspend"], sound: "Bright, bouncy synth loops, simple 808s and light, airy drums.", bpm: "usually 140 to 160 BPM" },
  "ny-drill": { name: "NY Drill", related: ["pop-smoke", "fivio-foreign", "kay-flock"], sound: "Sliding 808s, choppy drums and dark or sampled melodies, from Brooklyn to the Bronx.", bpm: "usually 140 to 145 BPM" },
  jerk: { name: "Jerk", related: ["kyle-richh", "cash-cobain", "ice-spice"], sound: "Fast, bouncy beats with bright synths and punchy, club-style drums.", bpm: "usually fast, 140 BPM and up" },
  memphis: { name: "Memphis", related: ["key-glock", "moneybagg-yo", "young-dolph"], sound: "Dark, bass-heavy trap with eerie melodies and hard-hitting drums.", bpm: "usually 130 to 160 BPM" },
  detroit: { name: "Detroit", related: ["babytron", "sada-baby", "tee-grizzley"], sound: "Punchy, offbeat drums, sampled or piano melodies and heavy bass.", bpm: "often fast and bouncy" },
  "west-coast": { name: "West Coast", related: ["snoop-dogg", "nipsey-hussle", "yg"], sound: "Funky basslines, smooth synth leads and laid-back, bouncy drums.", bpm: "usually 85 to 105 BPM" },
  phonk: { name: "Phonk", related: ["suicideboys", "ghostemane", "denzel-curry"], sound: "Memphis rap samples, cowbells and distorted 808s.", bpm: "usually 120 to 160 BPM" },
  "emo-rap": { name: "Emo Rap", related: ["juice-wrld", "lil-peep", "xxxtentacion"], sound: "Sad guitar or piano loops over trap drums, with room for melodic vocals.", bpm: "usually 130 to 160 BPM, often felt in half time" },
  "latin-trap": { name: "Latin Trap", related: ["bad-bunny", "anuel-aa", "eladio-carrion"], sound: "Dark trap 808s and hi-hats with Latin melodies.", bpm: "usually 130 to 150 BPM" },
  reggaeton: { name: "Reggaeton", related: ["bad-bunny", "feid", "j-balvin"], sound: "The dembow rhythm under smooth synths and deep bass.", bpm: "usually 85 to 100 BPM" },
};

export const TAG_SETS = {
  ...Object.fromEntries(Object.entries(ARTISTS).map(([slug, a]) => [slug, { ...a, kind: "artist" }])),
  ...Object.fromEntries(Object.entries(STYLES).map(([slug, s]) => [slug, { ...s, kind: "style" }])),
};
export const TAG_SET_SLUGS = Object.keys(TAG_SETS);

// Other tag sets to link from a tag set page, capped so a page doesn't list every artist.
// Sets that share a style come first; the rest start right after this one in the list,
// so every page gets links from some of its neighbours.
export const moreTagSets = (slug, limit = 24) => {
  const set = TAG_SETS[slug];
  if (!set) return [];
  const skip = new Set([slug, ...(set.related || [])]);
  const mine = new Set((set.styles || []).map((s) => s.toLowerCase()));
  const keys = TAG_SET_SLUGS.filter((s) => TAG_SETS[s].kind === set.kind);
  const at = keys.indexOf(slug);
  return keys
    .map((s, i) => ({
      s,
      shared: (TAG_SETS[s].styles || []).filter((st) => mine.has(st.toLowerCase())).length,
      order: (i - at + keys.length) % keys.length,
    }))
    .filter(({ s }) => !skip.has(s))
    .sort((a, b) => b.shared - a.shared || a.order - b.order)
    .slice(0, limit)
    .map(({ s }) => [s, TAG_SETS[s]]);
};

// Artists grouped by first letter for the type beat tags hub: [["A", [[slug, name], ...]], ...].
// A name is filed under its first letter or digit ("$uicideboy$" under U); digits go under "#".
const sortName = (name) => name.replace(/^[^a-z0-9]+/i, "");
export const artistsByLetter = () => {
  const groups = {};
  Object.entries(ARTISTS)
    .map(([slug, a]) => [slug, a.name])
    .sort((x, y) => sortName(x[1]).localeCompare(sortName(y[1]), "en", { sensitivity: "base" }))
    .forEach(([slug, name]) => {
      const first = sortName(name).charAt(0).toUpperCase() || "#";
      const key = /[A-Z]/.test(first) ? first : "#";
      (groups[key] = groups[key] || []).push([slug, name]);
    });
  return Object.keys(groups)
    .sort((x, y) => (x === "#" ? -1 : y === "#" ? 1 : x.localeCompare(y)))
    .map((k) => [k, groups[k]]);
};

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
  if (path.startsWith(`${TAG_HUB_PATH}/`)) {
    const page = tagSetPage(path.slice(TAG_HUB_PATH.length + 1));
    if (page) return { ...page, priority: "0.6", changefreq: "monthly" };
  }
  return null;
};

export const PUBLIC_PATHS = [
  ...Object.keys(STATIC_PAGES),
  FREE_TAG_PAGE.path,
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
  if (path === "/") return [faqPage(HOME.faq, year)]; // index.html already has the SoftwareApplication block
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
  if (GUIDES[path]) {
    return [breadcrumbs([["SendMyBeat", "/"], [GUIDES[path].h1, path]])];
  }
  const page = tagSetPage(path.slice(TAG_HUB_PATH.length + 1));
  return [
    breadcrumbs([["SendMyBeat", "/"], ["Type beat tags", TAG_HUB_PATH], [page.h1, path]]),
    faqPage(page.faq, year),
  ];
};

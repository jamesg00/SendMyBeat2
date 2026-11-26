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
    'Type an artist or a vibe, like "future type beat" or "dark trap". You get YouTube tags pulled from what people search and the tags on videos that already rank, sized for YouTube\'s 500-character limit. 3 free runs a day, no sign-up.',
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
      "Yes. You get 3 full runs a day without an account. Sign up free for 3 more AI generations and 3 YouTube uploads, no card needed. After that, Plus is $5 a month for 50 of each.",
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
// is the AI tag generator (3 free runs a day, shared with /free-tag-generator); the rest run in
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
    lede: 'Type the artist or sound your beat goes for, like "travis scott type beat". You get YouTube tags from live searches, each with a score so you can see which ones pull their weight. 3 free runs a day, no sign-up.',
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
        "Yes. You get 3 full tag runs a day without an account. Sign up free for 3 more AI generations and 3 YouTube uploads, no card needed. The title, description, hashtag and tag counter tools on this site run in your browser and are free with no limit.",
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
  // The free MP3 to YouTube uploader. Unlike the tools above it needs a free account, since
  // the video goes to the producer's own channel ("account: true" keeps it out of the
  // "no sign-up" lists). Both pages embed the same tool (pages/tools/Mp3UploadTool.js).
  "/upload-mp3-to-youtube": {
    tool: "upload",
    account: true,
    cta: "Upload my MP3",
    nav: "MP3 to YouTube uploader",
    appName: "SendMyBeat Free MP3 to YouTube Uploader",
    eyebrow: "Free tool, free account",
    title: "Upload MP3 to YouTube Free, with an Image or GIF | SendMyBeat",
    description:
      "Free MP3 to YouTube uploader: add a cover image or animated GIF, a title, tags and a description, and we upload the video to your YouTube channel. 3 free a day.",
    h1: "Upload MP3 to YouTube, free",
    lede: "YouTube doesn't take MP3 files, only videos. Pick your MP3 and a cover image or animated GIF, and SendMyBeat turns them into a video and uploads it to your own YouTube channel with your title, tags and description. Free with a SendMyBeat account: 3 uploads a day.",
    steps: [
      ["Sign in with Google", "One click. It creates your free SendMyBeat account and connects the YouTube channel your video goes to."],
      ["Add your MP3 and a picture", "MP3, WAV, M4A, FLAC or OGG audio, plus a JPG, PNG or WEBP cover or an animated GIF."],
      ["Fill in the details", "Type a title, pick a ready-made type beat tag set and edit the tags, write your description and choose public, unlisted or private."],
      ["Upload", "We render the video and upload it to your channel. You get the YouTube link when it's done."],
    ],
    how: [
      [
        "How to upload an MP3 to YouTube",
        "YouTube only accepts video files, so an MP3 needs a picture to go with it. This tool does the converting for you: the picture becomes a 16:9 video as long as your track, and it goes up to your channel with the title, tags, description and privacy you chose. You don't need video editing software, and nothing to install.",
      ],
      [
        "A still image or an animated GIF",
        "Use a JPG, PNG or WEBP cover for a still video, or an animated GIF, which keeps playing on a loop for the whole track. There's no audio visualizer here: what you upload is what viewers see.",
      ],
      [
        "Tags without retyping them",
        "Instead of typing tags every time, pick an artist or style from our type beat tag sets, like Drake or dark trap, and the tags fill in. Remove the ones that don't fit, add your own, and the counter keeps you under YouTube's 500-character limit.",
      ],
    ],
    extra: [
      [
        "What the free uploader includes",
        "3 uploads a day, to your own channel, with a small SendMyBeat watermark on the video. Free uploads don't use the 3 trial uploads that come with your account. Plus ($5 a month) and Pro ($10 a month) remove the watermark and add 50 or 100 Upload Studio uploads a month, with layouts, visualizers and AI-scored tags.",
      ],
    ],
    faq: [
      [
        "Is this MP3 to YouTube uploader really free?",
        "Yes. With a free SendMyBeat account you get 3 uploads a day at no cost and no card. The count resets every day at midnight Pacific time.",
      ],
      [
        "Do I need an account?",
        "Yes, a free one. The video goes to your own YouTube channel, so you sign in with Google and allow uploads to that channel. Signing in with Google creates your SendMyBeat account and connects YouTube in one step.",
      ],
      [
        "Is there a watermark?",
        "On the free plan, yes: a small SendMyBeat watermark on the video. The Plus ($5 a month) and Pro ($10 a month) plans remove it.",
      ],
      [
        "Can I use an animated GIF?",
        "Yes. Upload a GIF and it plays on a loop for the whole track. You can also use a still JPG, PNG or WEBP image. Video clips and visualizers aren't part of the free uploader.",
      ],
      [
        "Which audio files can I upload?",
        "MP3, WAV, M4A, FLAC and OGG.",
      ],
      [
        "Where do the tags come from?",
        "From SendMyBeat's ready-made type beat tag sets for 150 artists and 21 styles. They aren't generated for your beat: you pick a set and edit it. For tags scored on live YouTube searches, use the tag generator in the app.",
      ],
      [
        "Does it upload to my channel or yours?",
        "Yours. The video is published on the YouTube channel you connect, as public, unlisted or private, and you can edit or delete it in YouTube Studio like any other upload.",
      ],
    ],
  },
  // A producer page for "type beat video maker": the free uploader is the tool on the page,
  // and the copy covers Upload Studio's visualizer videos for when you want more.
  "/type-beat-video-maker": {
    tool: "upload",
    account: true,
    cta: "Make my video",
    nav: "Type beat video maker",
    appName: "SendMyBeat Type Beat Video Maker",
    eyebrow: "Free video maker, free account",
    title: "Type Beat Video Maker: Beat and Cover Art to a YouTube Video | SendMyBeat",
    description:
      "Make a type beat video free: your beat plus cover art or a GIF becomes a YouTube video on your channel. With an account, add a visualizer in Upload Studio.",
    h1: "Type beat video maker",
    lede: "A type beat video is your beat with something to look at. Add your audio and cover art, and SendMyBeat turns them into a video and uploads it to your YouTube channel with your title, tags and description. Free with a SendMyBeat account: 3 videos a day with a still image or animated GIF.",
    steps: [
      ["Sign in with Google", "Creates your free SendMyBeat account and connects the YouTube channel your video goes to."],
      ["Add your beat and cover art", "MP3, WAV, M4A, FLAC or OGG audio, plus a JPG, PNG or WEBP cover or an animated GIF."],
      ["Add the title, tags and description", "Type your title, pick a type beat tag set for your artist and edit it, then write the description."],
      ["Upload", "We render the video and put it on your channel as public, unlisted or private."],
    ],
    how: [
      [
        "What a type beat video needs",
        "YouTube only takes video files, so a beat needs a picture to go with it. Most type beat videos are the beat over one piece of cover art, with a title that starts with the artist and \"type beat\", tags for the searches buyers make and a description with your contact and purchase details. You don't need editing software for any of it.",
      ],
      [
        "Free: a still image or an animated GIF",
        "The video maker on this page is SendMyBeat's free uploader. Your cover becomes a 16:9 video as long as your beat, or an animated GIF plays on a loop for the whole track. You get 3 uploads a day with a free account, with a small SendMyBeat watermark on the video. There's no visualizer in the free uploader.",
      ],
      [
        "With an account: Upload Studio and visualizers",
        "Upload Studio is the full video maker inside SendMyBeat. Pick the shape (16:9 for YouTube, 9:16 for Shorts, square or 4:5 portrait), the background behind your art (black, white or a blurred copy of it) and an audio visualizer that moves with the beat. Preview the video, then publish it to your channel with the title, tags and description filled in.",
      ],
    ],
    extra: [
      [
        "Which visualizer styles you get",
        "Eight styles work on any account: NCS, Monstercat, Spectrum, Proximity, Trap, Wave, Mirror and Dots. Plus and Pro add 13 premium styles, such as Ridgeline, Waterfall, Terrain and Turntable. You can set the colours and how strongly it reacts, and on the styles built around a centre, put your cover art or logo in the middle.",
      ],
    ],
    related: [
      {
        heading: "More on beat videos",
        body: "Read how audio visualizers work for type beats, or go straight to the free MP3 uploader if all you need is your beat and a picture.",
        links: [
          ["/audio-visualizer-for-beats", "Audio visualizer for beats"],
          ["/upload-mp3-to-youtube", "Free MP3 to YouTube uploader"],
          ["/upload-beats-to-youtube", "Upload beats to YouTube"],
          ["/tunestotube-alternative", "TunesToTube alternative"],
        ],
      },
    ],
    faq: [
      [
        "Is the type beat video maker free?",
        "Yes. With a free SendMyBeat account you can make and upload 3 videos a day with a still image or animated GIF, no card needed. The count resets every day at midnight Pacific time.",
      ],
      [
        "Is there a watermark?",
        "Free videos have a small SendMyBeat watermark. Plus ($5 a month) and Pro ($10 a month) remove it.",
      ],
      [
        "Can I add an audio visualizer?",
        "Yes, in Upload Studio with a SendMyBeat account. Eight visualizer styles work on any account, including the 3 trial uploads a free account starts with. The 13 premium styles need Plus or Pro. The free uploader on this page doesn't have a visualizer.",
      ],
      [
        "Can I make a video for YouTube Shorts?",
        "Upload Studio can render a 9:16 video for Shorts, as well as 16:9, square and 4:5. The free uploader makes 16:9 videos.",
      ],
      [
        "Which files can I use?",
        "MP3, WAV, M4A, FLAC or OGG for the beat, and a JPG, PNG or WEBP image or an animated GIF for the picture.",
      ],
      [
        "Does it upload the video for me?",
        "Yes. You sign in with Google and the video goes to your own YouTube channel as public, unlisted or private. You can edit or delete it in YouTube Studio like any other upload.",
      ],
    ],
  },
  "/tunestotube-alternative": {
    tool: "upload",
    account: true,
    cta: "Try the free uploader",
    nav: "TunesToTube alternative",
    appName: "SendMyBeat Free Uploader, a TunesToTube Alternative",
    eyebrow: "Free MP3 to YouTube uploader, free account",
    title: "TunesToTube Alternative, Free with Animated GIFs | SendMyBeat",
    description:
      "A free TunesToTube alternative: SendMyBeat turns your MP3 and a still image or animated GIF into a video on your YouTube channel, with ready-made type beat tags.",
    h1: "A TunesToTube alternative for beat producers",
    lede: "TunesToTube made uploading audio to YouTube easy. SendMyBeat's free uploader does the same job, MP3 plus picture to a video on your channel, and adds animated GIFs and ready-made type beat tags so you're not retyping them every upload.",
    steps: [
      ["Sign in with Google", "Creates your free SendMyBeat account and connects your YouTube channel in one step."],
      ["Add your audio and a picture", "MP3, WAV, M4A, FLAC or OGG, plus a still image or an animated GIF."],
      ["Pick a tag set", "Choose an artist or style, keep the tags that fit and add your own."],
      ["Upload", "The video goes to your channel as public, unlisted or private."],
    ],
    how: [
      [
        "What TunesToTube does",
        "TunesToTube is a free website that turns an audio file and an image into a YouTube video and uploads it to your channel. It's simple and has worked for years. As of this writing, the picture is a still image (an animated GIF uses its first frame), free videos are 720p with a TunesToTube watermark, and you type your tags and description for each upload. It doesn't make visualizers or show channel analytics.",
      ],
      [
        "What SendMyBeat's free uploader does differently",
        "The picture can be a still image or an animated GIF that loops for the whole track. Tags come from ready-made type beat sets for 150 artists and 21 styles: pick one, remove what doesn't fit, add your own, and a counter keeps you under YouTube's 500 characters. You get 3 free uploads a day, with a small SendMyBeat watermark that Plus and Pro remove.",
      ],
      [
        "When TunesToTube may suit you better",
        "If you only ever upload a still picture and don't need tags, TunesToTube does that job without a SendMyBeat account. Our uploader needs a free account because it publishes to your channel through it.",
      ],
    ],
    extra: [
      [
        "The rest of SendMyBeat",
        "The free uploader is one tool. With an account you also get the AI tag generator, which scores every tag on search demand and competition, Upload Studio with layouts and beat visualizers, description templates, and on Pro, channel analytics and the Pros breakdowns of how the biggest type beat producers grew.",
      ],
    ],
    related: [
      {
        heading: "Comparing other tools?",
        body: "See how SendMyBeat compares with a general tag generator and a general YouTube growth suite, or make a full type beat video.",
        links: [
          ["/rapidtags-alternative", "Rapidtags alternative"],
          ["/vidiq-for-beat-producers", "vidIQ for beat producers"],
          ["/type-beat-video-maker", "Type beat video maker"],
        ],
      },
    ],
    faq: [
      [
        "Is SendMyBeat's uploader free like TunesToTube?",
        "Yes. You get 3 uploads a day free with a SendMyBeat account, no card needed. Plus ($5 a month) and Pro ($10 a month) remove the watermark and add the rest of the app.",
      ],
      [
        "Can I upload an animated GIF?",
        "Yes. The GIF keeps playing on a loop for the length of your track. Still JPG, PNG and WEBP images work too.",
      ],
      [
        "Do I have to retype my tags every time?",
        "No. Pick one of our type beat tag sets, edit it, and the tags go into the upload. The sets cover 150 artists and 21 styles.",
      ],
      [
        "Does it have a visualizer?",
        "Not the free uploader: it's a still image or a GIF, like TunesToTube. Beat visualizers are in SendMyBeat's Upload Studio.",
      ],
      [
        "Why do I need an account?",
        "The video is uploaded to your own YouTube channel, so you sign in with Google and allow uploads to it. That sign-in also creates your free SendMyBeat account.",
      ],
    ],
  },
  // Comparison pages. The tool on the page is the free tag generator; "pitch" is the sign-up
  // box under the copy. Keep what they say about other tools modest and dated.
  "/rapidtags-alternative": {
    tool: "tags",
    cta: "Generate my tags",
    nav: "Rapidtags alternative",
    appName: "SendMyBeat Type Beat Tag Generator, a Rapidtags Alternative",
    eyebrow: "Free tool, no account",
    title: "Rapidtags Alternative for Type Beat Tags, Free | SendMyBeat",
    description:
      "A Rapidtags alternative made for type beats: tags from live YouTube searches for your artist, scored and sized to 500 characters, plus titles and upload.",
    h1: "A Rapidtags alternative built for type beats",
    lede: 'Rapidtags is a quick YouTube tag generator for any kind of video. SendMyBeat\'s tag generator is made for type beat producers: type the artist your beat is for, like "drake type beat", and get tags from live YouTube searches, each scored and sized to fit the 500-character tag box. 3 free runs a day, no sign-up.',
    how: [
      [
        "What Rapidtags does",
        "Rapidtags turns a keyword into a list of YouTube tags for any topic, with a counter for YouTube's 500-character limit and a score for the tags. It's quick and works for most kinds of videos. As of November 2026, it isn't built around type beats: it has no artist or type beat logic, and it doesn't write beat titles or descriptions, make visualizer videos or upload beats for you.",
      ],
      [
        "What SendMyBeat does differently",
        "It starts from your artist. The generator reads YouTube's search suggestions and the tags on type beats that already rank for that artist, and AI adds the variations buyers type: the year, \"free\", spellings, the style and close artists. Every tag is scored on search demand, competition and how close it is to your search, and the best ones are packed into the 500 characters, up to 50 tags per run.",
      ],
      [
        "Tags, then the rest of the upload",
        "With a SendMyBeat account, the same search also suggests titles in the type beat format, and descriptions start from templates you can save and reuse. Upload Studio turns your beat and cover art into a video with an audio visualizer and uploads it to your channel with everything filled in.",
      ],
    ],
    extra: [
      [
        "When Rapidtags may suit you better",
        "If you make videos that aren't beats, like vlogs, gaming or tutorials, a general tag tool such as Rapidtags fits better: SendMyBeat's generator is tuned for type beat searches and won't help much with other topics.",
      ],
    ],
    pitch: {
      heading: "Tags are step one",
      body: "Sign up free for 3 AI generations and 3 YouTube uploads, no card needed: scored tags, titles, a description and a video with a visualizer, uploaded to your channel. After that, Plus is $5 a month for 50 of each and Pro is $10 a month for 100.",
      links: [
        ["/?signup=1", "Sign up free"],
        ["/", "See everything SendMyBeat does"],
      ],
    },
    related: [
      {
        heading: "Ready-made type beat tags",
        body: "Want a starting set right now? These pages have tags to copy for popular artists, sized for the 500-character limit.",
        links: [
          ["/type-beat-tags", "All type beat tags"],
          ["/type-beat-tags/drake", "Drake type beat tags"],
          ["/type-beat-tags/travis-scott", "Travis Scott type beat tags"],
          ["/type-beat-tags/future", "Future type beat tags"],
          ["/type-beat-tags/ken-carson", "Ken Carson type beat tags"],
          ["/youtube-tag-counter", "YouTube tag counter"],
        ],
      },
      {
        heading: "Compare other tools",
        body: "How SendMyBeat compares with a general YouTube growth suite and with a simple audio-to-video uploader.",
        links: [
          ["/vidiq-for-beat-producers", "vidIQ for beat producers"],
          ["/tunestotube-alternative", "TunesToTube alternative"],
        ],
      },
    ],
    faq: [
      [
        "Is SendMyBeat's tag generator free?",
        "You get 3 full runs a day without an account. Sign up free for 3 more AI generations and 3 YouTube uploads, no card needed. After that, Plus is $5 a month for 50 generations and Pro is $10 a month for 100.",
      ],
      [
        "Why use a type beat tag generator instead of a general one?",
        "Type beat buyers search in a particular way: the artist's name with \"type beat\", the year, \"free\", the style and common misspellings. A generator built around those searches gives you tags for them, instead of broad one-word tags that put your beat up against millions of other videos.",
      ],
      [
        "Does it keep me under the 500-character limit?",
        "Yes. The set is sized for YouTube's 500 characters, counted the way YouTube counts them: commas between tags, and two extra characters for the quote marks around any tag with a space in it.",
      ],
      [
        "What do the tag scores mean?",
        "Each tag gets a score out of 100 from search demand, competition and how close it is to your search. Green is 60 or more, amber 45 to 59 and red under 45, so you can swap the weak ones.",
      ],
      [
        "Can SendMyBeat upload the beat too?",
        "Yes, with an account. Upload Studio turns your beat and artwork into a video and publishes it to your YouTube channel with the tags, title and description filled in. For just an MP3 and a picture, the free uploader does 3 uploads a day.",
      ],
    ],
  },
  "/vidiq-for-beat-producers": {
    tool: "tags",
    cta: "Try the type beat tag generator",
    nav: "vidIQ for beat producers",
    appName: "SendMyBeat for Beat Producers, a vidIQ Alternative",
    eyebrow: "Comparison, free tool inside",
    title: "vidIQ for Beat Producers: A Type Beat Alternative | SendMyBeat",
    description:
      "vidIQ is a YouTube growth suite for every kind of channel. SendMyBeat is made for type beat channels: scored artist tags, titles, descriptions and upload.",
    h1: "vidIQ for beat producers: what fits a type beat channel",
    lede: "vidIQ is one of the best-known YouTube growth tools, made for every kind of channel. If your channel is type beats, here's an honest look at where it fits and where SendMyBeat, which is built only for beat producers, does the job more directly. Try the type beat tag generator below, 3 free runs a day, no sign-up.",
    how: [
      [
        "What vidIQ does",
        "vidIQ is a general YouTube growth suite: keyword research, scores for keywords and videos, and channel analytics, for creators in any niche. As of November 2026, it has a free plan and paid monthly plans. It's broad by design rather than built around type beats, so it isn't set up for the beat-specific parts: artist-based type beat tags, beat titles and descriptions, a visualizer video and the upload.",
      ],
      [
        "What SendMyBeat does for a type beat channel",
        "Type the artist your beat is for and get a scored tag set from live YouTube searches for that artist, sized to the 500-character limit, plus titles in the type beat format. Descriptions start from templates for type beats, beat sales or free-for-profit. Upload Studio turns your beat and cover art into a video with a visualizer and uploads it to your channel.",
      ],
      [
        "Analytics made for beat uploads",
        "On Pro, channel analytics compare each upload with your own average, show which title patterns win and lose on your channel, and suggest a better title for weak uploads. The Pros section breaks down how big type beat producers grew, with a plan to close the gap with your style.",
      ],
    ],
    extra: [
      [
        "When vidIQ suits you better",
        "If your channel isn't music, or you want broad keyword research and analytics across any topic, vidIQ is the more complete tool. SendMyBeat only does type beats. Some producers use both: a general tool for research, and SendMyBeat for tagging, making and uploading each beat.",
      ],
      [
        "What SendMyBeat costs",
        "Free to start with 3 AI generations and 3 YouTube uploads, no card needed. Plus is $5 a month for 50 of each with no watermark, and Pro is $10 a month for 100 of each, with channel analytics and the Pros breakdowns. Check vidIQ's own site for its current prices.",
      ],
    ],
    pitch: {
      heading: "Built for one kind of channel: yours",
      body: "Sign up free for 3 AI generations and 3 YouTube uploads, no card needed. Tag, title, describe, render and upload a beat from one place, then see what's working.",
      links: [
        ["/?signup=1", "Sign up free"],
        ["/", "See everything SendMyBeat does"],
      ],
    },
    related: [
      {
        heading: "Compare other tools",
        body: "How SendMyBeat compares with a general tag generator and with a simple audio-to-video uploader.",
        links: [
          ["/rapidtags-alternative", "Rapidtags alternative"],
          ["/tunestotube-alternative", "TunesToTube alternative"],
        ],
      },
      {
        heading: "Free tools for your next upload",
        body: "These work without a plan.",
        links: [
          ["/free-tag-generator", "Free tag generator"],
          ["/type-beat-title-generator", "Type beat title generator"],
          ["/beat-description-generator", "Beat description generator"],
          ["/type-beat-tags", "Type beat tags"],
          ["/type-beat-video-maker", "Type beat video maker"],
        ],
      },
    ],
    faq: [
      [
        "Is vidIQ good for beat producers?",
        "It can be, especially for general keyword research and channel stats. It isn't made for type beats, though, so you'll do the artist tags, beat titles, descriptions and video yourself. SendMyBeat does those parts for type beat channels specifically.",
      ],
      [
        "Can I use vidIQ and SendMyBeat together?",
        "Yes. They do different jobs. SendMyBeat connects to your YouTube channel through your Google account to upload, and doesn't need you to give up any other tool.",
      ],
      [
        "Does SendMyBeat have channel analytics?",
        "Yes, on Pro ($10 a month): views per upload against your own average, the title patterns that win and lose on your channel, and a better title for each weak upload.",
      ],
      [
        "Does SendMyBeat work for channels that aren't beats?",
        "Not well. Everything in it, from the tag logic to the description templates, is built around type beats. For other niches, a general tool like vidIQ is a better fit.",
      ],
      [
        "How much does SendMyBeat cost?",
        "Free to try with 3 AI generations and 3 uploads, no card needed. Plus is $5 a month and Pro is $10 a month. Cancel anytime.",
      ],
    ],
  },
};
export const TOOL_PATHS = Object.keys(TOOL_PAGES);

// A page's "related" links: one block or a list of blocks, { heading, body, links: [[path, label], ...] }.
export const relatedBlocks = (related) => (related ? [].concat(related) : []);

// The pitch on the free uploader pages: what a SendMyBeat account adds, in the homepage's
// own feature names and plans (HOME above), so the two never disagree.
export const UPLOAD_PITCH = {
  heading: "Want a visualizer and AI-scored tags next time?",
  body: "The free uploader is the simple version. SendMyBeat is built for type beat producers on YouTube: one search gives you a scored tag set, Upload Studio turns your beat into a video with a layout and visualizer, and analytics show what to fix next. Plus and Pro also take the watermark off your uploads.",
  features: HOME.features,
  plans: HOME.plans,
  signup: ["/?signup=1", "Sign up free"],
  home: ["/", "See everything SendMyBeat does"],
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
    related: {
      heading: "Only need your MP3 and a picture?",
      body: "The free uploader skips the visualizer: an MP3 plus a still image or animated GIF, with a ready-made tag set, uploaded to your channel. 3 free uploads a day with a free account.",
      links: [
        ["/upload-mp3-to-youtube", "Free MP3 to YouTube uploader"],
        ["/tunestotube-alternative", "TunesToTube alternative"],
      ],
    },
  },
  // Guides can also carry "faq" (shown on the page and as FAQPage structured data) and "cta"
  // (the box near the end: heading, body, links; the first link is the main button).
  "/audio-visualizer-for-beats": {
    title: "Audio Visualizer for Beats: Visualizer Videos for YouTube | SendMyBeat",
    description:
      "What an audio visualizer video is, why it suits a type beat upload, and how SendMyBeat's visualizer turns your beat and cover art into one for YouTube.",
    h1: "Audio visualizer for beats",
    lede: "An audio visualizer is the moving shape, usually bars or a ring, that reacts to your beat on screen. Here's what it adds to a type beat video and how to make one with SendMyBeat, without video editing software.",
    sections: [
      [
        "What an audio visualizer video is",
        "A visualizer video is your beat over your cover art with an animation that follows the music: bars that jump on the kick, a ring around your logo that pulses, lines that bend with the 808. The animation is drawn from the audio itself, so it moves in time with every hit.",
      ],
      [
        "Why use one on a type beat",
        "Plenty of producers upload with a still picture, and that works. A visualizer gives viewers something that moves with the beat while they listen, can carry your logo or cover art in the middle, and gives your uploads a look people recognise from one video to the next.",
      ],
      [
        "How SendMyBeat's visualizer works",
        "In Upload Studio, add your beat and cover art, turn on Visualizer and pick a style. Eight styles work on any account: NCS, Monstercat, Spectrum, Proximity, Trap, Wave, Mirror and Dots. Plus and Pro add 13 premium styles, including Ridgeline, Ring Ridges, Waterfall, Terrain, Groove and Turntable. Set the colour or turn on rainbow colours that follow the loudness, choose how strongly it reacts, and on the styles built around a centre, put your cover art, a logo or a plain colour in the middle.",
      ],
      [
        "Rendered into the video, in time with the beat",
        "SendMyBeat draws the visualizer frame by frame for the whole beat and records it into the video, so it stays in sync from start to finish. Pick 16:9 for YouTube, 9:16 for Shorts, square or 4:5, and 30 or 60 frames a second for smooth motion. Preview it, then upload to your channel with the title, tags and description filled in.",
      ],
      [
        "Just need a still image?",
        "If you don't want a visualizer, the free MP3 to YouTube uploader turns your beat and a still image or animated GIF into a video on your channel, 3 times a day with a free account.",
      ],
    ],
    related: {
      heading: "Make the rest of the video",
      body: "Start from the video maker, or use the free uploader for a beat and a picture.",
      links: [
        ["/type-beat-video-maker", "Type beat video maker"],
        ["/upload-mp3-to-youtube", "Free MP3 to YouTube uploader"],
        ["/upload-beats-to-youtube", "Upload beats to YouTube"],
      ],
    },
    cta: {
      heading: "Make your first visualizer video",
      body: "Sign up free for 3 YouTube uploads and 3 AI generations, no card needed. The eight standard visualizer styles work on the free uploads; Plus ($5 a month) and Pro ($10 a month) add the premium styles and remove the watermark.",
      links: [
        ["/?signup=1", "Sign up free"],
        ["/upload-mp3-to-youtube", "Free still-image uploader"],
      ],
    },
    faq: [
      [
        "Is SendMyBeat's visualizer free?",
        "The eight standard styles work on any account, so you can use them on the 3 free uploads a new account starts with, no card needed. The 13 premium styles need Plus ($5 a month) or Pro ($10 a month). You can try a premium style in the preview before you decide.",
      ],
      [
        "Do I need video editing software?",
        "No. You add your beat and cover art, pick a style, preview it and upload, all in SendMyBeat.",
      ],
      [
        "Can I make a visualizer video for YouTube Shorts?",
        "Yes. Pick the 9:16 shape in Upload Studio. Square and 4:5 portrait are there too.",
      ],
      [
        "Is there a watermark?",
        "Uploads on a free account have a small SendMyBeat watermark. Plus and Pro remove it.",
      ],
      [
        "Does the free MP3 uploader have a visualizer?",
        "No. The free uploader makes a video from a still image or animated GIF. Visualizers are in Upload Studio.",
      ],
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

// ---- Trending type beats ------------------------------------------------------------
// /trending-type-beats ranks artists by how strongly YouTube's search suggestions push
// "<artist> type beat" (GET /api/seo/trending). The ranking loads in the browser, so this
// copy, the FAQ and the popular artist links are what the prerendered page carries.
// "score" is a relative 0-100 signal, never a search count: keep the copy saying so.
export const TRENDING_PAGE = {
  path: "/trending-type-beats",
  nav: "Trending type beats",
  title: "Trending Type Beats This Week: Most In-Demand Artists | SendMyBeat",
  description:
    "Which artists' type beats are most in demand on YouTube this week, ranked from YouTube search suggestions and refreshed twice a day. Free tags for every artist.",
  h1: "Trending type beats this week",
  lede: 'Which artists buyers are looking for right now, ranked by how strongly YouTube suggests "[artist] type beat" as people type. Refreshed twice a day, with a free tag set for every artist on the list.',
  how: [
    [
      "How the ranking works",
      'Twice a day SendMyBeat looks at YouTube\'s search suggestions for "[artist] type beat" across 150 artists. An artist ranks higher when YouTube suggests their type beat search sooner and higher up while it\'s being typed, and when it suggests more longer searches under it.',
    ],
    [
      "What the demand score means",
      "Each artist gets a demand score from 0 to 100. It compares artists with each other; it isn't a count of searches or views, and YouTube doesn't publish those. Treat it as a guide to which type beats buyers are looking for, then check the artist's searches before you make the beat.",
    ],
    [
      "How to use it",
      "Pick an artist your style fits, open their tag page for a ready-made set, or run the free tag generator for tags from today's searches. A rising artist is a good bet for your next upload, as long as the beat really sounds like them.",
    ],
  ],
  faq: [
    [
      "How often is the trending list updated?",
      "Twice a day. The suggestion data behind it is never more than a few days old.",
    ],
    [
      "Is the demand score the number of searches?",
      "No. It's a relative score from 0 to 100 based on how YouTube's search suggestions treat \"[artist] type beat\". It shows which artists buyers look for more than others, not how many people searched.",
    ],
    [
      "What does \"vs last week\" mean?",
      "Once there's a list from about a week earlier, each artist shows how many points their score moved since then, and the list ranks artists by how much they rose. In the first week the list is ranked by demand alone.",
    ],
    [
      "Why isn't my favourite artist on the list?",
      "The list follows the 150 artists that have tag pages on SendMyBeat and shows the top 30. An artist can also be missing for a refresh when YouTube's suggestion data for them isn't in yet.",
    ],
    [
      "Should I only make beats for trending artists?",
      "No. Trending artists bring more buyers but also more producers. Make beats that sound like the artist you tag, and use the list to pick between artists your style already fits.",
    ],
  ],
};

// The artists the trending page links to before (or without) live data: the first 20 tag
// pages, which are the most-searched artists.
export const trendingFallbackArtists = (limit = 20) =>
  Object.entries(ARTISTS)
    .slice(0, limit)
    .map(([slug, a]) => [slug, a.name]);

// ---- Producer blog ------------------------------------------------------------------
// /blog lists the posts; each post renders with the guide template (pages/TypeBeatSeoPage.js),
// so a post has the same fields as a guide plus "date" (YYYY-MM-DD) and "summary" for the
// list. "tagSet" shows that artist's ready-made tag set on the post.
export const BLOG = {
  path: "/blog",
  title: "Producer Blog: YouTube Tips for Type Beat Producers | SendMyBeat",
  description:
    "Practical guides for type beat producers on YouTube: growing a channel, titling beats, choosing tags that buyers search, and getting every upload right.",
  h1: "The SendMyBeat producer blog",
  lede: "Short, practical guides for producers who sell or share type beats on YouTube: how to title, tag and describe a beat, and how to grow the channel around it.",
};

export const BLOG_POSTS = {
  "/blog/grow-a-type-beat-channel": {
    date: "2026-11-26",
    title: "How to Grow a Type Beat Channel on YouTube | SendMyBeat Blog",
    description:
      "A practical plan to grow a type beat channel on YouTube: steady uploads, clear titles, tags from real searches, thumbnails, descriptions, Shorts and analytics.",
    h1: "How to grow a type beat channel on YouTube",
    summary: "Steady uploads, a title format buyers recognise, tags from real searches, and the habits that keep a channel moving.",
    lede: "There's no trick that grows a type beat channel overnight. What works is doing the basics on every upload, for months: beats people search for, packaged so buyers can find them and buy them. Here's the checklist.",
    sections: [
      [
        "Upload on a schedule you can keep",
        "Pick a pace you can hold, whether that's one beat a day or two a week, and stick to it. A steady channel gives YouTube and returning viewers a reason to come back, and gives you more uploads to learn from. A backlog of finished beats helps you keep the schedule through busy weeks.",
      ],
      [
        "Title every beat the same way",
        'Buyers search the artist\'s name with "type beat", so lead with exactly that: [Artist] Type Beat - "Beat Name". Add the year or the style after it if there\'s room. Using one format on every upload makes your channel easy to scan and keeps the search words at the front, where they show even when the title gets cut off.',
      ],
      [
        "Tag from what buyers actually search",
        "Build tags from real searches for your artist: the artist plus \"type beat\", the year, \"free\" if the beat is free, the style and a couple of close artists your beat really sounds like. Stay inside YouTube's 500 characters and change a few tags for each beat so your uploads don't all compete for the same searches.",
      ],
      [
        "Thumbnails and descriptions that sell",
        "Use cover art that still reads as a small thumbnail on a phone: one clear image, strong contrast, little or no small text. In the description, put what a buyer needs near the top: where to buy or lease the beat, how to contact you, the BPM and key, and how to credit you if the beat is free for non-profit use.",
      ],
      [
        "Use Shorts and work with others",
        "A 9:16 clip of the best part of a beat can reach people who would never search for it, and point them to the full upload. Collaborating helps too: co-produce with other producers, send beats to artists, and share each other's uploads so each channel reaches the other's audience.",
      ],
      [
        "Check your analytics, then adjust",
        "Every few weeks, look at which uploads did better than your usual and what they have in common: the artist, the style, the title or the thumbnail. Make more of what works, and retitle or retag the uploads that stalled instead of deleting them.",
      ],
    ],
    related: [
      {
        heading: "Tools for each step",
        body: "Free tools for titles, tags, descriptions and hashtags, and the type beat video maker for your next upload.",
        links: [
          ["/type-beat-title-generator", "Type beat title generator"],
          ["/free-tag-generator", "Free tag generator"],
          ["/type-beat-tags", "Type beat tags by artist"],
          ["/beat-description-generator", "Beat description generator"],
          ["/youtube-hashtag-generator", "YouTube hashtag generator"],
          ["/type-beat-video-maker", "Type beat video maker"],
          ["/upload-mp3-to-youtube", "Free MP3 to YouTube uploader"],
        ],
      },
    ],
    cta: {
      heading: "Do the basics on every upload, faster",
      body: "SendMyBeat gives you scored tags, titles and a description from one search, turns your beat into a video with a visualizer, and uploads it to your channel. Sign up free for 3 generations and 3 uploads, no card needed.",
      links: [
        ["/?signup=1", "Sign up free"],
        ["/free-tag-generator", "Try the free tag generator"],
      ],
    },
    faq: [
      [
        "How often should I upload type beats?",
        "As often as you can keep up for months, not weeks. A steady pace you can hold beats a burst of uploads followed by silence.",
      ],
      [
        "What's the best title format for a type beat?",
        'Lead with the artist and "type beat", then the beat name in quotes: [Artist] Type Beat - "Beat Name". Add the year or style after it if there\'s room.',
      ],
      [
        "Should I post type beats as Shorts?",
        "Shorts are a good way to show the best part of a beat to people who aren't searching for it. Treat them as a way to point viewers to the full upload, not a replacement for it.",
      ],
      [
        "What should go in a type beat description?",
        "Where to buy or lease the beat, how to contact you, the BPM and key, and your credit terms if the beat is free to use. Put the purchase link near the top.",
      ],
    ],
  },
  "/blog/best-youtube-tags-for-drake-type-beat": {
    date: "2026-11-26",
    title: "Best YouTube Tags for a Drake Type Beat ({year}) | SendMyBeat Blog",
    description:
      "A copy-paste tag set for a Drake type beat, plus how to choose and order the tags and fit them in YouTube's 500-character tag limit.",
    h1: "Best YouTube tags for a Drake type beat",
    summary: "A ready tag set for Drake type beats, and how to pick, order and trim tags to fit YouTube's 500 characters.",
    lede: "Lots of producers upload Drake type beats, so tags that match how buyers actually search make a difference. Below is a starting set you can copy, then how to adjust it for your beat.",
    tagSet: "drake",
    sections: [
      [
        "Start with the main search",
        'The searches buyers type first are "drake type beat", the same with the year, and "free drake type beat" if your beat is free. Add "drake instrumental" and the nickname spelling "drizzy type beat". These go at the top of your list.',
      ],
      [
        "Add Drake's sound, then close artists",
        "Next, the style your beat actually has, like R&B or melodic trap, both with Drake's name and on its own. Then one or two artists your beat genuinely sounds like, such as Future, 21 Savage or The Weeknd, alone or as \"drake x future type beat\". Leave out artists your beat doesn't sound like: they bring viewers who leave.",
      ],
      [
        "Order the tags from most to least important",
        "Put your main artist tags first, then the style tags, then the close artists, then broad tags like \"type beat\" with the year. When you need to trim, cut from the bottom, so the searches that matter most always stay in the set.",
      ],
      [
        "Fit the 500-character limit",
        'YouTube allows 500 characters of tags. It counts every character, the commas between tags, and two extra for the quote marks around a tag with a space in it, so "drake type beat" costs 17, not 15. The set above leaves a little room for one or two tags of your own.',
      ],
      [
        "Change a few tags for every beat",
        "Use the set as a base, then swap a few tags for what makes each beat different: the mood, a second artist, the style. Uploading many beats with identical tags makes them compete with each other. Keep the title in step too: Drake Type Beat - \"Name\" belongs at the front of the title, since the title counts more than tags.",
      ],
    ],
    related: [
      {
        heading: "Tags for Drake and close artists",
        body: "Ready-made sets to copy, each sized for the 500-character limit.",
        links: [
          [tagSetPath("drake"), "Drake type beat tags"],
          ...ARTISTS.drake.related.map((s) => [tagSetPath(s), `${ARTISTS[s].name} type beat tags`]),
          [TAG_HUB_PATH, "All type beat tags"],
        ],
      },
      {
        heading: "Check and refresh your tags",
        body: "Count your own list the way YouTube does, or pull a fresh set from today's searches.",
        links: [
          ["/youtube-tag-counter", "YouTube tag counter"],
          [freeTagLink("drake type beat"), "Generate fresh Drake tags free"],
          ["/blog/how-to-title-a-type-beat", "How to title a type beat"],
        ],
      },
    ],
    cta: {
      heading: "Get tags scored on live searches",
      body: "The tag generator reads today's YouTube searches for your artist and scores every tag on demand and competition. You get 3 free runs a day with no account; sign up free for 3 more and 3 YouTube uploads, no card needed.",
      links: [
        [freeTagLink("drake type beat"), "Generate Drake tags"],
        ["/?signup=1", "Sign up free"],
      ],
    },
    faq: [
      [
        "How many tags should a Drake type beat have?",
        "As many focused tags as fit in YouTube's 500 characters, usually 15 to 30. Relevance matters more than the count, so cut anything that doesn't describe your beat.",
      ],
      [
        "Should I put the year in my Drake type beat tags?",
        'Yes. Buyers often search "drake type beat {year}", so add the year to your main tag and update it each January.',
      ],
      [
        "Does the order of tags matter?",
        "Put your most important tags first. It keeps your main searches in the set when you trim to fit, and makes the list easy to check.",
      ],
      [
        "Can I use the same tags on every Drake type beat?",
        "Use them as a starting point and change a few for each beat. Identical tags on many uploads make your own videos compete with each other.",
      ],
    ],
  },
  "/blog/how-to-title-a-type-beat": {
    date: "2026-11-26",
    title: "How to Title a Type Beat on YouTube, with Examples | SendMyBeat Blog",
    description:
      'How to title a type beat on YouTube: the [Artist] Type Beat - "Name" format, what to add after it, how long a title should be and when to use [FREE].',
    h1: "How to title a type beat on YouTube",
    summary: 'The [Artist] Type Beat - "Name" format, what to add after it, length, and when to use [FREE].',
    lede: "Your title is the first thing a buyer reads and the strongest signal of what your beat is. A good type beat title is simple, consistent and starts with the search.",
    sections: [
      [
        "Use the format buyers recognise",
        'Lead with the artist and "type beat", then the beat name in quotes: Drake Type Beat - "Midnight". Buyers searching for that artist see the match straight away, and the name in quotes makes the beat yours and easy to ask for.',
      ],
      [
        "What to add after the name",
        'If there\'s room, add the year, a second artist your beat sounds like, or the style: Drake x Future Type Beat {year} - "Midnight" | Dark R&B Instrumental. Each extra keyword is a search next to the obvious one. Join two artists with an "x" for a crossover title.',
      ],
      [
        "Keep it short enough to read",
        "YouTube allows 100 characters, but search results and phones often cut a title after about 70. Keep the artist, \"type beat\" and the name at the front so the important part always shows.",
      ],
      [
        "Use [FREE] only when the beat is free",
        '"Free type beat" is a big search, but putting [FREE] on a beat you sell brings in people who won\'t buy and leads to awkward messages. Use it only when anyone can use the beat for free, and say the terms in the description.',
      ],
      [
        "Stay consistent, and update the year",
        "Use the same format on every upload so your channel reads cleanly. Each January, update the year on your best uploads, and retitle beats that stalled rather than deleting them.",
      ],
    ],
    related: [
      {
        heading: "Make titles and tags for your next beat",
        body: "The title generator writes titles in these formats with a character count. Tags should match the title, so start from your artist's tag set.",
        links: [
          ["/type-beat-title-generator", "Type beat title generator"],
          [TAG_HUB_PATH, "Type beat tags by artist"],
          [tagSetPath("drake"), "Drake type beat tags"],
          [tagSetPath("travis-scott"), "Travis Scott type beat tags"],
          ["/blog/best-youtube-tags-for-drake-type-beat", "Best tags for a Drake type beat"],
        ],
      },
    ],
    cta: {
      heading: "Write your titles in seconds",
      body: "The type beat title generator is free with no sign-up and no limit. With a SendMyBeat account, titles come with your scored tags and description, ready to upload.",
      links: [
        ["/type-beat-title-generator", "Title generator"],
        ["/?signup=1", "Sign up free"],
      ],
    },
    faq: [
      [
        "What is the best title format for a type beat?",
        'Artist plus "Type Beat" first, then the beat name in quotes: Drake Type Beat - "Midnight". Add the year, a second artist or the style after it if there\'s room.',
      ],
      [
        "How long should a type beat title be?",
        "YouTube allows 100 characters. Aim for about 70 or less so the important part shows in search results and on phones.",
      ],
      [
        "Should the beat name be in quotes?",
        "Yes. Quotes show where the search words end and the name begins, and make the beat easy for a buyer to ask for by name.",
      ],
      [
        "Can I change a title after uploading?",
        "Yes, in YouTube Studio at any time. Retitling a beat that stalled is often better than deleting and uploading it again.",
      ],
    ],
  },
};
export const BLOG_PATHS = Object.keys(BLOG_POSTS);

// "2026-11-26" -> "November 26, 2026" (no Date, so the build and the browser agree).
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const postDate = (iso) => {
  const [y, m, d] = String(iso).split("-").map(Number);
  return MONTHS[m - 1] ? `${MONTHS[m - 1]} ${d}, ${y}` : String(iso);
};

// Newest first, for the blog index.
export const blogPostList = () =>
  Object.entries(BLOG_POSTS).sort(([pa, a], [pb, b]) => b.date.localeCompare(a.date) || pa.localeCompare(pb));

const pageMeta = (path) => {
  if (STATIC_PAGES[path]) return STATIC_PAGES[path];
  if (path === FREE_TAG_PAGE.path) return { ...FREE_TAG_PAGE, priority: "0.9", changefreq: "weekly" };
  if (path === TRENDING_PAGE.path) return { ...TRENDING_PAGE, priority: "0.7", changefreq: "daily" };
  if (GUIDES[path]) return { ...GUIDES[path], priority: path === TAG_HUB_PATH ? "0.8" : "0.7", changefreq: "monthly" };
  if (TOOL_PAGES[path]) return { ...TOOL_PAGES[path], priority: "0.8", changefreq: "monthly" };
  if (path === BLOG.path) return { ...BLOG, priority: "0.6", changefreq: "weekly" };
  if (BLOG_POSTS[path]) return { ...BLOG_POSTS[path], priority: "0.6", changefreq: "monthly" };
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
  TRENDING_PAGE.path,
  BLOG.path,
  ...BLOG_PATHS,
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
  if (path === TRENDING_PAGE.path) {
    return [breadcrumbs([["SendMyBeat", "/"], [TRENDING_PAGE.nav, path]]), faqPage(TRENDING_PAGE.faq, year)];
  }
  if (GUIDES[path]) {
    const guide = GUIDES[path];
    return [breadcrumbs([["SendMyBeat", "/"], [guide.h1, path]]), ...(guide.faq ? [faqPage(guide.faq, year)] : [])];
  }
  if (path === BLOG.path) {
    return [
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "SendMyBeat producer blog",
        url: `${SITE}${path}`,
        description: meta.description,
        publisher: { "@type": "Organization", name: "SendMyBeat", url: SITE },
        blogPost: blogPostList().map(([p, post]) => ({
          "@type": "BlogPosting",
          headline: withYear(post.h1, year),
          url: `${SITE}${p}`,
          datePublished: post.date,
        })),
      },
      breadcrumbs([["SendMyBeat", "/"], ["Blog", path]]),
    ];
  }
  if (BLOG_POSTS[path]) {
    const post = BLOG_POSTS[path];
    return [
      {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: withYear(post.h1, year),
        description: meta.description,
        url: `${SITE}${path}`,
        mainEntityOfPage: `${SITE}${path}`,
        datePublished: post.date,
        dateModified: post.updated || post.date,
        author: { "@type": "Organization", name: "SendMyBeat", url: SITE },
        publisher: { "@type": "Organization", name: "SendMyBeat", url: SITE },
      },
      breadcrumbs([["SendMyBeat", "/"], ["Blog", BLOG.path], [withYear(post.h1, year), path]]),
      faqPage(post.faq, year),
    ];
  }
  const page = tagSetPage(path.slice(TAG_HUB_PATH.length + 1));
  return [
    breadcrumbs([["SendMyBeat", "/"], ["Type beat tags", TAG_HUB_PATH], [page.h1, path]]),
    faqPage(page.faq, year),
  ];
};

// Search pages: one per thing producers search for, each answering it and pointing to the
// free tag generator or sign-up. Titles and descriptions also feed RouteMeta and the sitemap.
export const SEO_PAGES = {
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
    title: "Type Beat Tags: how to tag a type beat on YouTube | SendMyBeat",
    description: "How to tag a type beat on YouTube: which tags to use, which to skip, and a free generator that builds the set from live YouTube searches.",
    h1: "Type beat tags that people actually search",
    lede: "A good type beat tag set mixes the artist, the style and the way buyers phrase their search. Here's how to build one.",
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
};

export const SEO_PATHS = Object.keys(SEO_PAGES);

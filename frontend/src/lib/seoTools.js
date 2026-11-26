// Logic for the free, no-sign-up tools on the public pages: type beat titles, beat
// descriptions, hashtags and the YouTube tag counter. Everything runs in the browser, so
// the tools cost nothing to run and have no limit.
//
// The title and description builders are ports of the server's own builders
// (backend/services/tag_titles.py and backend/services/description_builder.py), so a
// visitor gets the same formats the app gives a signed-in producer. Keep them in step.
//
// Keep this file free of imports: scripts/prerender-seo.js loads it outside webpack,
// the same way it loads seoModel.js.

export const YOUTUBE_TAG_LIMIT = 500;
export const YOUTUBE_TITLE_LIMIT = 100;
export const TITLE_VISIBLE_CHARS = 70; // past this, the end of a title is often cut off in search
export const TAG_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_BYTES = 5000;
export const HASHTAGS_MIN = 3;
export const HASHTAGS_MAX = 5;
export const YOUTUBE_HASHTAG_LIMIT = 15; // more than this and YouTube ignores every hashtag
export const HASHTAGS_ABOVE_TITLE = 3;

// ---------------------------------------------------------------- helpers

// Python's " ".join(text.split()): collapse every run of whitespace.
const squash = (text) => String(text ?? "").split(/\s+/).filter(Boolean).join(" ");
const key = (text) => squash(text).toLowerCase();
// Length in characters (code points), like Python's len().
export const charLength = (text) => Array.from(String(text ?? "")).length;
const firstChars = (text, n) => Array.from(text).slice(0, n).join("");
export const byteLength = (text) => new TextEncoder().encode(String(text ?? "")).length;

// Python's round(): halves go to the even neighbour.
export const pyRound = (value) => {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
};

// Python's str.title(): a letter is upper case after anything that isn't a letter.
const pyTitle = (text) => {
  let out = "";
  let prevLetter = false;
  Array.from(String(text ?? "")).forEach((ch) => {
    const letter = ch.toLowerCase() !== ch.toUpperCase();
    out += letter ? (prevLetter ? ch.toLowerCase() : ch.toUpperCase()) : ch;
    prevLetter = letter;
  });
  return out;
};

// Title case, keeping the crossover "x" lower case (tag_titles._title_case). One addition:
// the letter after "&" is upper case too, so "r&b" reads "R&B".
export const titleCase = (text) =>
  key(text)
    .split(" ")
    .filter(Boolean)
    .map((word) => (word === "x" ? word : (word[0].toUpperCase() + word.slice(1)).replace(/&([a-z])/g, (_, c) => `&${c.toUpperCase()}`)))
    .join(" ");

const withoutTypeBeat = (tag) => key(tag).replace(/\s*\btype beats?\b\s*/g, " ").trim();

// "Drake x Future", "drake, future" or "Drake & Future" -> ["drake", "future"].
export const splitArtists = (text) =>
  String(text ?? "")
    .split(/\s+x\s+|\s*[,&+/]\s*|\s+feat\.?\s+|\s+ft\.?\s+/i)
    .map(key)
    .filter((a, i, all) => a && all.indexOf(a) === i);

// ---------------------------------------------------------------- tag scores

// The colours and words the signed-in tag tool uses for a tag's score
// (components/workflow/TagsSection.js and TagInsights.js).
export const TAG_SCORE_GREEN_MIN = 60;
export const TAG_SCORE_AMBER_MIN = 45;
export const scoreTone = (score) => {
  const value = Number(score);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= TAG_SCORE_GREEN_MIN) return "good";
  if (value >= TAG_SCORE_AMBER_MIN) return "ok";
  return "weak";
};
export const verdictFor = (score) => (score >= 80 ? "Strong tag" : score >= 60 ? "Good tag" : score >= 40 ? "Okay tag" : "Weak tag");

// ---------------------------------------------------------------- tag counter

// YouTube counts each tag's characters, a comma between tags, and two quote marks around
// a tag with a space in it. Same count as youtubeTagChars in seoModel.js.
export const tagCost = (tag) => tag.length + (tag.includes(" ") ? 2 : 0);
export const tagListChars = (tags) => (tags.length ? tags.reduce((n, t) => n + tagCost(t), 0) + tags.length - 1 : 0);

// Pasted tags -> a list: split on commas and new lines, drop quote marks around a tag,
// collapse spaces. YouTube doesn't take < or > in tags, so those go too.
export const parseTags = (text) =>
  String(text ?? "")
    .split(/[,\n]/)
    .map((raw) => squash(raw.replace(/[<>]/g, "")).replace(/^["'“”]+|["'“”]+$/g, "").trim())
    .filter(Boolean);

export const analyzeTags = (text, limit = YOUTUBE_TAG_LIMIT) => {
  const tags = parseTags(text);
  const seen = new Set();
  const rows = tags.map((tag) => {
    const k = key(tag);
    const duplicate = seen.has(k);
    seen.add(k);
    return { tag, length: tag.length, cost: tagCost(tag), duplicate, tooLong: tag.length > TAG_MAX_LENGTH };
  });
  const chars = tagListChars(tags);
  return {
    rows,
    count: tags.length,
    chars,
    limit,
    over: chars > limit,
    duplicates: rows.filter((r) => r.duplicate).map((r) => r.tag),
    tooLong: rows.filter((r) => r.tooLong).map((r) => r.tag),
    hadAngleBrackets: /[<>]/.test(String(text ?? "")),
  };
};

// Keep tags in order, drop repeats and over-long tags, and skip any tag that would push
// the list past the limit (a shorter one later on may still fit).
export const trimToFit = (tags, limit = YOUTUBE_TAG_LIMIT) => {
  const kept = [];
  const dropped = [];
  const seen = new Set();
  tags.forEach((tag) => {
    const k = key(tag);
    if (!k) return;
    if (seen.has(k)) {
      dropped.push({ tag, why: "repeat" });
      return;
    }
    seen.add(k);
    if (tag.length > TAG_MAX_LENGTH) dropped.push({ tag, why: "too long" });
    else if (tagListChars([...kept, tag]) > limit) dropped.push({ tag, why: "no room" });
    else kept.push(tag);
  });
  return { kept, dropped, chars: tagListChars(kept) };
};

// ---------------------------------------------------------------- titles (tag_titles.py)

const MAX_SUGGESTIONS = 5;
const PLACEHOLDER_BEAT = "BEAT NAME";
const TITLE_CHECK_WEIGHTS = { artist_first: 40, length: 15, top_keyword: 20, beat_name: 15, characters: 10 };
const ARTIST_FIRST_WITHIN = 40;

/** The run's best-scoring sound tag (a genre or mood, no artist, no "type beat"). */
export const topSoundKeyword = ({ artist, scoredTags }) => {
  const artistKey = key(artist);
  let best = "";
  let bestScore = -1;
  (scoredTags || []).forEach((entry) => {
    const tag = key(entry.tag);
    if (!tag || tag.includes("type beat") || (artistKey && tag.includes(artistKey)) || tag.split(" ").length > 3) return;
    const score = Number(entry.score) || 0;
    if (score > bestScore) {
      best = tag;
      bestScore = score;
    }
  });
  return best;
};

/** Score a video title out of 100 with the checks behind it (tag_titles.score_title). */
export const scoreTitle = (title, { artist = "", topKeyword = "" } = {}) => {
  const raw = String(title ?? "");
  const clean = squash(raw);
  const lowered = clean.toLowerCase();
  const artistKey = key(artist);
  const checks = [];

  const head = firstChars(lowered, ARTIST_FIRST_WITHIN);
  if (artistKey) {
    const ok = head.includes(artistKey) && head.includes("type beat");
    checks.push({
      id: "artist_first",
      ok,
      message: ok
        ? `Artist and 'type beat' in the first ${ARTIST_FIRST_WITHIN} characters`
        : `Start with '${titleCase(artistKey)} Type Beat' so searchers see it first`,
    });
  } else {
    const ok = head.includes("type beat");
    checks.push({
      id: "artist_first",
      ok,
      message: ok ? `'Type beat' in the first ${ARTIST_FIRST_WITHIN} characters` : "Put the artist and 'type beat' at the start",
    });
  }

  const length = charLength(clean);
  checks.push({
    id: "length",
    ok: length > 0 && length <= YOUTUBE_TITLE_LIMIT,
    message:
      length <= YOUTUBE_TITLE_LIMIT
        ? `${length} of ${YOUTUBE_TITLE_LIMIT} characters`
        : `${length} of ${YOUTUBE_TITLE_LIMIT} characters, ${length - YOUTUBE_TITLE_LIMIT} over YouTube's limit`,
  });

  if (topKeyword) {
    const ok = lowered.includes(key(topKeyword));
    checks.push({
      id: "top_keyword",
      ok,
      message: ok ? `Uses '${key(topKeyword)}', your top sound keyword` : `Add '${key(topKeyword)}', your top sound keyword`,
    });
  }

  const quoted = /["“”][^"“”]+["“”]/.test(clean);
  checks.push({ id: "beat_name", ok: quoted, message: quoted ? "Beat name in quotes" : 'Add the beat name in quotes, like "Neon"' });

  const bad = raw.includes("<") || raw.includes(">");
  checks.push({
    id: "characters",
    ok: !bad,
    message: bad ? "Remove < and >, YouTube rejects titles with them" : "No characters YouTube rejects",
  });

  const total = checks.reduce((n, c) => n + TITLE_CHECK_WEIGHTS[c.id], 0);
  const earned = checks.filter((c) => c.ok).reduce((n, c) => n + TITLE_CHECK_WEIGHTS[c.id], 0);
  let score = total && clean ? pyRound((100 * earned) / total) : 0;
  if (bad || length > YOUTUBE_TITLE_LIMIT) score = Math.min(score, 40); // YouTube won't take it as is
  return { title: clean, score, checks };
};

const titleEntry = (title, entries) => {
  const lowered = key(title);
  const covered = entries.filter((e) => e.tag && lowered.includes(e.tag)).map((e) => e.tag);
  return {
    title,
    keywords: covered,
    coverage: pyRound(entries.filter((e) => covered.includes(e.tag)).reduce((n, e) => n + e.score, 0)),
    length: charLength(title),
  };
};

/** Title ideas from a tag run's scored keywords (tag_titles.suggest_titles). */
export const suggestTitles = ({ artist, scoredTags, beatName = "", year, max = MAX_SUGGESTIONS }) => {
  const artistKey = key(artist);
  if (!artistKey) return [];
  const y = year || new Date().getFullYear();
  const beat = squash(beatName).toUpperCase() || PLACEHOLDER_BEAT;
  const head = `${titleCase(artistKey)} Type Beat`;
  const entries = (scoredTags || [])
    .filter((e) => e.tag)
    .map((e) => ({ tag: key(e.tag), score: Number(e.score) || 0 }))
    .sort((a, b) => b.score - a.score);

  const crossovers = [];
  const related = [];
  const sounds = [];
  entries.forEach(({ tag }) => {
    if (` ${tag} `.includes(" x ") && tag.includes(artistKey)) {
      const other = withoutTypeBeat(tag).split(artistKey).join("").split(" x ").join(" ").replace(/^[ x]+|[ x]+$/g, "");
      if (other) crossovers.push(other);
    } else if (tag.includes("type beat") && !tag.includes(artistKey)) {
      const name = withoutTypeBeat(tag);
      if (name && !/^\d+$/.test(name)) related.push(name);
    } else if (!tag.includes("type beat") && !tag.includes(artistKey) && tag.split(" ").length <= 3) {
      sounds.push(tag);
    }
  });

  const candidates = [
    `${head} - "${beat}"`,
    ...crossovers.slice(0, 2).map((o) => `${titleCase(artistKey)} x ${titleCase(o)} Type Beat - "${beat}"`),
    ...related.slice(0, 2).map((r) => `${head} - "${beat}" | ${titleCase(r)} Type Beat`),
    ...sounds.slice(0, 1).map((snd) => `${head} - "${beat}" | ${titleCase(snd)}${snd.includes("instrumental") ? "" : " Instrumental"}`),
  ];
  if (entries.some((e) => e.tag.includes(String(y)))) candidates.push(`${head} ${y} - "${beat}"`);

  const out = [];
  const seen = new Set();
  candidates.forEach((title) => {
    const lowered = key(title);
    if (seen.has(lowered) || charLength(title) > YOUTUBE_TITLE_LIMIT) return;
    seen.add(lowered);
    out.push(titleEntry(title, entries));
  });
  out.sort((a, b) => b.coverage - a.coverage);
  const topSound = topSoundKeyword({ artist: artistKey, scoredTags });
  out.forEach((item) => {
    item.covers = item.keywords;
    item.score = scoreTitle(item.title, { artist: artistKey, topKeyword: topSound }).score;
  });
  return out.slice(0, max);
};

/**
 * Type beat titles from what a visitor types: artist(s), beat name, mood or style, BPM and
 * whether it's a free beat. The app builds titles from a tag run's scored keywords; with no
 * run here, the inputs stand in for those keywords (the artist first, then collabs, the
 * style and the year), so the formats and ranking match the app. A few more formats that
 * producers use (BPM, the year with the style) fill the list out.
 */
export const typeBeatTitles = ({ artists = "", beatName = "", style = "", bpm = "", free = false, year, max = 8 } = {}) => {
  const names = splitArtists(artists);
  if (!names.length) return [];
  const y = year || new Date().getFullYear();
  const [artist, ...others] = names;
  const sound = key(style).replace(/\s*\btype beats?\b\s*/g, " ").trim();
  const tempo = pyRound(Number(String(bpm).replace(/[^0-9.]/g, "")) || 0);
  const scoredTags = [
    { tag: `${artist} type beat`, score: 90 },
    { tag: `${artist} type beat ${y}`, score: 75 },
    ...others.flatMap((o) => [
      { tag: `${artist} x ${o} type beat`, score: 80 },
      { tag: `${o} type beat`, score: 70 },
    ]),
    ...(sound ? [{ tag: sound, score: 60 }] : []),
  ];
  const entries = scoredTags.map((e) => ({ tag: key(e.tag), score: e.score }));
  const base = suggestTitles({ artist, scoredTags, beatName, year: y, max: 99 }).map((t) => t.title);

  const beat = squash(beatName).toUpperCase() || PLACEHOLDER_BEAT;
  const head = `${titleCase(artist)} Type Beat`;
  const soundTitle = sound ? `${titleCase(sound)}${sound.includes("instrumental") ? "" : " Instrumental"}` : "";
  const extras = [
    soundTitle && `${head} ${y} - "${beat}" | ${soundTitle}`,
    others.length > 1 && `${[artist, ...others.slice(0, 2)].map(titleCase).join(" x ")} Type Beat - "${beat}"`,
    others.length && `${head} ${y} - "${beat}" | ${titleCase(others[0])} Type Beat`,
    tempo > 0 && soundTitle && `${head} ${y} - "${beat}" | ${soundTitle} ${tempo} BPM`,
    tempo > 0 && `${head} - "${beat}" | ${tempo} BPM`,
    `${head} ${y} - "${beat}" | Instrumental`,
    `${head} - "${beat}" | Type Beat ${y}`,
  ].filter(Boolean);

  const prefix = free ? "[FREE] " : "";
  const out = [];
  const seen = new Set();
  [...base, ...extras].forEach((raw) => {
    const title = `${prefix}${raw}`;
    const lowered = key(title);
    if (seen.has(lowered) || charLength(title) > YOUTUBE_TITLE_LIMIT) return;
    seen.add(lowered);
    const item = titleEntry(title, entries);
    item.score = scoreTitle(title, { artist, topKeyword: sound }).score;
    item.long = item.length > TITLE_VISIBLE_CHARS;
    out.push(item);
  });
  out.sort((a, b) => b.coverage - a.coverage);
  return out.slice(0, max);
};

// ---------------------------------------------------------------- descriptions (description_builder.py)

const KEYWORD_LINE_COUNT = 3;
const CHAPTERS_MIN = 3;
const CHAPTER_MIN_GAP_SECONDS = 10;

/** 'Ken Carson type beat' -> 'kencarsontypebeat': lower-case letters and digits, no spaces. */
export const hashtagWord = (text) => String(text ?? "").toLowerCase().replace(/[^0-9a-z]+/g, "");

/** Hashtags in a block of text: a # not right after a letter, digit or another #. */
export const countHashtags = (text) => {
  const matches = String(text ?? "").match(/(^|[^\w#])#[^\s#]+/g);
  return matches ? matches.length : 0;
};

export const formatTimestamp = (seconds) => {
  const total = Math.max(0, Math.trunc(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hours ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
};

/** [clean chapters, null] when YouTube would show them, else [[], why not]. */
export const validateChapters = (chapters) => {
  const rows = [];
  (chapters || []).forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const label = squash(raw.label).replace(/[<>]/g, "");
    const t = Number(raw.t);
    if (raw.t === null || raw.t === undefined || raw.t === "" || !Number.isFinite(t)) return;
    if (label) rows.push({ t, label: Array.from(label).slice(0, 100).join("") });
  });
  if (!rows.length) return [[], null];
  rows.sort((a, b) => a.t - b.t);
  if (rows[0].t !== 0) return [[], "Chapters left out: the first one has to start at 00:00."];
  if (rows.length < CHAPTERS_MIN) return [[], `Chapters left out: YouTube needs at least ${CHAPTERS_MIN}.`];
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i].t - rows[i - 1].t < CHAPTER_MIN_GAP_SECONDS) {
      return [[], `Chapters left out: each one has to be at least ${CHAPTER_MIN_GAP_SECONDS} seconds after the last.`];
    }
  }
  return [rows, null];
};

/** 3 to 5 hashtags: artist type beat first, then the artist, then the run's own short tags. */
export const pickHashtags = ({ artist = "", tags = [], topKeyword = "" } = {}) => {
  const picked = [];
  const add = (text) => {
    const word = hashtagWord(text);
    if (word.length >= 3 && word.length <= 40 && !picked.includes(word) && picked.length < HASHTAGS_MAX) picked.push(word);
  };
  const artistClean = squash(artist);
  if (artistClean) {
    add(`${artistClean} type beat`);
    add(artistClean);
  }
  add("type beat");
  if (topKeyword) add(topKeyword.toLowerCase().includes("type beat") ? topKeyword : `${topKeyword} type beat`);
  tags.forEach((tag) => {
    const clean = squash(tag);
    if (clean && clean.split(" ").length <= 4) add(clean); // long phrases make unreadable hashtags
  });
  ["beats", "instrumental"].forEach((fallback) => {
    if (picked.length < HASHTAGS_MIN) add(fallback);
  });
  return picked.map((w) => `#${w}`);
};

const keywordLine = (titleKeywords) => {
  const seen = [];
  for (const keyword of titleKeywords) {
    const clean = squash(keyword);
    if (clean && !seen.some((s) => s.toLowerCase() === clean.toLowerCase())) seen.push(clean);
    if (seen.length >= KEYWORD_LINE_COUNT) break;
  }
  return seen.join(" | ");
};

const stripChars = (text, chars) => {
  const list = Array.from(text);
  while (list.length && chars.includes(list[0])) list.shift();
  while (list.length && chars.includes(list[list.length - 1])) list.pop();
  return list.join("");
};

/** A YouTube description from a tag run (description_builder.build_description). */
export const buildDescription = ({
  artist = "",
  beatName = "",
  tags = [],
  topKeyword = "",
  buyLink = "",
  linkLabel = "Buy or lease",
  bpm = null,
  key: musicKey = "",
  chapters = null,
  includeChapters = true,
  templateText = "",
} = {}) => {
  const warnings = [];
  const tagList = tags.map(squash).filter(Boolean);
  const artistClean = squash(artist);
  const beat = stripChars(squash(beatName), "\"'“”");
  const sound = squash(topKeyword);

  const mainTag = `${artistClean} type beat`;
  const titleKeywords = [...(artistClean ? [mainTag] : []), ...tagList.filter((t) => t.toLowerCase() !== mainTag.toLowerCase())];
  let head = keywordLine(titleKeywords);
  if (beat) head = head ? `${head} - "${beat.toUpperCase()}"` : `"${beat.toUpperCase()}"`;

  const lines = head ? [head] : [];
  const link = squash(buyLink);
  if (link) lines.push(`${linkLabel}: ${link}`);
  const facts = [];
  const tempo = Number(bpm);
  if (bpm !== null && bpm !== "" && Number.isFinite(tempo) && tempo) facts.push(`BPM: ${pyRound(tempo)}`);
  if (squash(musicKey)) facts.push(`Key: ${squash(musicKey)}`);
  if (facts.length) lines.push(facts.join(" | "));

  const paragraphBits = [];
  const namePart = beat ? `"${pyTitle(beat)}" is a` : "A";
  const style = sound && !artistClean.toLowerCase().includes(sound.toLowerCase()) ? `${sound} ` : "";
  if (artistClean) {
    paragraphBits.push(`${namePart} ${style}${artistClean} type beat.`);
    paragraphBits.push(`Made for artists who want a ${artistClean} sound.`);
  } else if (style) {
    paragraphBits.push(`${namePart} ${style.trim()} beat.`);
  }
  const paragraph = paragraphBits.join(" ");

  const blocks = lines.length ? [lines.join("\n")] : [];
  if (paragraph) blocks.push(paragraph);

  if (includeChapters && chapters && chapters.length) {
    const [valid, whyNot] = validateChapters(chapters);
    if (valid.length) blocks.push(valid.map((row) => `${formatTimestamp(row.t)} ${row.label}`).join("\n"));
    else if (whyNot) warnings.push(whyNot);
  }

  const template = String(templateText ?? "").trim();
  if (template) blocks.push(template);

  const hashtags = pickHashtags({ artist: artistClean, tags: tagList, topKeyword: sound });
  const existing = countHashtags(template);
  if (existing + hashtags.length > YOUTUBE_HASHTAG_LIMIT) {
    warnings.push(
      `Your template already has ${existing} hashtags. Over ${YOUTUBE_HASHTAG_LIMIT} in total and YouTube ignores all of them, so trim the template.`
    );
  }
  blocks.push(hashtags.join(" "));

  let content = blocks.filter(Boolean).join("\n\n");
  if (content.includes("<") || content.includes(">")) {
    content = content.replace(/[<>]/g, "");
    warnings.push("Removed < and > (YouTube rejects descriptions that contain them).");
  }

  if (byteLength(content) > DESCRIPTION_MAX_BYTES) {
    const tail = `\n\n${hashtags.join(" ")}`;
    const room = DESCRIPTION_MAX_BYTES - byteLength(tail);
    const body = content.endsWith(tail) ? content.slice(0, -tail.length) : content;
    const cut = new TextDecoder().decode(new TextEncoder().encode(body).slice(0, room)).replace(/�+$/, "").trimEnd();
    content = cut + tail;
    warnings.push(`Shortened to fit YouTube's ${DESCRIPTION_MAX_BYTES}-byte limit. Trim your template to keep its ending.`);
  }

  return { content, hashtags, bytes: byteLength(content), warnings };
};

// "@name", "name" or an instagram.com link -> what to print in a description.
export const instagramLine = (handle) => {
  const clean = squash(handle);
  if (!clean) return "";
  if (/^https?:\/\//i.test(clean) || clean.includes("instagram.com")) return clean;
  return `@${clean.replace(/^@+/, "")}`;
};

/**
 * The description tool on the public page: the server's builder, fed with what a visitor
 * types instead of a tag run. The keywords come from the artist, style and year, and the
 * credits and contact lines take the place of a saved template.
 */
export const beatDescription = ({
  beatName = "",
  artist = "",
  style = "",
  bpm = "",
  musicKey = "",
  buyLink = "",
  producer = "",
  email = "",
  instagram = "",
  free = false,
  year,
} = {}) => {
  const y = year || new Date().getFullYear();
  const names = splitArtists(artist);
  const main = names[0] || "";
  const sound = key(style).replace(/\s*\btype beats?\b\s*/g, " ").trim();
  const tags = main
    ? [
        free ? `free ${main} type beat` : `${main} type beat ${y}`,
        sound ? `${sound} type beat` : `${main} instrumental`,
        ...names.slice(1).map((o) => `${o} type beat`),
        free ? `${main} type beat ${y}` : "",
      ].filter(Boolean)
    : sound
      ? [`${sound} type beat`, `${sound} instrumental`]
      : [];

  const producerName = squash(producer);
  const template = [];
  if (producerName) template.push(`Prod. by ${producerName}`);
  if (free) {
    template.push(
      producerName
        ? `Free for profit: use this beat for free, just credit (prod. ${producerName}) in your title.`
        : "Free for profit: use this beat for free, just credit me in your title."
    );
  } else if (squash(buyLink)) {
    template.push("Not free for profit: lease the beat at the link above before you release music on it.");
  }
  const contact = [];
  if (squash(email)) contact.push(`Contact: ${squash(email)}`);
  if (instagramLine(instagram)) contact.push(`Instagram: ${instagramLine(instagram)}`);

  const blocks = [template.join("\n"), contact.join("\n")].filter(Boolean);
  const tempo = Number(String(bpm).replace(/[^0-9.]/g, ""));
  return buildDescription({
    artist: main ? titleCase(main) : "",
    beatName,
    tags,
    topKeyword: sound,
    buyLink,
    linkLabel: free ? "Free download or lease" : "Buy or lease",
    bpm: Number.isFinite(tempo) && tempo > 0 ? tempo : null,
    key: musicKey,
    templateText: blocks.join("\n\n"),
  });
};

// ---------------------------------------------------------------- hashtags

/** 3 to 5 hashtags for a beat's description, picked the way the app's description builder picks them. */
export const beatHashtags = ({ artists = "", style = "", existing = "" } = {}) => {
  const names = splitArtists(artists);
  const sound = key(style).replace(/\s*\btype beats?\b\s*/g, " ").trim();
  const tags = [...names.slice(1).map((o) => `${o} type beat`), ...(sound ? [sound] : [])];
  const hashtags = pickHashtags({ artist: names[0] || "", tags, topKeyword: sound });
  const already = countHashtags(existing);
  const total = already + hashtags.length;
  return { hashtags, already, total, over: total > YOUTUBE_HASHTAG_LIMIT };
};

// Downloads Satoshi and Clash Grotesk from Fontshare into assets/fonts (runs on npm install).
// Their license (ITF Free Font License) allows embedding them in the app but not publishing the
// files in a public repo, so they're gitignored and everyone fetches their own copy from Fontshare.
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const FONTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'fonts');
const WANTED = {
  satoshi: ['Satoshi-Regular.otf', 'Satoshi-Medium.otf', 'Satoshi-Bold.otf'],
  'clash-grotesk': ['ClashGrotesk-Semibold.otf'],
};

// Fontshare serves each family as one zip; read just the files we need out of it.
function extract(zip, names) {
  const out = {};
  let end = zip.length - 22;
  while (end >= 0 && zip.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('not a zip file');
  let at = zip.readUInt32LE(end + 16);
  for (let i = zip.readUInt16LE(end + 10); i > 0; i--) {
    const method = zip.readUInt16LE(at + 10);
    const size = zip.readUInt32LE(at + 20);
    const nameLen = zip.readUInt16LE(at + 28);
    const skip = nameLen + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const path = zip.toString('utf8', at + 46, at + 46 + nameLen);
    const file = path.split('/').pop();
    if (path.includes('/OTF/') && names.includes(file)) {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      out[file] = method === 8 ? inflateRawSync(data) : data;
    }
    at += 46 + skip;
  }
  return out;
}

const missing = Object.entries(WANTED).filter(([, files]) => files.some((f) => !existsSync(join(FONTS_DIR, f))));
if (missing.length === 0) process.exit(0);

mkdirSync(FONTS_DIR, { recursive: true });
for (const [family, files] of missing) {
  const res = await fetch(`https://api.fontshare.com/v2/fonts/download/${family}`);
  if (!res.ok) throw new Error(`Could not download ${family} from Fontshare (HTTP ${res.status}).`);
  const found = extract(Buffer.from(await res.arrayBuffer()), files);
  for (const f of files) {
    if (!found[f]) throw new Error(`${f} was not in the ${family} download from Fontshare.`);
    writeFileSync(join(FONTS_DIR, f), found[f]);
  }
  console.log(`Fetched ${files.join(', ')} from Fontshare.`);
}

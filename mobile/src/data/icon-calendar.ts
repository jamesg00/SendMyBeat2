import type { AppIconId } from '@/data/app-icons';

// Which holiday or event icon the app wears on a given day (the phone's own date), or null for
// the everyday icon. The first rule that matches wins, so the more specific days come first.
// Holidays that move each year (Lunar New Year, Diwali, Hanukkah, Eid) come from the tables
// below; add the next years before 2031.

type MD = [month: number, day: number]; // month 1-12
type Rule = { icon: AppIconId; days: (year: number) => [start: Date, end: Date][] };

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const addDays = (date: Date, n: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const span = (date: Date, before: number, after: number): [Date, Date] => [addDays(date, -before), addDays(date, after)];

/** The same dates every year, e.g. Oct 24 to Oct 31. */
const fixed = (icon: AppIconId, from: MD, to: MD = from): Rule => ({
  icon,
  days: (y) => [[d(y, from[0], from[1]), d(y, to[0], to[1])]],
});

/** The nth weekday of a month (weekday 0 = Sunday), e.g. the 4th Thursday of November. */
function nthWeekday(y: number, month: number, weekday: number, n: number) {
  const first = d(y, month, 1);
  return d(y, month, 1 + ((weekday - first.getDay() + 7) % 7) + (n - 1) * 7);
}

/** Easter Sunday (Gregorian, anonymous algorithm). */
function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - dd - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  return d(y, month, ((h + l - 7 * m + 114) % 31) + 1);
}

/** A holiday whose date comes from a table, shown from `before` days ahead to `after` days after. */
const table = (icon: AppIconId, dates: Record<number, MD>, before = 0, after = 0): Rule => ({
  icon,
  days: (y) => (dates[y] ? [span(d(y, dates[y][0], dates[y][1]), before, after)] : []),
});

// Lunar New Year day (chinesenewyear.net).
const LUNAR_NEW_YEAR: Record<number, MD> = { 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3] };
// Diwali (testbook.com, 20-year list).
const DIWALI: Record<number, MD> = { 2026: [11, 8], 2027: [10, 29], 2028: [10, 17], 2029: [11, 5], 2030: [10, 26] };
// Hanukkah: the evening of the first candle; it runs 8 days (hebcal.com).
const HANUKKAH: Record<number, MD> = { 2026: [12, 4], 2027: [12, 24], 2028: [12, 12], 2029: [12, 1], 2030: [12, 20] };
// Eid al-Fitr, which depends on the moon, so it's shown a day either side (officeholidays.com).
// Only the years confirmed so far; add more as they're announced.
const EID: Record<number, MD> = { 2026: [3, 20], 2027: [3, 9] };

const thanksgiving = (y: number) => nthWeekday(y, 11, 4, 4);

const RULES: Rule[] = [
  fixed('NewYearsEve', [12, 31]),
  fixed('NewYear', [1, 1], [1, 2]),
  fixed('Christmas', [12, 18], [12, 25]),
  table('Hanukkah', HANUKKAH, 0, 8),
  fixed('Kwanzaa', [12, 26], [12, 30]),
  fixed('ChristmasTree', [12, 1], [12, 17]),
  { icon: 'CyberMonday', days: (y) => [span(addDays(thanksgiving(y), 4), 0, 0)] },
  { icon: 'BlackFriday', days: (y) => [span(addDays(thanksgiving(y), 1), 0, 0)] },
  { icon: 'Thanksgiving', days: (y) => [span(thanksgiving(y), 2, 0)] },
  table('Diwali', DIWALI, 1, 1),
  fixed('Halloween', [10, 24], [10, 31]),
  fixed('SpookyPurple', [10, 1], [10, 23]),
  table('LunarNewYear', LUNAR_NEW_YEAR, 0, 2),
  fixed('ValentinesDay', [2, 12], [2, 14]),
  { icon: 'BigGame', days: (y) => [span(nthWeekday(y, 2, 0, 2), 0, 0)] },
  table('RamadanAndEid', EID, 1, 1),
  fixed('StPatricksDay', [3, 15], [3, 17]),
  fixed('Spring', [3, 20], [3, 21]),
  fixed('AprilFools', [4, 1]),
  { icon: 'Easter', days: (y) => [span(easter(y), 1, 0)] },
  fixed('EarthDay', [4, 22]),
  { icon: 'MothersDay', days: (y) => [span(nthWeekday(y, 5, 0, 2), 0, 0)] },
  { icon: 'FathersDay', days: (y) => [span(nthWeekday(y, 6, 0, 3), 0, 0)] },
  fixed('WorldMusicDay', [6, 21]),
  fixed('Summer', [6, 20]),
  fixed('PrideMonth', [6, 1], [6, 30]),
  fixed('FourthOfJuly', [7, 3], [7, 4]),
  fixed('HipHopDay', [8, 11]),
  fixed('BackToSchool', [8, 18], [8, 25]),
];

/** The event icon for this day, or null on an ordinary day. */
export function eventIconFor(date: Date = new Date()): AppIconId | null {
  const day = d(date.getFullYear(), date.getMonth() + 1, date.getDate()).getTime();
  // A span can cross into the next year (Hanukkah 2027), so check last year's rules too.
  for (const rule of RULES) {
    for (const y of [date.getFullYear(), date.getFullYear() - 1]) {
      if (rule.days(y).some(([start, end]) => day >= start.getTime() && day <= end.getTime())) return rule.icon;
    }
  }
  return null;
}

/** The event icons coming up, soonest first, for the picker's "Coming up" line. */
export function upcomingEvents(from: Date = new Date(), count = 3): { icon: AppIconId; start: Date }[] {
  const today = d(from.getFullYear(), from.getMonth() + 1, from.getDate());
  const seen = new Set<AppIconId>();
  const out: { icon: AppIconId; start: Date }[] = [];
  for (let i = 1; i <= 400 && out.length < count; i++) {
    const day = addDays(today, i);
    const icon = eventIconFor(day);
    if (icon && icon !== eventIconFor(addDays(day, -1)) && !seen.has(icon)) {
      seen.add(icon);
      out.push({ icon, start: day });
    }
  }
  return out;
}

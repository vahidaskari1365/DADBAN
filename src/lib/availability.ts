// Real availability engine for consultation booking.
// Computed from lawyer weekly rules (Asia/Tehran wall-clock) minus already
// taken consultations. Iran has no DST since 2022 → fixed +03:30 offset.

export interface AvailabilityRule {
  /** 0=شنبه … 6=جمعه */
  weekday: number;
  /** دقیقه از شروع روز (به وقت تهران) */
  startMin: number;
  endMin: number;
}

export interface TimeSlot {
  /** ISO timestamp (UTC instant) of slot start */
  start: string;
  /** Persian label e.g. «شنبه — ۱۰:۰۰» */
  label: string;
}

const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const PERSIAN_WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

/** JS weekday (0=Sunday) → Persian index (0=Saturday) */
const JS_TO_FA_WEEKDAY = [1, 2, 3, 4, 5, 6, 0];

const faMap = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const fa = (s: string) => s.replace(/\d/g, (d) => faMap[+d]);

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/** Parse and validate a YYYY-MM-DD date; returns the Tehran-local day start (UTC instant). */
export function parseTehranDay(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T00:00:00+03:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Persian weekday index (0=Saturday … 6=Friday) of the Tehran wall-clock day containing `instant`. */
export function tehranWeekday(instant: Date): number {
  const shifted = new Date(instant.getTime() + TEHRAN_OFFSET_MS);
  return JS_TO_FA_WEEKDAY[shifted.getUTCDay()];
}

export function computeSlots(opts: {
  rules: AvailabilityRule[];
  dayStartUtc: Date;
  durationMin: number;
  takenStarts: Date[];
  /** lead time before a slot can be booked (default: 3 ساعت) */
  leadMin?: number;
  now?: Date;
}): TimeSlot[] {
  const { rules, dayStartUtc, durationMin, takenStarts } = opts;
  const leadMin = opts.leadMin ?? 180;
  const now = opts.now ?? new Date();

  const faDay = tehranWeekday(dayStartUtc);
  const taken = new Set(takenStarts.map((t) => t.getTime()));
  const slots: TimeSlot[] = [];

  for (const rule of rules) {
    if (rule.weekday !== faDay) continue;
    if (!(rule.endMin > rule.startMin)) continue;
    for (let m = rule.startMin; m + durationMin <= rule.endMin; m += durationMin) {
      const startUtc = new Date(dayStartUtc.getTime() + m * 60_000);
      if (taken.has(startUtc.getTime())) continue;
      if (startUtc.getTime() < now.getTime() + leadMin * 60_000) continue;
      slots.push({
        start: startUtc.toISOString(),
        label: `${PERSIAN_WEEKDAYS[faDay]} — ${fa(pad(Math.floor(m / 60)) + ":" + pad(m % 60))}`,
      });
    }
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

/** Range of bookable days the picker offers (این هفته + هفته آینده، به وقت تهران). */
export function bookableDates(now = new Date(), daysAhead = 10): { date: string; label: string }[] {
  const shifted = new Date(now.getTime() + TEHRAN_OFFSET_MS);
  const result: { date: string; label: string }[] = [];
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(shifted.getTime() + i * DAY_MS);
    const y = d.getUTCFullYear();
    const m = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const wd = PERSIAN_WEEKDAYS[JS_TO_FA_WEEKDAY[d.getUTCDay()]];
    result.push({ date: `${y}-${m}-${day}`, label: `${wd} ${fa(`${String(y).slice(2)}/${m}/${day}`)}` });
  }
  return result;
}

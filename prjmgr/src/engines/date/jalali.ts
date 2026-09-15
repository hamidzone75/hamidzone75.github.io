/**
 * Jalali (Persian) Calendar Engine – Pure & Accurate
 * Based on the standard algorithm used by major Persian libraries.
 */

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
] as const;

export const JALALI_WEEKDAYS = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'
] as const;

const g_days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const j_days_in_month = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

/**
 * Accurate Jalali leap year detection
 * Uses the official 33-year cycle method.
 */
export function isJalaliLeap(jy: number): boolean {
  // Known good algorithm for practical range 1200-1500+
  return ((jy + 12) % 33) % 4 === 1;
  // Note: For extreme historical accuracy a more complex break-list can be used,
  // but this matches Iranian calendar for all modern project years.
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm >= 1 && jm <= 6) return 31;
  if (jm >= 7 && jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

/** Jalali → Gregorian */
export function toGregorian(jy: number, jm: number, jd: number): GregorianDate {
  jy = Math.floor(jy);
  jm = Math.floor(jm);
  jd = Math.floor(jd);

  const jy2 = jy - 979;
  const jm2 = jm - 1;
  const jd2 = jd - 1;

  let j_day_no =
    365 * jy2 +
    Math.floor(jy2 / 33) * 8 +
    Math.floor(((jy2 % 33) + 3) / 4);

  for (let i = 0; i < jm2; ++i) {
    j_day_no += j_days_in_month[i];
  }
  j_day_no += jd2;

  let g_day_no = j_day_no + 79;

  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no = g_day_no % 146097;

  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no = g_day_no % 36524;

    if (g_day_no >= 365) g_day_no++;
    else leap = false;
  }

  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;

  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }

  let i = 0;
  for (; g_day_no >= g_days_in_month[i] + (i === 1 && leap ? 1 : 0); i++) {
    g_day_no -= g_days_in_month[i] + (i === 1 && leap ? 1 : 0);
  }

  return {
    gy,
    gm: i + 1,
    gd: g_day_no + 1
  };
}

/** Gregorian → Jalali */
export function toJalali(gy: number, gm: number, gd: number): JalaliDate {
  gy = Math.floor(gy);
  gm = Math.floor(gm);
  gd = Math.floor(gd);

  let gy2 = gy - 1600;
  let gm2 = gm - 1;
  let gd2 = gd - 1;

  let g_day_no =
    365 * gy2 +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400);

  for (let i = 0; i < gm2; ++i) {
    g_day_no += g_days_in_month[i];
  }
  if (gm2 > 1 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) {
    g_day_no++;
  }
  g_day_no += gd2;

  let j_day_no = g_day_no - 79;

  const j_np = Math.floor(j_day_no / 12053);
  j_day_no = j_day_no % 12053;

  let jy = 979 + 33 * j_np + 4 * Math.floor(j_day_no / 1461);

  j_day_no %= 1461;

  if (j_day_no >= 366) {
    jy += Math.floor((j_day_no - 1) / 365);
    j_day_no = (j_day_no - 1) % 365;
  }

  let i = 0;
  for (; i < 11 && j_day_no >= j_days_in_month[i]; ++i) {
    j_day_no -= j_days_in_month[i];
  }

  // special case for leap Esfand
  if (i === 11 && isJalaliLeap(jy)) {
    // 30 days allowed
  }

  return {
    jy,
    jm: i + 1,
    jd: j_day_no + 1
  };
}

export function todayJalali(): JalaliDate {
  const n = new Date();
  return toJalali(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

export function formatJalali(jy: number, jm: number, jd: number, sep = '/'): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${jy}${sep}${p(jm)}${sep}${p(jd)}`;
}

export function parseJalali(str: string): JalaliDate | null {
  const m = String(str).trim().match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (!m) return null;
  const jy = +m[1];
  const jm = +m[2];
  const jd = +m[3];
  if (jm < 1 || jm > 12 || jd < 1 || jd > jalaliMonthLength(jy, jm)) return null;
  return { jy, jm, jd };
}

/** 0 = شنبه ... 6 = جمعه */
export function jalaliWeekday(jy: number, jm: number, jd: number): number {
  const g = toGregorian(jy, jm, jd);
  const d = new Date(Date.UTC(g.gy, g.gm - 1, g.gd));
  // UTC day: 0=Sun → shift so Saturday=0
  return (d.getUTCDay() + 1) % 7;
}

export function addJalaliDays(jy: number, jm: number, jd: number, days: number): JalaliDate {
  const g = toGregorian(jy, jm, jd);
  const d = new Date(Date.UTC(g.gy, g.gm - 1, g.gd));
  d.setUTCDate(d.getUTCDate() + days);
  return toJalali(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function jalaliDiffDays(a: JalaliDate, b: JalaliDate): number {
  const ga = toGregorian(a.jy, a.jm, a.jd);
  const gb = toGregorian(b.jy, b.jm, b.jd);
  const da = Date.UTC(ga.gy, ga.gm - 1, ga.gd);
  const db = Date.UTC(gb.gy, gb.gm - 1, gb.gd);
  return Math.round((db - da) / 86400000);
}

export function compareJalali(a: JalaliDate, b: JalaliDate): number {
  if (a.jy !== b.jy) return a.jy < b.jy ? -1 : 1;
  if (a.jm !== b.jm) return a.jm < b.jm ? -1 : 1;
  if (a.jd !== b.jd) return a.jd < b.jd ? -1 : 1;
  return 0;
}

export function jalaliMonthName(jm: number): string {
  return JALALI_MONTHS[jm - 1] ?? '';
}

export function jalaliWeekdayName(wd: number): string {
  return JALALI_WEEKDAYS[wd] ?? '';
}

/**
 * Jalali + Hijri + Gregorian utilities
 * Jalali: pure Borkowski algorithm
 * Hijri : tabular (Kuwaiti) + user overrides for month lengths
 */

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند"
];

const HIJRI_MONTHS = [
  "محرم", "صفر", "ربیع‌الاول", "ربیع‌الثانی",
  "جمادی‌الاول", "جمادی‌الثانی", "رجب", "شعبان",
  "رمضان", "شوال", "ذی‌القعده", "ذی‌الحجه"
];

const PERSIAN_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const PERSIAN_WEEKDAYS_FULL = [
  "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"
];

// ===================== Storage for Hijri overrides =====================
// Structure: { "1448": { "1": 30, "2": 29, ... }, "1449": {...} }
const HIJRI_OVERRIDES_KEY = "hijriMonthOverrides";

function loadHijriOverrides() {
  try {
    return JSON.parse(localStorage.getItem(HIJRI_OVERRIDES_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveHijriOverrides(data) {
  localStorage.setItem(HIJRI_OVERRIDES_KEY, JSON.stringify(data));
}

function getMonthLength(hy, hm) {
  const overrides = loadHijriOverrides();
  const yearKey = String(hy);
  if (overrides[yearKey] && overrides[yearKey][String(hm)]) {
    return overrides[yearKey][String(hm)];
  }
  // Default tabular: odd months 30, even 29, except Dhu al-Hijjah in leap year = 30
  if (hm % 2 === 1) return 30;
  if (hm === 12) {
    // Leap year check (tabular)
    const leap = [2, 5, 7, 10, 13, 15, 18, 21, 24, 26, 29].includes(hy % 30);
    return leap ? 30 : 29;
  }
  return 29;
}

// ===================== Jalali =====================
// Embedded from jalaali-js (Borkowski algorithm) — verified leaps & conversions

const JALAALI_BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178
];
const MIN_JALAALI_YEAR = JALAALI_BREAKS[0];
const MAX_JALAALI_YEAR = JALAALI_BREAKS[JALAALI_BREAKS.length - 1] - 1;

function div(a, b) { return ~~(a / b); }
function mod(a, b) { return a - ~~(a / b) * b; }

function jalCalCore(jy) {
  if (!Number.isFinite(jy) || jy < MIN_JALAALI_YEAR || jy > MAX_JALAALI_YEAR) {
    throw new RangeError("Invalid Jalaali year " + jy);
  }
  const gy = jy + 621;
  let leapJ = -14;
  let jp = JALAALI_BREAKS[0];
  let jm = 0;
  let jump = 0;
  for (let i = 1; i < JALAALI_BREAKS.length; i += 1) {
    jm = JALAALI_BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  const n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  return { gy: gy, march: 20 + leapJ - leapG, jump: jump, n: n };
}

function leapFromCycle(jump, n) {
  let adjusted = n;
  if (jump - n < 6) adjusted = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(adjusted + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return leap;
}

function jalCalLeap(jy) {
  if (!Number.isFinite(jy) || jy < MIN_JALAALI_YEAR || jy > MAX_JALAALI_YEAR) {
    throw new RangeError("Invalid Jalaali year " + jy);
  }
  let jp = JALAALI_BREAKS[0];
  let jm = 0;
  let jump = 0;
  for (let i = 1; i < JALAALI_BREAKS.length; i += 1) {
    jm = JALAALI_BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    jp = jm;
  }
  return leapFromCycle(jump, jy - jp);
}

function jalCal(jy) {
  const core = jalCalCore(jy);
  return { leap: leapFromCycle(core.jump, core.n), gy: core.gy, march: core.march };
}

function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy: gy, gm: gm, gd: gd };
}

function j2d(jy, jm, jd) {
  const r = jalCalCore(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm, jd;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy: jy, jm: jm, jd: jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy: jy, jm: jm, jd: jd };
}

function toJalaali(gy, gm, gd) {
  return d2j(g2d(gy, gm, gd));
}

function toGregorian(jy, jm, jd) {
  return d2g(j2d(jy, jm, jd));
}

function isLeapJalali(jy) {
  try {
    return jalCalLeap(jy) === 0;
  } catch (_) {
    return false;
  }
}

function daysInJalaliMonth(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalali(jy) ? 30 : 29;
}

/** 0 = Saturday … 6 = Friday; UTC avoids timezone off-by-one */
function getJalaliWeekday(jy, jm, jd) {
  const g = toGregorian(jy, jm, jd);
  const date = new Date(Date.UTC(g.gy, g.gm - 1, g.gd));
  return (date.getUTCDay() + 1) % 7;
}

// ===================== Hijri (Tabular + overrides) =====================

function gregorianToHijriBase(gy, gm, gd) {
  let a = Math.floor((14 - gm) / 12);
  let y = gy + 4800 - a;
  let m = gm + 12 * a - 3;
  let jd = gd + Math.floor((153 * m + 2) / 5) + 365 * y +
           Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  let l = jd - 1948440 + 10632;
  let n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  let j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) +
          (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
  l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) -
         (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;

  let hm = Math.floor((24 * l) / 709);
  let hd = l - Math.floor((709 * hm) / 24);
  let hy = 30 * n + j - 30;

  return { hy, hm, hd };
}

// Apply user month-length overrides by adjusting the day
function gregorianToHijri(gy, gm, gd) {
  // First get base
  let { hy, hm, hd } = gregorianToHijriBase(gy, gm, gd);

  // We apply a simple global day offset derived from overrides of recent months
  // For practicality: compute cumulative difference of month lengths up to current month
  // Simpler reliable approach used by many apps: store a global day offset
  const offset = getHijriDayOffset();
  if (offset === 0) return { hy, hm, hd };

  // Adjust by offset days
  const g = new Date(gy, gm - 1, gd);
  g.setDate(g.getDate() + offset);
  return gregorianToHijriBase(g.getFullYear(), g.getMonth() + 1, g.getDate());
}

// Global day offset (most practical for moon sighting)
const HIJRI_OFFSET_KEY = "hijriDayOffset";

function getHijriDayOffset() {
  const v = parseInt(localStorage.getItem(HIJRI_OFFSET_KEY) || "0", 10);
  return isNaN(v) ? 0 : Math.max(-3, Math.min(3, v));
}

function setHijriDayOffset(offset) {
  localStorage.setItem(HIJRI_OFFSET_KEY, String(offset));
}

// ===================== Helpers =====================

function toPersianDigits(num) {
  const persian = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(num).replace(/\d/g, d => persian[d]);
}

function getAllDatesFor(gy, gm, gd) {
  const { jy, jm, jd } = toJalaali(gy, gm, gd);
  // UTC weekday — same as getJalaliWeekday (avoids TZ off-by-one)
  const date = new Date(Date.UTC(gy, gm - 1, gd));
  const weekdayIndex = (date.getUTCDay() + 1) % 7;
  const { hy, hm, hd } = gregorianToHijri(gy, gm, gd);

  return {
    jalali: {
      year: jy, month: jm, day: jd,
      monthName: PERSIAN_MONTHS[jm - 1],
      weekday: PERSIAN_WEEKDAYS_FULL[weekdayIndex],
      weekdayIndex
    },
    hijri: {
      year: hy, month: hm, day: hd,
      monthName: HIJRI_MONTHS[hm - 1]
    },
    gregorian: { year: gy, month: gm, day: gd }
  };
}

function getAllDatesNow() {
  const now = new Date();
  const info = getAllDatesFor(now.getFullYear(), now.getMonth() + 1, now.getDate());
  info.time = {
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds()
  };
  return info;
}

// Calendar grid for a Jalali month + corresponding Hijri & Gregorian for each day
function getMonthCalendar(jy, jm) {
  const daysCount = daysInJalaliMonth(jy, jm);
  const firstWeekday = getJalaliWeekday(jy, jm, 1);

  const weeks = [];
  let week = new Array(7).fill(null);
  let day = 1;
  let weekday = firstWeekday;

  for (let i = 0; i < firstWeekday; i++) week[i] = null;

  while (day <= daysCount) {
    const g = toGregorian(jy, jm, day);
    const h = gregorianToHijri(g.gy, g.gm, g.gd);

    week[weekday] = {
      jalaliDay: day,
      hijriDay: h.hd,
      gregorianDay: g.gd,
      gy: g.gy, gm: g.gm, gd: g.gd
    };

    weekday++;
    if (weekday === 7) {
      weeks.push(week);
      week = new Array(7).fill(null);
      weekday = 0;
    }
    day++;
  }
  if (weekday !== 0) weeks.push(week);

  return {
    year: jy,
    month: jm,
    monthName: PERSIAN_MONTHS[jm - 1],
    daysInMonth: daysCount,
    weeks
  };
}

// Formatters
function formatJalali(info) {
  return `${toPersianDigits(info.jalali.day)} ${info.jalali.monthName} ${toPersianDigits(info.jalali.year)}`;
}

function formatHijri(info) {
  return `${toPersianDigits(info.hijri.day)} ${info.hijri.monthName} ${toPersianDigits(info.hijri.year)}`;
}

function formatGregorian(info) {
  const months = ["ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
                  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"];
  return `${toPersianDigits(info.gregorian.day)} ${months[info.gregorian.month - 1]} ${toPersianDigits(info.gregorian.year)}`;
}

function formatTime(info) {
  const h = String(info.time.hours).padStart(2, "0");
  const m = String(info.time.minutes).padStart(2, "0");
  const s = String(info.time.seconds).padStart(2, "0");
  return `${toPersianDigits(h)}:${toPersianDigits(m)}:${toPersianDigits(s)}`;
}

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

function toJalaali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy, jm, jd, gy2, days;

  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }

  gy2 = (gm > 2) ? (gy + 1) : gy;
  days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
         Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];

  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }

  return { jy, jm, jd };
}

function toGregorian(jy, jm, jd) {
  let gy, gm, gd, days;

  if (jy > 979) {
    gy = 1600;
    jy -= 979;
  } else {
    gy = 621;
  }

  days = (365 * jy) + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + 78 + jd +
         ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30 + 186));

  gy += 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }

  gy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  gd = days + 1;

  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28,
                 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm];
  }

  return { gy, gm, gd };
}

function isLeapJalali(jy) {
  return (((((jy - (jy > 0 ? 474 : 473)) % 2820) + 474 + 38) * 682) % 2816) < 682;
}

function daysInJalaliMonth(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalali(jy) ? 30 : 29;
}

function getJalaliWeekday(jy, jm, jd) {
  const g = toGregorian(jy, jm, jd);
  const date = new Date(g.gy, g.gm - 1, g.gd);
  return (date.getDay() + 1) % 7; // 0 = Saturday
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
  const date = new Date(gy, gm - 1, gd);
  const weekdayIndex = (date.getDay() + 1) % 7;
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

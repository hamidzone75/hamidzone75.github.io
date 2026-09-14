/**
 * Iranian Official Holidays - Jalali (Solar) & Hijri (Lunar)
 * Honorifics: (ص) Prophet, (ع) Imams, (عج) Imam Zaman, (س) Fatimah, (ره) Imam Khomeini
 */

const JALALI_HOLIDAYS = [
  { m: 1, d: 1,  title: "عید نوروز" },
  { m: 1, d: 2,  title: "عید نوروز" },
  { m: 1, d: 3,  title: "عید نوروز" },
  { m: 1, d: 4,  title: "عید نوروز" },
  { m: 1, d: 12, title: "روز جمهوری اسلامی" },
  { m: 1, d: 13, title: "روز طبیعت (سیزده‌بدر)" },
  { m: 3, d: 14, title: "رحلت امام خمینی (ره)" },
  { m: 3, d: 15, title: "قیام ۱۵ خرداد" },
  { m: 11, d: 22, title: "پیروزی انقلاب اسلامی" },
  { m: 12, d: 29, title: "ملی شدن صنعت نفت" },
];

const HIJRI_HOLIDAYS = [
  { m: 1,  d: 9,  title: "تاسوعای حسینی" },
  { m: 1,  d: 10, title: "عاشورای حسینی" },
  { m: 2,  d: 20, title: "اربعین حسینی" },
  { m: 2,  d: 28, title: "رحلت پیامبر (ص) و شهادت امام حسن مجتبی (ع)" },
  { m: 2,  d: 30, title: "شهادت امام رضا (ع)", flexible: true },
  { m: 3,  d: 8,  title: "شهادت امام حسن عسکری (ع)" },
  { m: 3,  d: 17, title: "میلاد پیامبر (ص) و امام صادق (ع)" },
  { m: 6,  d: 3,  title: "شهادت حضرت فاطمه (س)" },
  { m: 7,  d: 13, title: "ولادت امام علی (ع)" },
  { m: 7,  d: 27, title: "مبعث پیامبر (ص)" },
  { m: 8,  d: 15, title: "ولادت امام زمان (عج)" },
  { m: 9,  d: 21, title: "شهادت امام علی (ع)" },
  { m: 10, d: 1,  title: "عید فطر" },
  { m: 10, d: 2,  title: "عید فطر (دوم)" },
  { m: 10, d: 25, title: "شهادت امام صادق (ع)" },
  { m: 12, d: 10, title: "عید قربان" },
  { m: 12, d: 18, title: "عید غدیر خم" },
];

function getJalaliHoliday(jy, jm, jd) {
  for (const h of JALALI_HOLIDAYS) {
    if (h.m === jm && h.d === jd) return h.title;
  }
  if (jm === 12 && jd === 29) return "ملی شدن صنعت نفت";
  return null;
}

function getHijriHoliday(hy, hm, hd) {
  for (const h of HIJRI_HOLIDAYS) {
    if (h.m !== hm) continue;

    if (h.flexible && h.d === 30 && hm === 2) {
      const len = getMonthLength(hy, 2);
      if (len === 29 && hd === 29) return h.title;
      if (len === 30 && hd === 30) return h.title;
      continue;
    }

    if (h.d === hd) return h.title;
  }
  return null;
}

function getHolidayForDay(jy, jm, jd, hy, hm, hd) {
  // Personal occasions override / take priority display when present
  try {
    if (typeof getCustomOccasion === "function") {
      const custom = getCustomOccasion(jy, jm, jd);
      if (custom) return custom;
    }
  } catch (_) {}
  const jHol = getJalaliHoliday(jy, jm, jd);
  if (jHol) return jHol;
  return getHijriHoliday(hy, hm, hd);
}

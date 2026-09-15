/**
 * Reminders & Alarms system
 * Supports one-time and recurring patterns
 */

const REMINDERS_KEY = "calendarReminders";
const FIRED_KEY = "calendarRemindersFired"; // track already notified instances

// Recurrence types
const RECUR_TYPES = {
  once: "یک‌بار (روز خاص)",
  daily: "هر روز",
  weekly: "هر هفته",
  monthly: "هر ماه",
  yearly: "هر سال",
  everyNDays: "هر n روز",
  everyNWeeks: "هر n هفته",
  everyNMonths: "هر n ماه",
  everyNYears: "هر n سال",
  weekdays: "روزهای هفته (شنبه تا پنج‌شنبه)",
  weekends: "آخر هفته (جمعه)",
  evenDays: "روزهای زوج هفته (شنبه، دوشنبه، چهارشنبه)",
  oddDays: "روزهای فرد هفته (یکشنبه، سه‌شنبه، پنج‌شنبه)",
  nthWeekday: "اولین/دومین/.../آخرین روز هفته در ماه"
};

const WEEKDAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
const NTH_LABELS = ["اولین", "دومین", "سومین", "چهارمین", "آخرین"];

function loadReminders() {
  try {
    return JSON.parse(localStorage.getItem(REMINDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveReminders(list) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(list));
}

function loadFired() {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveFired(obj) {
  localStorage.setItem(FIRED_KEY, JSON.stringify(obj));
}

function generateId() {
  return "r_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Create a reminder object
 */
function createReminder({
  title,
  gy, gm, gd,          // start / base date (Gregorian)
  time,                 // "HH:MM"
  recurType,
  nValue = 1,           // for everyN*
  weekday = 0,          // 0=Sat ... 6=Fri (for weekly / nthWeekday)
  nth = 1,              // 1..4 or -1 for last
  enabled = true,
  jy, jm, jd            // optional Jalali base (preferred for yearly/monthly)
}) {
  // Always persist Jalali month/day so yearly/monthly stay on the same Persian date
  if (jy == null || jm == null || jd == null) {
    try {
      const j = toJalaali(gy, gm, gd);
      jy = j.jy;
      jm = j.jm;
      jd = j.jd;
    } catch (_) {
      jy = jy || null;
      jm = jm || null;
      jd = jd || null;
    }
  }
  return {
    id: generateId(),
    title: title || "یادآوری",
    gy, gm, gd,
    jy, jm, jd,
    time: time || "09:00",
    recurType: recurType || "once",
    nValue: nValue || 1,
    weekday,
    nth,
    enabled,
    createdAt: Date.now()
  };
}

function addReminder(rem) {
  const list = loadReminders();
  list.push(rem);
  saveReminders(list);
  return rem;
}

function updateReminder(id, patch) {
  const list = loadReminders();
  const i = list.findIndex(r => r.id === id);
  if (i >= 0) {
    list[i] = { ...list[i], ...patch };
    saveReminders(list);
    return list[i];
  }
  return null;
}

function deleteReminder(id) {
  const list = loadReminders().filter(r => r.id !== id);
  saveReminders(list);
}

function getRemindersForDate(gy, gm, gd) {
  return loadReminders().filter(r => r.enabled && matchesDate(r, gy, gm, gd));
}

function hasReminder(gy, gm, gd) {
  return getRemindersForDate(gy, gm, gd).length > 0;
}

/**
 * Check if a reminder matches a specific Gregorian date
 */
function matchesDate(rem, gy, gm, gd) {
  const target = new Date(gy, gm - 1, gd);
  const base = new Date(rem.gy, rem.gm - 1, rem.gd);
  // Normalize to midnight
  target.setHours(0, 0, 0, 0);
  base.setHours(0, 0, 0, 0);

  if (target < base && rem.recurType !== "once") {
    // allow some recurrence types to start from base only
  }

  const diffDays = Math.round((target - base) / 86400000);
  const jsDay = target.getDay(); // 0=Sun ... 6=Sat
  const persianWeekday = (jsDay + 1) % 7; // 0=Sat ... 6=Fri

  // Jalali day for even/odd
  let jDay = gd;
  try {
    const j = toJalaali(gy, gm, gd);
    jDay = j.jd;
  } catch (_) {}

  switch (rem.recurType) {
    case "once":
      return gy === rem.gy && gm === rem.gm && gd === rem.gd;

    case "daily":
      return target >= base;

    case "weekly":
      return target >= base && persianWeekday === rem.weekday;

    case "monthly": {
      // Same Jalali day-of-month each month
      const j = toJalaali(gy, gm, gd);
      const remJd = rem.jd != null ? rem.jd : (rem.gy != null ? toJalaali(rem.gy, rem.gm, rem.gd).jd : gd);
      return target >= base && j.jd === remJd;
    }

    case "yearly": {
      // Same Jalali month+day every year (e.g. birthday 22 Esfand stays 22 Esfand)
      const j = toJalaali(gy, gm, gd);
      let rjm = rem.jm;
      let rjd = rem.jd;
      if (rjm == null || rjd == null) {
        try {
          const rj = toJalaali(rem.gy, rem.gm, rem.gd);
          rjm = rj.jm;
          rjd = rj.jd;
        } catch (_) {
          return target >= base && gm === rem.gm && gd === rem.gd;
        }
      }
      // Non-leap years: Esfand 30 → Esfand 29
      if (rjm === 12 && rjd >= 30 && !isLeapJalali(j.jy)) {
        return target >= base && j.jm === 12 && j.jd === daysInJalaliMonth(j.jy, 12);
      }
      return target >= base && j.jm === rjm && j.jd === rjd;
    }

    case "everyNDays":
      if (target < base) return false;
      return diffDays % (rem.nValue || 1) === 0;

    case "everyNWeeks":
      if (target < base) return false;
      return persianWeekday === rem.weekday && Math.floor(diffDays / 7) % (rem.nValue || 1) === 0;

    case "everyNMonths": {
      if (target < base) return false;
      const monthDiff = (gy - rem.gy) * 12 + (gm - rem.gm);
      return monthDiff >= 0 && monthDiff % (rem.nValue || 1) === 0 && gd === rem.gd;
    }

    case "everyNYears": {
      if (target < base) return false;
      const j = toJalaali(gy, gm, gd);
      let rjm = rem.jm;
      let rjd = rem.jd;
      let rjy = rem.jy;
      if (rjm == null || rjd == null || rjy == null) {
        try {
          const rj = toJalaali(rem.gy, rem.gm, rem.gd);
          rjm = rj.jm; rjd = rj.jd; rjy = rj.jy;
        } catch (_) {
          return (gy - rem.gy) % (rem.nValue || 1) === 0 && gm === rem.gm && gd === rem.gd;
        }
      }
      if ((j.jy - rjy) % (rem.nValue || 1) !== 0) return false;
      if (rjm === 12 && rjd >= 30 && !isLeapJalali(j.jy)) {
        return j.jm === 12 && j.jd === daysInJalaliMonth(j.jy, 12);
      }
      return j.jm === rjm && j.jd === rjd;
    }

    case "weekdays":
      return target >= base && persianWeekday >= 0 && persianWeekday <= 5; // Sat-Thu

    case "weekends":
      return target >= base && persianWeekday === 6; // Friday

    case "evenDays":
      // زوج هفته: شنبه(0)، دوشنبه(2)، چهارشنبه(4)
      return target >= base && (persianWeekday === 0 || persianWeekday === 2 || persianWeekday === 4);

    case "oddDays":
      // فرد هفته: یکشنبه(1)، سه‌شنبه(3)، پنج‌شنبه(5)
      return target >= base && (persianWeekday === 1 || persianWeekday === 3 || persianWeekday === 5);

    case "nthWeekday": {
      if (persianWeekday !== rem.weekday) return false;
      // Find all matching weekdays in this month
      const daysInMonth = new Date(gy, gm, 0).getDate();
      const matchingDays = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(gy, gm - 1, d);
        if ((dt.getDay() + 1) % 7 === rem.weekday) matchingDays.push(d);
      }
      if (rem.nth === -1) {
        return gd === matchingDays[matchingDays.length - 1];
      }
      const idx = (rem.nth || 1) - 1;
      return matchingDays[idx] === gd;
    }

    default:
      return false;
  }
}

/**
 * Get human-readable description of recurrence
 */
function describeRecurrence(rem) {
  switch (rem.recurType) {
    case "once": return "یک‌بار";
    case "daily": return "هر روز";
    case "weekly": return "هر " + WEEKDAY_NAMES[rem.weekday];
    case "monthly": return "هر ماه (روز " + toPersianDigits(rem.gd) + ")";
    case "yearly": {
      const rjd = rem.jd != null ? rem.jd : null;
      const rjm = rem.jm != null ? rem.jm : null;
      if (rjd && rjm && typeof PERSIAN_MONTHS !== "undefined") {
        return "هر سال (" + toPersianDigits(rjd) + " " + PERSIAN_MONTHS[rjm - 1] + ")";
      }
      return "هر سال";
    }
    case "everyNDays": return "هر " + toPersianDigits(rem.nValue) + " روز";
    case "everyNWeeks": return "هر " + toPersianDigits(rem.nValue) + " هفته (" + WEEKDAY_NAMES[rem.weekday] + ")";
    case "everyNMonths": return "هر " + toPersianDigits(rem.nValue) + " ماه";
    case "everyNYears": return "هر " + toPersianDigits(rem.nValue) + " سال";
    case "weekdays": return "روزهای هفته";
    case "weekends": return "جمعه‌ها";
    case "evenDays": return "روزهای زوج هفته";
    case "oddDays": return "روزهای فرد هفته";
    case "nthWeekday": {
      const nthLabel = rem.nth === -1 ? "آخرین" : NTH_LABELS[(rem.nth || 1) - 1] || "اولین";
      return nthLabel + " " + WEEKDAY_NAMES[rem.weekday] + " هر ماه";
    }
    default: return rem.recurType;
  }
}

/**
 * Check for due reminders and fire notifications
 */
function checkDueReminders() {
  const now = new Date();
  const gy = now.getFullYear();
  const gm = now.getMonth() + 1;
  const gd = now.getDate();
  const currentTime = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");

  const due = getRemindersForDate(gy, gm, gd);
  const fired = loadFired();
  const todayKey = `${gy}-${gm}-${gd}`;
  let anyFired = false;

  due.forEach(rem => {
    const fireKey = `${rem.id}_${todayKey}`;
    if (fired[fireKey]) return;
    if (rem.time > currentTime) return; // not yet

    const body = describeRecurrence(rem) + " — " + rem.time;
    showReminderNotification(rem.title, body, fireKey);
    fired[fireKey] = Date.now();
    anyFired = true;
  });

  if (anyFired) saveFired(fired);

  // Always refresh today's list UI if available
  if (typeof renderTodayReminders === "function") {
    try { renderTodayReminders(); } catch (_) {}
  }
}

function showReminderNotification(title, body, tag) {
  // Prefer Service Worker notification (works better for installed PWA)
  if ("serviceWorker" in navigator && Notification.permission === "granted") {
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.active) {
        reg.active.postMessage({
          type: "SHOW_NOTIFICATION",
          payload: {
            title: title || "یادآوری",
            body: body || "",
            tag: tag || "reminder",
            icon: "./icons/icon-192.png"
          }
        });
      } else if (reg.showNotification) {
        reg.showNotification(title || "یادآوری", {
          body: body || "",
          icon: "./icons/icon-192.png",
          tag: tag || "reminder",
          dir: "rtl",
          lang: "fa"
        });
      }
    }).catch(() => {
      fallbackPageNotification(title, body, tag);
    });
    return;
  }
  fallbackPageNotification(title, body, tag);
}

function fallbackPageNotification(title, body, tag) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title || "یادآوری", {
      body: body || "",
      icon: "./icons/icon-192.png",
      tag: tag || "reminder",
      dir: "rtl",
      lang: "fa"
    });
  } catch (e) {
    console.warn("Notification failed", e);
  }
}

function requestNotificationPermission() {
  if (!("Notification" in window)) return Promise.resolve(false);
  if (Notification.permission === "granted") return Promise.resolve(true);
  if (Notification.permission === "denied") return Promise.resolve(false);
  return Notification.requestPermission().then(p => p === "granted");
}

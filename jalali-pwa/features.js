/**
 * Extra features: search, week view, custom occasions,
 * accessibility, stats, auto-backup reminder, dashboard
 */

const CUSTOM_OCC_KEY = "calendarCustomOccasions";
const LAST_BACKUP_KEY = "calendarLastBackupAt";
const A11Y_KEY = "calendarA11y";
const AUTO_BACKUP_DAYS = 7;

// ---------- Custom occasions ----------
function loadCustomOccasions() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_OCC_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCustomOccasions(obj) {
  localStorage.setItem(CUSTOM_OCC_KEY, JSON.stringify(obj));
}

function occasionKey(jy, jm, jd) {
  return jy + "-" + jm + "-" + jd;
}

function getCustomOccasion(jy, jm, jd) {
  return loadCustomOccasions()[occasionKey(jy, jm, jd)] || null;
}

function setCustomOccasion(jy, jm, jd, title) {
  const all = loadCustomOccasions();
  const k = occasionKey(jy, jm, jd);
  if (title && title.trim()) all[k] = title.trim();
  else delete all[k];
  saveCustomOccasions(all);
}

// Patch holiday lookup if holidays.js already defined getHolidayForDay
function getHolidayOrCustom(jy, jm, jd, hy, hm, hd) {
  const custom = getCustomOccasion(jy, jm, jd);
  if (custom) return custom;
  if (typeof getHolidayForDay === "function") {
    return getHolidayForDay(jy, jm, jd, hy, hm, hd);
  }
  return null;
}

// ---------- Accessibility ----------
function loadA11y() {
  try {
    return JSON.parse(localStorage.getItem(A11Y_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveA11y(cfg) {
  localStorage.setItem(A11Y_KEY, JSON.stringify(cfg));
}

function applyA11y() {
  const cfg = loadA11y();
  const root = document.documentElement;
  root.setAttribute("data-a11y-font", cfg.largeFont ? "large" : "normal");
  root.setAttribute("data-a11y-contrast", cfg.highContrast ? "high" : "normal");
  root.setAttribute("data-a11y-motion", cfg.reducedMotion ? "reduce" : "normal");
  const lf = document.getElementById("a11y-large-font");
  const hc = document.getElementById("a11y-high-contrast");
  const rm = document.getElementById("a11y-reduced-motion");
  if (lf) lf.checked = !!cfg.largeFont;
  if (hc) hc.checked = !!cfg.highContrast;
  if (rm) rm.checked = !!cfg.reducedMotion;
}

function setA11yFlag(key, value) {
  const cfg = loadA11y();
  cfg[key] = !!value;
  saveA11y(cfg);
  applyA11y();
}

// ---------- Stats ----------
function computeStats() {
  const notes = typeof loadNotes === "function" ? loadNotes() : {};
  const rems = typeof loadReminders === "function" ? loadReminders() : [];
  const occ = loadCustomOccasions();
  const noteCount = Object.keys(notes).filter((k) => notes[k] && String(notes[k]).trim()).length;
  const remActive = rems.filter((r) => r.enabled !== false).length;
  const remTotal = rems.length;
  const occCount = Object.keys(occ).length;

  let monthHolidays = 0;
  if (typeof viewYear !== "undefined" && typeof getMonthCalendar === "function") {
    const cal = getMonthCalendar(viewYear, viewMonth);
    cal.weeks.forEach((week) => {
      week.forEach((cell) => {
        if (!cell) return;
        const hInfo = gregorianToHijri(cell.gy, cell.gm, cell.gd);
        const h = getHolidayOrCustom(
          viewYear,
          viewMonth,
          cell.jalaliDay,
          hInfo.hy,
          hInfo.hm,
          hInfo.hd
        );
        if (h) monthHolidays++;
      });
    });
  }

  return { noteCount, remActive, remTotal, occCount, monthHolidays };
}

function renderStats() {
  const el = document.getElementById("stats-body");
  if (!el) return;
  const s = computeStats();
  el.innerHTML =
    '<div class="stats-grid">' +
    statCard("یادداشت‌ها", s.noteCount) +
    statCard("یادآوری فعال", s.remActive) +
    statCard("کل یادآوری‌ها", s.remTotal) +
    statCard("مناسبت شخصی", s.occCount) +
    statCard("تعطیل/مناسبت این ماه", s.monthHolidays) +
    "</div>";
}

function statCard(label, value) {
  return (
    '<div class="stat-card"><div class="stat-value">' +
    (typeof toPersianDigits === "function" ? toPersianDigits(value) : value) +
    '</div><div class="stat-label">' +
    label +
    "</div></div>"
  );
}

// ---------- Search ----------
function runSearch(query) {
  const q = (query || "").trim().toLowerCase();
  const notesResults = [];
  const remResults = [];
  if (!q) return { notesResults, remResults };

  const notes = typeof loadNotes === "function" ? loadNotes() : {};
  Object.keys(notes).forEach((key) => {
    const text = notes[key] || "";
    if (text.toLowerCase().includes(q)) {
      const parts = key.split("-");
      notesResults.push({
        key,
        gy: +parts[0],
        gm: +parts[1],
        gd: +parts[2],
        text
      });
    }
  });

  const rems = typeof loadReminders === "function" ? loadReminders() : [];
  rems.forEach((r) => {
    const title = (r.title || "").toLowerCase();
    const desc =
      typeof describeRecurrence === "function" ? describeRecurrence(r).toLowerCase() : "";
    if (title.includes(q) || desc.includes(q)) {
      remResults.push(r);
    }
  });

  return { notesResults, remResults };
}

function renderSearchResults(query) {
  const box = document.getElementById("search-results");
  if (!box) return;
  const { notesResults, remResults } = runSearch(query);
  if (!(query || "").trim()) {
    box.innerHTML = '<p class="day-summary-empty">عبارتی برای جستجو بنویسید</p>';
    return;
  }
  if (!notesResults.length && !remResults.length) {
    box.innerHTML = '<p class="day-summary-empty">موردی یافت نشد</p>';
    return;
  }
  let html = "";
  if (notesResults.length) {
    html += "<h3 class='feature-sub'>📝 یادداشت‌ها (" + toPersianDigits(notesResults.length) + ")</h3>";
    notesResults.forEach((n) => {
      let dateLabel = n.key;
      try {
        const info = getAllDatesFor(n.gy, n.gm, n.gd);
        dateLabel = formatJalali(info);
      } catch (_) {}
      html +=
        '<button type="button" class="search-item" data-gy="' +
        n.gy +
        '" data-gm="' +
        n.gm +
        '" data-gd="' +
        n.gd +
        '"><strong>' +
        escapeHtml(dateLabel) +
        "</strong><span>" +
        escapeHtml(n.text.slice(0, 120)) +
        (n.text.length > 120 ? "…" : "") +
        "</span></button>";
    });
  }
  if (remResults.length) {
    html += "<h3 class='feature-sub'>🔔 یادآوری‌ها (" + toPersianDigits(remResults.length) + ")</h3>";
    remResults.forEach((r) => {
      html +=
        '<div class="search-item static"><strong>' +
        escapeHtml(r.title || "یادآوری") +
        "</strong><span>" +
        toPersianDigits(r.time || "--:--") +
        " · " +
        escapeHtml(typeof describeRecurrence === "function" ? describeRecurrence(r) : "") +
        "</span></div>";
    });
  }
  box.innerHTML = html;
  box.querySelectorAll("button.search-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gy = +btn.dataset.gy;
      const gm = +btn.dataset.gm;
      const gd = +btn.dataset.gd;
      selectedDate = { gy, gm, gd };
      try {
        const info = getAllDatesFor(gy, gm, gd);
        viewYear = info.jalali.year;
        viewMonth = info.jalali.month;
        const h = getHolidayOrCustom(
          info.jalali.year,
          info.jalali.month,
          info.jalali.day,
          info.hijri.year,
          info.hijri.month,
          info.hijri.day
        );
        updateHeader(h || null);
      } catch (_) {
        updateHeader(null);
      }
      renderCalendar();
      closeFeatureModal();
      showDaySummary(gy, gm, gd);
    });
  });
}

// ---------- Week view (7 days) ----------
function renderWeekView() {
  const box = document.getElementById("week-view-body");
  if (!box) return;
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  let html = "";
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const gy = d.getFullYear();
    const gm = d.getMonth() + 1;
    const gd = d.getDate();
    let info;
    try {
      info = getAllDatesFor(gy, gm, gd);
    } catch (_) {
      continue;
    }
    const holiday = getHolidayOrCustom(
      info.jalali.year,
      info.jalali.month,
      info.jalali.day,
      info.hijri.year,
      info.hijri.month,
      info.hijri.day
    );
    const note = typeof getNote === "function" ? getNote(gy, gm, gd) : "";
    const rems =
      typeof getRemindersForDate === "function" ? getRemindersForDate(gy, gm, gd) : [];
    const shift =
      typeof getShiftForJalali === "function"
        ? getShiftForJalali(info.jalali.year, info.jalali.month, info.jalali.day)
        : null;

    html += '<div class="week-day-card' + (i === 0 ? " today" : "") + '">';
    html +=
      '<div class="week-day-head"><strong>' +
      escapeHtml(info.jalali.weekday) +
      "</strong> · " +
      escapeHtml(formatJalali(info)) +
      "</div>";
    if (shift) {
      html +=
        '<div class="week-meta">شیفت روز: <b>' +
        shift.dayShift +
        "</b> (" +
        shift.dayPhase +
        ") · شب: <b>" +
        shift.nightShift +
        "</b> (" +
        shift.nightPhase +
        ")</div>";
    }
    if (holiday) {
      html += '<div class="week-holiday">🎉 ' + escapeHtml(holiday) + "</div>";
    }
    if (note && note.trim()) {
      html += '<div class="week-note">📝 ' + escapeHtml(note.slice(0, 100)) + (note.length > 100 ? "…" : "") + "</div>";
    }
    if (rems.length) {
      html +=
        '<div class="week-rems">🔔 ' +
        rems
          .map((r) => toPersianDigits(r.time || "") + " " + escapeHtml(r.title || ""))
          .join(" · ") +
        "</div>";
    }
    if (!holiday && !(note && note.trim()) && !rems.length) {
      html += '<div class="week-empty">مورد خاصی ثبت نشده</div>';
    }
    html +=
      '<button type="button" class="week-open-btn" data-gy="' +
      gy +
      '" data-gm="' +
      gm +
      '" data-gd="' +
      gd +
      '">باز کردن روز</button>';
    html += "</div>";
  }
  box.innerHTML = html;
  box.querySelectorAll(".week-open-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gy = +btn.dataset.gy;
      const gm = +btn.dataset.gm;
      const gd = +btn.dataset.gd;
      selectedDate = { gy, gm, gd };
      const info = getAllDatesFor(gy, gm, gd);
      viewYear = info.jalali.year;
      viewMonth = info.jalali.month;
      const h = getHolidayOrCustom(
        info.jalali.year,
        info.jalali.month,
        info.jalali.day,
        info.hijri.year,
        info.hijri.month,
        info.hijri.day
      );
      updateHeader(h || null);
      renderCalendar();
      closeFeatureModal();
      showDaySummary(gy, gm, gd);
    });
  });
}

// ---------- Dashboard strip ----------
function renderDashboard() {
  const el = document.getElementById("dashboard-strip");
  if (!el) return;
  const now = getAllDatesNow();
  const rems = getRemindersForDate(
    now.gregorian.year,
    now.gregorian.month,
    now.gregorian.day
  )
    .filter((r) => r.enabled !== false)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const currentTime =
    String(new Date().getHours()).padStart(2, "0") +
    ":" +
    String(new Date().getMinutes()).padStart(2, "0");
  let nearest = null;
  for (let i = 0; i < rems.length; i++) {
    if ((rems[i].time || "99:99") >= currentTime) {
      nearest = rems[i];
      break;
    }
  }
  if (!nearest && rems.length) nearest = rems[0];

  const s = computeStats();
  el.innerHTML =
    '<div class="dash-item dash-wide"><span class="dash-k">نزدیک‌ترین یادآوری</span><span class="dash-v">' +
    (nearest
      ? toPersianDigits(nearest.time) + " — " + escapeHtml(nearest.title || "")
      : "—") +
    '</span></div><div class="dash-item dash-wide"><span class="dash-k">آمار</span><span class="dash-v">' +
    toPersianDigits(s.noteCount) +
    " یادداشت · " +
    toPersianDigits(s.remActive) +
    " یادآوری</span></div>";
}

// ---------- Auto backup reminder ----------
function markBackupDone() {
  localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
}

function checkAutoBackupReminder() {
  const raw = localStorage.getItem(LAST_BACKUP_KEY);
  if (!raw) {
    showToast("پیشنهاد: یک پشتیبان از داده‌ها بگیرید", "notify");
    return;
  }
  const ts = parseInt(raw, 10);
  if (Number.isNaN(ts)) return;
  const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  if (days >= AUTO_BACKUP_DAYS) {
    showToast(
      "بیش از " +
        (typeof toPersianDigits === "function" ? toPersianDigits(AUTO_BACKUP_DAYS) : AUTO_BACKUP_DAYS) +
        " روز از آخرین پشتیبان گذشته است",
      "notify"
    );
  }
}

// ---------- Custom occasions UI ----------
function renderOccasionsList() {
  const box = document.getElementById("occasions-list");
  if (!box) return;
  const all = loadCustomOccasions();
  const keys = Object.keys(all).sort();
  if (!keys.length) {
    box.innerHTML = '<p class="day-summary-empty">مناسبت شخصی ثبت نشده است</p>';
    return;
  }
  box.innerHTML = keys
    .map((k) => {
      const parts = k.split("-");
      return (
        '<div class="occasion-item" data-key="' +
        k +
        '"><div><strong>' +
        toPersianDigits(parts[2]) +
        "/" +
        toPersianDigits(parts[1]) +
        "/" +
        toPersianDigits(parts[0]) +
        "</strong><span>" +
        escapeHtml(all[k]) +
        '</span></div><button type="button" class="manage-del-btn occ-del" data-key="' +
        k +
        '">حذف</button></div>'
      );
    })
    .join("");
  box.querySelectorAll(".occ-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await showConfirm("این مناسبت شخصی حذف شود؟", "حذف مناسبت");
      if (!ok) return;
      const all2 = loadCustomOccasions();
      delete all2[btn.dataset.key];
      saveCustomOccasions(all2);
      renderOccasionsList();
      renderCalendar();
      renderDashboard();
      showToast("مناسبت حذف شد");
    });
  });
}

function saveOccasionFromForm() {
  const title = (document.getElementById("occ-title").value || "").trim();
  const jy = parseInt(normalizeYearInput(document.getElementById("occ-jy").value), 10);
  const jm = parseInt(normalizeYearInput(document.getElementById("occ-jm").value), 10);
  const jd = parseInt(normalizeYearInput(document.getElementById("occ-jd").value), 10);
  if (!title) {
    showToast("عنوان مناسبت را وارد کنید", "error");
    return;
  }
  if (!jy || jy < 1300 || jy > 1600 || !jm || jm < 1 || jm > 12 || !jd || jd < 1 || jd > 31) {
    showToast("تاریخ نامعتبر است", "error");
    return;
  }
  setCustomOccasion(jy, jm, jd, title);
  document.getElementById("occ-title").value = "";
  renderOccasionsList();
  renderCalendar();
  renderDashboard();
  showToast("مناسبت ذخیره شد");
}

// ---------- Feature modal tabs ----------
function openFeatureModal(tab) {
  const modal = document.getElementById("feature-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  switchFeatureTab(tab || "search");
  if (typeof Sounds !== "undefined") Sounds.open();
}

function closeFeatureModal() {
  const modal = document.getElementById("feature-modal");
  if (modal) modal.classList.add("hidden");
}

function switchFeatureTab(tab) {
  ["search", "week", "occasions", "a11y", "stats"].forEach((t) => {
    const panel = document.getElementById("panel-" + t);
    const btn = document.getElementById("tab-" + t);
    if (panel) panel.classList.toggle("hidden", t !== tab);
    if (btn) btn.classList.toggle("active", t === tab);
  });
  if (tab === "search") renderSearchResults(document.getElementById("search-input")?.value || "");
  if (tab === "week") renderWeekView();
  if (tab === "occasions") renderOccasionsList();
  if (tab === "a11y") applyA11y();
  if (tab === "stats") renderStats();
}

// ---------- Background sync registration ----------
async function registerBackgroundSync() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("periodicSync" in reg) {
      const status = await navigator.permissions.query({
        name: "periodic-background-sync"
      });
      if (status.state === "granted") {
        await reg.periodicSync.register("reminder-check", {
          minInterval: 15 * 60 * 1000
        });
      }
    }
  } catch (_) {
    /* not supported */
  }
  // Also ask notification permission again if needed
  if (typeof requestNotificationPermission === "function") {
    requestNotificationPermission();
  }
}

function setupFeatures() {
  applyA11y();
  renderDashboard();

  const openSearch = document.getElementById("open-search-btn");
  const openWeek = document.getElementById("open-week-btn");
  const openTools = document.getElementById("open-tools-btn");
  if (openSearch) openSearch.addEventListener("click", () => openFeatureModal("search"));
  if (openWeek) openWeek.addEventListener("click", () => openFeatureModal("week"));
  if (openTools) openTools.addEventListener("click", () => openFeatureModal("stats"));

  document.getElementById("feature-close-x")?.addEventListener("click", closeFeatureModal);
  document.getElementById("feature-close-btn")?.addEventListener("click", closeFeatureModal);
  document.getElementById("feature-backdrop")?.addEventListener("click", closeFeatureModal);

  ["search", "week", "occasions", "a11y", "stats"].forEach((t) => {
    document.getElementById("tab-" + t)?.addEventListener("click", () => switchFeatureTab(t));
  });

  document.getElementById("search-input")?.addEventListener("input", (e) => {
    renderSearchResults(e.target.value);
  });

  document.getElementById("a11y-large-font")?.addEventListener("change", (e) => {
    setA11yFlag("largeFont", e.target.checked);
    showToast(e.target.checked ? "فونت بزرگ فعال شد" : "فونت عادی");
  });
  document.getElementById("a11y-high-contrast")?.addEventListener("change", (e) => {
    setA11yFlag("highContrast", e.target.checked);
    showToast(e.target.checked ? "کنتراست بالا فعال شد" : "کنتراست عادی");
  });
  document.getElementById("a11y-reduced-motion")?.addEventListener("change", (e) => {
    setA11yFlag("reducedMotion", e.target.checked);
    showToast(e.target.checked ? "کاهش حرکت فعال شد" : "انیمیشن عادی");
  });

  document.getElementById("occ-save-btn")?.addEventListener("click", saveOccasionFromForm);

  // Refresh dashboard periodically
  setInterval(renderDashboard, 60000);

  registerBackgroundSync();
  setTimeout(checkAutoBackupReminder, 1200);
}

// Hook backup success
function featuresOnBackupDone() {
  markBackupDone();
}

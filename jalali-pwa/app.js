// ===================== State =====================
let viewYear, viewMonth;
let selectedDate = null;
let lastCellTapTime = 0;
let lastCellTapKey = "";
let tempOffset = 0;
let tempOverrides = {};
let settingsYear = null;
let editingReminderId = null;
let pickerYear = null;
let pickerMonth = null;



// ===================== Shift Schedule (6-day cycle) =====================
// Reference: 1405/06/22 Jalali
// 0: روزکاری دوم B + شبکاری دوم C
const SHIFT_CYCLE = [
  { dayPhase: "دوم", dayShift: "B", nightPhase: "دوم", nightShift: "C" },
  { dayPhase: "اول", dayShift: "A", nightPhase: "اول", nightShift: "B" },
  { dayPhase: "دوم", dayShift: "A", nightPhase: "دوم", nightShift: "B" },
  { dayPhase: "اول", dayShift: "C", nightPhase: "اول", nightShift: "A" },
  { dayPhase: "دوم", dayShift: "C", nightPhase: "دوم", nightShift: "A" },
  { dayPhase: "اول", dayShift: "B", nightPhase: "اول", nightShift: "C" }
];

function getShiftRefUtcMs() {
  const g = toGregorian(1405, 6, 22);
  return Date.UTC(g.gy, g.gm - 1, g.gd);
}

function getShiftForJalali(jy, jm, jd) {
  const g = toGregorian(jy, jm, jd);
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.round((Date.UTC(g.gy, g.gm - 1, g.gd) - getShiftRefUtcMs()) / dayMs);
  const idx = ((diff % 6) + 6) % 6;
  return SHIFT_CYCLE[idx];
}

function updateShiftInfo(jy, jm, jd) {
  const el = document.getElementById("shift-text");
  if (!el) return;
  const s = getShiftForJalali(jy, jm, jd);
  el.innerHTML =
    '<span class="shift-label">روزکاری ' + s.dayPhase + ' شیفت </span>' +
    '<span class="shift-name day">' + s.dayShift + "</span>" +
    '<span class="shift-sep"> · </span>' +
    '<span class="shift-label">شبکاری ' + s.nightPhase + ' شیفت </span>' +
    '<span class="shift-name night">' + s.nightShift + "</span>";
}

// ===================== Theme & Sound =====================
const THEME_KEY = "calendarTheme";

function getTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "light" ? "#0d9488" : "#0f766e";
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.textContent = theme === "light" ? "☀️" : "🌙";
    btn.title = theme === "light" ? "تم روشن" : "تم تیره";
  }
}

function toggleTheme() {
  document.documentElement.classList.add("theme-switching");
  const next = getTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  if (typeof Sounds !== "undefined") Sounds.toggle();
  setTimeout(() => document.documentElement.classList.remove("theme-switching"), 400);
}

function applySoundUI() {
  const btn = document.getElementById("sound-toggle");
  if (!btn || typeof isSoundEnabled !== "function") return;
  const on = isSoundEnabled();
  btn.textContent = on ? "🔊" : "🔇";
  btn.classList.toggle("active", on);
  btn.title = on ? "صدا روشن" : "صدا خاموش";
}

function toggleSound() {
  if (typeof isSoundEnabled !== "function") return;
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  applySoundUI();
  if (next && typeof Sounds !== "undefined") Sounds.toggle();
}

// ===================== Notes =====================
const NOTES_KEY = "calendarNotes";

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}"); } catch { return {}; }
}
function saveNotes(notes) { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }
function noteKey(gy, gm, gd) { return `${gy}-${String(gm).padStart(2,"0")}-${String(gd).padStart(2,"0")}`; }
function getNote(gy, gm, gd) { return loadNotes()[noteKey(gy, gm, gd)] || ""; }
function setNote(gy, gm, gd, text) {
  const notes = loadNotes();
  const key = noteKey(gy, gm, gd);
  if (text && text.trim()) notes[key] = text.trim(); else delete notes[key];
  saveNotes(notes);
}
function hasNote(gy, gm, gd) { return !!getNote(gy, gm, gd); }

// ===================== Init =====================

// ===================== Android / browser Back button =====================
const APP_MODAL_CLOSE_ORDER = [
  "confirm-modal",
  "attachments-modal",
  "extras-modal",
  "feature-modal",
  "month-picker-modal",
  "day-summary-modal",
  "manage-reminders-modal",
  "reminder-modal",
  "note-modal",
  "settings-modal"
];

let _backNavReady = false;
let _exitConfirmOpen = false;

function isAppModalOpen(id) {
  const el = document.getElementById(id);
  return !!(el && !el.classList.contains("hidden"));
}

function getOpenAppModals() {
  return APP_MODAL_CLOSE_ORDER.filter(isAppModalOpen);
}

/** Close the top-most open modal. Returns true if something was closed. */
function closeTopAppModal() {
  const open = getOpenAppModals();
  if (!open.length) return false;
  const id = open[0]; // highest priority first in APP_MODAL_CLOSE_ORDER

  if (id === "confirm-modal") {
    closeConfirm(false);
    return true;
  }
  if (id === "note-modal" && typeof closeNoteDialog === "function") {
    closeNoteDialog();
    return true;
  }
  if (id === "reminder-modal" && typeof closeReminderDialog === "function") {
    closeReminderDialog();
    return true;
  }
  if (id === "manage-reminders-modal" && typeof closeManageReminders === "function") {
    closeManageReminders();
    return true;
  }
  if (id === "settings-modal" && typeof closeSettings === "function") {
    closeSettings();
    return true;
  }
  if (id === "month-picker-modal" && typeof closeMonthPicker === "function") {
    closeMonthPicker();
    return true;
  }
  if (id === "day-summary-modal" && typeof closeDaySummary === "function") {
    closeDaySummary();
    return true;
  }
  if (id === "attachments-modal" && typeof closeAttachmentsDialog === "function") {
    closeAttachmentsDialog();
    return true;
  }
  if (id === "extras-modal" && typeof closeExtrasModal === "function") {
    closeExtrasModal();
    return true;
  }
  if (id === "feature-modal") {
    const el = document.getElementById("feature-modal");
    if (el) el.classList.add("hidden");
    return true;
  }

  const el = document.getElementById(id);
  if (el) {
    el.classList.add("hidden");
    return true;
  }
  return false;
}

function armBackHistory() {
  try {
    history.pushState({ appBack: 1 }, "");
  } catch (_) {}
}

async function handleAppBackButton() {
  // 1) Close open modal / dialog first
  if (closeTopAppModal()) {
    armBackHistory();
    return;
  }

  // 2) No modal — ask before leaving the app
  if (_exitConfirmOpen) {
    armBackHistory();
    return;
  }
  _exitConfirmOpen = true;
  let leave = false;
  try {
    leave = await showConfirm(
      "می‌خواهید از برنامه خارج شوید؟",
      "خروج از برنامه",
      { okText: "خروج", cancelText: "ماندن" }
    );
  } finally {
    _exitConfirmOpen = false;
  }

  if (leave) {
    // Leave the PWA / tab: go back past our sentinel state
    try {
      _backNavReady = false;
      history.go(-1);
      // If still here (standalone install), try another step
      setTimeout(() => {
        try {
          history.go(-1);
        } catch (_) {}
      }, 120);
    } catch (_) {}
  } else {
    armBackHistory();
  }
}

function setupBackNavigation() {
  // Sentinel so the first device BACK stays inside the app
  armBackHistory();
  _backNavReady = true;

  window.addEventListener("popstate", function () {
    if (!_backNavReady) return;
    // Re-enter app handling asynchronously (confirm uses promise)
    handleAppBackButton();
  });
}


function init() {
  applyTheme(getTheme());
  applySoundUI();

  const today = getAllDatesNow();
  viewYear = today.jalali.year;
  viewMonth = today.jalali.month;
  selectedDate = null;

  renderWeekdays();
  updateHeader();
  renderCalendar();
  renderTodayReminders();
  setupEvents();

  setInterval(() => {
    document.getElementById("time").textContent = formatTime(getAllDatesNow());
  }, 1000);

  // Alarm checker — more frequent while app is open
  requestNotificationPermission();
  checkDueReminders();
  setInterval(checkDueReminders, 15000);

  // Extra features (search, week, a11y, stats, dashboard, backup reminder)
  if (typeof setupFeatures === "function") setupFeatures();
  if (typeof setupAttachments === "function") setupAttachments();
  if (typeof setupExtras === "function") setupExtras();

  // Startup day summary (notes + reminders)
  setTimeout(maybeShowStartupDaySummary, 400);

  // Device BACK: close modals, then confirm exit
  setupBackNavigation();
}

function setupEvents() {
  setupConfirmModal();
  setupMonthPicker();
  setupCalendarSwipe();
  // Day summary modal
  document.getElementById("day-summary-close-btn").addEventListener("click", closeDaySummary);
  document.getElementById("day-summary-close-x").addEventListener("click", closeDaySummary);
  document.getElementById("day-summary-backdrop").addEventListener("click", closeDaySummary);
  document.getElementById("day-summary-startup-toggle").addEventListener("change", (e) => {
    setDaySummaryOnStartup(e.target.checked);
    showToast(e.target.checked ? "نمایش خودکار هنگام شروع فعال شد" : "نمایش خودکار هنگام شروع غیرفعال شد");
  });

  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
  document.getElementById("sound-toggle").addEventListener("click", toggleSound);

  document.getElementById("prev-month").addEventListener("click", () => {
    if (typeof Sounds !== "undefined") Sounds.nav();
    changeMonth(1);
  });
  document.getElementById("next-month").addEventListener("click", () => {
    if (typeof Sounds !== "undefined") Sounds.nav();
    changeMonth(-1);
  });
  document.getElementById("go-today").addEventListener("click", () => {
    if (typeof Sounds !== "undefined") Sounds.click();
    goToToday();
  });

  // Hijri settings
  document.getElementById("hijri-settings-btn").addEventListener("click", openSettings);
  document.getElementById("close-modal").addEventListener("click", closeSettings);
  document.getElementById("modal-backdrop").addEventListener("click", closeSettings);
  document.getElementById("offset-minus").addEventListener("click", () => changeTempOffset(-1));
  document.getElementById("offset-plus").addEventListener("click", () => changeTempOffset(1));
  document.getElementById("save-settings").addEventListener("click", saveSettings);
  document.getElementById("reset-settings").addEventListener("click", resetSettings);
  document.getElementById("hijri-year-select").addEventListener("change", onSettingsYearChange);

  // Notes
  document.getElementById("note-btn").addEventListener("click", openNoteDialog);
  document.getElementById("close-note-modal").addEventListener("click", closeNoteDialog);
  document.getElementById("note-backdrop").addEventListener("click", closeNoteDialog);
  document.getElementById("close-note-btn").addEventListener("click", closeNoteDialog);
  document.getElementById("save-note-btn").addEventListener("click", saveNoteFromDialog);
  document.getElementById("delete-note-btn").addEventListener("click", deleteNoteFromDialog);

  // Reminders
  document.getElementById("reminder-btn").addEventListener("click", openReminderDialog);
  document.getElementById("close-reminder-modal").addEventListener("click", closeReminderDialog);
  document.getElementById("reminder-backdrop").addEventListener("click", closeReminderDialog);
  document.getElementById("close-reminder-btn").addEventListener("click", closeReminderDialog);
  document.getElementById("save-reminder-btn").addEventListener("click", saveReminderFromDialog);
  document.getElementById("rem-recur").addEventListener("change", onRecurTypeChange);

  // Backup / Restore
  document.getElementById("backup-btn").addEventListener("click", doBackup);
  document.getElementById("restore-btn").addEventListener("click", () => {
    document.getElementById("restore-file").click();
  });
  document.getElementById("restore-file").addEventListener("change", doRestore);

  // Manage all reminders
  document.getElementById("manage-reminders-btn").addEventListener("click", openManageReminders);
  document.getElementById("close-manage-modal").addEventListener("click", closeManageReminders);
  document.getElementById("close-manage-btn").addEventListener("click", closeManageReminders);
  document.getElementById("manage-reminders-backdrop").addEventListener("click", closeManageReminders);
  document.getElementById("request-notif-perm-btn").addEventListener("click", async () => {
    const ok = await requestNotificationPermission();
    updateNotifPermStatus();
    showToast(ok ? "اعلان سیستم فعال شد" : "مجوز اعلان داده نشد");
  });
}

// ===================== Header =====================
function updateHeader(holidayTitle) {
  let info;
  if (selectedDate) {
    info = getAllDatesFor(selectedDate.gy, selectedDate.gm, selectedDate.gd);
    info.time = getAllDatesNow().time;
  } else {
    info = getAllDatesNow();
  }

  document.getElementById("weekday").textContent = info.jalali.weekday;
  document.getElementById("time").textContent = formatTime(info);
  document.getElementById("jalali-date").textContent = formatJalali(info);
  document.getElementById("hijri-date").textContent = formatHijri(info);
  document.getElementById("gregorian-date").textContent = formatGregorian(info);
  updateShiftInfo(info.jalali.year, info.jalali.month, info.jalali.day);

  const banner = document.getElementById("holiday-banner");
  if (holidayTitle) {
    banner.textContent = holidayTitle;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }

  const gy = selectedDate ? selectedDate.gy : info.gregorian.year;
  const gm = selectedDate ? selectedDate.gm : info.gregorian.month;
  const gd = selectedDate ? selectedDate.gd : info.gregorian.day;

  document.getElementById("note-btn").classList.toggle("has-note", hasNote(gy, gm, gd));
  document.getElementById("reminder-btn").classList.toggle("has-reminder", hasReminder(gy, gm, gd));
  if (typeof hasAttachments === "function") {
    hasAttachments(gy, gm, gd).then((has) => {
      const ab = document.getElementById("attach-btn");
      if (ab) ab.classList.toggle("has-attach", has);
    }).catch(() => {});
  }
  const colorSel = document.getElementById("day-color-select");
  if (colorSel && typeof getDayColor === "function") {
    colorSel.value = getDayColor(gy, gm, gd) || "none";
  }
}

// ===================== Calendar =====================
function renderWeekdays() {
  const row = document.getElementById("weekdays-row");
  row.innerHTML = "";
  PERSIAN_WEEKDAYS_SHORT.forEach((name, i) => {
    const cell = document.createElement("div");
    cell.className = "weekday-cell" + (i === 6 ? " friday" : "");
    cell.textContent = name;
    row.appendChild(cell);
  });
}

function renderCalendar() {
  const cal = getMonthCalendar(viewYear, viewMonth);
  const todayInfo = getAllDatesNow();
  document.getElementById("month-title").textContent = `${cal.monthName} ${toPersianDigits(cal.year)}`;

  const grid = document.getElementById("days-grid");
  grid.innerHTML = "";

  cal.weeks.forEach(week => {
    week.forEach((cellData, weekdayIndex) => {
      const cell = document.createElement("div");
      cell.className = "day-cell";

      if (!cellData) {
        cell.classList.add("empty");
      } else {
        const { jalaliDay, hijriDay, gregorianDay, gy, gm, gd } = cellData;
        const hInfo = gregorianToHijri(gy, gm, gd);
        const holiday = getHolidayForDay(viewYear, viewMonth, jalaliDay, hInfo.hy, hInfo.hm, hInfo.hd);
        const noteExists = hasNote(gy, gm, gd);
        const remExists = hasReminder(gy, gm, gd);

        let dots = "";
        if (noteExists) dots += '<span class="note-dot"></span>';
        if (remExists) dots += '<span class="rem-dot"></span>';

        cell.innerHTML = `
          ${dots}
          <span class="j-day">${toPersianDigits(jalaliDay)}</span>
          <span class="h-day">${toPersianDigits(hijriDay)}</span>
          <span class="g-day">${gregorianDay}</span>
        `;

        if (weekdayIndex === 6) cell.classList.add("friday");
        if (holiday) cell.classList.add("holiday");
        if (jalaliDay === todayInfo.jalali.day && viewMonth === todayInfo.jalali.month && viewYear === todayInfo.jalali.year)
          cell.classList.add("today");
        cell.dataset.gy = gy;
        cell.dataset.gm = gm;
        cell.dataset.gd = gd;
        if (typeof decorateExtraCellMarkers === "function") {
          decorateExtraCellMarkers(cell, gy, gm, gd);
        }
        if (selectedDate && selectedDate.gy === gy && selectedDate.gm === gm && selectedDate.gd === gd)
          cell.classList.add("selected");

        cell.addEventListener("click", () => {
          const key = gy + "-" + gm + "-" + gd;
          const now = Date.now();
          const isDouble = (key === lastCellTapKey && now - lastCellTapTime < 400);
          lastCellTapTime = now;
          lastCellTapKey = key;

          if (isDouble) {
            if (typeof Sounds !== "undefined") Sounds.open();
            selectedDate = { gy, gm, gd };
            updateHeader(holiday || null);
            renderCalendar();
            const sel = document.querySelector(".day-cell.selected");
            if (sel) {
              sel.classList.remove("cell-pulse");
              void sel.offsetWidth;
              sel.classList.add("cell-pulse");
            }
            showDaySummary(gy, gm, gd);
            return;
          }

          if (typeof Sounds !== "undefined") Sounds.click();
          selectedDate = { gy, gm, gd };
          updateHeader(holiday || null);
          renderCalendar();
          // Pulse only the selected cell
          const sel = document.querySelector(".day-cell.selected");
          if (sel) {
            sel.classList.remove("cell-pulse");
            void sel.offsetWidth;
            sel.classList.add("cell-pulse");
          }
          if (holiday) showToast(holiday, "notify");
        });
      }
      grid.appendChild(cell);
    });
  });
  if (typeof refreshAttachmentIndicators === "function") {
    refreshAttachmentIndicators();
  }
}

function changeMonth(delta) {
  viewMonth += delta;
  if (viewMonth > 12) { viewMonth = 1; viewYear++; }
  else if (viewMonth < 1) { viewMonth = 12; viewYear--; }
  renderCalendar();
}

function goToToday() {
  const today = getAllDatesNow();
  viewYear = today.jalali.year;
  viewMonth = today.jalali.month;
  selectedDate = null;
  const holiday = getHolidayForDay(today.jalali.year, today.jalali.month, today.jalali.day, today.hijri.year, today.hijri.month, today.hijri.day);
  updateHeader(holiday || null);
  renderCalendar();
}


function renderTodayReminders() {
  const section = document.getElementById("today-reminders");
  const listEl = document.getElementById("today-rem-list");
  const countEl = document.getElementById("today-rem-count");
  if (!section || !listEl) return;

  const now = new Date();
  const gy = now.getFullYear();
  const gm = now.getMonth() + 1;
  const gd = now.getDate();
  const currentTime = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");

  const list = getRemindersForDate(gy, gm, gd)
    .slice()
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  if (!list.length) {
    section.classList.add("hidden");
    listEl.innerHTML = "";
    if (countEl) countEl.textContent = "";
    return;
  }

  section.classList.remove("hidden");
  if (countEl) countEl.textContent = toPersianDigits(list.length) + " مورد";

  listEl.innerHTML = list.map((r) => {
    const past = (r.time || "99:99") < currentTime;
    return `
      <div class="today-rem-item${past ? " past" : ""}">
        <div class="today-rem-time">${toPersianDigits(r.time || "--:--")}</div>
        <div class="today-rem-body">
          <strong>${escapeHtml(r.title)}</strong>
          <span>${escapeHtml(describeRecurrence(r))}</span>
        </div>
      </div>
    `;
  }).join("");
}

function showToast(message, kind) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 3200);
  if (typeof Sounds !== "undefined") {
    if (kind === "error") Sounds.error();
    else if (kind === "notify") Sounds.notify();
    else Sounds.success();
  }
}



// ===================== Day Summary Modal =====================
const DAY_SUMMARY_STARTUP_KEY = "calendarDaySummaryOnStartup";

function isDaySummaryOnStartup() {
  const v = localStorage.getItem(DAY_SUMMARY_STARTUP_KEY);
  return v === null ? true : v === "1";
}

function setDaySummaryOnStartup(on) {
  localStorage.setItem(DAY_SUMMARY_STARTUP_KEY, on ? "1" : "0");
}

function showDaySummary(gy, gm, gd, options) {
  options = options || {};
  const info = getAllDatesFor(gy, gm, gd);
  const holiday = getHolidayForDay(
    info.jalali.year, info.jalali.month, info.jalali.day,
    info.hijri.year, info.hijri.month, info.hijri.day
  );
  const note = getNote(gy, gm, gd);
  const rems = getRemindersForDate(gy, gm, gd);

  document.getElementById("day-summary-title").textContent =
    options.isStartup ? "خلاصه امروز" : "خلاصه روز";
  document.getElementById("day-summary-date").textContent =
    info.jalali.weekday + " — " + formatJalali(info);

  const holSec = document.getElementById("day-summary-holiday");
  const holText = document.getElementById("day-summary-holiday-text");
  holSec.classList.remove("hidden");
  if (holiday) {
    holText.className = "day-summary-item";
    holText.textContent = holiday;
  } else {
    holText.className = "day-summary-empty";
    holText.textContent = "مناسبت یا تعطیلی برای این روز ثبت نشده است";
  }

  const notesEl = document.getElementById("day-summary-notes");
  if (note && note.trim()) {
    notesEl.innerHTML = '<div class="day-summary-item">' + escapeHtml(note) + "</div>";
  } else {
    notesEl.innerHTML = '<p class="day-summary-empty">یادداشتی برای این روز نیست</p>';
  }

  const remsEl = document.getElementById("day-summary-reminders");
  if (rems.length) {
    remsEl.innerHTML = rems
      .slice()
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
      .map((r) => {
        const en = r.enabled !== false;
        return (
          '<div class="day-summary-item' + (en ? "" : " past") + '">' +
          "<strong>" + escapeHtml(r.title || "یادآوری") + "</strong>" +
          '<div class="meta">⏰ ' + toPersianDigits(r.time || "--:--") +
          " · " + escapeHtml(describeRecurrence(r)) +
          (en ? "" : " · غیرفعال") +
          "</div></div>"
        );
      })
      .join("");
  } else {
    remsEl.innerHTML = '<p class="day-summary-empty">یادآوری‌ای برای این روز نیست</p>';
  }

  const startupRow = document.getElementById("day-summary-startup-row");
  const toggle = document.getElementById("day-summary-startup-toggle");
  if (options.isStartup) {
    startupRow.style.display = "flex";
    toggle.checked = isDaySummaryOnStartup();
  } else {
    startupRow.style.display = "flex"; // still allow toggle from any open
    toggle.checked = isDaySummaryOnStartup();
  }

  document.getElementById("day-summary-modal").classList.remove("hidden");
  if (typeof Sounds !== "undefined") {
    if (options.isStartup) Sounds.notify();
    else Sounds.open();
  }
}

function closeDaySummary() {
  document.getElementById("day-summary-modal").classList.add("hidden");
  if (typeof Sounds !== "undefined") Sounds.click();
}

function maybeShowStartupDaySummary() {
  if (!isDaySummaryOnStartup()) return;
  const now = new Date();
  showDaySummary(now.getFullYear(), now.getMonth() + 1, now.getDate(), { isStartup: true });
}


// ===================== Month / Year Picker =====================
function openMonthPicker() {
  pickerYear = viewYear;
  pickerMonth = viewMonth;
  const input = document.getElementById("picker-year");
  input.value = toPersianDigits(String(pickerYear));
  document.getElementById("picker-year-error").classList.add("hidden");
  renderPickerMonths();
  document.getElementById("month-picker-modal").classList.remove("hidden");
  if (typeof Sounds !== "undefined") Sounds.open();
}

function closeMonthPicker() {
  document.getElementById("month-picker-modal").classList.add("hidden");
  if (typeof Sounds !== "undefined") Sounds.click();
}

function renderPickerMonths() {
  const box = document.getElementById("picker-months");
  box.innerHTML = PERSIAN_MONTHS.map((name, i) => {
    const m = i + 1;
    const active = m === pickerMonth ? " active" : "";
    return '<button type="button" class="picker-month-btn' + active + '" data-month="' + m + '">' + name + "</button>";
  }).join("");
  box.querySelectorAll(".picker-month-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      pickerMonth = parseInt(btn.dataset.month, 10);
      renderPickerMonths();
      if (typeof Sounds !== "undefined") Sounds.click();
    });
  });
}

function normalizeYearInput(raw) {
  // Convert Persian/Arabic digits to English, strip non-digits
  const map = { "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
                "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9" };
  let s = String(raw || "").replace(/[۰-۹٠-٩]/g, (ch) => map[ch] || ch);
  s = s.replace(/[^\d]/g, "");
  return s;
}

function validatePickerYear(showError) {
  const input = document.getElementById("picker-year");
  const err = document.getElementById("picker-year-error");
  const normalized = normalizeYearInput(input.value);
  const n = parseInt(normalized, 10);
  if (!normalized || Number.isNaN(n) || n < 1300 || n > 1600) {
    if (showError) err.classList.remove("hidden");
    return null;
  }
  err.classList.add("hidden");
  pickerYear = n;
  // keep display in Persian digits
  input.value = toPersianDigits(String(n));
  return n;
}

function onPickerYearInput(e) {
  const input = e.target;
  // Allow only digits (Persian/English) while typing
  let s = input.value;
  const mapRev = {};
  // strip invalid chars but keep Persian digits
  s = s.replace(/[^\d۰-۹٠-٩]/g, "");
  if (s.length > 4) s = s.slice(0, 4);
  input.value = s;
  const err = document.getElementById("picker-year-error");
  const n = parseInt(normalizeYearInput(s), 10);
  if (s.length === 4 && (Number.isNaN(n) || n < 1300 || n > 1600)) {
    err.classList.remove("hidden");
  } else {
    err.classList.add("hidden");
  }
}

function applyMonthPicker() {
  const y = validatePickerYear(true);
  if (y === null) {
    if (typeof Sounds !== "undefined") Sounds.error();
    showToast("سال نامعتبر است (۱۳۰۰ تا ۱۶۰۰)", "error");
    return;
  }
  if (!pickerMonth || pickerMonth < 1 || pickerMonth > 12) {
    showToast("ماه را انتخاب کنید", "error");
    return;
  }
  viewYear = y;
  viewMonth = pickerMonth;
  closeMonthPicker();
  renderCalendar();
  if (typeof Sounds !== "undefined") Sounds.success();
  showToast("تقویم به " + PERSIAN_MONTHS[viewMonth - 1] + " " + toPersianDigits(viewYear) + " منتقل شد");
}

function setupMonthPicker() {
  document.getElementById("month-title").addEventListener("click", openMonthPicker);
  document.getElementById("month-picker-close-x").addEventListener("click", closeMonthPicker);
  document.getElementById("month-picker-close-btn").addEventListener("click", closeMonthPicker);
  document.getElementById("month-picker-backdrop").addEventListener("click", closeMonthPicker);
  document.getElementById("month-picker-apply").addEventListener("click", applyMonthPicker);
  document.getElementById("picker-year").addEventListener("input", onPickerYearInput);
  document.getElementById("picker-year").addEventListener("blur", () => validatePickerYear(true));
  document.getElementById("picker-year-minus").addEventListener("click", () => {
    const y = validatePickerYear(false) || pickerYear || viewYear;
    const next = Math.max(1300, y - 1);
    pickerYear = next;
    document.getElementById("picker-year").value = toPersianDigits(String(next));
    document.getElementById("picker-year-error").classList.add("hidden");
    if (typeof Sounds !== "undefined") Sounds.click();
  });
  document.getElementById("picker-year-plus").addEventListener("click", () => {
    const y = validatePickerYear(false) || pickerYear || viewYear;
    const next = Math.min(1600, y + 1);
    pickerYear = next;
    document.getElementById("picker-year").value = toPersianDigits(String(next));
    document.getElementById("picker-year-error").classList.add("hidden");
    if (typeof Sounds !== "undefined") Sounds.click();
  });
}

// ===================== Swipe month navigation =====================
function setupCalendarSwipe() {
  const el = document.querySelector(".calendar-section");
  if (!el) return;
  let startX = 0;
  let startY = 0;
  let tracking = false;

  el.addEventListener("touchstart", (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  el.addEventListener("touchend", (e) => {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) < 50) return;
    if (Math.abs(dx) < Math.abs(dy)) return; // vertical scroll
    // swipe right (left→right) -> next month; swipe left (right→left) -> previous month
    if (dx > 0) {
      if (typeof Sounds !== "undefined") Sounds.nav();
      changeMonth(1);
    } else {
      if (typeof Sounds !== "undefined") Sounds.nav();
      changeMonth(-1);
    }
  }, { passive: true });
}

// ===================== Confirm Modal =====================
let _confirmResolve = null;

function showConfirm(message, title, options) {
  return new Promise((resolve) => {
    _confirmResolve = resolve;
    const modal = document.getElementById("confirm-modal");
    document.getElementById("confirm-title").textContent = title || "تأیید";
    document.getElementById("confirm-message").textContent = message || "آیا مطمئن هستید؟";
    const okBtn = document.getElementById("confirm-ok-btn");
    const cancelBtn = document.getElementById("confirm-cancel-btn");
    if (okBtn) okBtn.textContent = (options && options.okText) || "بله، حذف شود";
    if (cancelBtn) cancelBtn.textContent = (options && options.cancelText) || "انصراف";
    modal.classList.remove("hidden");
    if (typeof Sounds !== "undefined") Sounds.open();
  });
}

function closeConfirm(result) {
  document.getElementById("confirm-modal").classList.add("hidden");
  if (typeof Sounds !== "undefined") Sounds.click();
  if (_confirmResolve) {
    _confirmResolve(!!result);
    _confirmResolve = null;
  }
}

function setupConfirmModal() {
  document.getElementById("confirm-ok-btn").addEventListener("click", () => closeConfirm(true));
  document.getElementById("confirm-cancel-btn").addEventListener("click", () => closeConfirm(false));
  document.getElementById("confirm-close-x").addEventListener("click", () => closeConfirm(false));
  document.getElementById("confirm-backdrop").addEventListener("click", () => closeConfirm(false));
}


function getCurrentSelectedGregorian() {
  if (selectedDate) return selectedDate;
  const info = getAllDatesNow();
  return { gy: info.gregorian.year, gm: info.gregorian.month, gd: info.gregorian.day };
}


// ===================== Notes =====================
function openNoteDialog() {
  if (typeof Sounds !== "undefined") Sounds.open();
  const { gy, gm, gd } = getCurrentSelectedGregorian();
  const info = getAllDatesFor(gy, gm, gd);
  document.getElementById("note-date-label").textContent = `${info.jalali.weekday} — ${formatJalali(info)}`;
  const existing = getNote(gy, gm, gd);
  document.getElementById("note-textarea").value = existing;
  document.getElementById("delete-note-btn").classList.toggle("hidden", !existing);
  document.getElementById("note-modal").classList.remove("hidden");
  document.getElementById("note-textarea").focus();
}
function closeNoteDialog() { document.getElementById("note-modal").classList.add("hidden"); }
function saveNoteFromDialog() {
  const { gy, gm, gd } = getCurrentSelectedGregorian();
  const text = document.getElementById("note-textarea").value;
  setNote(gy, gm, gd, text);
  closeNoteDialog();
  updateHeader();
  renderCalendar();
  showToast(text.trim() ? "یادداشت ذخیره شد" : "یادداشت حذف شد");
}
async function deleteNoteFromDialog() {
  const { gy, gm, gd } = getCurrentSelectedGregorian();
  const ok = await showConfirm("یادداشت این روز حذف شود؟ (قابل بازگردانی از سطل زباله)", "حذف یادداشت");
  if (!ok) return;
  if (typeof extrasSoftDeleteNoteHook === "function") {
    extrasSoftDeleteNoteHook(gy, gm, gd);
  } else {
    setNote(gy, gm, gd, "");
  }
  closeNoteDialog();
  updateHeader();
  renderCalendar();
  showToast("یادداشت به سطل زباله منتقل شد");
}

// ===================== Reminders UI =====================
function openReminderDialog() {
  if (typeof Sounds !== "undefined") Sounds.open();
  editingReminderId = null;
  const { gy, gm, gd } = getCurrentSelectedGregorian();
  const info = getAllDatesFor(gy, gm, gd);
  document.getElementById("reminder-date-label").textContent = `${info.jalali.weekday} — ${formatJalali(info)}`;

  document.getElementById("rem-title").value = "";
  document.getElementById("rem-time").value = "09:00";
  document.getElementById("rem-recur").value = "once";
  document.getElementById("rem-n").value = "1";
  document.getElementById("rem-weekday").value = String(info.jalali.weekdayIndex);
  document.getElementById("rem-nth").value = "1";
  onRecurTypeChange();

  // List existing
  const list = getRemindersForDate(gy, gm, gd);
  const section = document.getElementById("rem-list-section");
  const listEl = document.getElementById("rem-list");
  if (list.length) {
    section.classList.remove("hidden");
    listEl.innerHTML = list.map(r => `
      <div class="rem-item" data-id="${r.id}">
        <div class="rem-item-info">
          <strong>${escapeHtml(r.title)}</strong>
          <span>${r.time} — ${describeRecurrence(r)}</span>
        </div>
        <button class="rem-delete-btn" data-id="${r.id}" title="حذف">✕</button>
      </div>
    `).join("");
    listEl.querySelectorAll(".rem-delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const ok = await showConfirm(
          "آیا از حذف این یادآوری مطمئن هستید؟ این عمل قابل بازگشت نیست.",
          "حذف یادآوری"
        );
        if (!ok) return;
        deleteReminder(btn.dataset.id);
        openReminderDialog(); // refresh
        updateHeader();
        renderCalendar();
        renderTodayReminders();
        showToast("یادآوری حذف شد");
      });
    });
  } else {
    section.classList.add("hidden");
    listEl.innerHTML = "";
  }

  document.getElementById("reminder-modal").classList.remove("hidden");
  requestNotificationPermission();
}

function closeReminderDialog() {
  document.getElementById("reminder-modal").classList.add("hidden");
  editingReminderId = null;
}

function onRecurTypeChange() {
  const type = document.getElementById("rem-recur").value;
  const nGroup = document.getElementById("rem-n-group");
  const wdGroup = document.getElementById("rem-weekday-group");
  const nthGroup = document.getElementById("rem-nth-group");

  nGroup.classList.add("hidden");
  wdGroup.classList.add("hidden");
  nthGroup.classList.add("hidden");

  if (["everyNDays", "everyNWeeks", "everyNMonths", "everyNYears"].includes(type)) {
    nGroup.classList.remove("hidden");
  }
  if (["weekly", "everyNWeeks", "nthWeekday"].includes(type)) {
    wdGroup.classList.remove("hidden");
  }
  if (type === "nthWeekday") {
    nthGroup.classList.remove("hidden");
  }
}

function saveReminderFromDialog() {
  const { gy, gm, gd } = getCurrentSelectedGregorian();
  const title = document.getElementById("rem-title").value.trim() || "یادآوری";
  const time = document.getElementById("rem-time").value || "09:00";
  const recurType = document.getElementById("rem-recur").value;
  const nValue = parseInt(document.getElementById("rem-n").value, 10) || 1;
  const weekday = parseInt(document.getElementById("rem-weekday").value, 10) || 0;
  const nth = parseInt(document.getElementById("rem-nth").value, 10) || 1;

  const rem = createReminder({ title, gy, gm, gd, time, recurType, nValue, weekday, nth });
  addReminder(rem);

  closeReminderDialog();
  updateHeader();
  renderCalendar();
  showToast("یادآوری ذخیره شد: " + describeRecurrence(rem));
  requestNotificationPermission();
  renderTodayReminders();
}

function escapeHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ===================== Hijri Settings =====================
function openSettings() {
  if (typeof Sounds !== "undefined") Sounds.open();
  const now = getAllDatesNow();
  settingsYear = now.hijri.year;
  tempOffset = getHijriDayOffset();
  updateOffsetUI();

  const select = document.getElementById("hijri-year-select");
  select.innerHTML = "";
  for (let y = now.hijri.year - 5; y <= now.hijri.year + 5; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = toPersianDigits(y);
    if (y === settingsYear) opt.selected = true;
    select.appendChild(opt);
  }
  buildMonthLengthsList(settingsYear);
  document.getElementById("settings-modal").classList.remove("hidden");
}

function onSettingsYearChange() {
  settingsYear = parseInt(document.getElementById("hijri-year-select").value, 10);
  buildMonthLengthsList(settingsYear);
}

function buildMonthLengthsList(hy) {
  const list = document.getElementById("month-lengths-list");
  list.innerHTML = "";
  const overrides = loadHijriOverrides();
  tempOverrides = JSON.parse(JSON.stringify(overrides));
  for (let m = 1; m <= 12; m++) {
    const len = getMonthLength(hy, m);
    const item = document.createElement("div");
    item.className = "month-item";
    item.innerHTML = `<span>${HIJRI_MONTHS[m-1]}</span>
      <select data-month="${m}">
        <option value="29" ${len===29?"selected":""}>۲۹ روز</option>
        <option value="30" ${len===30?"selected":""}>۳۰ روز</option>
      </select>`;
    list.appendChild(item);
  }
}

function closeSettings() { document.getElementById("settings-modal").classList.add("hidden"); }
function changeTempOffset(delta) {
  tempOffset = Math.max(-3, Math.min(3, tempOffset + delta));
  updateOffsetUI();
}
function updateOffsetUI() {
  document.getElementById("offset-value").textContent = toPersianDigits(tempOffset > 0 ? "+"+tempOffset : tempOffset);
  const hints = {"-3":"۳ روز عقب","-2":"۲ روز عقب","-1":"۱ روز عقب","0":"بدون جابجایی","1":"۱ روز جلو","2":"۲ روز جلو","3":"۳ روز جلو"};
  document.getElementById("offset-hint").textContent = hints[String(tempOffset)] || "";
}

function saveSettings() {
  setHijriDayOffset(tempOffset);
  const yearKey = String(settingsYear);
  if (!tempOverrides[yearKey]) tempOverrides[yearKey] = {};
  document.querySelectorAll("#month-lengths-list select").forEach(sel => {
    tempOverrides[yearKey][sel.dataset.month] = parseInt(sel.value, 10);
  });
  saveHijriOverrides(tempOverrides);
  closeSettings();
  if (selectedDate) {
    const info = getAllDatesFor(selectedDate.gy, selectedDate.gm, selectedDate.gd);
    updateHeader(getHolidayForDay(info.jalali.year, info.jalali.month, info.jalali.day, info.hijri.year, info.hijri.month, info.hijri.day) || null);
  } else {
    const t = getAllDatesNow();
    updateHeader(getHolidayForDay(t.jalali.year, t.jalali.month, t.jalali.day, t.hijri.year, t.hijri.month, t.hijri.day) || null);
  }
  renderCalendar();
  showToast("تنظیمات سال " + toPersianDigits(settingsYear) + " ذخیره شد");
}

function resetSettings() {
  tempOffset = 0;
  setHijriDayOffset(0);
  const overrides = loadHijriOverrides();
  delete overrides[String(settingsYear)];
  saveHijriOverrides(overrides);
  tempOverrides = JSON.parse(JSON.stringify(overrides));
  updateOffsetUI();
  buildMonthLengthsList(settingsYear);
  updateHeader(null);
  renderCalendar();
  showToast("بازنشانی شد");
}



// ===================== Manage All Reminders =====================
function openManageReminders() {
  if (typeof Sounds !== "undefined") Sounds.open();
  renderManageRemindersList();
  updateNotifPermStatus();
  document.getElementById("manage-reminders-modal").classList.remove("hidden");
}

function closeManageReminders() {
  document.getElementById("manage-reminders-modal").classList.add("hidden");
}

function updateNotifPermStatus() {
  const el = document.getElementById("notif-perm-status");
  if (!el) return;
  if (!("Notification" in window)) {
    el.textContent = "این مرورگر از اعلان سیستم پشتیبانی نمی‌کند.";
    el.className = "notif-perm-status denied";
    return;
  }
  const p = Notification.permission;
  el.className = "notif-perm-status " + p;
  if (p === "granted") {
    el.textContent = "وضعیت اعلان سیستم: فعال ✓ — یادآوری‌ها می‌توانند به‌صورت اعلان نمایش داده شوند.";
  } else if (p === "denied") {
    el.textContent = "وضعیت اعلان سیستم: مسدود — از تنظیمات مرورگر/گوشی مجوز را فعال کنید.";
  } else {
    el.textContent = "وضعیت اعلان سیستم: هنوز مجوز داده نشده — روی «فعال‌سازی اعلان سیستم» بزنید.";
  }
}

function formatReminderBaseDate(rem) {
  try {
    const info = getAllDatesFor(rem.gy, rem.gm, rem.gd);
    return formatJalali(info);
  } catch {
    return rem.gy + "/" + rem.gm + "/" + rem.gd;
  }
}

function renderManageRemindersList() {
  const list = loadReminders().slice().sort((a, b) => {
    // enabled first, then by time
    if (!!b.enabled !== !!a.enabled) return (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0);
    return (a.time || "").localeCompare(b.time || "");
  });

  const listEl = document.getElementById("manage-rem-list");
  const emptyEl = document.getElementById("manage-empty");
  const countEl = document.getElementById("manage-count");

  countEl.textContent = toPersianDigits(list.length) + " مورد";

  if (!list.length) {
    listEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");

  listEl.innerHTML = list.map((r) => {
    const enabled = r.enabled !== false;
    return `
      <div class="manage-rem-item${enabled ? "" : " disabled"}" data-id="${r.id}">
        <div class="manage-rem-top">
          <div>
            <div class="manage-rem-title">${escapeHtml(r.title || "یادآوری")}</div>
            <div class="manage-rem-meta">
              ⏰ ${toPersianDigits(r.time || "--:--")}
              · ${escapeHtml(describeRecurrence(r))}
              <br/>📅 از ${escapeHtml(formatReminderBaseDate(r))}
            </div>
          </div>
          <div class="manage-rem-actions">
            <label class="manage-toggle" title="فعال / غیرفعال">
              <input type="checkbox" class="manage-enable" data-id="${r.id}" ${enabled ? "checked" : ""} />
              <span class="slider"></span>
            </label>
            <button class="manage-del-btn" data-id="${r.id}">حذف</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  listEl.querySelectorAll(".manage-enable").forEach((input) => {
    input.addEventListener("change", () => {
      updateReminder(input.dataset.id, { enabled: input.checked });
      renderManageRemindersList();
      renderTodayReminders();
      updateHeader();
      renderCalendar();
      showToast(input.checked ? "یادآوری فعال شد" : "یادآوری غیرفعال شد");
    });
  });

  listEl.querySelectorAll(".manage-del-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await showConfirm(
        "آیا از حذف این یادآوری مطمئن هستید؟ این عمل قابل بازگشت نیست.",
        "حذف یادآوری"
      );
      if (!ok) return;
      deleteReminder(btn.dataset.id);
      renderManageRemindersList();
      renderTodayReminders();
      updateHeader();
      renderCalendar();
      showToast("یادآوری حذف شد");
    });
  });
}

// ===================== Backup / Restore =====================
function collectBackupData() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    notes: loadNotes(),
    reminders: loadReminders(),
    hijriDayOffset: getHijriDayOffset(),
    hijriMonthOverrides: loadHijriOverrides(),
    firedReminders: loadFired(),
    customOccasions: typeof loadCustomOccasions === "function" ? loadCustomOccasions() : {},
    a11y: typeof loadA11y === "function" ? loadA11y() : {}
  };
}

function doBackup() {
  try {
    const data = collectBackupData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `calendar-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof featuresOnBackupDone === "function") featuresOnBackupDone();
    showToast("فایل پشتیبان دانلود شد");
  } catch (e) {
    console.error(e);
    showToast("خطا در پشتیبان‌گیری");
  }
}

function doRestore(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = ""; // reset so same file can be chosen again
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || typeof data !== "object") throw new Error("invalid");

      const notesCount = data.notes && typeof data.notes === "object" ? Object.keys(data.notes).length : 0;
      const remCount = Array.isArray(data.reminders) ? data.reminders.length : 0;
      const dateInfo = data.exportedAt
        ? "\nتاریخ پشتیبان: " + new Date(data.exportedAt).toLocaleString("fa-IR")
        : "";

      const msg =
        "با بازیابی، داده‌های فعلی (یادداشت‌ها، یادآوری‌ها و تنظیمات قمری) با محتوای فایل پشتیبان جایگزین می‌شوند.\n\n" +
        "تعداد یادداشت‌ها در فایل: " + notesCount + "\n" +
        "تعداد یادآوری‌ها در فایل: " + remCount +
        dateInfo +
        "\n\nآیا مطمئن هستید؟";

      if (!window.confirm(msg)) {
        showToast("بازیابی لغو شد");
        return;
      }

      // Restore notes
      if (data.notes && typeof data.notes === "object") {
        saveNotes(data.notes);
      }
      // Restore reminders
      if (Array.isArray(data.reminders)) {
        saveReminders(data.reminders);
      }
      // Restore Hijri settings
      if (typeof data.hijriDayOffset === "number") {
        setHijriDayOffset(data.hijriDayOffset);
      }
      if (data.hijriMonthOverrides && typeof data.hijriMonthOverrides === "object") {
        saveHijriOverrides(data.hijriMonthOverrides);
      }
      if (data.firedReminders && typeof data.firedReminders === "object") {
        saveFired(data.firedReminders);
      }
      if (data.customOccasions && typeof data.customOccasions === "object" && typeof saveCustomOccasions === "function") {
        saveCustomOccasions(data.customOccasions);
      }
      if (data.a11y && typeof data.a11y === "object" && typeof saveA11y === "function") {
        saveA11y(data.a11y);
        if (typeof applyA11y === "function") applyA11y();
      }

      // Refresh UI
      selectedDate = null;
      const today = getAllDatesNow();
      viewYear = today.jalali.year;
      viewMonth = today.jalali.month;
      updateHeader(null);
      renderCalendar();
      renderTodayReminders();
      if (typeof renderDashboard === "function") renderDashboard();
      if (typeof featuresOnBackupDone === "function") featuresOnBackupDone();
      showToast("بازیابی با موفقیت انجام شد");
    } catch (err) {
      console.error(err);
      showToast("فایل پشتیبان نامعتبر است");
    }
  };
  reader.onerror = function () {
    showToast("خطا در خواندن فایل");
  };
  reader.readAsText(file);
}

// ===================== SW =====================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}


// SW periodic reminder ping
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "PERIODIC_REMINDER_CHECK") {
      if (typeof checkDueReminders === "function") checkDueReminders();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);

/**
 * Extras: templates, copy day, pins, countdown, focus mode,
 * attachment backup, trash, PIN lock, monthly report, day colors, year view,
 * shift visibility
 */

const PINS_KEY = "calendarPinnedDays";
const COLORS_KEY = "calendarDayColors";
const COUNTDOWN_KEY = "calendarCountdowns";
const TRASH_KEY = "calendarTrash";
const PIN_LOCK_KEY = "calendarPinLock";
const SHIFT_VIS_KEY = "calendarShiftVisible";
const FOCUS_KEY = "calendarFocusMode";
const TRASH_MAX_DAYS = 14;

// ---------- storage helpers ----------
function loadJson(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "null");
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}
function saveJson(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function gKey(gy, gm, gd) {
  return gy + "-" + gm + "-" + gd;
}

// ---------- Shift visibility ----------
function isShiftVisible() {
  const v = localStorage.getItem(SHIFT_VIS_KEY);
  return v !== "0";
}
function setShiftVisible(on) {
  localStorage.setItem(SHIFT_VIS_KEY, on ? "1" : "0");
  applyShiftVisibility();
}
function applyShiftVisibility() {
  const el = document.getElementById("shift-info");
  if (el) el.classList.toggle("hidden", !isShiftVisible());
  const cb = document.getElementById("shift-visible-toggle");
  if (cb) cb.checked = isShiftVisible();
}

// ---------- Pins ----------
function loadPins() {
  return loadJson(PINS_KEY, {});
}
function isPinned(gy, gm, gd) {
  return !!loadPins()[gKey(gy, gm, gd)];
}
function togglePin(gy, gm, gd) {
  const all = loadPins();
  const k = gKey(gy, gm, gd);
  if (all[k]) delete all[k];
  else all[k] = true;
  saveJson(PINS_KEY, all);
  return !!all[k];
}

// ---------- Day colors ----------
const DAY_COLORS = {
  none: "",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899"
};
function loadColors() {
  return loadJson(COLORS_KEY, {});
}
function getDayColor(gy, gm, gd) {
  return loadColors()[gKey(gy, gm, gd)] || "";
}
function setDayColor(gy, gm, gd, colorKey) {
  const all = loadColors();
  const k = gKey(gy, gm, gd);
  if (!colorKey || colorKey === "none") delete all[k];
  else all[k] = colorKey;
  saveJson(COLORS_KEY, all);
}

// ---------- Countdown ----------
function loadCountdowns() {
  return loadJson(COUNTDOWN_KEY, []);
}
function saveCountdowns(list) {
  saveJson(COUNTDOWN_KEY, list);
}
function addCountdown(title, gy, gm, gd) {
  const list = loadCountdowns();
  list.push({
    id: "cd_" + Date.now(),
    title: title || "رویداد",
    gy,
    gm,
    gd
  });
  saveCountdowns(list);
}
function removeCountdown(id) {
  saveCountdowns(loadCountdowns().filter((x) => x.id !== id));
}
function daysUntil(gy, gm, gd) {
  const target = new Date(gy, gm - 1, gd);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

// ---------- Trash (soft delete) ----------
function loadTrash() {
  return loadJson(TRASH_KEY, []);
}
function saveTrash(list) {
  saveJson(TRASH_KEY, list);
}
function purgeOldTrash() {
  const cutoff = Date.now() - TRASH_MAX_DAYS * 86400000;
  saveTrash(loadTrash().filter((x) => (x.deletedAt || 0) > cutoff));
}
function trashPush(item) {
  const list = loadTrash();
  list.unshift({ ...item, deletedAt: Date.now() });
  saveTrash(list.slice(0, 200));
}
function softDeleteNote(gy, gm, gd) {
  const text = typeof getNote === "function" ? getNote(gy, gm, gd) : "";
  if (!text) return;
  trashPush({ type: "note", gy, gm, gd, text });
  if (typeof setNote === "function") setNote(gy, gm, gd, "");
}
function restoreTrashItem(id) {
  const list = loadTrash();
  const idx = list.findIndex((x, i) => String(i) === String(id) || x.id === id);
  // use index
  const item = list[Number(id)];
  if (!item) return false;
  if (item.type === "note" && typeof setNote === "function") {
    setNote(item.gy, item.gm, item.gd, item.text || "");
  }
  list.splice(Number(id), 1);
  saveTrash(list);
  return true;
}

// ---------- PIN lock ----------
function getPinHash() {
  return localStorage.getItem(PIN_LOCK_KEY) || "";
}
function setPinHash(pin) {
  if (!pin) localStorage.removeItem(PIN_LOCK_KEY);
  else localStorage.setItem(PIN_LOCK_KEY, btoa("cal:" + pin));
}
function checkPin(pin) {
  return getPinHash() === btoa("cal:" + pin);
}
function isPinEnabled() {
  return !!getPinHash();
}

// ---------- Focus mode ----------
function isFocusMode() {
  return localStorage.getItem(FOCUS_KEY) === "1";
}
function setFocusMode(on) {
  localStorage.setItem(FOCUS_KEY, on ? "1" : "0");
  applyFocusMode();
}
function applyFocusMode() {
  document.body.classList.toggle("focus-mode", isFocusMode());
  const btn = document.getElementById("focus-toggle-btn");
  if (btn) btn.classList.toggle("active", isFocusMode());
}

// ---------- Templates ----------
const NOTE_TEMPLATES = [
  { id: "meeting", label: "جلسه", text: "جلسه:\nموضوع:\nحاضرین:\nنتیجه:" },
  { id: "medicine", label: "دارو", text: "دارو:\nدوز:\nساعت:" },
  { id: "call", label: "تماس", text: "تماس با:\nموضوع:\nنتیجه:" },
  { id: "task", label: "کار", text: "کار:\nاولویت:\nوضعیت:" }
];

// ---------- Monthly report ----------
function buildMonthlyReport(jy, jm) {
  const cal = getMonthCalendar(jy, jm);
  let notes = 0,
    pins = 0,
    colored = 0,
    holidays = 0,
    rems = 0;
  const pinMap = loadPins();
  const colorMap = loadColors();
  cal.weeks.forEach((week) => {
    week.forEach((cell) => {
      if (!cell) return;
      const k = gKey(cell.gy, cell.gm, cell.gd);
      if (typeof hasNote === "function" && hasNote(cell.gy, cell.gm, cell.gd)) notes++;
      if (pinMap[k]) pins++;
      if (colorMap[k]) colored++;
      const hInfo = gregorianToHijri(cell.gy, cell.gm, cell.gd);
      const h = getHolidayForDay(jy, jm, cell.jalaliDay, hInfo.hy, hInfo.hm, hInfo.hd);
      if (h) holidays++;
      if (typeof getRemindersForDate === "function") {
        rems += getRemindersForDate(cell.gy, cell.gm, cell.gd).length;
      }
    });
  });
  return { notes, pins, colored, holidays, rems, monthName: cal.monthName, year: jy };
}

// ---------- Copy day ----------
function copyDayData(from, toList, opts) {
  // from: {gy,gm,gd}, toList: [{gy,gm,gd}], opts: {note,reminders,color,pin}
  const note =
    opts.note && typeof getNote === "function" ? getNote(from.gy, from.gm, from.gd) : "";
  const color = opts.color ? getDayColor(from.gy, from.gm, from.gd) : "";
  const pinned = opts.pin ? isPinned(from.gy, from.gm, from.gd) : false;
  let remTemplates = [];
  if (opts.reminders && typeof loadReminders === "function") {
    remTemplates = loadReminders().filter((r) => {
      // one-time on that day or all that match that date via getRemindersForDate
      return true;
    });
    if (typeof getRemindersForDate === "function") {
      remTemplates = getRemindersForDate(from.gy, from.gm, from.gd).map((r) => ({ ...r }));
    }
  }
  toList.forEach((t) => {
    if (opts.note && note && typeof setNote === "function") setNote(t.gy, t.gm, t.gd, note);
    if (opts.color && color) setDayColor(t.gy, t.gm, t.gd, color);
    if (opts.pin && pinned) {
      const all = loadPins();
      all[gKey(t.gy, t.gm, t.gd)] = true;
      saveJson(PINS_KEY, all);
    }
    if (opts.reminders && remTemplates.length && typeof saveReminders === "function") {
      const all = loadReminders();
      remTemplates.forEach((r) => {
        const copy = {
          ...r,
          id: "r_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          date: t.gy + "-" + String(t.gm).padStart(2, "0") + "-" + String(t.gd).padStart(2, "0"),
          type: r.type === "once" ? "once" : r.type
        };
        // for once reminders, set specific date fields if used
        if (copy.gy != null) {
          copy.gy = t.gy;
          copy.gm = t.gm;
          copy.gd = t.gd;
        }
        all.push(copy);
      });
      saveReminders(all);
    }
  });
}

// ---------- Attachment backup via ZIP of base64 JSON ----------
async function exportAttachmentsBackup() {
  if (typeof openAttDb !== "function") throw new Error("no att");
  const db = await openAttDb();
  const rows = await new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readonly");
    const req = tx.objectStore("files").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  const out = [];
  for (const r of rows) {
    let buf;
    if (r.data != null) buf = r.data;
    else if (r.blob instanceof Blob) buf = await r.blob.arrayBuffer();
    else continue;
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    out.push({
      id: r.id,
      dayKey: r.dayKey,
      name: r.name,
      mime: r.mime,
      size: r.size,
      kind: r.kind,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      dataBase64: btoa(binary)
    });
  }
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    files: out
  };
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "calendar-attachments-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return out.length;
}

async function importAttachmentsBackup(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.files)) throw new Error("invalid");
  let n = 0;
  for (const f of data.files) {
    const binary = atob(f.dataBase64 || "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const rec = {
      id: f.id || "a_" + Date.now() + "_" + n,
      dayKey: f.dayKey,
      name: f.name,
      mime: f.mime,
      size: f.size || bytes.byteLength,
      kind: f.kind,
      data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      createdAt: f.createdAt || Date.now(),
      updatedAt: f.updatedAt || Date.now()
    };
    await saveAttachmentRecord(rec);
    n++;
  }
  return n;
}

// ---------- UI: countdown strip ----------
function renderCountdownStrip() {
  const el = document.getElementById("countdown-strip");
  if (!el) return;
  const list = loadCountdowns()
    .map((c) => ({ ...c, left: daysUntil(c.gy, c.gm, c.gd) }))
    .filter((c) => c.left >= -1)
    .sort((a, b) => a.left - b.left)
    .slice(0, 3);
  if (!list.length) {
    el.classList.add("hidden");
    el.innerHTML = "";
    return;
  }
  el.classList.remove("hidden");
  el.innerHTML = list
    .map((c) => {
      const label =
        c.left > 0
          ? toPersianDigits(c.left) + " روز تا "
          : c.left === 0
            ? "امروز: "
            : "گذشته: ";
      return (
        '<div class="countdown-item"><span>' +
        label +
        escapeHtml(c.title) +
        '</span><button type="button" class="cd-del" data-id="' +
        c.id +
        '">×</button></div>'
      );
    })
    .join("");
  el.querySelectorAll(".cd-del").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeCountdown(btn.dataset.id);
      renderCountdownStrip();
    });
  });
}

// ---------- Year view ----------
function renderYearView(year) {
  const box = document.getElementById("year-view-body");
  if (!box) return;
  year = year || viewYear;
  window._yearViewY = year;
  document.getElementById("year-view-label").textContent = toPersianDigits(year);
  var html = '<div class="year-grid">';
  for (var m = 1; m <= 12; m++) {
    var cal = getMonthCalendar(year, m);
    html += '<button type="button" class="year-month-card" data-y="' + year + '" data-m="' + m + '">';
    html += '<div class="ym-name">' + cal.monthName + '</div>';
    html += '<div class="ym-mini">' + toPersianDigits(cal.daysInMonth) + ' روز</div>';
    html += '</button>';
  }
  html += '</div>';
  box.innerHTML = html;
  box.querySelectorAll(".year-month-card").forEach(function (btn) {
    btn.addEventListener("click", function () {
      viewYear = +btn.dataset.y;
      viewMonth = +btn.dataset.m;
      renderCalendar();
      closeExtrasModal();
      showToast(PERSIAN_MONTHS[viewMonth - 1] + " " + toPersianDigits(viewYear));
    });
  });
}

// ---------- Decorate calendar cells ----------
function decorateExtraCellMarkers(cell, gy, gm, gd) {
  if (isPinned(gy, gm, gd)) {
    const pin = document.createElement("span");
    pin.className = "pin-mark";
    pin.textContent = "⭐";
    cell.appendChild(pin);
  }
  const ck = getDayColor(gy, gm, gd);
  if (ck && DAY_COLORS[ck]) {
    cell.style.boxShadow = "inset 0 0 0 2px " + DAY_COLORS[ck];
  }
}

// ---------- Extras modal ----------
function openExtrasModal(tab) {
  document.getElementById("extras-modal")?.classList.remove("hidden");
  switchExtrasTab(tab || "templates");
  if (typeof Sounds !== "undefined") Sounds.open();
}
function closeExtrasModal() {
  document.getElementById("extras-modal")?.classList.add("hidden");
}
function switchExtrasTab(tab) {
  [
    "templates",
    "copy",
    "countdown",
    "trash",
    "report",
    "year",
    "security",
    "more"
  ].forEach((t) => {
    document.getElementById("exp-" + t)?.classList.toggle("hidden", t !== tab);
    document.getElementById("extab-" + t)?.classList.toggle("active", t === tab);
  });
  if (tab === "trash") renderTrashList();
  if (tab === "report") renderReportPanel();
  if (tab === "year") renderYearView(viewYear);
  if (tab === "countdown") renderCountdownFormList();
  if (tab === "security") {
    document.getElementById("pin-status").textContent = isPinEnabled()
      ? "قفل PIN فعال است"
      : "قفل PIN غیرفعال است";
  }
  if (tab === "more") {
    document.getElementById("shift-visible-toggle").checked = isShiftVisible();
    document.getElementById("focus-mode-toggle").checked = isFocusMode();
  }
}

function renderTrashList() {
  purgeOldTrash();
  const box = document.getElementById("trash-list");
  const list = loadTrash();
  if (!list.length) {
    box.innerHTML = '<p class="day-summary-empty">سطل زباله خالی است</p>';
    return;
  }
  box.innerHTML = list
    .map((item, i) => {
      return (
        '<div class="trash-item"><div><strong>' +
        (item.type === "note" ? "یادداشت" : item.type) +
        "</strong><span>" +
        escapeHtml((item.text || "").slice(0, 80)) +
        '</span></div><button type="button" class="backup-btn trash-restore" data-i="' +
        i +
        '">بازگردانی</button></div>'
      );
    })
    .join("");
  box.querySelectorAll(".trash-restore").forEach((btn) => {
    btn.addEventListener("click", () => {
      restoreTrashItem(btn.dataset.i);
      renderTrashList();
      renderCalendar();
      showToast("بازگردانی شد");
    });
  });
}

function renderReportPanel() {
  const r = buildMonthlyReport(viewYear, viewMonth);
  document.getElementById("report-body").innerHTML =
    "<h3>" +
    r.monthName +
    " " +
    toPersianDigits(r.year) +
    "</h3>" +
    '<div class="stats-grid">' +
    statCard("یادداشت", r.notes) +
    statCard("یادآوری", r.rems) +
    statCard("ستاره‌دار", r.pins) +
    statCard("رنگی", r.colored) +
    statCard("مناسبت/تعطیل", r.holidays) +
    "</div>";
}

function renderCountdownFormList() {
  const box = document.getElementById("countdown-manage-list");
  const list = loadCountdowns();
  if (!list.length) {
    box.innerHTML = '<p class="day-summary-empty">شمارش‌معکوسی ثبت نشده</p>';
    return;
  }
  box.innerHTML = list
    .map((c) => {
      const left = daysUntil(c.gy, c.gm, c.gd);
      return (
        '<div class="trash-item"><div><strong>' +
        escapeHtml(c.title) +
        "</strong><span>" +
        toPersianDigits(c.gd) +
        "/" +
        toPersianDigits(c.gm) +
        "/" +
        toPersianDigits(c.gy) +
        " · " +
        (left >= 0 ? toPersianDigits(left) + " روز مانده" : "گذشته") +
        '</span></div><button type="button" class="manage-del-btn cd-rm" data-id="' +
        c.id +
        '">حذف</button></div>'
      );
    })
    .join("");
  box.querySelectorAll(".cd-rm").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeCountdown(btn.dataset.id);
      renderCountdownFormList();
      renderCountdownStrip();
    });
  });
}

function setupExtras() {
  applyShiftVisibility();
  applyFocusMode();
  renderCountdownStrip();
  purgeOldTrash();

  document.getElementById("open-extras-btn")?.addEventListener("click", () =>
    openExtrasModal("templates")
  );
  document.getElementById("focus-toggle-btn")?.addEventListener("click", () => {
    setFocusMode(!isFocusMode());
    showToast(isFocusMode() ? "حالت تمرکز فعال شد" : "حالت تمرکز خاموش شد");
  });
  document.getElementById("extras-close-x")?.addEventListener("click", closeExtrasModal);
  document.getElementById("extras-close-btn")?.addEventListener("click", closeExtrasModal);
  document.getElementById("extras-backdrop")?.addEventListener("click", closeExtrasModal);

  [
    "templates",
    "copy",
    "countdown",
    "trash",
    "report",
    "year",
    "security",
    "more"
  ].forEach((t) => {
    document.getElementById("extab-" + t)?.addEventListener("click", () => switchExtrasTab(t));
  });

  // templates
  document.querySelectorAll(".tpl-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tpl = NOTE_TEMPLATES.find((t) => t.id === btn.dataset.tpl);
      if (!tpl) return;
      const { gy, gm, gd } = getCurrentSelectedGregorian();
      const existing = typeof getNote === "function" ? getNote(gy, gm, gd) : "";
      const text = existing ? existing + "\n\n" + tpl.text : tpl.text;
      if (typeof setNote === "function") setNote(gy, gm, gd, text);
      showToast("قالب «" + tpl.label + "» افزوده شد");
      renderCalendar();
      if (typeof openNoteDialog === "function") openNoteDialog();
    });
  });

  // pin / color quick actions on day tools
  document.getElementById("pin-day-btn")?.addEventListener("click", () => {
    const { gy, gm, gd } = getCurrentSelectedGregorian();
    const on = togglePin(gy, gm, gd);
    showToast(on ? "روز ستاره‌دار شد" : "ستاره برداشته شد");
    renderCalendar();
  });
  document.getElementById("day-color-select")?.addEventListener("change", (e) => {
    const { gy, gm, gd } = getCurrentSelectedGregorian();
    setDayColor(gy, gm, gd, e.target.value);
    renderCalendar();
    showToast("رنگ روز ذخیره شد");
  });

  // copy day
  document.getElementById("copy-day-btn")?.addEventListener("click", () => {
    const from = getCurrentSelectedGregorian();
    const raw = (document.getElementById("copy-target-days").value || "").trim();
    // format: comma separated jalali days in current view month, or relative +1 +2
    if (!raw) {
      showToast("روزهای مقصد را وارد کنید", "error");
      return;
    }
    const opts = {
      note: document.getElementById("copy-note").checked,
      reminders: document.getElementById("copy-rem").checked,
      color: document.getElementById("copy-color").checked,
      pin: document.getElementById("copy-pin").checked
    };
    const targets = [];
    raw.split(/[,\s]+/).forEach((part) => {
      const p = part.trim();
      if (!p) return;
      if (p.startsWith("+") || p.startsWith("-")) {
        const delta = parseInt(p, 10);
        if (Number.isNaN(delta)) return;
        const dt = new Date(from.gy, from.gm - 1, from.gd + delta);
        targets.push({ gy: dt.getFullYear(), gm: dt.getMonth() + 1, gd: dt.getDate() });
      } else {
        const jd = parseInt(normalizeYearInput(p), 10);
        if (!jd) return;
        try {
          const g = toGregorian(viewYear, viewMonth, jd);
          targets.push({ gy: g.gy, gm: g.gm, gd: g.gd });
        } catch (_) {}
      }
    });
    if (!targets.length) {
      showToast("مقصد معتبر نیست", "error");
      return;
    }
    copyDayData(from, targets, opts);
    renderCalendar();
    showToast("کپی روی " + toPersianDigits(targets.length) + " روز انجام شد");
  });

  // countdown add
  document.getElementById("cd-add-btn")?.addEventListener("click", () => {
    const title = (document.getElementById("cd-title").value || "").trim();
    const jy = parseInt(normalizeYearInput(document.getElementById("cd-jy").value), 10);
    const jm = parseInt(normalizeYearInput(document.getElementById("cd-jm").value), 10);
    const jd = parseInt(normalizeYearInput(document.getElementById("cd-jd").value), 10);
    if (!title || !jy || !jm || !jd) {
      showToast("عنوان و تاریخ را کامل وارد کنید", "error");
      return;
    }
    try {
      const g = toGregorian(jy, jm, jd);
      addCountdown(title, g.gy, g.gm, g.gd);
      document.getElementById("cd-title").value = "";
      renderCountdownFormList();
      renderCountdownStrip();
      showToast("شمارش‌معکوس اضافه شد");
    } catch (e) {
      showToast("تاریخ نامعتبر", "error");
    }
  });

  // attachment backup
  document.getElementById("att-backup-btn")?.addEventListener("click", async () => {
    try {
      const n = await exportAttachmentsBackup();
      showToast("پشتیبان " + toPersianDigits(n) + " پیوست دانلود شد");
    } catch (e) {
      console.error(e);
      showToast("خطا در پشتیبان پیوست‌ها", "error");
    }
  });
  document.getElementById("att-restore-btn")?.addEventListener("click", () => {
    document.getElementById("att-restore-file").click();
  });
  document.getElementById("att-restore-file")?.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const n = await importAttachmentsBackup(file);
      showToast(toPersianDigits(n) + " پیوست بازیابی شد");
      if (typeof refreshAttachmentIndicators === "function") refreshAttachmentIndicators();
    } catch (err) {
      console.error(err);
      showToast("فایل پشتیبان نامعتبر است", "error");
    }
  });

  // security PIN
  document.getElementById("pin-save-btn")?.addEventListener("click", () => {
    const p1 = document.getElementById("pin-input").value;
    const p2 = document.getElementById("pin-input2").value;
    if (!/^\d{4,8}$/.test(p1)) {
      showToast("PIN باید ۴ تا ۸ رقم باشد", "error");
      return;
    }
    if (p1 !== p2) {
      showToast("تکرار PIN یکسان نیست", "error");
      return;
    }
    setPinHash(p1);
    document.getElementById("pin-input").value = "";
    document.getElementById("pin-input2").value = "";
    showToast("قفل PIN فعال شد");
    switchExtrasTab("security");
  });
  document.getElementById("pin-clear-btn")?.addEventListener("click", async () => {
    const ok = await showConfirm("قفل PIN غیرفعال شود؟", "امنیت");
    if (!ok) return;
    setPinHash("");
    showToast("قفل PIN برداشته شد");
    switchExtrasTab("security");
  });

  document.getElementById("shift-visible-toggle")?.addEventListener("change", (e) => {
    setShiftVisible(e.target.checked);
    showToast(e.target.checked ? "نمایش شیفت روشن" : "نمایش شیفت خاموش");
  });
  document.getElementById("focus-mode-toggle")?.addEventListener("change", (e) => {
    setFocusMode(e.target.checked);
  });

  // unlock gate
  document.getElementById("pin-unlock-btn")?.addEventListener("click", () => {
    const v = document.getElementById("pin-unlock-input").value;
    if (checkPin(v)) {
      document.getElementById("pin-gate").classList.add("hidden");
      document.getElementById("pin-unlock-input").value = "";
      showToast("خوش آمدید");
    } else {
      showToast("PIN نادرست است", "error");
    }
  });

  if (isPinEnabled()) {
    document.getElementById("pin-gate")?.classList.remove("hidden");
  }

  // year nav
  document.getElementById("year-prev-btn")?.addEventListener("click", () => {
    const y = (parseInt(document.getElementById("year-view-label").textContent.replace(/[^\d]/g, ""), 10) || viewYear) - 1;
    // label is persian digits - use data
    renderYearView((window._yearViewY || viewYear) - 1);
    window._yearViewY = (window._yearViewY || viewYear) - 1;
  });
  document.getElementById("year-next-btn")?.addEventListener("click", () => {
    window._yearViewY = (window._yearViewY || viewYear) + 1;
    renderYearView(window._yearViewY);
  });
}

// Patch note delete to use soft delete — call from app if available
function extrasSoftDeleteNoteHook(gy, gm, gd) {
  softDeleteNote(gy, gm, gd);
}

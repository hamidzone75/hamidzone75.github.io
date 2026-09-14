/**
 * Day attachments via IndexedDB
 * Supports any file type; text can be edited in-app
 */

const ATT_DB_NAME = "calendarAttachmentsDB";
const ATT_DB_VERSION = 1;
const ATT_STORE = "files";
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB per file

let attDbPromise = null;

function openAttDb() {
  if (attDbPromise) return attDbPromise;
  attDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(ATT_DB_NAME, ATT_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ATT_STORE)) {
        const store = db.createObjectStore(ATT_STORE, { keyPath: "id" });
        store.createIndex("dayKey", "dayKey", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return attDbPromise;
}

function dayKeyFromParts(gy, gm, gd) {
  return gy + "-" + String(gm).padStart(2, "0") + "-" + String(gd).padStart(2, "0");
}

function newAttId() {
  return "a_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function guessKind(mime, name) {
  const m = (mime || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (m.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) return "image";
  if (m.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/.test(n)) return "audio";
  if (m.startsWith("video/") || /\.(mp4|webm|mov|mkv|avi)$/.test(n)) return "video";
  if (m.startsWith("text/") || /\.(txt|md|csv|json|log|html?|css|js)$/.test(n)) return "text";
  return "file";
}

async function listAttachments(gy, gm, gd) {
  const db = await openAttDb();
  const dayKey = dayKeyFromParts(gy, gm, gd);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATT_STORE, "readonly");
    const idx = tx.objectStore(ATT_STORE).index("dayKey");
    const req = idx.getAll(dayKey);
    req.onsuccess = () => {
      const rows = (req.result || []).map((r) => ({
        id: r.id,
        dayKey: r.dayKey,
        name: r.name,
        mime: r.mime,
        size: r.size,
        kind: r.kind,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      }));
      rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

async function hasAttachments(gy, gm, gd) {
  const list = await listAttachments(gy, gm, gd);
  return list.length > 0;
}

async function getAttachment(id) {
  const db = await openAttDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATT_STORE, "readonly");
    const req = tx.objectStore(ATT_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveAttachmentRecord(rec) {
  const db = await openAttDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATT_STORE, "readwrite");
    tx.objectStore(ATT_STORE).put(rec);
    tx.oncomplete = () => resolve(rec);
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteAttachment(id) {
  const db = await openAttDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATT_STORE, "readwrite");
    tx.objectStore(ATT_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function addFilesToDay(gy, gm, gd, fileList) {
  const dayKey = dayKeyFromParts(gy, gm, gd);
  const files = Array.from(fileList || []);
  const saved = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("FILE_TOO_LARGE:" + file.name);
    }
    const buf = await file.arrayBuffer();
    const rec = {
      id: newAttId(),
      dayKey,
      name: file.name || "file",
      mime: file.type || "application/octet-stream",
      size: file.size,
      kind: guessKind(file.type, file.name),
      blob: new Blob([buf], { type: file.type || "application/octet-stream" }),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await saveAttachmentRecord(rec);
    saved.push(rec);
  }
  return saved;
}

function formatBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}

function kindIcon(kind) {
  if (kind === "image") return "🖼️";
  if (kind === "audio") return "🎵";
  if (kind === "video") return "🎬";
  if (kind === "text") return "📄";
  return "📎";
}

// ---- UI ----
let attContext = null; // {gy,gm,gd}
let attObjectUrls = [];

function revokeAttUrls() {
  attObjectUrls.forEach((u) => {
    try {
      URL.revokeObjectURL(u);
    } catch (_) {}
  });
  attObjectUrls = [];
}

async function openAttachmentsDialog() {
  const { gy, gm, gd } = getCurrentSelectedGregorian();
  attContext = { gy, gm, gd };
  let info;
  try {
    info = getAllDatesFor(gy, gm, gd);
    document.getElementById("att-date-label").textContent =
      info.jalali.weekday + " — " + formatJalali(info);
  } catch (_) {
    document.getElementById("att-date-label").textContent = dayKeyFromParts(gy, gm, gd);
  }
  document.getElementById("attachments-modal").classList.remove("hidden");
  document.getElementById("att-preview").classList.add("hidden");
  document.getElementById("att-text-editor").classList.add("hidden");
  if (typeof Sounds !== "undefined") Sounds.open();
  await renderAttachmentsList();
}

function closeAttachmentsDialog() {
  document.getElementById("attachments-modal").classList.add("hidden");
  revokeAttUrls();
  attContext = null;
  if (typeof Sounds !== "undefined") Sounds.click();
}

async function renderAttachmentsList() {
  const box = document.getElementById("att-list");
  if (!box || !attContext) return;
  const list = await listAttachments(attContext.gy, attContext.gm, attContext.gd);
  if (!list.length) {
    box.innerHTML = '<p class="day-summary-empty">پیوستی برای این روز نیست</p>';
    return;
  }
  box.innerHTML = list
    .map((a) => {
      return (
        '<div class="att-item" data-id="' +
        a.id +
        '">' +
        '<div class="att-main">' +
        '<span class="att-icon">' +
        kindIcon(a.kind) +
        "</span>" +
        '<div class="att-meta"><strong>' +
        escapeHtml(a.name) +
        "</strong>" +
        "<span>" +
        escapeHtml(a.mime || "file") +
        " · " +
        formatBytes(a.size || 0) +
        "</span></div></div>" +
        '<div class="att-actions">' +
        '<button type="button" class="backup-btn att-open" data-id="' +
        a.id +
        '">باز کردن</button>' +
        (a.kind === "text"
          ? '<button type="button" class="backup-btn att-edit" data-id="' + a.id + '">ویرایش</button>'
          : "") +
        '<button type="button" class="manage-del-btn att-del" data-id="' +
        a.id +
        '">حذف</button>' +
        "</div></div>"
      );
    })
    .join("");

  box.querySelectorAll(".att-open").forEach((btn) => {
    btn.addEventListener("click", () => openAttachmentById(btn.dataset.id));
  });
  box.querySelectorAll(".att-edit").forEach((btn) => {
    btn.addEventListener("click", () => editTextAttachment(btn.dataset.id));
  });
  box.querySelectorAll(".att-del").forEach((btn) => {
    btn.addEventListener("click", () => removeAttachmentById(btn.dataset.id));
  });
}

async function openAttachmentById(id) {
  const rec = await getAttachment(id);
  if (!rec) {
    showToast("فایل پیدا نشد", "error");
    return;
  }
  const preview = document.getElementById("att-preview");
  const editor = document.getElementById("att-text-editor");
  editor.classList.add("hidden");
  revokeAttUrls();
  const url = URL.createObjectURL(rec.blob);
  attObjectUrls.push(url);

  if (rec.kind === "image") {
    preview.classList.remove("hidden");
    preview.innerHTML =
      '<img class="att-preview-media" src="' +
      url +
      '" alt="' +
      escapeHtml(rec.name) +
      '" />' +
      '<a class="primary-btn att-download" href="' +
      url +
      '" download="' +
      escapeHtml(rec.name) +
      '">دانلود</a>';
  } else if (rec.kind === "audio") {
    preview.classList.remove("hidden");
    preview.innerHTML =
      '<audio class="att-preview-media" controls src="' +
      url +
      '"></audio>' +
      '<a class="primary-btn att-download" href="' +
      url +
      '" download="' +
      escapeHtml(rec.name) +
      '">دانلود</a>';
  } else if (rec.kind === "video") {
    preview.classList.remove("hidden");
    preview.innerHTML =
      '<video class="att-preview-media" controls src="' +
      url +
      '"></video>' +
      '<a class="primary-btn att-download" href="' +
      url +
      '" download="' +
      escapeHtml(rec.name) +
      '">دانلود</a>';
  } else if (rec.kind === "text") {
    const text = await rec.blob.text();
    preview.classList.remove("hidden");
    preview.innerHTML =
      '<pre class="att-text-view">' +
      escapeHtml(text) +
      "</pre>" +
      '<a class="primary-btn att-download" href="' +
      url +
      '" download="' +
      escapeHtml(rec.name) +
      '">دانلود</a>';
  } else {
    preview.classList.remove("hidden");
    preview.innerHTML =
      '<p class="modal-desc">پیش‌نمایش برای این نوع فایل در دسترس نیست. می‌توانید دانلود کنید.</p>' +
      '<a class="primary-btn att-download" href="' +
      url +
      '" download="' +
      escapeHtml(rec.name) +
      '">دانلود / باز کردن</a>';
  }
}

async function editTextAttachment(id) {
  const rec = await getAttachment(id);
  if (!rec || rec.kind !== "text") {
    showToast("فقط فایل متنی قابل ویرایش است", "error");
    return;
  }
  const text = await rec.blob.text();
  document.getElementById("att-preview").classList.add("hidden");
  const editor = document.getElementById("att-text-editor");
  editor.classList.remove("hidden");
  document.getElementById("att-text-area").value = text;
  editor.dataset.editId = id;
}

async function saveTextAttachmentEdit() {
  const editor = document.getElementById("att-text-editor");
  const id = editor.dataset.editId;
  if (!id) return;
  const rec = await getAttachment(id);
  if (!rec) return;
  const text = document.getElementById("att-text-area").value;
  const blob = new Blob([text], { type: rec.mime || "text/plain" });
  rec.blob = blob;
  rec.size = blob.size;
  rec.updatedAt = Date.now();
  await saveAttachmentRecord(rec);
  editor.classList.add("hidden");
  showToast("متن ذخیره شد");
  await renderAttachmentsList();
  await openAttachmentById(id);
  refreshAttachmentIndicators();
}

async function removeAttachmentById(id) {
  const ok = await showConfirm(
    "این پیوست برای همیشه حذف شود؟",
    "حذف پیوست"
  );
  if (!ok) return;
  await deleteAttachment(id);
  document.getElementById("att-preview").classList.add("hidden");
  document.getElementById("att-text-editor").classList.add("hidden");
  showToast("پیوست حذف شد");
  await renderAttachmentsList();
  refreshAttachmentIndicators();
}

async function onAttFilesSelected(e) {
  const files = e.target.files;
  e.target.value = "";
  if (!files || !files.length || !attContext) return;
  try {
    await addFilesToDay(attContext.gy, attContext.gm, attContext.gd, files);
    showToast("پیوست ذخیره شد");
    await renderAttachmentsList();
    refreshAttachmentIndicators();
  } catch (err) {
    console.error(err);
    if (String(err.message || "").startsWith("FILE_TOO_LARGE")) {
      showToast("حجم فایل بیش از ۲۵ مگابایت است", "error");
    } else {
      showToast("خطا در ذخیره پیوست", "error");
    }
  }
}

async function refreshAttachmentIndicators() {
  // header button
  try {
    const { gy, gm, gd } = getCurrentSelectedGregorian();
    const btn = document.getElementById("attach-btn");
    if (btn) {
      const has = await hasAttachments(gy, gm, gd);
      btn.classList.toggle("has-attach", has);
    }
  } catch (_) {}

  // calendar dots — re-render is heavy; mark cells async
  const cells = document.querySelectorAll(".day-cell[data-gy]");
  for (const cell of cells) {
    const gy = +cell.dataset.gy;
    const gm = +cell.dataset.gm;
    const gd = +cell.dataset.gd;
    if (!gy) continue;
    hasAttachments(gy, gm, gd).then((has) => {
      let dot = cell.querySelector(".att-dot");
      if (has && !dot) {
        dot = document.createElement("span");
        dot.className = "att-dot";
        dot.textContent = "📎";
        dot.setAttribute("aria-hidden", "true");
        cell.appendChild(dot);
      } else if (!has && dot) {
        dot.remove();
      }
    });
  }
}

function setupAttachments() {
  document.getElementById("attach-btn")?.addEventListener("click", openAttachmentsDialog);
  document.getElementById("close-att-modal")?.addEventListener("click", closeAttachmentsDialog);
  document.getElementById("close-att-btn")?.addEventListener("click", closeAttachmentsDialog);
  document.getElementById("att-backdrop")?.addEventListener("click", closeAttachmentsDialog);
  document.getElementById("att-add-btn")?.addEventListener("click", () => {
    document.getElementById("att-file-input")?.click();
  });
  document.getElementById("att-file-input")?.addEventListener("change", onAttFilesSelected);
  document.getElementById("att-text-save")?.addEventListener("click", saveTextAttachmentEdit);
  document.getElementById("att-text-cancel")?.addEventListener("click", () => {
    document.getElementById("att-text-editor").classList.add("hidden");
  });
}

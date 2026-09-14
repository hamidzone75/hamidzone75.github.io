/**
 * Day attachments via IndexedDB (ArrayBuffer storage for mobile reliability)
 */

const ATT_DB_NAME = "calendarAttachmentsDB";
const ATT_DB_VERSION = 2;
const ATT_STORE = "files";
const MAX_FILE_BYTES = 25 * 1024 * 1024;

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
    req.onerror = () => {
      attDbPromise = null;
      reject(req.error || new Error("IndexedDB open failed"));
    };
  });
  return attDbPromise;
}

function dayKeyFromParts(gy, gm, gd) {
  return (
    String(gy) +
    "-" +
    String(gm).padStart(2, "0") +
    "-" +
    String(gd).padStart(2, "0")
  );
}

function newAttId() {
  return "a_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function guessKind(mime, name) {
  const m = (mime || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (m.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(n)) return "image";
  if (m.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(n)) return "audio";
  if (m.startsWith("video/") || /\.(mp4|webm|mov|mkv|avi)$/i.test(n)) return "video";
  if (m.startsWith("text/") || /\.(txt|md|csv|json|log|html?|css|js)$/i.test(n)) return "text";
  return "file";
}

function recordToBlob(rec) {
  if (!rec) return null;
  if (rec.blob instanceof Blob) return rec.blob;
  if (rec.data != null) {
    return new Blob([rec.data], { type: rec.mime || "application/octet-stream" });
  }
  return null;
}

async function listAttachments(gy, gm, gd) {
  const db = await openAttDb();
  const dayKey = dayKeyFromParts(gy, gm, gd);
  return new Promise((resolve, reject) => {
    try {
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
          kind: r.kind || guessKind(r.mime, r.name),
          createdAt: r.createdAt,
          updatedAt: r.updatedAt
        }));
        rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

async function hasAttachments(gy, gm, gd) {
  try {
    const list = await listAttachments(gy, gm, gd);
    return list.length > 0;
  } catch (_) {
    return false;
  }
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
    const store = tx.objectStore(ATT_STORE);
    const req = store.put(rec);
    req.onsuccess = () => resolve(rec);
    req.onerror = () => reject(req.error || new Error("put failed"));
    tx.onerror = () => reject(tx.error || new Error("tx failed"));
  });
}

async function deleteAttachment(id) {
  const db = await openAttDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ATT_STORE, "readwrite");
    const req = tx.objectStore(ATT_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function addFilesToDay(gy, gm, gd, fileList) {
  const dayKey = dayKeyFromParts(gy, gm, gd);
  const files = Array.from(fileList || []);
  if (!files.length) return [];
  const saved = [];
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("FILE_TOO_LARGE:" + (file.name || ""));
    }
    const buf = await file.arrayBuffer();
    const rec = {
      id: newAttId(),
      dayKey: dayKey,
      name: file.name || "file",
      mime: file.type || "application/octet-stream",
      size: file.size,
      kind: guessKind(file.type, file.name),
      // ArrayBuffer is more reliable than Blob across mobile browsers
      data: buf,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await saveAttachmentRecord(rec);
    saved.push({
      id: rec.id,
      dayKey: rec.dayKey,
      name: rec.name,
      mime: rec.mime,
      size: rec.size,
      kind: rec.kind
    });
  }
  return saved;
}

function formatBytes(n) {
  n = n || 0;
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

function safeEscape(str) {
  if (typeof escapeHtml === "function") return escapeHtml(str);
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- UI ----
let attContext = null;
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
  try {
    const sel = getCurrentSelectedGregorian();
    attContext = { gy: sel.gy, gm: sel.gm, gd: sel.gd };
  } catch (e) {
    console.error(e);
    showToast("روز انتخاب‌شده مشخص نیست", "error");
    return;
  }

  try {
    const info = getAllDatesFor(attContext.gy, attContext.gm, attContext.gd);
    document.getElementById("att-date-label").textContent =
      info.jalali.weekday + " — " + formatJalali(info);
  } catch (_) {
    document.getElementById("att-date-label").textContent = dayKeyFromParts(
      attContext.gy,
      attContext.gm,
      attContext.gd
    );
  }

  document.getElementById("attachments-modal").classList.remove("hidden");
  const preview = document.getElementById("att-preview");
  const editor = document.getElementById("att-text-editor");
  if (preview) {
    preview.classList.add("hidden");
    preview.innerHTML = "";
  }
  if (editor) editor.classList.add("hidden");
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
  box.innerHTML = '<p class="day-summary-empty">در حال بارگذاری…</p>';
  try {
    const list = await listAttachments(attContext.gy, attContext.gm, attContext.gd);
    if (!list.length) {
      box.innerHTML =
        '<p class="day-summary-empty">پیوستی برای این روز ثبت نشده است. با دکمه «افزودن فایل» یک فایل انتخاب کنید.</p>';
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
          safeEscape(a.name) +
          "</strong>" +
          "<span>" +
          safeEscape(a.mime || "file") +
          " · " +
          formatBytes(a.size || 0) +
          "</span></div></div>" +
          '<div class="att-actions">' +
          '<button type="button" class="backup-btn att-open" data-id="' +
          a.id +
          '">باز کردن</button>' +
          (a.kind === "text"
            ? '<button type="button" class="backup-btn att-edit" data-id="' +
              a.id +
              '">ویرایش</button>'
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
  } catch (e) {
    console.error(e);
    box.innerHTML =
      '<p class="day-summary-empty">خطا در خواندن پیوست‌ها. فضای ذخیره‌سازی مرورگر را بررسی کنید.</p>';
  }
}

async function openAttachmentById(id) {
  const rec = await getAttachment(id);
  if (!rec) {
    showToast("فایل پیدا نشد", "error");
    return;
  }
  const blob = recordToBlob(rec);
  if (!blob) {
    showToast("داده فایل ناقص است", "error");
    return;
  }
  const preview = document.getElementById("att-preview");
  const editor = document.getElementById("att-text-editor");
  if (editor) editor.classList.add("hidden");
  revokeAttUrls();
  const url = URL.createObjectURL(blob);
  attObjectUrls.push(url);
  const kind = rec.kind || guessKind(rec.mime, rec.name);
  const name = safeEscape(rec.name || "file");

  if (!preview) return;
  preview.classList.remove("hidden");

  if (kind === "image") {
    preview.innerHTML =
      '<img class="att-preview-media" src="' +
      url +
      '" alt="' +
      name +
      '" />' +
      '<a class="primary-btn att-download" href="' +
      url +
      '" download="' +
      name +
      '">دانلود</a>';
  } else if (kind === "audio") {
    preview.innerHTML =
      '<audio class="att-preview-media" controls src="' +
      url +
      '"></audio>' +
      '<a class="primary-btn att-download" href="' +
      url +
      '" download="' +
      name +
      '">دانلود</a>';
  } else if (kind === "video") {
    preview.innerHTML =
      '<video class="att-preview-media" controls src="' +
      url +
      '"></video>' +
      '<a class="primary-btn att-download" href="' +
      url +
      '" download="' +
      name +
      '">دانلود</a>';
  } else if (kind === "text") {
    const text = await blob.text();
    preview.innerHTML =
      '<pre class="att-text-view">' +
      safeEscape(text) +
      "</pre>" +
      '<a class="primary-btn att-download" href="' +
      url +
      '" download="' +
      name +
      '">دانلود</a>';
  } else {
    preview.innerHTML =
      '<p class="modal-desc">پیش‌نمایش برای این نوع در دسترس نیست. می‌توانید دانلود کنید.</p>' +
      '<a class="primary-btn att-download" href="' +
      url +
      '" download="' +
      name +
      '">دانلود / باز کردن</a>';
  }
}

async function editTextAttachment(id) {
  const rec = await getAttachment(id);
  if (!rec) {
    showToast("فایل پیدا نشد", "error");
    return;
  }
  const blob = recordToBlob(rec);
  if (!blob) {
    showToast("داده فایل ناقص است", "error");
    return;
  }
  const kind = rec.kind || guessKind(rec.mime, rec.name);
  if (kind !== "text") {
    showToast("فقط فایل متنی قابل ویرایش است", "error");
    return;
  }
  const text = await blob.text();
  document.getElementById("att-preview")?.classList.add("hidden");
  const editor = document.getElementById("att-text-editor");
  if (!editor) return;
  editor.classList.remove("hidden");
  document.getElementById("att-text-area").value = text;
  editor.dataset.editId = id;
}

async function saveTextAttachmentEdit() {
  const editor = document.getElementById("att-text-editor");
  const id = editor && editor.dataset.editId;
  if (!id) return;
  const rec = await getAttachment(id);
  if (!rec) return;
  const text = document.getElementById("att-text-area").value;
  const enc = new TextEncoder().encode(text);
  // copy to ArrayBuffer
  const buf = enc.buffer.slice(enc.byteOffset, enc.byteOffset + enc.byteLength);
  rec.data = buf;
  delete rec.blob;
  rec.size = enc.byteLength;
  rec.mime = rec.mime || "text/plain";
  rec.kind = "text";
  rec.updatedAt = Date.now();
  await saveAttachmentRecord(rec);
  editor.classList.add("hidden");
  showToast("متن ذخیره شد");
  await renderAttachmentsList();
  await openAttachmentById(id);
  refreshAttachmentIndicators();
}

async function removeAttachmentById(id) {
  const ok = await showConfirm("این پیوست برای همیشه حذف شود؟", "حذف پیوست");
  if (!ok) return;
  await deleteAttachment(id);
  document.getElementById("att-preview")?.classList.add("hidden");
  document.getElementById("att-text-editor")?.classList.add("hidden");
  showToast("پیوست حذف شد");
  await renderAttachmentsList();
  refreshAttachmentIndicators();
}

async function handleSelectedFiles(files) {
  if (!files || !files.length) {
    showToast("فایلی انتخاب نشد", "error");
    return;
  }
  if (!attContext) {
    showToast("ابتدا یک روز را انتخاب کنید", "error");
    return;
  }
  try {
    const saved = await addFilesToDay(
      attContext.gy,
      attContext.gm,
      attContext.gd,
      files
    );
    showToast(
      (typeof toPersianDigits === "function"
        ? toPersianDigits(saved.length)
        : saved.length) + " فایل پیوست شد"
    );
    await renderAttachmentsList();
    refreshAttachmentIndicators();
  } catch (err) {
    console.error(err);
    if (String(err && err.message).startsWith("FILE_TOO_LARGE")) {
      showToast("حجم فایل بیش از ۲۵ مگابایت است", "error");
    } else {
      showToast("خطا در ذخیره پیوست — اجازه ذخیره‌سازی را بررسی کنید", "error");
    }
  }
}

async function onAttFilesSelected(e) {
  const files = e.target.files;
  // reset so same file can be picked again
  const input = e.target;
  const list = files ? Array.from(files) : [];
  input.value = "";
  await handleSelectedFiles(list);
}

/** Prefer File System Access API when available (no mic/camera shortcuts) */
async function pickFilesModern() {
  if (typeof window.showOpenFilePicker === "function") {
    try {
      const handles = await window.showOpenFilePicker({
        multiple: true,
        excludeAcceptAllOption: false
      });
      const files = [];
      for (const h of handles) {
        files.push(await h.getFile());
      }
      return files;
    } catch (e) {
      // user cancelled or not allowed — fall through
      if (e && e.name === "AbortError") return null;
      console.warn("showOpenFilePicker failed, fallback to input", e);
    }
  }
  return undefined; // signal fallback
}

async function onAddAttachmentClick(e) {
  if (e) e.preventDefault();
  const modern = await pickFilesModern();
  if (modern === null) return; // cancelled
  if (Array.isArray(modern)) {
    await handleSelectedFiles(modern);
    return;
  }
  // Classic file input (must not use capture; avoid display:none on some WebViews)
  const input = document.getElementById("att-file-input");
  if (!input) {
    showToast("ورودی فایل یافت نشد", "error");
    return;
  }
  input.value = "";
  input.click();
}

async function refreshAttachmentIndicators() {
  try {
    const { gy, gm, gd } = getCurrentSelectedGregorian();
    const btn = document.getElementById("attach-btn");
    if (btn) {
      const has = await hasAttachments(gy, gm, gd);
      btn.classList.toggle("has-attach", has);
    }
  } catch (_) {}

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
  document.getElementById("att-add-btn")?.addEventListener("click", onAddAttachmentClick);
  document.getElementById("att-file-input")?.addEventListener("change", onAttFilesSelected);
  document.getElementById("att-text-save")?.addEventListener("click", saveTextAttachmentEdit);
  document.getElementById("att-text-cancel")?.addEventListener("click", () => {
    document.getElementById("att-text-editor")?.classList.add("hidden");
  });
}

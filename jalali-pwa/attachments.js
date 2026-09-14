/**
 * Day file attachments — IndexedDB (ArrayBuffer)
 * Reliable file picker via <label for="..."> (no capture, no mic)
 */

const ATT_DB_NAME = "calendarAttachmentsDB";
const ATT_DB_VERSION = 2;
const ATT_STORE = "files";
const MAX_FILE_BYTES = 25 * 1024 * 1024;

let attDbPromise = null;
let attContext = null;
let attObjectUrls = [];

function openAttDb() {
  if (attDbPromise) return attDbPromise;
  attDbPromise = new Promise(function (resolve, reject) {
    var req = indexedDB.open(ATT_DB_NAME, ATT_DB_VERSION);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(ATT_STORE)) {
        var store = db.createObjectStore(ATT_STORE, { keyPath: "id" });
        store.createIndex("dayKey", "dayKey", { unique: false });
      }
    };
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function () {
      reject(req.error);
    };
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
  var m = (mime || "").toLowerCase();
  var n = (name || "").toLowerCase();
  if (m.indexOf("image/") === 0 || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(n)) return "image";
  if (m.indexOf("audio/") === 0 || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(n)) return "audio";
  if (m.indexOf("video/") === 0 || /\.(mp4|webm|mov|mkv|avi)$/i.test(n)) return "video";
  if (m.indexOf("text/") === 0 || /\.(txt|md|csv|json|log|html?|css|js)$/i.test(n)) return "text";
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

async function listAttachments(gy, gm, gd) {
  var db = await openAttDb();
  var dayKey = dayKeyFromParts(gy, gm, gd);
  return new Promise(function (resolve, reject) {
    try {
      var tx = db.transaction(ATT_STORE, "readonly");
      var idx = tx.objectStore(ATT_STORE).index("dayKey");
      var req = idx.getAll(dayKey);
      req.onsuccess = function () {
        var rows = (req.result || []).map(function (r) {
          return {
            id: r.id,
            dayKey: r.dayKey,
            name: r.name,
            mime: r.mime,
            size: r.size,
            kind: r.kind || guessKind(r.mime, r.name),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt
          };
        });
        rows.sort(function (a, b) {
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        resolve(rows);
      };
      req.onerror = function () {
        reject(req.error);
      };
    } catch (e) {
      reject(e);
    }
  });
}

async function hasAttachments(gy, gm, gd) {
  try {
    var list = await listAttachments(gy, gm, gd);
    return list.length > 0;
  } catch (_) {
    return false;
  }
}

async function getAttachment(id) {
  var db = await openAttDb();
  return new Promise(function (resolve, reject) {
    var tx = db.transaction(ATT_STORE, "readonly");
    var req = tx.objectStore(ATT_STORE).get(id);
    req.onsuccess = function () {
      resolve(req.result || null);
    };
    req.onerror = function () {
      reject(req.error);
    };
  });
}

async function saveAttachmentRecord(rec) {
  var db = await openAttDb();
  return new Promise(function (resolve, reject) {
    var tx = db.transaction(ATT_STORE, "readwrite");
    var store = tx.objectStore(ATT_STORE);
    var req = store.put(rec);
    req.onsuccess = function () {
      resolve(rec);
    };
    req.onerror = function () {
      reject(req.error || new Error("put failed"));
    };
    tx.onerror = function () {
      reject(tx.error || new Error("tx failed"));
    };
  });
}

async function deleteAttachment(id) {
  var db = await openAttDb();
  return new Promise(function (resolve, reject) {
    var tx = db.transaction(ATT_STORE, "readwrite");
    var req = tx.objectStore(ATT_STORE).delete(id);
    req.onsuccess = function () {
      resolve();
    };
    req.onerror = function () {
      reject(req.error);
    };
  });
}

async function addFilesToDay(gy, gm, gd, fileList) {
  var dayKey = dayKeyFromParts(gy, gm, gd);
  var files = Array.from(fileList || []);
  if (!files.length) return [];
  var saved = [];
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("FILE_TOO_LARGE:" + (file.name || ""));
    }
    var buf = await file.arrayBuffer();
    var rec = {
      id: newAttId(),
      dayKey: dayKey,
      name: file.name || "file",
      mime: file.type || "application/octet-stream",
      size: file.size,
      kind: guessKind(file.type, file.name),
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

function revokeAttUrls() {
  attObjectUrls.forEach(function (u) {
    try {
      URL.revokeObjectURL(u);
    } catch (_) {}
  });
  attObjectUrls = [];
}

async function openAttachmentsDialog() {
  try {
    var sel = getCurrentSelectedGregorian();
    attContext = { gy: sel.gy, gm: sel.gm, gd: sel.gd };
  } catch (e) {
    console.error(e);
    showToast("روز انتخاب‌شده مشخص نیست", "error");
    return;
  }

  try {
    var info = getAllDatesFor(attContext.gy, attContext.gm, attContext.gd);
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
  var preview = document.getElementById("att-preview");
  var editor = document.getElementById("att-text-editor");
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
  var box = document.getElementById("att-list");
  if (!box || !attContext) return;
  box.innerHTML = '<p class="day-summary-empty">در حال بارگذاری…</p>';
  try {
    var list = await listAttachments(attContext.gy, attContext.gm, attContext.gd);
    if (!list.length) {
      box.innerHTML =
        '<p class="day-summary-empty">پیوستی برای این روز نیست. از دکمه زیر یک فایل از حافظه انتخاب کنید.</p>';
      return;
    }
    box.innerHTML = list
      .map(function (a) {
        var editBtn =
          a.kind === "text"
            ? '<button type="button" class="backup-btn att-edit" data-id="' + a.id + '">ویرایش</button>'
            : "";
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
          "</strong><span>" +
          safeEscape(a.mime || "file") +
          " · " +
          formatBytes(a.size || 0) +
          "</span></div></div>" +
          '<div class="att-actions">' +
          '<button type="button" class="backup-btn att-open" data-id="' +
          a.id +
          '">باز کردن</button>' +
          editBtn +
          '<button type="button" class="manage-del-btn att-del" data-id="' +
          a.id +
          '">حذف</button>' +
          "</div></div>"
        );
      })
      .join("");

    box.querySelectorAll(".att-open").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openAttachmentById(btn.dataset.id);
      });
    });
    box.querySelectorAll(".att-edit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        editTextAttachment(btn.dataset.id);
      });
    });
    box.querySelectorAll(".att-del").forEach(function (btn) {
      btn.addEventListener("click", function () {
        removeAttachmentById(btn.dataset.id);
      });
    });
  } catch (e) {
    console.error(e);
    box.innerHTML = '<p class="day-summary-empty">خطا در خواندن پیوست‌ها</p>';
  }
}

async function openAttachmentById(id) {
  var rec = await getAttachment(id);
  if (!rec) {
    showToast("فایل پیدا نشد", "error");
    return;
  }
  var preview = document.getElementById("att-preview");
  var editor = document.getElementById("att-text-editor");
  if (editor) editor.classList.add("hidden");
  if (!preview) return;
  revokeAttUrls();
  var blob = recordToBlob(rec);
  if (!blob) {
    showToast("محتوای فایل قابل خواندن نیست", "error");
    return;
  }
  var url = URL.createObjectURL(blob);
  attObjectUrls.push(url);
  var kind = rec.kind || guessKind(rec.mime, rec.name);
  var dl =
    '<a class="primary-btn att-download" href="' +
    url +
    '" download="' +
    safeEscape(rec.name) +
    '">دانلود</a>';

  preview.classList.remove("hidden");
  if (kind === "image") {
    preview.innerHTML =
      '<img class="att-preview-media" src="' + url + '" alt="' + safeEscape(rec.name) + '" />' + dl;
  } else if (kind === "audio") {
    preview.innerHTML = '<audio class="att-preview-media" controls src="' + url + '"></audio>' + dl;
  } else if (kind === "video") {
    preview.innerHTML = '<video class="att-preview-media" controls src="' + url + '"></video>' + dl;
  } else if (kind === "text") {
    var text = await blob.text();
    preview.innerHTML = '<pre class="att-text-view">' + safeEscape(text) + "</pre>" + dl;
  } else {
    preview.innerHTML =
      '<p class="modal-desc">پیش‌نمایش این نوع فایل در دسترس نیست. می‌توانید دانلود کنید.</p>' + dl;
  }
}

async function editTextAttachment(id) {
  var rec = await getAttachment(id);
  if (!rec || (rec.kind !== "text" && guessKind(rec.mime, rec.name) !== "text")) {
    showToast("فقط فایل متنی قابل ویرایش است", "error");
    return;
  }
  var blob = recordToBlob(rec);
  var text = await blob.text();
  document.getElementById("att-preview").classList.add("hidden");
  var editor = document.getElementById("att-text-editor");
  editor.classList.remove("hidden");
  document.getElementById("att-text-area").value = text;
  editor.dataset.editId = id;
}

async function saveTextAttachmentEdit() {
  var editor = document.getElementById("att-text-editor");
  var id = editor.dataset.editId;
  if (!id) return;
  var rec = await getAttachment(id);
  if (!rec) return;
  var text = document.getElementById("att-text-area").value;
  var buf = new TextEncoder().encode(text);
  rec.data = buf.buffer;
  rec.size = buf.byteLength;
  rec.updatedAt = Date.now();
  delete rec.blob;
  await saveAttachmentRecord(rec);
  editor.classList.add("hidden");
  showToast("متن ذخیره شد");
  await renderAttachmentsList();
  await openAttachmentById(id);
  refreshAttachmentIndicators();
}

async function removeAttachmentById(id) {
  var ok = true;
  if (typeof showConfirm === "function") {
    ok = await showConfirm("این پیوست حذف شود؟", "حذف پیوست");
  }
  if (!ok) return;
  await deleteAttachment(id);
  document.getElementById("att-preview").classList.add("hidden");
  document.getElementById("att-text-editor").classList.add("hidden");
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
    var saved = await addFilesToDay(attContext.gy, attContext.gm, attContext.gd, files);
    showToast(
      (typeof toPersianDigits === "function" ? toPersianDigits(saved.length) : saved.length) +
        " فایل پیوست شد"
    );
    await renderAttachmentsList();
    refreshAttachmentIndicators();
  } catch (err) {
    console.error(err);
    if (String(err && err.message).indexOf("FILE_TOO_LARGE") === 0) {
      showToast("حجم فایل بیش از ۲۵ مگابایت است", "error");
    } else {
      showToast("خطا در ذخیره پیوست", "error");
    }
  }
}

function onAttFilesSelected(e) {
  var input = e.target;
  var list = input.files ? Array.from(input.files) : [];
  // reset after reading so same file can be chosen again
  setTimeout(function () {
    input.value = "";
  }, 0);
  handleSelectedFiles(list);
}

async function refreshAttachmentIndicators() {
  try {
    var sel = getCurrentSelectedGregorian();
    var btn = document.getElementById("attach-btn");
    if (btn) {
      var has = await hasAttachments(sel.gy, sel.gm, sel.gd);
      btn.classList.toggle("has-attach", has);
    }
  } catch (_) {}

  var cells = document.querySelectorAll(".day-cell[data-gy]");
  for (var i = 0; i < cells.length; i++) {
    (function (cell) {
      var gy = +cell.dataset.gy;
      var gm = +cell.dataset.gm;
      var gd = +cell.dataset.gd;
      if (!gy) return;
      hasAttachments(gy, gm, gd).then(function (has) {
        var dot = cell.querySelector(".att-dot");
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
    })(cells[i]);
  }
}

function setupAttachments() {
  document.getElementById("attach-btn")?.addEventListener("click", openAttachmentsDialog);
  document.getElementById("close-att-modal")?.addEventListener("click", closeAttachmentsDialog);
  document.getElementById("close-att-btn")?.addEventListener("click", closeAttachmentsDialog);
  document.getElementById("att-backdrop")?.addEventListener("click", closeAttachmentsDialog);
  // File input: use change only — open via <label for="att-file-input">
  document.getElementById("att-file-input")?.addEventListener("change", onAttFilesSelected);
  document.getElementById("att-text-save")?.addEventListener("click", saveTextAttachmentEdit);
  document.getElementById("att-text-cancel")?.addEventListener("click", function () {
    document.getElementById("att-text-editor")?.classList.add("hidden");
  });
}

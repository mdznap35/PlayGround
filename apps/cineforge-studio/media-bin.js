(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CineForgeMediaBin = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const DB_NAME = "cineforge-media-library";
  const DB_VERSION = 1;
  const STORE = "assets";
  const MAX_FILE_BYTES = 128 * 1024 * 1024;
  const MAX_LIBRARY_BYTES = 512 * 1024 * 1024;
  const MAX_ARCHIVE_BYTES = 160 * 1024 * 1024;
  const MAX_ASSETS = 500;
  const KIND_EXTENSIONS = {
    image: new Set(["png", "jpg", "jpeg", "webp"]),
    audio: new Set(["mp3", "wav", "m4a", "ogg", "aac", "flac"]),
    video: new Set(["mp4", "mov", "webm", "mkv"])
  };
  const SOURCE_TYPES = new Set(["user", "generated", "open_license", "licensed", "unknown"]);
  let databasePromise = null;

  function extension(name) {
    const match = String(name || "").toLowerCase().match(/\.([a-z0-9]{1,8})$/);
    return match ? match[1] : "";
  }

  function inferKind(name) {
    const ext = extension(name);
    for (const [kind, extensions] of Object.entries(KIND_EXTENSIONS)) {
      if (extensions.has(ext)) return kind;
    }
    throw new TypeError("نوع الملف غير مدعوم. الأنواع المقبولة: PNG/JPG/WEBP وMP3/WAV/M4A/OGG/AAC/FLAC وMP4/MOV/WEBM/MKV.");
  }

  function cleanText(value, maxLength, fallback) {
    return String(value == null ? fallback || "" : value).replace(/\u0000/g, "").trim().slice(0, maxLength);
  }

  function createId() {
    if (root.crypto && typeof root.crypto.randomUUID === "function") return root.crypto.randomUUID();
    return "asset-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }

  function safeStem(name) {
    const raw = String(name || "media").replace(/\.[^.]+$/, "").normalize("NFKC");
    const result = raw.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "").replace(/\.{2,}/g, ".").slice(0, 64);
    return result || "media";
  }

  function projectPath(asset) {
    if (!asset || !SOURCE_TYPES.has(asset.source_type || "unknown")) {
      throw new TypeError("سجل الأصل غير صالح.");
    }
    const kind = asset.kind;
    if (!Object.prototype.hasOwnProperty.call(KIND_EXTENSIONS, kind)) {
      throw new TypeError("فئة الأصل غير مدعومة للتصدير.");
    }
    const ext = extension(asset.name);
    if (!KIND_EXTENSIONS[kind].has(ext)) throw new TypeError("امتداد الملف لا يطابق فئته.");
    const directory = kind === "image" ? "assets" : kind === "audio" ? "audio" : "video";
    const idPrefix = cleanText(asset.id, 8, "asset").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "asset";
    return directory + "/" + idPrefix + "-" + safeStem(asset.name) + "." + ext;
  }

  function validateArchivePath(name) {
    if (typeof name !== "string" || !name || name.length > 240 || name.includes("\\") || name.includes("\u0000")) {
      throw new TypeError("مسار داخل الحزمة غير صالح.");
    }
    if (name.startsWith("/") || /^[a-z]:/i.test(name)) throw new TypeError("لا يسمح بمسارات مطلقة داخل الحزمة.");
    const parts = name.split("/");
    if (parts.some(part => !part || part === "." || part === "..")) throw new TypeError("مسار داخل الحزمة يحاول الخروج من مجلد المشروع.");
    return name;
  }

  function publicRecord(record) {
    const { blob, ...metadata } = record;
    return metadata;
  }

  function openDatabase() {
    if (databasePromise) return databasePromise;
    if (!root.indexedDB) return Promise.reject(new Error("المتصفح لا يدعم IndexedDB؛ تعذّر فتح مكتبة الوسائط المحلية."));
    databasePromise = new Promise((resolve, reject) => {
      const request = root.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("تعذّر فتح قاعدة مكتبة الوسائط."));
      request.onblocked = () => reject(new Error("قاعدة مكتبة الوسائط مشغولة في نافذة أخرى. أغلق النسخة الأخرى ثم أعد المحاولة."));
    }).catch(error => {
      databasePromise = null;
      throw error;
    });
    return databasePromise;
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("فشلت عملية تخزين الوسائط."));
      transaction.onabort = () => reject(transaction.error || new Error("أُلغيت عملية تخزين الوسائط."));
    });
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("فشلت قراءة مكتبة الوسائط."));
    });
  }

  async function digestFile(file) {
    if (!root.crypto || !root.crypto.subtle || typeof file.arrayBuffer !== "function") return null;
    const bytes = await file.arrayBuffer();
    const digest = await root.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
  }

  function unavailableMediaMetadata() {
    return {width:null,height:null,duration_seconds:null,metadata_status:"unavailable"};
  }

  async function inspectMediaMetadata(file, platform = root) {
    const kind = inferKind(file && file.name);
    if (kind === "image" && typeof platform.createImageBitmap === "function") {
      try {
        const bitmap = await platform.createImageBitmap(file);
        const result = Number(bitmap.width) > 0 && Number(bitmap.height) > 0
          ? {width:Number(bitmap.width),height:Number(bitmap.height),duration_seconds:null,metadata_status:"available"}
          : unavailableMediaMetadata();
        if (typeof bitmap.close === "function") bitmap.close();
        return result;
      } catch (_) {
        // Fall through to the browser image element when bitmap decoding is unavailable.
      }
    }

    const documentObject = platform.document;
    const urlApi = platform.URL;
    if (!documentObject || !urlApi || typeof urlApi.createObjectURL !== "function") {
      return unavailableMediaMetadata();
    }

    let objectUrl;
    try {
      objectUrl = urlApi.createObjectURL(file);
    } catch (_) {
      return unavailableMediaMetadata();
    }

    return new Promise(resolve => {
      const tag = kind === "image" ? "img" : kind === "video" ? "video" : "audio";
      const element = documentObject.createElement(tag);
      let settled = false;
      const finish = metadata => {
        if (settled) return;
        settled = true;
        element.onload = null;
        element.onerror = null;
        element.onloadedmetadata = null;
        try {
          if (typeof element.removeAttribute === "function") element.removeAttribute("src");
          if (typeof element.load === "function") element.load();
        } catch (_) {}
        try { urlApi.revokeObjectURL(objectUrl); } catch (_) {}
        resolve(metadata);
      };

      element.preload = "metadata";
      if (kind === "video") {
        element.muted = true;
        element.playsInline = true;
      }
      const onReady = () => {
        const width = kind === "audio" ? null : Number(kind === "image" ? (element.naturalWidth || element.width) : element.videoWidth);
        const height = kind === "audio" ? null : Number(kind === "image" ? (element.naturalHeight || element.height) : element.videoHeight);
        const duration = kind === "image" ? null : Number(element.duration);
        const dimensionsValid = kind === "audio" || (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0);
        const durationValid = kind === "image" || (Number.isFinite(duration) && duration >= 0);
        finish(dimensionsValid && durationValid
          ? {width,height,duration_seconds:duration,metadata_status:"available"}
          : unavailableMediaMetadata());
      };
      element.onload = kind === "image" ? onReady : null;
      element.onloadedmetadata = kind === "image" ? null : onReady;
      element.onerror = () => finish(unavailableMediaMetadata());
      try {
        element.src = objectUrl;
      } catch (_) {
        finish(unavailableMediaMetadata());
      }
    });
  }

  async function usage() {
    const db = await openDatabase();
    const transaction = db.transaction(STORE, "readonly");
    const records = await requestResult(transaction.objectStore(STORE).getAll());
    return {
      count: records.length,
      bytes: records.reduce((sum, item) => sum + Number(item.size || 0), 0),
      maxBytes: MAX_LIBRARY_BYTES
    };
  }

  async function list() {
    const db = await openDatabase();
    const transaction = db.transaction(STORE, "readonly");
    const records = await requestResult(transaction.objectStore(STORE).getAll());
    return records.map(publicRecord).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  async function get(id) {
    const db = await openDatabase();
    const transaction = db.transaction(STORE, "readonly");
    const record = await requestResult(transaction.objectStore(STORE).get(id));
    return record || null;
  }

  async function add(file, metadata = {}) {
    if (!file || typeof file.arrayBuffer !== "function" || typeof file.name !== "string") {
      throw new TypeError("اختر ملفاً محلياً صالحاً.");
    }
    if (!Number.isFinite(file.size) || file.size <= 0) throw new RangeError("الملف فارغ.");
    if (file.size > MAX_FILE_BYTES) throw new RangeError("الحد الأقصى لحجم الملف الواحد 128 ميغابايت.");
    const kind = inferKind(file.name);
    const current = await usage();
    if (current.count >= MAX_ASSETS) throw new RangeError("وصلت مكتبة الوسائط إلى حد 500 ملف.");
    if (current.bytes + file.size > MAX_LIBRARY_BYTES) throw new RangeError("تجاوزت مكتبة الوسائط سقف 512 ميغابايت. احذف ملفات غير مستخدمة أو صدّرها ثم أزلها.");
    const sourceType = SOURCE_TYPES.has(metadata.source_type) ? metadata.source_type : "unknown";
    const technicalMetadata = await inspectMediaMetadata(file);
    const record = {
      id: createId(),
      name: cleanText(file.name, 180, "media." + extension(file.name)),
      kind,
      mime: cleanText(file.type, 120, "application/octet-stream"),
      size: file.size,
      sha256: await digestFile(file),
      ...technicalMetadata,
      source_type: sourceType,
      source_ref: cleanText(metadata.source_ref, 500, ""),
      license: cleanText(metadata.license, 180, "غير محدد"),
      notes: cleanText(metadata.notes, 1000, ""),
      created_at: new Date().toISOString(),
      blob: file
    };
    const db = await openDatabase();
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).add(record);
    await transactionDone(transaction);
    return publicRecord(record);
  }

  async function remove(id) {
    const db = await openDatabase();
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).delete(id);
    await transactionDone(transaction);
  }

  function auditRights(records) {
    if (!Array.isArray(records)) throw new TypeError("سجلات الأصول يجب أن تكون قائمة.");
    const issues = [];
    const unspecified = new Set(["", "غير محدد", "غير معروف", "unknown", "n/a", "na", "none"]);
    for (const asset of records) {
      if (!asset || typeof asset !== "object") {
        issues.push({asset_id:null,name:"ملف غير معروف",code:"invalid_record",message:"سجل الأصل غير صالح."});
        continue;
      }
      const name = cleanText(asset.name, 180, "ملف بلا اسم");
      const sourceType = SOURCE_TYPES.has(asset.source_type) ? asset.source_type : "unknown";
      if (sourceType === "unknown") {
        issues.push({asset_id:asset.id || null,name,code:"unknown_source",message:"مصدر الأصل غير موثق."});
      }
      const license = cleanText(asset.license, 180, "").toLowerCase();
      // Selecting "user-created / personal" is an explicit ownership assertion in the UI.
      // External/generated assets still require a meaningful license or permission record.
      if (unspecified.has(license) && sourceType !== "user") {
        issues.push({asset_id:asset.id || null,name,code:"license_unspecified",message:"الترخيص أو الإذن غير محدد."});
      }
      if (["generated", "open_license", "licensed"].includes(sourceType) &&
          !cleanText(asset.source_ref, 500, "")) {
        issues.push({asset_id:asset.id || null,name,code:"source_reference_missing",message:"يلزم تسجيل المزود أو رابط المصدر أو مرجع الإذن."});
      }
    }
    return {ok:issues.length === 0,checked_assets:records.length,issue_count:issues.length,issues};
  }

  function auditPackageAssets(job, records) {
    if (!job || typeof job !== "object" || !Array.isArray(job.scenes)) {
      throw new TypeError("مهمة الرندر غير صالحة لفحص أصول المشروع.");
    }
    if (!Array.isArray(records)) throw new TypeError("سجلات مكتبة الوسائط غير صالحة.");

    const referencedPaths = [
      ...job.scenes.map(scene => scene && scene.image_file),
      job.voiceover_file,
      job.music_file
    ].filter(value => typeof value === "string" && value.trim()).map(value => value.trim());
    const uniquePaths = [...new Set(referencedPaths)];
    const byPath = new Map();
    const invalidRecords = [];
    const duplicatePaths = [];

    for (const asset of records) {
      try {
        const path = projectPath(asset);
        if (byPath.has(path)) duplicatePaths.push(path);
        else byPath.set(path, asset);
      } catch (error) {
        invalidRecords.push({
          asset_id:asset && asset.id || null,
          name:cleanText(asset && asset.name, 180, "ملف بلا اسم"),
          message:error && error.message ? error.message : "سجل أصل غير صالح."
        });
      }
    }

    const assets = uniquePaths.map(path => byPath.get(path)).filter(Boolean);
    const missingPaths = uniquePaths.filter(path => !byPath.has(path));
    const usedIds = new Set(assets.map(asset => asset.id));
    const unreferencedAssets = records.filter(asset => !usedIds.has(asset && asset.id));
    const expectedAspect = {"16:9":16/9,"9:16":9/16,"1:1":1}[job.aspect || "16:9"];
    const aspectMismatches = Number.isFinite(expectedAspect)
      ? assets.filter(asset => asset.kind === "image" && Number(asset.width) > 0 && Number(asset.height) > 0)
        .map(asset => ({
          asset_id:asset.id,
          name:asset.name,
          actual:Number(asset.width) / Number(asset.height),
          expected:expectedAspect
        }))
        .filter(item => Math.abs(item.actual - item.expected) / item.expected > 0.08)
      : [];
    const rightsAudit = auditRights(assets);

    return {
      ok:missingPaths.length === 0 && duplicatePaths.length === 0,
      referenced_paths:uniquePaths,
      assets,
      missing_paths:missingPaths,
      duplicate_paths:[...new Set(duplicatePaths)],
      invalid_records:invalidRecords,
      unreferenced_assets:unreferencedAssets,
      aspect_mismatches:aspectMismatches,
      rights_audit:rightsAudit
    };
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let value = n;
      for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      table[n] = value >>> 0;
    }
    return table;
  })();

  function crc32(value) {
    const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index++) crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function toUint8Array(value) {
    if (typeof value === "string") return new TextEncoder().encode(value);
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    throw new TypeError("محتوى ملف ZIP يجب أن يكون نصاً أو Blob أو ArrayBuffer أو Uint8Array.");
  }

  function dosTimestamp(date) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((Math.floor(date.getSeconds() / 2)) & 31),
      date: (((year - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31)
    };
  }

  function write16(view, offset, value) { view.setUint16(offset, value, true); }
  function write32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

  async function buildZip(entries, options = {}) {
    if (!Array.isArray(entries) || entries.length > 1000) throw new TypeError("قائمة ملفات الحزمة غير صالحة أو كبيرة جداً.");
    const maxBytes = Number.isFinite(options.maxBytes) ? options.maxBytes : MAX_ARCHIVE_BYTES;
    const seen = new Set();
    const prepared = [];
    let totalBytes = 0;
    for (const entry of entries) {
      const name = validateArchivePath(entry && entry.name);
      if (seen.has(name)) throw new TypeError("اسم ملف مكرر داخل الحزمة: " + name);
      seen.add(name);
      let data;
      if (entry.data && typeof entry.data.arrayBuffer === "function") {
        data = new Uint8Array(await entry.data.arrayBuffer());
      } else {
        data = toUint8Array(entry.data);
      }
      if (data.byteLength > 0xffffffff) throw new RangeError("ملف واحد أكبر من حدود ZIP32.");
      totalBytes += data.byteLength;
      if (totalBytes > maxBytes) throw new RangeError("حجم الحزمة يتجاوز الحد الحالي " + Math.round(maxBytes / (1024 * 1024)) + " ميغابايت. احذف ملفات غير مستخدمة أو أنشئ حزم أصغر.");
      if (totalBytes > 0xffffffff) throw new RangeError("الحزمة أكبر من حدود ZIP32.");
      prepared.push({name, nameBytes:new TextEncoder().encode(name), data, crc:crc32(data), stamp:dosTimestamp(new Date())});
    }

    const localParts = [];
    const centralParts = [];
    let localOffset = 0;
    for (const item of prepared) {
      const local = new Uint8Array(30 + item.nameBytes.length);
      const localView = new DataView(local.buffer);
      write32(localView,0,0x04034b50); write16(localView,4,20); write16(localView,6,0x0800);
      write16(localView,8,0); write16(localView,10,item.stamp.time); write16(localView,12,item.stamp.date);
      write32(localView,14,item.crc); write32(localView,18,item.data.length); write32(localView,22,item.data.length);
      write16(localView,26,item.nameBytes.length); write16(localView,28,0);
      local.set(item.nameBytes,30);
      localParts.push(local,item.data);

      const central = new Uint8Array(46 + item.nameBytes.length);
      const view = new DataView(central.buffer);
      write32(view,0,0x02014b50); write16(view,4,20); write16(view,6,20); write16(view,8,0x0800);
      write16(view,10,0); write16(view,12,item.stamp.time); write16(view,14,item.stamp.date);
      write32(view,16,item.crc); write32(view,20,item.data.length); write32(view,24,item.data.length);
      write16(view,28,item.nameBytes.length); write16(view,30,0); write16(view,32,0);
      write16(view,34,0); write16(view,36,0); write32(view,38,0); write32(view,42,localOffset);
      central.set(item.nameBytes,46);
      centralParts.push(central);
      localOffset += local.length + item.data.length;
    }

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    write32(endView,0,0x06054b50); write16(endView,4,0); write16(endView,6,0);
    write16(endView,8,prepared.length); write16(endView,10,prepared.length);
    write32(endView,12,centralSize); write32(endView,16,localOffset); write16(endView,20,0);
    return new root.Blob([...localParts,...centralParts,end], {type:"application/zip"});
  }

  return {
    MAX_FILE_BYTES, MAX_LIBRARY_BYTES, MAX_ARCHIVE_BYTES, MAX_ASSETS,
    inferKind, projectPath, validateArchivePath, crc32, buildZip,
    usage, list, get, add, remove, inspectMediaMetadata, auditRights, auditPackageAssets
  };
});

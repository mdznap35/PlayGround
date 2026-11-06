(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CineForgeCaptions = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_CUES = 500;
  const MAX_TEXT = 180;
  const EPSILON = 0.001;

  function parseTimestamp(value, decimal) {
    const token = String(value || "").trim();
    const match = token.match(/^(?:(\d{2,}):)?([0-5]?\d):([0-5]?\d)[,.](\d{3})$/);
    if (!match) throw new TypeError("طابع زمني غير صالح: " + token);
    const hours = match[1] == null ? 0 : Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    const millis = Number(match[4]);
    if (match[1] != null && minutes > 59) throw new TypeError("الدقائق في الطابع الزمني يجب أن تكون أقل من 60.");
    return hours * 3600 + minutes * 60 + seconds + millis / 1000;
  }

  function parseCueBlocks(input, mode) {
    const source = String(input == null ? "" : input).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    if (mode === "vtt" && !/^\s*WEBVTT(?:[ \t].*)?(?:\n|$)/i.test(source)) {
      throw new TypeError("ملف WebVTT يجب أن يبدأ بترويسة WEBVTT.");
    }
    const lines = source.split("\n");
    const cues = [];
    let index = mode === "vtt" ? lines.findIndex(line => /^WEBVTT(?:[ \t].*)?$/i.test(line.trim())) + 1 : 0;
    while (index < lines.length) {
      while (index < lines.length && !lines[index].trim()) index++;
      if (index >= lines.length) break;
      const first = lines[index].trim();
      if (mode === "vtt" && /^(NOTE|STYLE|REGION)(?:\s|$)/.test(first)) {
        while (index < lines.length && lines[index].trim()) index++;
        continue;
      }
      let cueId = "";
      let timing = first;
      if (!timing.includes("-->")) {
        cueId = timing;
        index++;
        if (index >= lines.length) throw new TypeError("معرّف ترجمة بلا سطر توقيت.");
        timing = lines[index].trim();
      }
      if (!timing.includes("-->")) throw new TypeError("سطر توقيت الترجمة غير صالح: " + timing);
      const parts = timing.split("-->");
      if (parts.length !== 2) throw new TypeError("يجب أن يحتوي سطر التوقيت على سهم واحد.");
      const startToken = parts[0].trim();
      const endToken = parts[1].trim().split(/\s+/)[0];
      const start = parseTimestamp(startToken, mode);
      const end = parseTimestamp(endToken, mode);
      index++;
      const textLines = [];
      while (index < lines.length && lines[index].trim()) {
        textLines.push(lines[index].trimEnd());
        index++;
      }
      const cueText = textLines.join("\n").trim();
      if (!cueText) throw new TypeError("يوجد مقطع ترجمة بلا نص.");
      cues.push({
        id: cueId && /^[a-zA-Z0-9_-]{1,120}$/.test(cueId) ? cueId : "caption-" + (cues.length + 1),
        scene_id: null,
        start,
        end,
        text: cueText
      });
      if (cues.length > MAX_CUES) throw new RangeError("الحد الأقصى 500 مقطع ترجمة.");
    }
    if (!cues.length) throw new TypeError("لم يتم العثور على أي مقطع ترجمة صالح.");
    return cues;
  }

  function parseSrt(input) {
    return parseCueBlocks(input, "srt");
  }

  function parseVtt(input) {
    return parseCueBlocks(input, "vtt");
  }

  function sceneRanges(scenes) {
    let cursor = 0;
    return (Array.isArray(scenes) ? scenes : []).map((scene, index) => {
      const start = cursor;
      const duration = Number(scene && scene.seconds);
      if (!Number.isFinite(duration) || duration <= 0) throw new TypeError("مدة المشهد " + (index + 1) + " غير صالحة.");
      cursor += duration;
      return {id:String(scene.id), start, end:cursor};
    });
  }

  function sceneAt(scenes, time) {
    const ranges = sceneRanges(scenes);
    if (!ranges.length) return null;
    const value = Math.max(0, Number(time) || 0);
    return (ranges.find(item => value >= item.start - EPSILON && value < item.end - EPSILON) || ranges[ranges.length - 1]).id;
  }

  function validate(cues, options) {
    const settings = options || {};
    const duration = Number(settings.duration);
    const scenes = Array.isArray(settings.scenes) ? settings.scenes : null;
    const ranges = scenes ? sceneRanges(scenes) : [];
    const byScene = new Map(ranges.map(item => [item.id, item]));
    if (!Array.isArray(cues) || cues.length > MAX_CUES) {
      throw new RangeError("قائمة الترجمة يجب أن تحتوي على 0 إلى 500 مقطع.");
    }
    if (settings.duration != null && (!Number.isFinite(duration) || duration <= 0)) {
      throw new TypeError("مدة المشروع غير صالحة.");
    }
    const normalized = cues.map((raw, index) => {
      const cue = raw && typeof raw === "object" ? raw : {};
      const id = String(cue.id || "caption-" + (index + 1)).trim().slice(0, 120);
      const start = Number(cue.start);
      const end = Number(cue.end);
      const text = String(cue.text == null ? "" : cue.text).replace(/\u0000/g, "").trim();
      const sceneId = cue.scene_id == null ? "" : String(cue.scene_id).trim();
      if (!id) throw new TypeError("كل مقطع ترجمة يحتاج معرّفاً.");
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
        throw new RangeError("توقيت مقطع الترجمة " + (index + 1) + " غير صالح.");
      }
      if (!text || text.length > MAX_TEXT || text.split("\n").length > 2) {
        throw new RangeError("نص المقطع " + (index + 1) + " يجب أن يكون بين 1 و180 حرفاً وعلى سطرين كحد أقصى.");
      }
      if (settings.duration != null && end > duration + EPSILON) {
        throw new RangeError("ينتهي مقطع الترجمة " + (index + 1) + " بعد نهاية الفيديو.");
      }
      if (scenes) {
        const range = byScene.get(sceneId);
        if (!range) throw new TypeError("المشهد المرتبط بمقطع الترجمة " + (index + 1) + " غير موجود.");
        if (start < range.start - EPSILON || end > range.end + EPSILON) {
          throw new RangeError("يجب أن يقع مقطع الترجمة كاملاً داخل مدة المشهد المرتبط به.");
        }
      }
      return {id, scene_id:sceneId || null, start, end, text};
    });
    const ids = new Set();
    normalized.forEach(cue => {
      if (ids.has(cue.id)) throw new TypeError("معرّفات مقاطع الترجمة يجب أن تكون فريدة.");
      ids.add(cue.id);
    });
    normalized.sort((a,b) => a.start - b.start || a.end - b.end);
    for (let index = 1; index < normalized.length; index++) {
      if (normalized[index].start < normalized[index - 1].end - EPSILON) {
        throw new RangeError("توجد مقاطع ترجمة متداخلة؛ عدّل التوقيت قبل التصدير.");
      }
    }
    return normalized;
  }

  function rebase(cues, oldScenes, newScenes) {
    const oldRanges = new Map(sceneRanges(oldScenes).map(range => [range.id, range]));
    const newRanges = new Map(sceneRanges(newScenes).map(range => [range.id, range]));
    return (Array.isArray(cues) ? cues : []).flatMap(cue => {
      if (!cue || typeof cue !== "object") return [];
      const before = oldRanges.get(String(cue.scene_id));
      const after = newRanges.get(String(cue.scene_id));
      if (!before || !after) return [];
      const relativeStart = Number(cue.start) - before.start;
      const relativeEnd = Number(cue.end) - before.start;
      const nextDuration = after.end - after.start;
      if (!Number.isFinite(relativeStart) || !Number.isFinite(relativeEnd) ||
          relativeStart < 0 || relativeStart >= nextDuration || relativeEnd <= 0) return [];
      const start = after.start + Math.max(0, relativeStart);
      const end = after.start + Math.min(nextDuration, relativeEnd);
      return end > start ? [{...cue, start, end}] : [];
    }).sort((a, b) => a.start - b.start || a.end - b.end);
  }

  function toMilliseconds(seconds) {
    return Math.max(0, Math.round(Number(seconds) * 1000));
  }

  function timestamp(seconds, separator) {
    const value = toMilliseconds(seconds);
    const hours = Math.floor(value / 3600000);
    const minutes = Math.floor((value % 3600000) / 60000);
    const secs = Math.floor((value % 60000) / 1000);
    const millis = value % 1000;
    const sep = separator || ",";
    return String(hours).padStart(2,"0") + ":" + String(minutes).padStart(2,"0") + ":" +
      String(secs).padStart(2,"0") + sep + String(millis).padStart(3,"0");
  }

  function exportSrt(cues, options) {
    return validate(cues, options).map((cue,index) =>
      (index + 1) + "\n" + timestamp(cue.start,",") + " --> " + timestamp(cue.end,",") + "\n" + cue.text
    ).join("\n\n") + "\n";
  }

  function exportVtt(cues, options) {
    return "WEBVTT\n\n" + validate(cues, options).map(cue =>
      cue.id + "\n" + timestamp(cue.start,".") + " --> " + timestamp(cue.end,".") + "\n" + cue.text
    ).join("\n\n") + "\n";
  }

  return {MAX_CUES, MAX_TEXT, parseTimestamp, parseSrt, parseVtt, validate, sceneRanges, sceneAt, rebase, timestamp, exportSrt, exportVtt};
});

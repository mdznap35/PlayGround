(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CineForgeStoryPlanImporter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA = "cineforge.story-plan";
  const MAX_SCENES = 40;
  const MAX_SCENE_SECONDS = 90;
  const MAX_TOTAL_SECONDS = 900;

  function text(value, max, fallback = "") {
    return String(value == null ? fallback : value).trim().slice(0, max);
  }

  function allocateDurations(total, weights, minimum = 3, maximum = MAX_SCENE_SECONDS) {
    const count = weights.length;
    if (!count || count * minimum > total || count * maximum < total) {
      throw new RangeError("لا يمكن توزيع هذه المدة على عدد المراحل ضمن حد 3–90 ثانية لكل مشهد. عدّل المدة أو عدد المراحل.");
    }
    const safeWeights = weights.map(value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0);
    if (safeWeights.every(value => value === 0)) safeWeights.fill(1);
    const durations = Array(count).fill(minimum);
    let remaining = total - count * minimum;
    let active = weights.map((_, index) => index);

    while (remaining > 0 && active.length) {
      const weightSum = active.reduce((sum, index) => sum + safeWeights[index], 0) || active.length;
      const shares = active.map(index => ({
        index,
        exact: remaining * ((safeWeights[index] || (weightSum === active.length ? 1 : 0)) / weightSum)
      }));
      const capped = shares.filter(item => item.exact >= maximum - durations[item.index]);
      if (capped.length) {
        for (const item of capped) {
          const room = maximum - durations[item.index];
          durations[item.index] += room;
          remaining -= room;
        }
        const cappedSet = new Set(capped.map(item => item.index));
        active = active.filter(index => !cappedSet.has(index));
        continue;
      }
      let assigned = 0;
      for (const item of shares) {
        const whole = Math.floor(item.exact);
        durations[item.index] += whole;
        assigned += whole;
      }
      remaining -= assigned;
      const fractional = shares.slice().sort((a, b) =>
        (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)) || a.index - b.index
      );
      for (const item of fractional) {
        if (remaining <= 0) break;
        if (durations[item.index] < maximum) {
          durations[item.index] += 1;
          remaining -= 1;
        }
      }
      break;
    }
    if (remaining !== 0 || durations.some(value => value < minimum || value > maximum)) {
      throw new RangeError("فشل توزيع مدة المشاهد بصورة صالحة. راجع مدة المشروع وعدد المراحل.");
    }
    return durations;
  }

  function convert(plan) {
    if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
      throw new TypeError("ملف الخطة يجب أن يحتوي كائن JSON صالحاً.");
    }
    if (plan.schema !== SCHEMA || Number(plan.schema_version) !== 2) {
      throw new TypeError("صيغة الملف غير مدعومة. صدّر الخطة من مخطط CineForge الحالي.");
    }
    if (!Array.isArray(plan.beats) || plan.beats.length < 1 || plan.beats.length > MAX_SCENES) {
      throw new RangeError("يجب أن تحتوي الخطة على 1–40 مرحلة سردية.");
    }
    const minutes = Number(plan.target_minutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes * 60 > MAX_TOTAL_SECONDS) {
      throw new RangeError("مدة الرندر المدعومة حالياً من 1 ثانية حتى 15 دقيقة.");
    }
    const totalSeconds = Math.round(minutes * 60);
    const beats = plan.beats.map((beat, index) => {
      if (!beat || typeof beat !== "object" || Array.isArray(beat)) {
        throw new TypeError("المرحلة رقم " + (index + 1) + " غير صالحة.");
      }
      return {
        title: text(beat.title, 100, "مرحلة " + (index + 1)),
        prompt: text(beat.prompt, 500),
        content: text(beat.content, 700),
        narrative_role: ["hook","context","setup","development","turning_point","resolution","closing","story_beat"].includes(beat.narrative_role) ? beat.narrative_role : ["hook","context","setup","development","turning_point","resolution","closing"][index] || "story_beat",
        purpose: text(beat.purpose, 300, text(beat.prompt, 500)),
        continuity_note: text(beat.continuity_note, 500),
        share: Number.isFinite(Number(beat.share)) ? Math.max(0, Math.min(100, Number(beat.share))) : 0
      };
    });
    const durations = allocateDurations(totalSeconds, beats.map(beat => beat.share));
    const moves = ["push_in", "pan_left", "pan_right", "pan_up", "pan_down", "pull_out", "static"];
    const scenes = beats.map((beat, index) => ({
      id: "story-" + (index + 1),
      title: beat.title || "مشهد " + (index + 1),
      narration: beat.content,
      visual: beat.prompt,
      image_file: "",
      camera_move: moves[index % moves.length],
      seconds: durations[index],
      narrative_role: beat.narrative_role,
      purpose: beat.purpose,
      continuity_note: beat.continuity_note
    }));
    const snapshot = {
      schema: SCHEMA,
      schema_version: 2,
      title: text(plan.title, 90, "مشروع CineForge"),
      audience: text(plan.audience, 180),
      goal: text(plan.goal, 500),
      premise: text(plan.premise, 700),
      format: text(plan.format, 80),
      tone: text(plan.tone, 80),
      target_minutes: minutes,
      wpm: Math.max(80, Math.min(220, Number(plan.wpm) || 135)),
      beats,
      characters: Array.isArray(plan.characters) ? plan.characters.slice(0, 40).map(item => ({
        name: text(item && item.name, 100), notes: text(item && item.notes, 500)
      })) : [],
      locations: Array.isArray(plan.locations) ? plan.locations.slice(0, 40).map(item => ({
        name: text(item && item.name, 100), notes: text(item && item.notes, 500)
      })) : [],
      props: Array.isArray(plan.props) ? plan.props.slice(0, 40).map(item => ({
        name: text(item && item.name, 100), notes: text(item && item.notes, 500)
      })) : [],
      sources: Array.isArray(plan.sources) ? plan.sources.slice(0, 80).map(item => ({
        name: text(item && item.name, 180), url: text(item && item.url, 500),
        status: text(item && item.status, 40, "غير متحقق")
      })) : [],
      narration: text(plan.narration, 12000)
    };
    return {
      title: snapshot.title,
      idea: snapshot.premise || snapshot.goal || snapshot.title,
      targetSeconds: totalSeconds,
      scenes,
      storyContext: snapshot
    };
  }

  return { convert, allocateDurations, SCHEMA, MAX_SCENES, MAX_TOTAL_SECONDS };
});

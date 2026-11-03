(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CineForgeStoryPlanner = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ROLE_LABELS = {
    hook: "الخطاف",
    setup: "التمهيد",
    development: "التطوير",
    turning_point: "نقطة التحول",
    resolution: "الخاتمة"
  };

  const ROLE_PURPOSES = {
    hook: "اجذب الانتباه بصورة أو سؤال محدد، وقدّم وعداً واضحاً دون كشف النتيجة.",
    setup: "عرّف المشاهد بالمشكلة والسياق وما يحتاج فهمه قبل التفاصيل.",
    development: "طوّر الفكرة خطوة واحدة في كل مشهد، مع دليل أو مثال مرئي.",
    turning_point: "قدّم المعلومة الأهم أو المثال الذي يغيّر فهم المشاهد للفكرة.",
    resolution: "أجب عن السؤال الافتتاحي، واجمع الرسالة في نتيجة محددة."
  };

  const ROLE_ORDER = ["hook", "setup", "development", "turning_point", "resolution"];

  function createStoryArc(brief = {}) {
    const idea = String(brief.idea || "الفكرة الأساسية").trim() || "الفكرة الأساسية";
    const audience = String(brief.audience || "المشاهد").trim() || "المشاهد";
    return {
      hook: "افتح بسؤال أو صورة تثير فضول " + audience + " حول: " + idea,
      setup: "اشرح السياق الضروري، وحدد السؤال الذي سيجيب عنه الفيديو: " + idea,
      development: "قسّم الفكرة إلى خطوات مترابطة، واجعل لكل خطوة معلومة أو مثالاً واضحاً.",
      turning_point: "قدّم أقوى مثال أو معلومة تغيّر طريقة فهم الفكرة، وبيّن سبب أهميتها.",
      resolution: "أجب عن سؤال البداية، لخّص النتيجة، واترك رسالة واحدة يسهل تذكرها."
    };
  }

  function roleFor(index, count) {
    if (count <= 1) return "resolution";
    if (index === 0) return "hook";
    if (index === count - 1) return "resolution";
    if (count >= 4 && index === 1) return "setup";
    if (count >= 5 && index === count - 2) return "turning_point";
    return "development";
  }

  function createScenePlan(index, count, brief = {}) {
    if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1 || index < 0 || index >= count) {
      throw new RangeError("Invalid scene index or scene count.");
    }
    const role = roleFor(index, count);
    const camera = role === "hook" ? "push_in" : role === "resolution" ? "pull_out" : role === "turning_point" ? "pan_right" : "static";
    const framing = role === "hook" ? "wide" : role === "turning_point" ? "close_up" : role === "resolution" ? "medium" : "establishing";
    return {
      narrative_role: role,
      role_label: ROLE_LABELS[role],
      purpose: ROLE_PURPOSES[role],
      subject_action: "حدّد العنصر الرئيسي، وما الذي يفعله أو يتغير أمام الكاميرا.",
      framing,
      lighting: String(brief.tone || "إضاءة متوازنة تخدم وضوح الموضوع."),
      on_screen_text: "",
      sound_cue: "",
      transition: index === 0 ? "fade_in" : index === count - 1 ? "fade_out" : "cut",
      continuity_note: "",
      camera_move: camera
    };
  }

  function estimateNarrationSeconds(text, wordsPerMinute = 130) {
    const words = String(text || "").trim().split(/\s+/u).filter(Boolean).length;
    const rate = Number.isFinite(wordsPerMinute) ? Math.min(220, Math.max(80, wordsPerMinute)) : 130;
    return words ? Math.ceil((words / rate) * 60) : 0;
  }

  function analyzeSceneTiming(scene, wordsPerMinute = 130) {
    const seconds = Math.max(0, Number(scene && scene.seconds) || 0);
    const words = String(scene && scene.narration || "").trim().split(/\s+/u).filter(Boolean).length;
    const estimatedSeconds = estimateNarrationSeconds(scene && scene.narration, wordsPerMinute);
    let status = "empty";
    let message = "لا يوجد نص تعليق صوتي بعد.";
    if (words) {
      if (estimatedSeconds > seconds) {
        status = "over";
        message = "النص أطول من مدة المشهد تقريباً.";
      } else if (estimatedSeconds < Math.max(2, seconds * 0.35)) {
        status = "under";
        message = "المشهد أطول من النص؛ أضف شرحاً أو اتركه لقطة صامتة مقصودة.";
      } else {
        status = "fit";
        message = "زمن النص مناسب تقريبياً للمدة.";
      }
    }
    return { words, estimatedSeconds, availableSeconds: seconds, status, message };
  }

  function analyzeProjectTiming(scenes, wordsPerMinute = 130) {
    const rows = (Array.isArray(scenes) ? scenes : []).map(scene => analyzeSceneTiming(scene, wordsPerMinute));
    return {
      estimatedVoiceSeconds: rows.reduce((sum, row) => sum + row.estimatedSeconds, 0),
      sceneSeconds: rows.reduce((sum, row) => sum + row.availableSeconds, 0),
      over: rows.filter(row => row.status === "over").length,
      under: rows.filter(row => row.status === "under").length,
      empty: rows.filter(row => row.status === "empty").length,
      rows
    };
  }

  function normalizeProject(project) {
    if (!project || typeof project !== "object" || Array.isArray(project)) {
      throw new TypeError("Project must be an object.");
    }
    const copy = JSON.parse(JSON.stringify(project));
    if (!Array.isArray(copy.scenes) || copy.scenes.length < 1 || copy.scenes.length > 40) {
      throw new RangeError("Project must contain 1–40 scenes.");
    }
    copy.schema_version = 1;
    copy.project_schema_version = 2;
    copy.story_arc = Object.assign(createStoryArc(copy), copy.story_arc || {});
    copy.continuity = Object.assign({
      subject: "", location: "", props: "", visual_language: String(copy.style || "cinematic")
    }, copy.continuity || {});
    copy.scenes = copy.scenes.map((scene, index) => {
      const plan = createScenePlan(index, copy.scenes.length, copy);
      return Object.assign({}, plan, scene, {
        title: String(scene.title || "مشهد " + (index + 1)).slice(0, 100),
        narration: String(scene.narration || "").slice(0, 700),
        visual: String(scene.visual || "").slice(0, 500),
        seconds: Math.max(3, Math.min(90, Number(scene.seconds) || 3))
      });
    });
    return copy;
  }

  function validateProject(project) {
    const normalized = normalizeProject(project);
    const totalSeconds = normalized.scenes.reduce((sum, scene) => sum + scene.seconds, 0);
    if (totalSeconds > 900) throw new RangeError("Project duration cannot exceed 900 seconds.");
    for (const [key, value] of Object.entries(normalized.story_arc)) {
      if (typeof value !== "string" || value.length > 900) throw new TypeError("Invalid story arc field: " + key);
    }
    for (const scene of normalized.scenes) {
      if (!ROLE_LABELS[scene.narrative_role]) throw new TypeError("Unsupported narrative role.");
      if (typeof scene.purpose !== "string" || scene.purpose.length > 500) throw new TypeError("Invalid scene purpose.");
    }
    return normalized;
  }

  return {
    ROLE_LABELS,
    ROLE_ORDER,
    createStoryArc,
    createScenePlan,
    estimateNarrationSeconds,
    analyzeSceneTiming,
    analyzeProjectTiming,
    normalizeProject,
    validateProject
  };
});

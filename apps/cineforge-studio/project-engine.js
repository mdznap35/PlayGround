(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CineForgeProjectEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA = "cineforge.project";
  const VERSION = 2;
  const MAX_SCENES = 40;
  const MAX_SECONDS = 900;
  const TRACK_TYPES = new Set(["video", "voiceover", "music", "subtitle", "overlay"]);

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function clean(value, limit, fallback) {
    return String(value == null ? (fallback || "") : value).replace(/\u0000/g, "").trim().slice(0, limit);
  }
  function makeId(prefix) {
    const id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    return (prefix || "id") + "-" + id;
  }
  function finite(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }
  function roundTime(value, fps) {
    const rate = Math.max(1, Math.round(finite(fps, 24)));
    return Math.max(0, Math.round(finite(value, 0) * rate) / rate);
  }
  function normalizeScene(scene, index) {
    const item = scene && typeof scene === "object" ? scene : {};
    return {
      id: clean(item.id, 120, "scene-" + (index + 1)),
      title: clean(item.title, 100, "مشهد " + (index + 1)),
      narration: clean(item.narration, 700, ""),
      visual: clean(item.visual, 500, ""),
      image_file: clean(item.image_file, 180, ""),
      camera_move: clean(item.camera_move, 24, "push_in"),
      seconds: Math.max(3, Math.min(90, Math.round(finite(item.seconds, 8))))
    };
  }

  function buildTimeline(scenes, audio, options) {
    const settings = options || {};
    const sources = audio || {};
    const fps = Math.max(1, Math.min(60, Math.round(finite(settings.fps, 24))));
    let cursor = 0;
    const videoClips = (Array.isArray(scenes) ? scenes : []).map((scene, index) => {
      const duration = Math.max(3, Math.min(90, finite(scene.seconds, 8)));
      const clip = {
        id: "video-" + String(scene.id || index + 1),
        scene_id: String(scene.id || index + 1),
        name: clean(scene.title, 100, "مشهد " + (index + 1)),
        start: cursor,
        source_in: 0,
        duration: duration,
        source: clean(scene.image_file, 180, "")
      };
      cursor += duration;
      return clip;
    });
    const total = cursor;
    const tracks = [
      {id:"track-video-main", type:"video", name:"الصورة / المشاهد", enabled:true, allow_overlap:false, clips:videoClips},
      {id:"track-voiceover", type:"voiceover", name:"التعليق الصوتي", enabled:true, allow_overlap:true, clips:[]},
      {id:"track-music", type:"music", name:"الموسيقى والمؤثرات", enabled:true, allow_overlap:true, clips:[]}
    ];
    if (sources.voiceover_file) {
      tracks[1].clips.push({
        id:"voiceover-main", name:"التعليق الصوتي", source:clean(sources.voiceover_file,180,""),
        start:0, source_in:0, duration:total
      });
    }
    if (sources.music_file) {
      tracks[2].clips.push({
        id:"music-main", name:"الموسيقى الخلفية", source:clean(sources.music_file,180,""),
        start:0, source_in:0, duration:total, volume:Math.max(0,Math.min(1,finite(sources.music_volume,0.18)))
      });
    }
    return {version:1, fps:fps, duration:total, tracks:tracks};
  }

  function contentOf(project) {
    return {
      schema:project.schema, schema_version:project.schema_version, id:project.id,
      title:project.title, form:project.form, scenes:project.scenes,
      selected_scene_id:project.selected_scene_id, story_context:project.story_context,
      timeline:project.timeline
    };
  }

  function createProject(state, previous, now) {
    const input = state || {};
    const prior = previous && previous.schema === SCHEMA ? previous : null;
    const form = input.form && typeof input.form === "object" ? input.form : input;
    const scenesInput = Array.isArray(input.scenes) ? input.scenes : [];
    if (!scenesInput.length || scenesInput.length > MAX_SCENES) {
      throw new RangeError("يجب أن يحتوي المشروع على 1 إلى 40 مشهداً.");
    }
    const scenes = scenesInput.map(normalizeScene);
    const ids = new Set();
    for (const scene of scenes) {
      if (!scene.id || ids.has(scene.id)) throw new TypeError("معرّفات المشاهد يجب أن تكون فريدة.");
      ids.add(scene.id);
    }
    const total = scenes.reduce((sum, scene) => sum + scene.seconds, 0);
    if (total > MAX_SECONDS) throw new RangeError("مدة المشروع تتجاوز 900 ثانية.");
    const normalizedForm = {
      title:clean(form.title,90,"مشروع بلا عنوان") || "مشروع بلا عنوان",
      idea:clean(form.idea,500,""),
      language:["ar","en","mixed"].includes(form.language) ? form.language : "ar",
      style:["cinematic","documentary","educational","editorial","promo"].includes(form.style) ? form.style : "cinematic",
      aspect:["16:9","9:16","1:1"].includes(form.aspect) ? form.aspect : "16:9",
      target_duration:Math.max(3,Math.min(900,Math.round(finite(form.target_duration,total)))),
      voiceover_file:clean(form.voiceover_file,180,""),
      music_file:clean(form.music_file,180,""),
      music_volume:Math.max(0,Math.min(1,finite(form.music_volume,0.18)))
    };
    const timeline = buildTimeline(scenes, normalizedForm);
    const selected = input.selectedScene != null ? Number(input.selectedScene) : -1;
    const selectedId = input.selected_scene_id || (selected >= 0 && scenes[selected] ? scenes[selected].id : scenes[0].id);
    const project = {
      schema:SCHEMA, schema_version:VERSION,
      id:clean(input.id,120,"") || (prior && prior.id) || makeId("project"),
      title:normalizedForm.title, form:normalizedForm, scenes:scenes,
      selected_scene_id:scenes.some(scene => scene.id === String(selectedId)) ? String(selectedId) : scenes[0].id,
      story_context:input.storyPlan && typeof input.storyPlan === "object"
        ? clone(input.storyPlan)
        : (input.story_context && typeof input.story_context === "object" ? clone(input.story_context) : null),
      timeline:timeline,
      created_at:(prior && prior.created_at) || input.created_at || new Date(now || Date.now()).toISOString(),
      updated_at:new Date(now || Date.now()).toISOString(),
      revision:1
    };
    const signature = JSON.stringify(contentOf(project));
    const oldSignature = prior ? JSON.stringify(contentOf(prior)) : "";
    if (prior && signature === oldSignature) {
      project.revision = Math.max(1, finite(prior.revision,1));
      project.updated_at = prior.updated_at;
    } else {
      project.revision = prior ? Math.max(1, finite(prior.revision,1)) + 1 : 1;
    }
    validateProject(project);
    return project;
  }

  function normalizeProject(value) {
    const input = value && typeof value === "object" ? value : {};
    if (input.schema === SCHEMA && input.schema_version === VERSION) {
      validateProject(input);
      return clone(input);
    }
    if (input.form && Array.isArray(input.scenes)) return createProject({
      id:input.id, form:input.form, scenes:input.scenes,
      selectedScene:input.selectedScene,
      selected_scene_id:input.selected_scene_id,
      storyPlan:input.storyPlan,
      story_context:input.story_context,
      created_at:input.created_at
    }, null);
    if (Array.isArray(input.scenes)) return createProject({
      id:input.id,
      form:{
        title:input.title, idea:input.idea, language:input.language, style:input.style,
        aspect:input.aspect, target_duration:input.target_duration,
        voiceover_file:input.voiceover_file, music_file:input.music_file,
        music_volume:input.music_volume
      },
      scenes:input.scenes
    }, null);
    throw new TypeError("ملف المشروع لا يطابق صيغة CineForge المعروفة.");
  }

  function validateProject(project) {
    if (!project || project.schema !== SCHEMA || project.schema_version !== VERSION) {
      throw new TypeError("صيغة المشروع أو رقم الإصدار غير مدعوم.");
    }
    if (!Array.isArray(project.scenes) || project.scenes.length < 1 || project.scenes.length > MAX_SCENES) {
      throw new RangeError("عدد المشاهد يجب أن يكون بين 1 و40.");
    }
    const sceneIds = new Set(project.scenes.map(scene => String(scene.id)));
    if (sceneIds.size !== project.scenes.length) throw new TypeError("توجد معرّفات مشاهد مكررة.");
    if (!project.timeline || project.timeline.version !== 1 || !Array.isArray(project.timeline.tracks) ||
        project.timeline.tracks.length<1 || project.timeline.tracks.length>12) {
      throw new TypeError("بنية المسارات الزمنية غير صالحة.");
    }
    const sceneDuration=project.scenes.reduce((sum,scene)=>{
      const duration=finite(scene.seconds,NaN);
      if (!Number.isFinite(duration) || duration<3 || duration>90) throw new RangeError("مدة المشهد يجب أن تكون بين 3 و90 ثانية.");
      return sum+duration;
    },0);
    if (sceneDuration>MAX_SECONDS) throw new RangeError("مجموع مدة المشاهد يتجاوز 900 ثانية.");
    const trackIds = new Set();
    let maxEnd = 0;
    for (const track of project.timeline.tracks) {
      if (!TRACK_TYPES.has(track.type) || !track.id || trackIds.has(track.id)) {
        throw new TypeError("نوع المسار أو معرّفه غير صالح.");
      }
      trackIds.add(track.id);
      const clipIds = new Set();
      if (!Array.isArray(track.clips)) throw new TypeError("قائمة مقاطع المسار غير صالحة.");
      const clips = track.clips;
      const sorted = clips.slice().sort((a,b) => finite(a.start,0) - finite(b.start,0));
      let previousEnd = -1;
      for (const clip of sorted) {
        const start = finite(clip.start,NaN);
        const duration = finite(clip.duration,NaN);
        const sourceIn = finite(clip.source_in,0);
        if (!clip.id || clipIds.has(clip.id) || !Number.isFinite(start) || !Number.isFinite(duration) ||
            start < 0 || duration <= 0 || sourceIn < 0) {
          throw new RangeError("موضع المقطع أو مدته أو معرّفه غير صالح.");
        }
        clipIds.add(clip.id);
        if (!track.allow_overlap && start < previousEnd - 0.0001) {
          throw new RangeError("توجد مقاطع متداخلة في المسار " + track.name + ".");
        }
        previousEnd = Math.max(previousEnd,start + duration);
        maxEnd = Math.max(maxEnd,start + duration);
        if (clip.scene_id && !sceneIds.has(String(clip.scene_id))) {
          throw new TypeError("المقطع يشير إلى مشهد غير موجود.");
        }
      }
    }
    if (maxEnd > MAX_SECONDS + 0.0001) throw new RangeError("الخط الزمني يتجاوز 900 ثانية.");
    if (Math.abs(finite(project.timeline.duration,NaN)-maxEnd)>0.001) {
      throw new RangeError("مدة الخط الزمني لا تطابق نهاية أطول مقطع.");
    }
    return {valid:true, duration:maxEnd, scene_count:project.scenes.length};
  }

  function cloneForEdit(project) {
    const copy = clone(project);
    validateProject(copy);
    return copy;
  }
  function refreshTimelineDuration(project) {
    let duration=0;
    for (const track of project.timeline.tracks) {
      for (const clip of track.clips || []) duration=Math.max(duration,clip.start+clip.duration);
    }
    project.timeline.duration=duration;
  }
  function findTrack(project, trackId) {
    const track = project.timeline.tracks.find(item => item.id === trackId);
    if (!track) throw new Error("المسار المطلوب غير موجود.");
    return track;
  }
  function findClip(track, clipId) {
    const clip = track.clips.find(item => item.id === clipId);
    if (!clip) throw new Error("المقطع المطلوب غير موجود.");
    return clip;
  }
  function snapTime(project, track, clipId, position, options) {
    const opts = options || {};
    const fps = project.timeline.fps || 24;
    let result = roundTime(position, fps);
    if (opts.snap === false) return result;
    const tolerance = Math.max(0, finite(opts.tolerance,0.35));
    const candidates = [0];
    for (const clip of track.clips) {
      if (clip.id === clipId) continue;
      candidates.push(clip.start, clip.start + clip.duration);
    }
    let closest = result, distance = tolerance + 1;
    for (const candidate of candidates) {
      const d = Math.abs(candidate - result);
      if (d < distance) { distance = d; closest = candidate; }
    }
    return distance <= tolerance ? roundTime(closest,fps) : result;
  }

  function moveClip(project, trackId, clipId, targetStart, options) {
    const copy = cloneForEdit(project), track = findTrack(copy,trackId), clip = findClip(track,clipId);
    clip.start = snapTime(copy,track,clipId,targetStart,options);
    refreshTimelineDuration(copy);
    validateProject(copy);
    return copy;
  }
  function trimClip(project, trackId, clipId, edge, absoluteTime, options) {
    const copy = cloneForEdit(project), track = findTrack(copy,trackId), clip = findClip(track,clipId);
    const fps = copy.timeline.fps || 24;
    const time = snapTime(copy,track,clipId,absoluteTime,options);
    const oldEnd = clip.start + clip.duration;
    if (edge === "start") {
      const next = Math.min(oldEnd - 1 / fps, Math.max(0,time));
      const delta = next - clip.start;
      clip.start = next;
      clip.source_in += delta;
      clip.duration = oldEnd - next;
    } else if (edge === "end") {
      clip.duration = Math.max(1 / fps, time - clip.start);
    } else {
      throw new TypeError("حافة القص يجب أن تكون start أو end.");
    }
    refreshTimelineDuration(copy);
    validateProject(copy);
    return copy;
  }
  function splitClip(project, trackId, clipId, absoluteTime) {
    const copy = cloneForEdit(project), track = findTrack(copy,trackId), clip = findClip(track,clipId);
    const at = roundTime(absoluteTime,copy.timeline.fps || 24);
    const end = clip.start + clip.duration;
    if (at <= clip.start || at >= end) throw new RangeError("نقطة التقسيم يجب أن تكون داخل المقطع.");
    const right = clone(clip);
    right.id = makeId("clip");
    right.start = at;
    right.source_in = clip.source_in + at - clip.start;
    right.duration = end - at;
    clip.duration = at - clip.start;
    track.clips.push(right);
    track.clips.sort((a,b) => a.start - b.start);
    refreshTimelineDuration(copy);
    validateProject(copy);
    return {project:copy, right_clip_id:right.id};
  }
  function removeClip(project, trackId, clipId) {
    const copy = cloneForEdit(project), track = findTrack(copy,trackId);
    const before = track.clips.length;
    track.clips = track.clips.filter(clip => clip.id !== clipId);
    if (track.clips.length === before) throw new Error("المقطع المطلوب غير موجود.");
    refreshTimelineDuration(copy);
    validateProject(copy);
    return copy;
  }

  function rendererCompatibility(project) {
    try {
      validateProject(project);
      const video = project.timeline.tracks.filter(track => track.type === "video");
      if (video.length !== 1) return {ok:false, errors:["المصيّر v1 يحتاج مسار صورة واحداً."]};
      const clips = video[0].clips.slice().sort((a,b) => a.start - b.start);
      if (clips.length !== project.scenes.length) return {ok:false, errors:["يجب أن يحتوي مسار الصورة على مقطع واحد لكل مشهد."]};
      let cursor = 0;
      for (let index=0;index<clips.length;index++) {
        const clip=clips[index];
        const scene=project.scenes[index];
        if (Math.abs(clip.start - cursor) > 0.001) return {ok:false, errors:["توجد فجوة أو تداخل في مسار الصورة؛ المصيّر v1 يتعامل مع المشاهد المتتابعة فقط."]};
        if (String(clip.scene_id)!==String(scene.id)) return {ok:false, errors:["ترتيب مقاطع الصورة لا يطابق ترتيب المشاهد الذي يستخدمه المصيّر v1."]};
        if (Math.abs(clip.duration - Number(scene.seconds)) > 0.001) return {ok:false, errors:["مدة أحد مقاطع الصورة لا تطابق مدة المشهد المرتبط به في المصيّر v1."]};
        cursor += clip.duration;
      }
      const errors = [];
      for (const track of project.timeline.tracks) {
        if (!["video","voiceover","music"].includes(track.type) && track.clips.length) {
          errors.push("المصيّر v1 لا يدعم مقاطع في مسار " + track.type + ".");
        }
      }
      for (const type of ["voiceover","music"]) {
        const matching = project.timeline.tracks.filter(item => item.type === type);
        if (matching.length > 1) {
          errors.push("المصيّر v1 يحتاج مساراً واحداً فقط لنوع " + type + ".");
          continue;
        }
        const track = matching[0];
        const clips = track ? track.clips : [];
        const sourceField = type + "_file";
        const expectedSource = clean(project.form && project.form[sourceField],180,"");
        if (clips.length > 1) errors.push("المصيّر v1 لا يخلط عدة مقاطع في مسار " + type + ".");
        if (Boolean(clips.length) !== Boolean(expectedSource)) {
          errors.push("مصدر " + type + " في المسار لا يطابق إعداد المشروع.");
        }
        if (clips[0]) {
          if (clips[0].start !== 0) errors.push("المصيّر v1 لا يدعم إزاحة بداية مسار " + type + ".");
          if (clips[0].source !== expectedSource) errors.push("ملف " + type + " في المسار لا يطابق ملف المشروع.");
          if (Math.abs(clips[0].duration - cursor) > 0.001) errors.push("مدة مسار " + type + " لا تطابق مدة الفيديو.");
          if (type === "music" && Math.abs(finite(clips[0].volume,0.18)-finite(project.form.music_volume,0.18))>0.001) {
            errors.push("مستوى الموسيقى في المسار لا يطابق إعداد المشروع.");
          }
        }
      }
      return {ok:errors.length === 0,errors:errors};
    } catch (error) {
      return {ok:false,errors:[error.message || "مشروع غير صالح."]};
    }
  }

  function toEditorState(project) {
    validateProject(project);
    const selectedIndex = project.scenes.findIndex(scene => scene.id === project.selected_scene_id);
    return {
      form:clone(project.form),
      scenes:clone(project.scenes),
      selectedScene:Math.max(0,selectedIndex),
      storyPlan:project.story_context ? clone(project.story_context) : null
    };
  }

  return {
    SCHEMA, VERSION, MAX_SCENES, MAX_SECONDS,
    buildTimeline, createProject, normalizeProject, validateProject, toEditorState,
    snapTime, moveClip, trimClip, splitClip, removeClip, rendererCompatibility
  };
});

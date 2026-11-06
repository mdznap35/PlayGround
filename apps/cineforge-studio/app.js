(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "cineforge-studio-project-v1";
  const storyPlanImporter = window.CineForgeStoryPlanImporter;
  const narrationFit = window.CineForgeNarrationFit;
  const captionsEngine = window.CineForgeCaptions;
  const mediaBin = window.CineForgeMediaBin;
  const projectEngine = window.CineForgeProjectEngine;
  const projectStorage = window.CineForgeProjectStorage;
  const timelineMath = window.CineForgeTimelineMath;
  if (!timelineMath) throw new Error("CineForge Timeline Math failed to load.");
  if (!mediaBin) throw new Error("CineForge Media Bin failed to load.");
  if (!projectEngine) throw new Error("CineForge Project Engine failed to load.");
  if (!projectStorage) throw new Error("CineForge Project Storage failed to load.");
  if (!storyPlanImporter) throw new Error("CineForge Story Plan importer failed to load.");
  if (!narrationFit) throw new Error("CineForge narration-fit analyzer failed to load.");
  if (!captionsEngine) throw new Error("CineForge captions engine failed to load.");
  let importedStoryPlan = null;
  let projectDocument = null;
  let saveChain = Promise.resolve();
  const NARRATIVE_ROLE_LABELS = {hook:"الخطاف",context:"السياق",setup:"التمهيد",development:"التطوير",turning_point:"التحول",resolution:"الحل",closing:"الخاتمة",story_beat:"مرحلة سردية"};
  const NARRATIVE_ROLE_OPTIONS = [["hook","الخطاف"],["context","السياق"],["setup","التمهيد"],["development","التطوير"],["turning_point","التحول"],["resolution","الحل"],["closing","الخاتمة"],["story_beat","مرحلة سردية"]];
  const palette = {
    cinematic: ["#092039", "#17465a", "#b8f3d3"],
    documentary: ["#172438", "#38516a", "#d9c49b"],
    educational: ["#0e2940", "#235b6a", "#a9d4ef"],
    editorial: ["#28243a", "#554365", "#ebc6a0"],
    promo: ["#2b1d31", "#754154", "#f0c77b"]
  };

  const templates = [
    {title:"افتتاحية: اتساع السؤال", visual:"لقطة افتتاحية واسعة، حركة اقتراب بطيئة، عنوان واضح ومساحة هادئة للنص.", narration:"ابدأ بسؤال يفتح فضول المشاهد، وقدّم الوعد الذي سيحققه هذا الفيديو."},
    {title:"السياق: لماذا يهمنا؟", visual:"طبقات بصرية متدرجة، عنصر رئيسي في المنتصف، ومعلومة واحدة بارزة.", narration:"ضع الفكرة في سياقها، واشرح لماذا تستحق وقت المشاهد."},
    {title:"الفكرة الأولى: الأساس", visual:"بطاقة معلوماتية أنيقة، شكل هندسي متحرك، وتباين واضح بين العنوان والتفاصيل.", narration:"اشرح المبدأ الأول بجملة بسيطة، ثم أضف تفصيلاً يثبّت المعنى."},
    {title:"مثال بصري: من النظرية إلى الواقع", visual:"مشهد تطبيقي مع مقارنة أو تسلسل بصري قصير.", narration:"حوّل الفكرة إلى مثال ملموس، ووضّح ما الذي ينبغي أن يلاحظه المشاهد."},
    {title:"الخلاصة: الأثر الذي يبقى", visual:"عودة إلى العنصر البصري الأول، خاتمة نظيفة ورسالة أخيرة.", narration:"اجمع الفكرة في خلاصة واحدة، واترك المشاهد مع نتيجة واضحة."}
  ];

  let scenes = [];
  let captions = [];
  let editingCaptionId = null;
  let selectedScene = 0;
  let saveTimer = null;
  let mediaPreviewUrls = [];
  let playheadTime = 0;
  let timelineZoom = 100;
  let isTimelinePlaying = false;
  let playbackFrame = 0;
  let playbackLastTime = null;
  const TIMELINE_FPS = 24;

  const defaultProject = () => ({
    version: 1,
    title: $("projectTitle").value,
    idea: $("projectIdea").value,
    language: $("language").value,
    style: $("style").value,
    aspect: $("aspect").value,
    target_duration: Number($("targetDuration").value),
    voiceover_file: $("voiceoverFile").value.trim(),
    music_file: $("musicFile").value.trim(),
    music_volume: Number($("musicVolume").value),
    scenes: templates.map((scene, index) => ({...scene, seconds: 12, id: index + 1, image_file: "", camera_move: "push_in"}))
  });

  function readForm() {
    return {
      title: $("projectTitle").value.trim() || "مشروع بلا عنوان",
      idea: $("projectIdea").value.trim(),
      language: $("language").value,
      style: $("style").value,
      aspect: $("aspect").value,
      target_duration: Number($("targetDuration").value),
      voiceover_file: $("voiceoverFile").value.trim(),
      music_file: $("musicFile").value.trim(),
      music_volume: Number($("musicVolume").value)
    };
  }

  function setExactTargetDuration(seconds) {
    const select = $("targetDuration");
    const exact = String(Math.round(Number(seconds)));
    let option = [...select.options].find(item => item.value === exact);
    if (!option) {
      option = document.createElement("option");
      option.value = exact;
      option.textContent = Math.floor(Number(seconds) / 60) > 0
        ? Math.floor(Number(seconds) / 60) + " د " + (Number(seconds) % 60) + " ث — مستورد"
        : exact + " ثانية — مستورد";
      option.dataset.imported = "true";
      select.add(option);
    }
    select.value = exact;
  }

  function importStoryPlanDocument(raw) {
    const imported = storyPlanImporter.convert(raw);
    $("projectTitle").value = imported.title;
    $("projectIdea").value = imported.idea;
    const format = imported.storyContext.format;
    const style = /وثائقي|documentary/i.test(format) ? "documentary"
      : /تعليمي|educational/i.test(format) ? "educational"
      : /إعلاني|promo|advert/i.test(format) ? "promo" : "cinematic";
    $("style").value = style;
    setExactTargetDuration(imported.targetSeconds);
    scenes = imported.scenes;
    captions = [];
    editingCaptionId = null;
    importedStoryPlan = imported.storyContext;
    selectedScene = 0;
    resetCaptionForm();
    updateMusicVolumeLabel();
    renderAll();
    updatePreview();
    scheduleSave();
    setSavedState("تم استيراد خطة القصة");
  }

  function makeOutline() {
    const brief = readForm();
    if (!brief.idea) {
      $("projectIdea").focus();
      $("projectIdea").setCustomValidity("اكتب الفكرة الأساسية أولاً.");
      $("projectIdea").reportValidity();
      $("projectIdea").setCustomValidity("");
      return;
    }
    importedStoryPlan = null;
    captions = [];
    editingCaptionId = null;
    const target = brief.target_duration;
    const count = target <= 30 ? 3 : target <= 90 ? 5 : target <= 180 ? 7 : 9;
    const seconds = Math.max(3, Math.round(target / count));
    scenes = [];
    for (let i = 0; i < count; i++) {
      const base = templates[i % templates.length];
      scenes.push({
        id: Date.now() + i,
        title: i === 0 ? base.title : (i === count - 1 ? "الخاتمة: الفكرة التي تبقى" : base.title),
        narration: i === 0 ? base.narration.replace("ابدأ بسؤال", "انطلق من الفكرة") : base.narration,
        visual: base.visual,
        image_file: "",
        camera_move: i % 3 === 0 ? "push_in" : (i % 3 === 1 ? "pan_left" : "pan_right"),
        seconds
      });
    }
    const remainder = target - scenes.reduce((sum, scene) => sum + scene.seconds, 0);
    scenes[scenes.length - 1].seconds += remainder;
    selectedScene = 0;
    resetCaptionForm();
    renderAll();
    scheduleSave();
  }

  function totalSeconds() {
    return scenes.reduce((sum, scene) => sum + Number(scene.seconds || 0), 0);
  }

  function timecode(seconds) {
    const s = Math.max(0, Math.round(seconds));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  function frameTimecode(seconds) {
    const frame = Math.max(0, Math.floor(Number(seconds) * TIMELINE_FPS + 0.000001));
    return timecode(Math.floor(frame / TIMELINE_FPS)) + ":" + String(frame % TIMELINE_FPS).padStart(2, "0");
  }

  function stopTimelinePlayback() {
    isTimelinePlaying = false;
    playbackLastTime = null;
    if (playbackFrame) cancelAnimationFrame(playbackFrame);
    playbackFrame = 0;
    const button = $("timelinePlayButton");
    if (button) {
      button.textContent = "▶ تشغيل";
      button.setAttribute("aria-label", "تشغيل المعاينة");
      button.setAttribute("aria-pressed", "false");
    }
  }

  function syncTimelinePlayhead() {
    const total = totalSeconds();
    playheadTime = timelineMath.clampTime(playheadTime, total);
    const progress = timelineMath.progress(playheadTime, total);
    const stage = $("timelineStage");
    if (stage) {
      stage.style.setProperty("--timeline-playhead", (progress * 100) + "%");
      stage.style.width = timelineZoom + "%";
    }
    const scrubber = $("timelineScrubber");
    if (scrubber) {
      scrubber.max = String(Math.max(1, Math.round(total * TIMELINE_FPS)));
      scrubber.value = String(Math.round(playheadTime * TIMELINE_FPS));
    }
    if ($("timelineCurrentTime")) $("timelineCurrentTime").textContent = frameTimecode(playheadTime);
    if ($("timelineTotalTime")) $("timelineTotalTime").textContent = frameTimecode(total);
    if ($("timelineZoomValue")) $("timelineZoomValue").textContent = timelineZoom + "%";
    const viewport = $("timelineScroll");
    if (stage && viewport) {
      const stageRect = stage.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      const markerX = stageRect.left + stageRect.width * progress;
      const margin = Math.min(44, viewport.clientWidth * 0.12);
      if (markerX > viewportRect.right - margin) {
        viewport.scrollLeft += markerX - (viewportRect.right - margin);
      } else if (markerX < viewportRect.left + margin) {
        viewport.scrollLeft -= (viewportRect.left + margin) - markerX;
      }
    }
    if ($("previewTime")) $("previewTime").textContent = timecode(playheadTime);
    document.querySelectorAll(".timeline-clip[data-scene-index]").forEach(button => {
      button.classList.toggle("is-active", Number(button.dataset.sceneIndex) === selectedScene);
    });
  }

  function seekTimeline(seconds, fromPlayback) {
    if (!fromPlayback) stopTimelinePlayback();
    playheadTime = timelineMath.clampTime(seconds, totalSeconds());
    const nextScene = timelineMath.sceneIndexAt(scenes, playheadTime);
    const changedScene = nextScene >= 0 && nextScene !== selectedScene;
    if (nextScene >= 0) selectedScene = nextScene;
    syncTimelinePlayhead();
    if (changedScene) renderSceneSelection();
  }

  function selectTimelineScene(index) {
    if (!Number.isInteger(index) || index < 0 || index >= scenes.length) return;
    stopTimelinePlayback();
    selectedScene = index;
    playheadTime = timelineMath.sceneStart(scenes, index);
    renderSceneSelection();
    renderTimeline();
    scheduleSave();
  }

  function timelinePlaybackTick(now) {
    if (!isTimelinePlaying) return;
    if (playbackLastTime == null) playbackLastTime = now;
    const elapsed = Math.max(0, (now - playbackLastTime) / 1000);
    playbackLastTime = now;
    const next = Math.min(totalSeconds(), playheadTime + elapsed);
    seekTimeline(next, true);
    if (next >= totalSeconds()) {
      stopTimelinePlayback();
      return;
    }
    playbackFrame = requestAnimationFrame(timelinePlaybackTick);
  }

  function startTimelinePlayback() {
    if (isTimelinePlaying || !scenes.length) return;
    if (playheadTime >= totalSeconds()) seekTimeline(0, true);
    isTimelinePlaying = true;
    playbackLastTime = null;
    const button = $("timelinePlayButton");
    button.textContent = "Ⅱ إيقاف مؤقت";
    button.setAttribute("aria-label", "إيقاف المعاينة مؤقتاً");
    button.setAttribute("aria-pressed", "true");
    playbackFrame = requestAnimationFrame(timelinePlaybackTick);
  }

  function toggleTimelinePlayback() {
    if (isTimelinePlaying) stopTimelinePlayback();
    else startTimelinePlayback();
  }

  function stepTimelineFrames(frameDelta) {
    const currentFrame = Math.round(playheadTime * TIMELINE_FPS);
    seekTimeline(timelineMath.secondsFromFrame(currentFrame + frameDelta, TIMELINE_FPS));
  }

  function handleTimelineKeyboard(event) {
    const target = event.target;
    const tag = target && target.tagName ? target.tagName.toLowerCase() : "";
    const editing = ["input", "textarea", "select"].includes(tag) || (target && target.isContentEditable);
    if (editing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === "Space") {
      event.preventDefault();
      toggleTimelinePlayback();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepTimelineFrames(event.shiftKey ? -TIMELINE_FPS : -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      stepTimelineFrames(event.shiftKey ? TIMELINE_FPS : 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      seekTimeline(0);
    } else if (event.key === "End") {
      event.preventDefault();
      seekTimeline(totalSeconds());
    }
  }

  function updateNarrationFitBadge(badge, scene) {
    const result = narrationFit.analyze(scene.narration, scene.seconds, $("language").value);
    badge.dataset.status = result.status;
    badge.textContent = result.label;
    badge.title = result.detail;
    badge.setAttribute("aria-label", result.detail);
  }

  function refreshNarrationFitIndicators() {
    [...$("sceneList").querySelectorAll(".scene-card")].forEach(card => {
      const scene = scenes[Number(card.dataset.index)];
      const badge = card.querySelector(".narration-fit");
      if (scene && badge) updateNarrationFitBadge(badge, scene);
    });
  }

  function createSceneCard(scene, index) {
    scene.image_file = scene.image_file || "";
    scene.camera_move = scene.camera_move || "push_in";
    scene.visual = scene.visual || "";
    const card = document.createElement("article");
    card.className = "scene-card" + (index === selectedScene ? " selected" : "");
    card.dataset.index = String(index);

    const number = document.createElement("div");
    number.className = "scene-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const content = document.createElement("div");
    content.className = "scene-content";
    const storyMeta = document.createElement("div");
    storyMeta.className = "scene-story-meta";
    const roleLabel = document.createElement("label");
    roleLabel.className = "scene-role-field";
    const roleCaption = document.createElement("span");
    roleCaption.textContent = "الدور السردي";
    const roleSelect = document.createElement("select");
    roleSelect.setAttribute("aria-label", "الدور السردي للمشهد " + (index + 1));
    NARRATIVE_ROLE_OPTIONS.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      roleSelect.append(option);
    });
    roleSelect.value = NARRATIVE_ROLE_LABELS[scene.narrative_role] ? scene.narrative_role : "story_beat";
    roleSelect.addEventListener("change", () => { scene.narrative_role = roleSelect.value; scheduleSave(); });
    roleLabel.append(roleCaption, roleSelect);
    const purposeLabel = document.createElement("label");
    purposeLabel.className = "scene-context-field";
    const purposeCaption = document.createElement("span");
    purposeCaption.textContent = "هدف المشهد";
    const purpose = document.createElement("textarea");
    purpose.className = "scene-purpose";
    purpose.maxLength = 300;
    purpose.rows = 2;
    purpose.value = scene.purpose || "";
    purpose.placeholder = "ما الذي يجب أن يفهمه المشاهد أو يتغير هنا؟";
    purpose.setAttribute("aria-label", "هدف المشهد " + (index + 1));
    purpose.addEventListener("input", () => { scene.purpose = purpose.value; scheduleSave(); });
    purposeLabel.append(purposeCaption, purpose);
    const continuityLabel = document.createElement("label");
    continuityLabel.className = "scene-context-field scene-continuity-field";
    const continuityCaption = document.createElement("span");
    continuityCaption.textContent = "ملاحظة الاستمرارية";
    const continuity = document.createElement("textarea");
    continuity.className = "scene-continuity";
    continuity.maxLength = 500;
    continuity.rows = 2;
    continuity.value = scene.continuity_note || "";
    continuity.placeholder = "الشخصية، المكان، الملابس، الإكسسوار أو الحالة التي يجب الحفاظ عليها...";
    continuity.setAttribute("aria-label", "ملاحظة الاستمرارية للمشهد " + (index + 1));
    continuity.addEventListener("input", () => { scene.continuity_note = continuity.value; scheduleSave(); });
    continuityLabel.append(continuityCaption, continuity);
    storyMeta.append(roleLabel, purposeLabel, continuityLabel);
    const title = document.createElement("input");
    title.className = "scene-title";
    title.value = scene.title;
    title.maxLength = 100;
    title.setAttribute("aria-label", "عنوان المشهد " + (index + 1));
    title.addEventListener("input", () => { scene.title = title.value; updatePreview(); renderTimeline(); scheduleSave(); });

    const narration = document.createElement("textarea");
    narration.className = "scene-description";
    narration.value = scene.narration;
    narration.maxLength = 700;
    narration.rows = 2;
    narration.placeholder = "نص التعليق أو الجملة التي تظهر للمشاهد";
    narration.setAttribute("aria-label", "نص المشهد " + (index + 1));
    narration.addEventListener("input", () => { scene.narration = narration.value; updateNarrationFitBadge(fitBadge, scene); scheduleSave(); });

    const fitBadge = document.createElement("div");
    fitBadge.className = "narration-fit";
    fitBadge.setAttribute("role", "status");
    updateNarrationFitBadge(fitBadge, scene);

    const visual = document.createElement("textarea");
    visual.className = "scene-visual";
    visual.value = scene.visual;
    visual.maxLength = 500;
    visual.rows = 2;
    visual.placeholder = "وصف اللقطة: الموضوع، الفعل، الإضاءة، التكوين...";
    visual.setAttribute("aria-label", "الوصف البصري للمشهد " + (index + 1));
    visual.addEventListener("input", () => { scene.visual = visual.value; scheduleSave(); });

    const assetWrap = document.createElement("label");
    assetWrap.className = "scene-asset-wrap";
    const assetLabel = document.createElement("span");
    assetLabel.textContent = "مسار الصورة داخل jobs/assets/";
    const asset = document.createElement("input");
    asset.className = "scene-asset";
    asset.type = "text";
    asset.maxLength = 180;
    asset.value = scene.image_file;
    asset.placeholder = "assets/scene-01.webp";
    asset.dir = "ltr";
    asset.setAttribute("aria-label", "مسار صورة المشهد " + (index + 1));
    asset.addEventListener("input", () => { scene.image_file = asset.value.trim(); updatePreview(); scheduleSave(); });
    assetWrap.append(assetLabel, asset);

    const meta = document.createElement("div");
    meta.className = "scene-meta";
    const label = document.createElement("span");
    label.textContent = "CAMERA MOVE";
    const camera = document.createElement("select");
    camera.className = "scene-camera";
    camera.setAttribute("aria-label", "حركة الكاميرا");
    [
      ["push_in","اقتراب بطيء"],["pull_out","ابتعاد"],["pan_left","تحريك لليسار"],
      ["pan_right","تحريك لليمين"],["pan_up","تحريك للأعلى"],["pan_down","تحريك للأسفل"],["static","ثابتة"]
    ].forEach(([value,text]) => {
      const option = document.createElement("option");
      option.value = value; option.textContent = text;
      camera.append(option);
    });
    camera.value = scene.camera_move;
    camera.addEventListener("change", () => { scene.camera_move = camera.value; scheduleSave(); });
    meta.append(label, camera);
    content.append(title, storyMeta, narration, fitBadge, visual, assetWrap, meta);

    const tools = document.createElement("div");
    tools.className = "scene-tools";
    const makeTool = (text, titleText, disabled, handler) => {
      const button = document.createElement("button");
      button.className = "tiny-button";
      button.type = "button";
      button.textContent = text;
      button.title = titleText;
      button.disabled = disabled;
      button.addEventListener("click", (event) => { event.stopPropagation(); handler(); });
      return button;
    };
    tools.append(
      makeTool("↑","تحريك للأعلى",index===0,()=>moveScene(index,-1)),
      makeTool("↓","تحريك للأسفل",index===scenes.length-1,()=>moveScene(index,1)),
      makeTool("×","حذف المشهد",false,()=>deleteScene(index))
    );

    const duration = document.createElement("input");
    duration.className = "duration-input";
    duration.type = "number"; duration.min = "3"; duration.max = "90";
    duration.value = String(scene.seconds);
    duration.setAttribute("aria-label", "مدة المشهد بالثواني");
    duration.addEventListener("change", () => {
      const oldScenes = scenes.map(item => ({...item}));
      scene.seconds = Math.max(3, Math.min(90, Number(duration.value) || 3));
      duration.value = String(scene.seconds);
      rebaseCaptions(oldScenes, scenes);
      if (editingCaptionId && !captions.some(cue => String(cue.id) === String(editingCaptionId))) resetCaptionForm();
      renderCaptions();
      renderTimeline();
      updateNarrationFitBadge(fitBadge, scene);
      scheduleSave();
    });
    const right = document.createElement("div");
    right.className = "scene-side";
    right.append(duration, tools);
    card.append(number, content, right);
    card.addEventListener("click", () => selectTimelineScene(index));
    return card;
  }

  function renderAll() {
    const list = $("sceneList");
    list.replaceChildren(...scenes.map(createSceneCard));
    $("sceneCount").textContent = scenes.length + " مشاهد";
    renderCaptions();
    $("timelineCount").textContent = String(scenes.length).padStart(2, "0");
    renderTimeline();
    renderSceneSelection();
  }

  function renderSceneSelection() {
    [...$("sceneList").children].forEach((card, index) => card.classList.toggle("selected", index === selectedScene));
    updatePreview();
  }

  function renderTimeline() {
    const total = totalSeconds();
    const safeTotal = Math.max(1,total);
    $("runtimeTotal").textContent = timecode(total);
    const summaryTrack = $("timelineTrack");
    summaryTrack.replaceChildren();
    scenes.forEach((scene) => {
      const segment = document.createElement("span");
      segment.className = "timeline-segment";
      segment.style.flex = String(Math.max(1, Number(scene.seconds) || 1));
      segment.title = scene.title + " — " + scene.seconds + "s";
      summaryTrack.append(segment);
    });

    const timeline = projectEngine.buildTimeline(scenes,{
      voiceover_file:$("voiceoverFile").value.trim(),
      music_file:$("musicFile").value.trim(),
      music_volume:Number($("musicVolume").value)
    },{captions});
    const ruler = $("timelineRuler");
    const lanes = $("multiTrackTimeline");
    const stage = $("timelineStage");
    if (!ruler || !lanes || !stage) return;
    stage.style.width = timelineZoom + "%";
    ruler.replaceChildren();
    const step = timelineMath.tickStep(total);
    for (let second=0;second<=total;second+=step) {
      const tick=document.createElement("span");
      tick.className="timeline-ruler-tick";
      tick.style.left=(second/safeTotal*100)+"%";
      tick.textContent=timecode(second);
      ruler.append(tick);
    }
    if (total % step !== 0) {
      const tick=document.createElement("span");
      tick.className="timeline-ruler-tick timeline-ruler-end";
      tick.style.left="100%";
      tick.textContent=timecode(total);
      ruler.append(tick);
    }

    lanes.replaceChildren();
    timeline.tracks.forEach(track => {
      const row=document.createElement("div");
      row.className="timeline-lane-row timeline-lane-"+track.type;
      const heading=document.createElement("div");
      heading.className="timeline-lane-name";
      heading.textContent=track.name;
      const body=document.createElement("div");
      body.className="timeline-lane-body";
      if (!track.clips.length) {
        const empty=document.createElement("span");
        empty.className="timeline-lane-empty";
        empty.textContent=track.type==="voiceover" ? "اربط ملف التعليق الصوتي من مكتبة الوسائط"
          : track.type==="music" ? "اربط الموسيقى أو المؤثرات من مكتبة الوسائط" : "لا توجد مقاطع";
        body.append(empty);
      } else {
        track.clips.forEach(clip => {
          const button=document.createElement("button");
          button.type="button";
          button.className="timeline-clip";
          button.style.left=(clip.start/safeTotal*100)+"%";
          button.style.width=Math.max(clip.duration/safeTotal*100,Math.min(4,100/safeTotal))+"%";
          button.title=clip.name+" · "+timecode(clip.start)+" — "+timecode(clip.start+clip.duration);
          button.textContent=clip.name.length>22 ? clip.name.slice(0,21)+"…" : clip.name;
          if (track.type==="video") {
            const sceneIndex=scenes.findIndex(scene=>String(scene.id)===String(clip.scene_id));
            button.dataset.sceneIndex=String(sceneIndex);
            button.draggable=true;
            button.addEventListener("click",()=>{
              if (sceneIndex>=0) selectTimelineScene(sceneIndex);
            });
            button.addEventListener("dragstart",event=>{
              if (sceneIndex<0) return;
              event.dataTransfer.setData("text/plain",String(sceneIndex));
              event.dataTransfer.effectAllowed="move";
            });
            button.addEventListener("dragover",event=>event.preventDefault());
            button.addEventListener("drop",event=>{
              event.preventDefault();
              event.stopPropagation();
              const from=Number(event.dataTransfer.getData("text/plain"));
              const to=Number(button.dataset.sceneIndex);
              if (Number.isInteger(from) && Number.isInteger(to) && from!==to) reorderScene(from,to);
            });
          } else if (track.type==="subtitle") {
            button.addEventListener("click",()=>editCaption(clip.id));
            button.setAttribute("aria-label","تعديل الترجمة: "+clip.name);
          } else {
            button.disabled=true;
            button.setAttribute("aria-label",clip.name+" — معاينة مسار");
          }
          body.append(button);
        });
      }
      if (track.type==="video") {
        body.addEventListener("click", event => {
          if (event.target !== body) return;
          const bounds = body.getBoundingClientRect();
          if (bounds.width > 0) seekTimeline(((event.clientX - bounds.left) / bounds.width) * total);
        });
        body.addEventListener("dragover",event=>event.preventDefault());
        body.addEventListener("drop",event=>{
          event.preventDefault();
          const from=Number(event.dataTransfer.getData("text/plain"));
          if (Number.isInteger(from) && from>=0 && from<scenes.length) reorderScene(from,scenes.length-1);
        });
      }
      row.append(heading,body);
      lanes.append(row);
    });
    seekTimeline(playheadTime, true);
  }

  function reorderScene(from, to) {
    if (from<0 || to<0 || from>=scenes.length || to>=scenes.length || from===to) return;
    const oldScenes=scenes.map(scene=>({...scene}));
    const moved=scenes.splice(from,1)[0];
    scenes.splice(to,0,moved);
    rebaseCaptions(oldScenes,scenes);
    selectedScene=to;
    playheadTime=timelineMath.sceneStart(scenes,to);
    renderAll();
    scheduleSave();
  }

  function moveScene(index, delta) {
    const next = index + delta;
    if (next < 0 || next >= scenes.length) return;
    const oldScenes=scenes.map(scene=>({...scene}));
    [scenes[index], scenes[next]] = [scenes[next], scenes[index]];
    rebaseCaptions(oldScenes,scenes);
    selectedScene = next;
    playheadTime = timelineMath.sceneStart(scenes,next);
    renderAll();
    scheduleSave();
  }

  function deleteScene(index) {
    if (scenes.length <= 1) { alert("يجب أن يحتوي المشروع على مشهد واحد على الأقل."); return; }
    const oldScenes=scenes.map(scene=>({...scene}));
    scenes.splice(index, 1);
    rebaseCaptions(oldScenes,scenes);
    selectedScene = Math.min(selectedScene, scenes.length - 1);
    if(editingCaptionId && !captions.some(cue=>String(cue.id)===String(editingCaptionId))) resetCaptionForm();
    playheadTime = timelineMath.sceneStart(scenes,selectedScene);
    renderAll();
    scheduleSave();
  }

  function addScene() {
    scenes.push({id: Date.now(), title:"مشهد جديد", narration:"اكتب الرسالة التي تريد إيصالها في هذا المشهد.", visual:"حدد العنصر الرئيسي والحركة والإضاءة والإحساس البصري.", narrative_role:"story_beat", purpose:"", continuity_note:"", image_file:"", camera_move:"push_in", seconds:10});
    selectedScene = scenes.length - 1;
    playheadTime = timelineMath.sceneStart(scenes,selectedScene);
    renderAll();
    scheduleSave();
  }

  function updatePreview() {
    const scene = scenes[selectedScene];
    if (!scene) return;
    $("previewMeta").textContent = "SCENE " + String(selectedScene + 1).padStart(2,"0") + " / " + String(scenes.length).padStart(2,"0");
    $("previewTime").textContent = timecode(playheadTime);
    $("previewTitle").textContent = scene.title;
    $("previewAsset").textContent = scene.image_file
      ? "ASSET: jobs/" + scene.image_file + " · " + scene.camera_move
      : "لا توجد صورة مرفقة؛ سيستخدم المحرك خلفية تصميمية لهذا المشهد.";
    drawCanvas(scene, selectedScene);
  }

  function drawCanvas(scene, index) {
    const canvas = $("previewCanvas");
    const ctx = canvas.getContext("2d");
    const colors = palette[$("style").value] || palette.cinematic;
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, colors[0]); grad.addColorStop(1, "#070d18");
    ctx.fillStyle = grad; ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.strokeStyle = "rgba(189,220,240,.09)";
    for (let x=0; x<canvas.width; x+=52) { ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke(); }
    for (let y=0; y<canvas.height; y+=52) { ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke(); }

    for(let i=0;i<44;i++){
      const x=(i*193+71)%canvas.width, y=(i*97+29)%canvas.height;
      ctx.fillStyle = "rgba(225,240,249,"+(0.14+(i%4)*0.09)+")";
      ctx.beginPath();ctx.arc(x,y,(i%3)+0.7,0,Math.PI*2);ctx.fill();
    }
    ctx.strokeStyle = colors[2];ctx.globalAlpha=.25;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(canvas.width*.79,canvas.height*.33,canvas.height*.23,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(canvas.width*.79,canvas.height*.33,canvas.height*.31,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;
    ctx.fillStyle=colors[2];ctx.fillRect(54,66,45,3);
    ctx.fillStyle="rgba(226,240,247,.72)";ctx.font="600 16px Manrope, sans-serif";ctx.textAlign="left";
    ctx.fillText("CINEFORGE   /   " + String(index+1).padStart(2,"0"),54,54);
    ctx.textAlign="right";ctx.fillStyle="#f0f5f9";ctx.font="700 38px IBM Plex Sans Arabic, sans-serif";
    const title = scene.title || "مشهد بلا عنوان";
    ctx.fillText(title.length>35 ? title.slice(0,34)+"…" : title, canvas.width-56, canvas.height*.56);
    ctx.fillStyle="rgba(220,233,242,.78)";ctx.font="400 20px IBM Plex Sans Arabic, sans-serif";
    const subtitle=(scene.narration||"").slice(0,72);
    ctx.fillText(subtitle.length>65 ? subtitle.slice(0,64)+"…" : subtitle,canvas.width-56,canvas.height*.67);
    ctx.fillStyle=colors[2];ctx.fillRect(54,canvas.height-64,canvas.width-108,2);
    ctx.fillStyle="rgba(220,233,242,.62)";ctx.font="500 13px Manrope, sans-serif";ctx.textAlign="left";
    ctx.fillText("STORYBOARD PREVIEW  •  "+timecode(scene.seconds),54,canvas.height-36);
  }

  function buildJob() {
    const brief = readForm();
    if (!brief.idea) throw new Error("أضف الفكرة الأساسية أولاً.");
    if (!scenes.length) throw new Error("أنشئ مخطط المشاهد أولاً.");
    if (scenes.length > 40) throw new Error("الحد الأقصى 40 مشهداً.");
    const safeScenes = projectEngine.toRendererScenes(scenes);
    const total = safeScenes.reduce((sum, scene) => sum + scene.seconds, 0);
    if (total > 900) throw new Error("مدة المشروع تتجاوز 15 دقيقة، قسّمه إلى جزأين.");
    return {
      schema_version: 1,
      title: brief.title.slice(0,90),
      idea: brief.idea.slice(0,500),
      language: brief.language,
      style: brief.style,
      aspect: brief.aspect,
      fps: 24,
      resolution: "1080p",
      voiceover_file: brief.voiceover_file || null,
      music_file: brief.music_file || null,
      music_volume: brief.music_volume,
      story_context: importedStoryPlan ? {
        ...importedStoryPlan,
        import_contract: "cineforge.story-plan@2",
        note: "Planning snapshot imported into the renderer workspace. Rendered visuals use the scene fields above."
      } : null,
      scenes: safeScenes,
      subtitles: captionsEngine.validate(captions,{duration:total,scenes})
    };
  }

  function downloadJob() {
    try {
      const job = buildJob();
      const compatibility = projectEngine.rendererCompatibility(makeProjectDocument());
      if (!compatibility.ok) {
        throw new Error("لا يمكن تنزيل وصف الرندر بأمان لأن بعض تعديلات الخط الزمني لا يدعمها المصيّر الحالي:\n" +
          compatibility.errors.slice(0,8).join("\n"));
      }
      const blob = new Blob([JSON.stringify(job, null, 2)], {type:"application/json;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const slug = (job.title || "cineforge").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,"-").replace(/^-|-$/g,"").slice(0,40) || "cineforge";
      anchor.href = url; anchor.download = "cineforge-" + slug + ".json";
      document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setSavedState("تم تنزيل JSON");
    } catch (error) { alert(error.message); }
  }



  function rebaseCaptions(oldScenes,newScenes) {
    captions = captionsEngine.rebase(captions, oldScenes, newScenes);
  }

  function captionOptions() {
    const select=$("captionScene");
    if(!select) return;
    const previous=select.value;
    select.replaceChildren();
    let cursor=0;
    scenes.forEach((scene,index)=>{
      const option=document.createElement("option");
      option.value=String(scene.id);
      option.textContent=String(index+1).padStart(2,"0")+" · "+scene.title+" ("+timecode(cursor)+"–"+timecode(cursor+scene.seconds)+")";
      select.append(option);
      cursor+=Number(scene.seconds)||0;
    });
    if(scenes.some(scene=>String(scene.id)===previous)) select.value=previous;
    else if(scenes[selectedScene]) select.value=String(scenes[selectedScene].id);
  }

  function renderCaptions() {
    const list=$("captionList");
    if(!list) return;
    captionOptions();
    try {
      captions=captionsEngine.validate(captions,{duration:totalSeconds(),scenes});
      $("captionStatus").textContent=captions.length+" مقطع ترجمة · "+timecode(totalSeconds())+" مدة المشروع";
    } catch(error) {
      $("captionStatus").textContent="تحتاج الترجمة إلى مراجعة: "+error.message;
    }
    list.replaceChildren();
    if(!captions.length){
      const empty=document.createElement("div");
      empty.className="caption-empty";
      empty.textContent="لا توجد ترجمة بعد. أضف مقطعاً أو استورد ملف SRT / VTT.";
      list.append(empty); return;
    }
    captions.forEach(cue=>{
      const row=document.createElement("article"); row.className="caption-item";
      const body=document.createElement("div"); body.className="caption-item-body";
      const stamp=document.createElement("span"); stamp.className="caption-time";
      stamp.textContent=captionsEngine.timestamp(cue.start,",")+" – "+captionsEngine.timestamp(cue.end,",");
      const text=document.createElement("p"); text.textContent=cue.text;
      const scene=scenes.find(item=>String(item.id)===String(cue.scene_id));
      const linked=document.createElement("small"); linked.textContent=scene?"المشهد: "+scene.title:"مشهد غير معروف";
      body.append(stamp,text,linked);
      const actions=document.createElement("div"); actions.className="caption-item-actions";
      const edit=document.createElement("button"); edit.type="button"; edit.className="media-action"; edit.textContent="تعديل";
      edit.addEventListener("click",()=>editCaption(cue.id));
      const remove=document.createElement("button"); remove.type="button"; remove.className="media-delete"; remove.textContent="حذف";
      remove.addEventListener("click",()=>deleteCaption(cue.id));
      actions.append(edit,remove); row.append(body,actions); list.append(row);
    });
  }

  function resetCaptionForm() {
    editingCaptionId=null;
    $("captionText").value="";
    $("captionSaveButton").textContent="إضافة الترجمة";
    $("captionCancelButton").hidden=true;
    captionOptions();
    const scene=scenes[selectedScene];
    const start=scene ? timelineMath.sceneStart(scenes,selectedScene) : 0;
    $("captionScene").value=scene ? String(scene.id) : "";
    $("captionStart").value=String(start.toFixed(3));
    $("captionEnd").value=String(Math.min(start+2.5,start+(Number(scene&&scene.seconds)||3)).toFixed(3));
  }

  function editCaption(id) {
    const cue=captions.find(item=>String(item.id)===String(id));
    if(!cue) return;
    editingCaptionId=cue.id; captionOptions(); $("captionScene").value=cue.scene_id;
    $("captionStart").value=String(cue.start); $("captionEnd").value=String(cue.end);
    $("captionText").value=cue.text; $("captionSaveButton").textContent="حفظ تعديل الترجمة";
    $("captionCancelButton").hidden=false; $("captionText").focus();
  }

  function saveCaption() {
    try {
      const cue={id:editingCaptionId || (window.crypto&&window.crypto.randomUUID ? window.crypto.randomUUID() : "caption-"+Date.now()),
        scene_id:$("captionScene").value,start:Number($("captionStart").value),end:Number($("captionEnd").value),text:$("captionText").value};
      captions=captionsEngine.validate(captions.filter(item=>String(item.id)!==String(cue.id)).concat(cue),{duration:totalSeconds(),scenes});
      resetCaptionForm(); renderCaptions(); renderTimeline(); scheduleSave(); setSavedState("تم حفظ مقطع الترجمة");
    } catch(error) { alert("تعذّر حفظ الترجمة: "+(error.message||"توقيت أو نص غير صالح.")); }
  }

  function deleteCaption(id) {
    captions=captions.filter(cue=>String(cue.id)!==String(id));
    if(String(editingCaptionId)===String(id)) resetCaptionForm();
    renderCaptions(); renderTimeline(); scheduleSave(); setSavedState("تم حذف مقطع الترجمة");
  }

  function exportCaptions(format) {
    try {
      const valid=captionsEngine.validate(captions,{duration:totalSeconds(),scenes});
      if(!valid.length) throw new Error("أضف مقاطع ترجمة أولاً.");
      const body=format==="vtt"?captionsEngine.exportVtt(valid,{duration:totalSeconds(),scenes}):captionsEngine.exportSrt(valid,{duration:totalSeconds(),scenes});
      downloadBlob(new Blob([body],{type:format==="vtt"?"text/vtt;charset=utf-8":"application/x-subrip;charset=utf-8"}),
        "cineforge-captions."+(format==="vtt"?"vtt":"srt"));
      setSavedState("تم تصدير "+format.toUpperCase());
    } catch(error) { alert("تعذّر تصدير الترجمة: "+error.message); }
  }

  async function importCaptionsFile() {
    const file=$("captionFile").files && $("captionFile").files[0];
    if(!file) return;
    try {
      if(file.size>2*1024*1024) throw new Error("حجم ملف الترجمة أكبر من 2 ميغابايت.");
      const parsed=/\.vtt$/i.test(file.name)?captionsEngine.parseVtt(await file.text()):captionsEngine.parseSrt(await file.text());
      const mapped=parsed.map((cue,index)=>({...cue,id:"caption-import-"+Date.now()+"-"+index,
        scene_id:captionsEngine.sceneAt(scenes,(cue.start+cue.end)/2)}));
      captions=captionsEngine.validate(captions.concat(mapped),{duration:totalSeconds(),scenes});
      editingCaptionId=null; renderCaptions(); renderTimeline(); scheduleSave();
      setSavedState("تم استيراد "+mapped.length+" مقطع ترجمة");
    } catch(error) { alert("تعذّر استيراد ملف الترجمة: "+error.message); }
    finally { $("captionFile").value=""; }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function mediaKindLabel(kind) {
    return ({image:"صورة",audio:"صوت",video:"فيديو"})[kind] || "ملف";
  }

  function createMediaButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className || "tiny-button";
    button.textContent = label;
    button.addEventListener("click", event => {
      event.stopPropagation();
      Promise.resolve(handler()).catch(error => alert(error.message || "تعذّر تنفيذ العملية."));
    });
    return button;
  }

  async function refreshMediaBin() {
    const grid = $("mediaGrid");
    mediaPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    mediaPreviewUrls = [];
    try {
      const items = await mediaBin.list();
      const usage = await mediaBin.usage();
      $("mediaStats").textContent = items.length + " ملف · " + formatBytes(usage.bytes) + " مستخدمة من " + formatBytes(usage.maxBytes) + " · محفوظة على هذا المتصفح";
      grid.replaceChildren();
      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "media-empty";
        empty.textContent = "المكتبة فارغة حالياً. أضف صوراً أو ملفات صوتية أو فيديو للبدء.";
        grid.append(empty);
        return;
      }
      for (const item of items) {
        const card = document.createElement("article");
        card.className = "media-card";
        const visual = document.createElement("div");
        visual.className = "media-card-visual";
        visual.textContent = item.kind === "image" ? "▧" : item.kind === "audio" ? "♫" : "▶";
        if (item.kind === "image" && item.size <= 12 * 1024 * 1024) {
          const stored = await mediaBin.get(item.id);
          if (stored && stored.blob) {
            const url = URL.createObjectURL(stored.blob);
            mediaPreviewUrls.push(url);
            const image = document.createElement("img");
            image.src = url;
            image.alt = item.name;
            image.loading = "lazy";
            visual.replaceChildren(image);
          }
        }
        const body = document.createElement("div");
        body.className = "media-card-body";
        const title = document.createElement("strong");
        title.className = "media-card-title";
        title.textContent = item.name;
        title.title = item.name;
        const detail = document.createElement("span");
        detail.className = "media-card-detail";
        const technical = [];
        if (item.width && item.height) technical.push(item.width + " × " + item.height);
        if (Number.isFinite(item.duration_seconds)) technical.push("مدة " + timecode(item.duration_seconds));
        if (item.metadata_status === "unavailable") technical.push("تعذّرت قراءة البيانات الفنية");
        detail.textContent = mediaKindLabel(item.kind) + " · " + formatBytes(item.size) +
          (technical.length ? " · " + technical.join(" · ") : "");
        const origin = document.createElement("span");
        origin.className = "media-card-origin";
        const sourceLabels = {user:"من إنشائي",generated:"مولّد",open_license:"ترخيص مفتوح",licensed:"مرخّص",unknown:"غير متحقق"};
        origin.textContent = (sourceLabels[item.source_type] || "غير متحقق") + " · " + (item.license || "غير محدد");
        const hash = document.createElement("code");
        hash.className = "media-hash";
        hash.textContent = item.sha256 ? "SHA-256 " + item.sha256.slice(0,16) + "…" : "تعذّر إنشاء بصمة SHA-256";
        body.append(title, detail, origin, hash);
        const actions = document.createElement("div");
        actions.className = "media-card-actions";
        if (item.kind === "image") {
          actions.append(createMediaButton("تعيين للمشهد المحدد","media-action",()=>assignMedia(item.id,"image")));
        } else if (item.kind === "audio") {
          actions.append(
            createMediaButton("تعليق صوتي","media-action",()=>assignMedia(item.id,"voiceover")),
            createMediaButton("موسيقى","media-action",()=>assignMedia(item.id,"music"))
          );
        } else {
          const note = document.createElement("span");
          note.className = "media-future-note";
          note.textContent = "محفوظ · مسار الفيديو غير مدمج في الرندر الحالي";
          actions.append(note);
        }
        actions.append(createMediaButton("حذف","media-delete",()=>removeMedia(item)));
        card.append(visual,body,actions);
        grid.append(card);
      }
    } catch (error) {
      $("mediaStats").textContent = "المكتبة غير متاحة";
      grid.replaceChildren();
      const message = document.createElement("div");
      message.className = "media-empty media-error";
      message.textContent = error.message || "تعذّر فتح مكتبة الوسائط.";
      grid.append(message);
    }
  }

  async function addSelectedMediaFiles() {
    const input = $("mediaFiles");
    const files = Array.from(input.files || []);
    if (!files.length) return;
    if (files.length > 20) {
      alert("أضف 20 ملفاً كحد أقصى في الدفعة الواحدة.");
      input.value = "";
      return;
    }
    const metadata = {
      source_type: $("assetSourceType").value,
      source_ref: $("assetSourceRef").value,
      license: $("assetLicense").value,
      notes: $("assetNotes").value
    };
    let added = 0;
    const errors = [];
    for (const file of files) {
      try {
        await mediaBin.add(file, metadata);
        added++;
      } catch (error) {
        errors.push(file.name + ": " + (error.message || "فشل الإضافة"));
      }
    }
    input.value = "";
    await refreshMediaBin();
    setSavedState("تمت إضافة " + added + " ملف إلى المكتبة");
    if (errors.length) alert("أُضيف " + added + " ملف. تعذّرت إضافة بعض الملفات:\n" + errors.slice(0,8).join("\n"));
  }

  async function assignMedia(id, target) {
    const asset = await mediaBin.get(id);
    if (!asset) throw new Error("لم يعد الملف موجوداً في المكتبة.");
    const path = mediaBin.projectPath(asset);
    if (target === "image") {
      if (!scenes[selectedScene]) throw new Error("أنشئ المشاهد أولاً ثم اختر المشهد المطلوب.");
      scenes[selectedScene].image_file = path;
      renderAll();
    } else if (target === "voiceover") {
      $("voiceoverFile").value = path;
      renderTimeline();
    } else if (target === "music") {
      $("musicFile").value = path;
      renderTimeline();
    }
    scheduleSave();
    setSavedState("تم ربط " + asset.name + " بالمشروع");
  }

  async function removeMedia(item) {
    const path = mediaBin.projectPath(item);
    const referenced = scenes.some(scene => scene.image_file === path) ||
      $("voiceoverFile").value.trim() === path || $("musicFile").value.trim() === path;
    if (referenced) {
      alert("لا يمكن حذف هذا الملف لأنه مستخدم في المشروع. أزل ارتباطه من المشهد أو مسار الصوت أولاً.");
      return;
    }
    if (!confirm("حذف " + item.name + " من مكتبة هذا المتصفح؟")) return;
    await mediaBin.remove(item.id);
    await refreshMediaBin();
    setSavedState("تم حذف الملف من المكتبة");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function runExportPreflight() {
    const panel = $("preflightReport");
    panel.replaceChildren();
    const addLine = (kind, message) => {
      const item = document.createElement("li");
      item.className = "preflight-item preflight-" + kind;
      item.textContent = message;
      panel.append(item);
    };

    let job;
    try {
      job = buildJob();
    } catch (error) {
      panel.dataset.state = "blocked";
      addLine("error", "لا يمكن فحص المشروع: " + (error.message || "بيانات المشروع غير مكتملة."));
      $("preflightSummary").textContent = "الفحص متوقف";
      return;
    }

    try {
      const currentProject = makeProjectDocument();
      const compatibility = projectEngine.rendererCompatibility(currentProject);
      const records = await mediaBin.list();
      const packageAudit = mediaBin.auditPackageAssets(job, records);
      const includeUnused = $("includeUnusedMedia").checked;
      const preflightRecords = includeUnused ? records : packageAudit.assets;
      const preflightDuplicatePaths = includeUnused
        ? packageAudit.all_duplicate_paths
        : packageAudit.duplicate_paths;
      const preflightRightsAudit = mediaBin.auditRights(preflightRecords);
      const renderBlocking = [];
      const packageBlocking = [];
      const warnings = [];

      if (!compatibility.ok) renderBlocking.push(...compatibility.errors);
      if (packageAudit.missing_paths.length) {
        packageBlocking.push("ملفات مستخدمة غير موجودة في مكتبة هذا المتصفح: " + packageAudit.missing_paths.join("، "));
      }
      if (preflightDuplicatePaths.length) {
        packageBlocking.push("توجد مسارات أصول مكررة ضمن نطاق الحزمة المختار: " + preflightDuplicatePaths.join("، "));
      }
      if (includeUnused && packageAudit.invalid_records.length) {
        packageBlocking.push("لا يمكن تضمين المكتبة كاملة قبل إصلاح " +
          packageAudit.invalid_records.length + " سجل وسائط غير صالح.");
      }
      if (packageAudit.type_mismatches.length) {
        renderBlocking.push(...packageAudit.type_mismatches.map(item =>
          item.name + ": نوع الأصل " + item.actual_kind + " لا يطابق الاستخدام المطلوب (" +
          item.expected_kinds.join(" أو ") + ")."));
      }
      if (preflightRightsAudit.issue_count) {
        warnings.push("توجد " + preflightRightsAudit.issue_count +
          " ملاحظات حقوق في " + preflightRightsAudit.checked_assets + " أصل ضمن نطاق الحزمة المختار.");
      }
      if (packageAudit.aspect_mismatches.length) {
        warnings.push(packageAudit.aspect_mismatches.length +
          " صورة تختلف نسبتها عن أبعاد الفيديو المختارة بأكثر من 8%؛ راجع القص والملاءمة قبل الإنتاج.");
      }
      const unreadableMetadata = preflightRecords.filter(item => item.metadata_status !== "available").length;
      if (unreadableMetadata) {
        warnings.push(unreadableMetadata + " أصل ضمن نطاق الحزمة المختار لم يتمكن المتصفح من قراءة بياناته الفنية.");
      }
      if (!packageAudit.referenced_paths.length) {
        warnings.push("لا توجد صور أو ملفات صوت مرتبطة بالرندر الحالي؛ سيعتمد الناتج على تصميمات Motion Graphics والنصوص.");
      }
      if (packageAudit.unreferenced_assets.length) {
        warnings.push(packageAudit.unreferenced_assets.length +
          (includeUnused
            ? " ملفاً غير مرتبط بالمشاهد لكنه سيُضمّن لأنك اخترت نسخ المكتبة كاملة."
            : " ملفاً في المكتبة غير مرتبط بالمشروع، ولن يدخل الحزمة الافتراضية."));
      }
      if (packageAudit.invalid_records.length && !includeUnused) {
        warnings.push(packageAudit.invalid_records.length +
          " سجل وسائط غير صالح خارج نطاق الحزمة الافتراضي؛ لن يؤثر ما لم تختر تضمين المكتبة كاملة.");
      }

      const blocked = renderBlocking.length > 0 || packageBlocking.length > 0;
      panel.dataset.state = blocked ? "blocked" : warnings.length ? "warning" : "ready";
      $("preflightSummary").textContent = renderBlocking.length
        ? "الرندر يحتاج معالجة"
        : packageBlocking.length ? "حزمة ZIP غير مكتملة"
        : warnings.length ? "جاهز مع تنبيهات" : "اجتاز الفحص الأولي";

      addLine(renderBlocking.length ? "error" : "success",
        renderBlocking.length
          ? "توجد تعديلات أو ملفات لا يستطيع المصيّر الحالي تمثيلها بأمان."
          : "توافق الخط الزمني وأنواع الملفات مع المصيّر الحالي سليم.");
      if (packageBlocking.length) {
        addLine("warning", "لا يمكن إنشاء ZIP مكتمل حتى تُعالج ملاحظات النطاق المحدد أدناه. قد تكون بعض الملفات موجودة مسبقاً في مستودع الإنتاج.");
      }
      addLine("info", job.scenes.length + " مشهد · " + timecode(job.scenes.reduce((sum, scene) => sum + scene.seconds, 0)) +
        " · " + job.aspect + " · " + preflightRecords.length + " أصل ضمن نطاق الحزمة.");
      renderBlocking.forEach(message => addLine("error", message));
      packageBlocking.forEach(message => addLine("warning", message));
      warnings.forEach(message => addLine("warning", message));
      if (!blocked && !warnings.length) addLine("success", "لا توجد ملاحظات معروفة في هذا الفحص.");
      setSavedState(blocked ? "فحص التصدير: يحتاج معالجة" : "اكتمل فحص التصدير الأولي");
    } catch (error) {
      panel.dataset.state = "blocked";
      $("preflightSummary").textContent = "تعذّر إكمال الفحص";
      addLine("error", error.message || "حدث خطأ غير متوقع أثناء فحص المشروع.");
    }
  }

  async function downloadProjectPackage() {
    try {
      const records = await mediaBin.list();
      const job = buildJob();
      const compatibility = projectEngine.rendererCompatibility(makeProjectDocument());
      if (!compatibility.ok && !confirm(
        "تنبيه: هذه الحزمة ستحفظ ملف المشروع الكامل، لكن وصف الرندر v1 لا يستطيع تمثيل بعض تعديلات الخط الزمني الحالية.\n\n" +
        compatibility.errors.slice(0,6).join("\n") +
        "\n\nيمكنك المتابعة لنسخ المشروع الاحتياطي، لكن لا تعتمد على ملف الرندر حتى تعالج هذه الملاحظات. هل تريد المتابعة؟"
      )) return;
      const packageAudit = mediaBin.auditPackageAssets(job, records);
      if (packageAudit.missing_paths.length) {
        throw new Error("الحزمة لن تكون مكتملة. أضف هذه الملفات إلى مكتبة الوسائط ثم أعد ربطها:\n" +
          packageAudit.missing_paths.slice(0,8).join("\n"));
      }
      if (packageAudit.duplicate_paths.length) {
        throw new Error("توجد مسارات مكررة في مكتبة الوسائط: " + packageAudit.duplicate_paths.join("، "));
      }
      if (packageAudit.type_mismatches.length) {
        throw new Error("نوع بعض الملفات لا يطابق الاستخدام في المشروع: " +
          packageAudit.type_mismatches.slice(0,8).map(item => item.name + " (" + item.actual_kind + ")").join("، "));
      }

      const includeUnused = $("includeUnusedMedia").checked;
      if (includeUnused && packageAudit.all_duplicate_paths.length) {
        throw new Error("توجد مسارات متضاربة بين ملفات المكتبة الكاملة: " +
          packageAudit.all_duplicate_paths.slice(0,8).join("، "));
      }
      if (includeUnused && packageAudit.invalid_records.length) {
        throw new Error("لا يمكن تضمين كامل المكتبة قبل إصلاح السجلات غير الصالحة: " +
          packageAudit.invalid_records.slice(0,5).map(item => item.name).join("، "));
      }
      const packageRecords = includeUnused ? records : packageAudit.assets;
      const rightsAudit = mediaBin.auditRights(packageRecords);
      if (!rightsAudit.ok) {
        const details = rightsAudit.issues.slice(0,10)
          .map(issue => "• " + issue.name + ": " + issue.message).join("\n");
        const remaining = rightsAudit.issue_count > 10
          ? "\nو" + (rightsAudit.issue_count - 10) + " ملاحظات أخرى." : "";
        const warning = "تنبيه الحقوق: توجد " + rightsAudit.issue_count +
          " ملاحظات في " + rightsAudit.checked_assets + " أصل ستُضاف إلى الحزمة.\n\n" +
          details + remaining +
          "\n\nيمكنك متابعة إنشاء النسخة الاحتياطية، لكن لا تنشر أو تستخدم الأصول ذات الحقوق غير المتحققة قبل مراجعتها. هل تريد المتابعة؟";
        if (!confirm(warning)) return;
      }
      const slug = (job.title || "cineforge").normalize("NFKC")
        .replace(/[^\p{L}\p{N}-]+/gu,"-").replace(/^-|-$/g,"").slice(0,48) || "cineforge";
      const manifestAssets = packageRecords.map(item => ({
        id:item.id, name:item.name, kind:item.kind, mime:item.mime, size:item.size,
        width:item.width ?? null, height:item.height ?? null,
        duration_seconds:item.duration_seconds ?? null, metadata_status:item.metadata_status || "unavailable",
        sha256:item.sha256, source_type:item.source_type, source_ref:item.source_ref,
        license:item.license, notes:item.notes, created_at:item.created_at,
        project_path:mediaBin.projectPath(item)
      }));
      const assetScope = includeUnused ? "full-library" : "project-referenced";
      const projectFilePath = "apps/cineforge-studio/projects/" + slug + ".cineforge.json";
      const fullProject = makeProjectDocument();
      job.project_manifest = {
        schema:"cineforge.project",
        schema_version:2,
        created_at:fullProject.created_at,
        project_file:projectFilePath,
        project_revision:fullProject.revision,
        timeline_schema_version:1,
        renderer_job_schema_version:1,
        asset_count:manifestAssets.length,
        asset_scope:assetScope
      };
      job.media_manifest = manifestAssets;
      job.media_manifest_scope = assetScope;
      const jobRoot = "apps/cineforge-studio/jobs/";
      const entries = [
        {name:jobRoot + slug + ".json",data:JSON.stringify(job,null,2) + "\n"},
        {name:projectFilePath,data:JSON.stringify(fullProject,null,2) + "\n"},
        {name:"apps/cineforge-studio/media-manifests/media-manifest-" + slug + ".json",data:JSON.stringify({
          schema:"cineforge.media-manifest",schema_version:1,project_title:job.title,
          asset_scope:assetScope,assets:manifestAssets
        },null,2) + "\n"},
        {name:"CINEFORGE-PACKAGE-README.txt",data:
          "CineForge project package\n\n" +
          "Extract this ZIP at the repository root and preserve the folder structure.\n" +
          "The render job is under apps/cineforge-studio/jobs/.\n" +
          "Media paths in the job are relative to that jobs/ folder.\n" +
          "Packaged media scope: " + assetScope + ".\n" +
          "By default only media referenced by this project is included.\n" +
          "Commit the JSON and its required assets/audio files together before running the CineForge workflow.\n" +
          "This package contains local media copies and their provenance metadata.\n"}
      ];
      for (const item of packageRecords) {
        const stored = await mediaBin.get(item.id);
        if (!stored || !stored.blob) throw new Error("الملف مفقود من التخزين المحلي: " + item.name);
        entries.push({name:jobRoot + mediaBin.projectPath(item),data:stored.blob});
      }
      const zip = await mediaBin.buildZip(entries);
      downloadBlob(zip,"cineforge-" + slug + "-project.zip");
      setSavedState("تم إنشاء حزمة المشروع · " + packageRecords.length + " أصل");
    } catch (error) {
      alert("تعذّر إنشاء حزمة المشروع:\n" + (error.message || "خطأ غير معروف"));
    }
  }

  function updateMusicVolumeLabel() {
    $("musicVolumeValue").textContent = Math.round(Number($("musicVolume").value) * 100) + "%";
  }

  function makeProjectDocument() {
    const state={form:readForm(),scenes,selectedScene,storyPlan:importedStoryPlan,captions};
    return projectEngine.createProject(state,projectDocument);
  }

  function downloadFullProject() {
    try {
      const project=makeProjectDocument();
      projectDocument=project;
      const blob=new Blob([JSON.stringify(project,null,2)],{type:"application/json;charset=utf-8"});
      const slug=(project.title||"cineforge").normalize("NFKC")
        .replace(/[^\p{L}\p{N}-]+/gu,"-").replace(/^-|-$/g,"").slice(0,48)||"cineforge";
      downloadBlob(blob,"cineforge-"+slug+".cineforge.json");
      scheduleSave();
      setSavedState("تم تنزيل ملف المشروع الكامل");
    } catch(error) { alert("تعذّر تصدير المشروع: "+(error.message||"خطأ غير معروف")); }
  }

  async function restorePreviousVersion() {
    try {
      const current=projectDocument || makeProjectDocument();
      const history=await projectStorage.listSnapshots(current.id);
      if (!history.length) {
        alert("لا توجد نسخة سابقة محفوظة بعد. تُنشأ النسخ السابقة تلقائياً عند تعديل المشروع وحفظ إصدار جديد.");
        return;
      }
      const latest=history[0];
      const date=new Date(latest.createdAt).toLocaleString("ar");
      if (!confirm("استعادة النسخة السابقة المحفوظة بتاريخ "+date+"؟ سيُحفظ الإصدار الحالي في سجل الاستعادة قبل الاستبدال.")) return;
      const previous=await projectStorage.restoreSnapshot(latest.id);
      if (!previous) throw new Error("تعذّر قراءة النسخة الاحتياطية.");
      const normalized=projectEngine.normalizeProject(previous);
      const editor=projectEngine.toEditorState(normalized);
      const restored=projectEngine.createProject({
        id:normalized.id,
        form:editor.form,
        scenes:editor.scenes,
        selectedScene:editor.selectedScene,
        storyPlan:editor.storyPlan,
        captions:editor.captions
      },current,new Date().toISOString());
      applyProjectDocument(restored,editor);
      renderAll();
      scheduleSave();
      setSavedState("تمت استعادة نسخة سابقة");
    } catch(error) { alert("تعذّرت استعادة النسخة: "+(error.message||"خطأ غير معروف")); }
  }

  function applyProjectDocument(project, suppliedState) {
    const normalized=projectEngine.normalizeProject(project);
    const state=suppliedState || projectEngine.toEditorState(normalized);
    $("projectTitle").value=state.form.title || "مشروع بلا عنوان";
    $("projectIdea").value=state.form.idea || "";
    $("language").value=state.form.language || "ar";
    $("style").value=state.form.style || "cinematic";
    $("aspect").value=state.form.aspect || "16:9";
    setExactTargetDuration(state.form.target_duration || 60);
    $("voiceoverFile").value=state.form.voiceover_file || "";
    $("musicFile").value=state.form.music_file || "";
    $("musicVolume").value=String(state.form.music_volume ?? 0.18);
    updateMusicVolumeLabel();
    scenes=state.scenes.slice(0,40);
    captions=Array.isArray(state.captions)?state.captions.slice(0,500):[];
    editingCaptionId=null;
    importedStoryPlan=state.storyPlan;
    selectedScene=state.selectedScene;
    resetCaptionForm();
    projectDocument=normalized;
    playheadTime=0;
    stopTimelinePlayback();
  }

  function scheduleSave() {
    $("saveState").textContent = "يحفظ…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const snapshot=makeProjectDocument();
        projectDocument=snapshot;
        saveChain=saveChain.catch(()=>{}).then(()=>projectStorage.save(snapshot)).then(result=>{
          $("saveState").textContent=result.backend==="indexedDB" ? "محفوظ · IndexedDB" : "محفوظ · تخزين احتياطي";
        }).catch(()=>{
          $("saveState").textContent = "تعذّر الحفظ المحلي";
        });
      } catch (error) {
        $("saveState").textContent = "تعذّر الحفظ: " + (error.message || "مشروع غير صالح");
      }
    }, 350);
  }

  function setSavedState(value) { $("saveState").textContent = value; }

  function restoreState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!stored) return false;
      const form = stored.form || {};
      $("projectTitle").value = form.title || $("projectTitle").value;
      $("projectIdea").value = form.idea || $("projectIdea").value;
      $("language").value = form.language || "ar";
      $("style").value = form.style || "cinematic";
      $("aspect").value = form.aspect || "16:9";
      $("targetDuration").value = String(form.target_duration || 60);
      $("voiceoverFile").value = form.voiceover_file || "";
      $("musicFile").value = form.music_file || "";
      $("musicVolume").value = String(form.music_volume ?? 0.18);
      updateMusicVolumeLabel();
      scenes = Array.isArray(stored.scenes) ? stored.scenes.slice(0,40) : [];
      captions = Array.isArray(stored.captions) ? stored.captions.slice(0,500) : [];
      importedStoryPlan = stored.storyPlan && typeof stored.storyPlan === "object" ? stored.storyPlan : null;
      selectedScene = Math.max(0,Math.min(Number(stored.selectedScene)||0,scenes.length-1));
      return scenes.length > 0;
    } catch { return false; }
  }

  function importDemo() {
    const job = defaultProject();
    scenes = job.scenes;
    selectedScene = 0;
    renderAll();
  }

  $("generateButton").addEventListener("click", makeOutline);
  $("captionSaveButton").addEventListener("click", saveCaption);
  $("captionCancelButton").addEventListener("click", resetCaptionForm);
  $("captionImportButton").addEventListener("click",()=>$("captionFile").click());
  $("captionFile").addEventListener("change",importCaptionsFile);
  $("captionExportSrtButton").addEventListener("click",()=>exportCaptions("srt"));
  $("captionExportVttButton").addEventListener("click",()=>exportCaptions("vtt"));
  $("importStoryButton").addEventListener("click", () => $("storyPlanFile").click());
  $("importProjectFileButton").addEventListener("click", () => $("projectFile").click());
  $("projectFile").addEventListener("change", async () => {
    const file=$("projectFile").files && $("projectFile").files[0];
    if (!file) return;
    try {
      if (file.size>4*1024*1024) throw new Error("ملف المشروع أكبر من 4 ميغابايت.");
      const document=JSON.parse(await file.text());
      const project=projectEngine.normalizeProject(document);
      const compatibility=projectEngine.rendererCompatibility(project);
      if (!compatibility.ok) {
        throw new Error("لا يمكن فتح هذا الخط الزمني في محرر الرندر الحالي دون فقدان بيانات: "+compatibility.errors.join("؛ "));
      }
      let imported=project;
      if (projectDocument && projectDocument.id===project.id) {
        const editor=projectEngine.toEditorState(project);
        imported=projectEngine.createProject({
          id:project.id,
          form:editor.form,
          scenes:editor.scenes,
          selectedScene:editor.selectedScene,
          storyPlan:editor.storyPlan,
          captions:editor.captions
        },projectDocument,new Date().toISOString());
      }
      applyProjectDocument(imported);
      renderAll();
      scheduleSave();
      setSavedState("تم استيراد ملف المشروع الكامل");
    } catch(error) {
      alert("تعذّر استيراد المشروع: "+(error.message||"ملف غير صالح."));
    } finally {
      $("projectFile").value="";
    }
  });
  $("storyPlanFile").addEventListener("change", async () => {
    const file = $("storyPlanFile").files && $("storyPlanFile").files[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error("حجم ملف خطة القصة أكبر من 1 ميغابايت.");
      const raw = JSON.parse(await file.text());
      importStoryPlanDocument(raw);
    } catch (error) {
      alert("تعذّر استيراد خطة القصة: " + (error && error.message ? error.message : "ملف غير صالح."));
    } finally {
      $("storyPlanFile").value = "";
    }
  });
  $("addSceneButton").addEventListener("click", addScene);
  $("timelinePlayButton").addEventListener("click", toggleTimelinePlayback);
  $("timelineStartButton").addEventListener("click", () => seekTimeline(0));
  $("timelineEndButton").addEventListener("click", () => seekTimeline(totalSeconds()));
  $("timelineFrameBackButton").addEventListener("click", () => stepTimelineFrames(-1));
  $("timelineFrameForwardButton").addEventListener("click", () => stepTimelineFrames(1));
  $("timelineScrubber").addEventListener("input", event => {
    seekTimeline(timelineMath.secondsFromFrame(Number(event.target.value), TIMELINE_FPS));
  });
  $("timelineZoom").addEventListener("input", event => {
    timelineZoom = Math.max(100, Math.min(250, Number(event.target.value) || 100));
    syncTimelinePlayhead();
  });
  $("timelineRuler").addEventListener("click", event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width > 0) seekTimeline(((event.clientX - bounds.left) / bounds.width) * totalSeconds());
  });
  document.addEventListener("keydown", handleTimelineKeyboard);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopTimelinePlayback();
  });
  $("downloadButton").addEventListener("click", downloadJob);
  $("preflightButton").addEventListener("click", runExportPreflight);
  $("downloadProjectFileButton").addEventListener("click", downloadFullProject);
  $("restorePreviousVersionButton").addEventListener("click", restorePreviousVersion);
  $("downloadPackageButton").addEventListener("click", downloadProjectPackage);
  $("mediaFiles").addEventListener("change", addSelectedMediaFiles);
  $("addMediaButton").addEventListener("click", () => $("mediaFiles").click());
  $("printButton").addEventListener("click", () => window.print());
  $("helpButton").addEventListener("click", () => $("helpDialog").showModal());
  $("closeHelp").addEventListener("click", () => $("helpDialog").close());
  $("musicVolume").addEventListener("input", () => { updateMusicVolumeLabel(); scheduleSave(); });
  ["projectTitle","projectIdea","language","style","aspect","targetDuration","voiceoverFile","musicFile"].forEach(id => {
    $(id).addEventListener("input", () => { updatePreview(); if (id === "language") refreshNarrationFitIndicators(); if (id === "voiceoverFile" || id === "musicFile") renderTimeline(); scheduleSave(); });
    $(id).addEventListener("change", () => { updatePreview(); if (id === "language") refreshNarrationFitIndicators(); if (id === "voiceoverFile" || id === "musicFile") renderTimeline(); scheduleSave(); });
  });

  async function initializeStudio() {
    timelineZoom = Number($("timelineZoom").value) || 100;
    resetCaptionForm();
    stopTimelinePlayback();
    let loadedFromProjectStore=false;
    try {
      const stored=await projectStorage.loadLatest();
      if (stored) {
        applyProjectDocument(stored);
        loadedFromProjectStore=true;
      }
    } catch (error) {
      $("saveState").textContent="تعذّرت قراءة النسخة المحفوظة";
    }
    if (!loadedFromProjectStore) {
      if (restoreState()) {
        projectDocument=projectEngine.createProject({
          form:readForm(),scenes,selectedScene,storyPlan:importedStoryPlan,captions
        },null);
        scheduleSave();
      } else {
        importDemo();
        scheduleSave();
      }
    }
    renderAll();
    refreshMediaBin();
    if (loadedFromProjectStore) setSavedState("تمت استعادة آخر مشروع محفوظ");
  }

  initializeStudio().catch(error=>{
    $("saveState").textContent="تعذّر بدء الاستوديو";
    console.error(error);
    if (!scenes.length) importDemo();
    renderAll();
  });
})();
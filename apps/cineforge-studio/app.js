(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "cineforge-studio-project-v1";
  const planner = window.CineForgeStoryPlanner;
  if (!planner) throw new Error("CineForge Story Planner failed to load.");
  let storyArc = planner.createStoryArc({idea: $("projectIdea").value});
  let continuity = {subject:"",location:"",props:"",visual_language:"cinematic"};
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
  let selectedScene = 0;
  let saveTimer = null;

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
      audience: $("audience").value.trim(),
      platform: $("platform").value,
      tone: $("tone").value.trim(),
      voiceover_file: $("voiceoverFile").value.trim(),
      music_file: $("musicFile").value.trim(),
      music_volume: Number($("musicVolume").value)
    };
  }

  function readStoryArcForm() {
    return {
      hook: $("arcHook").value.trim(),
      setup: $("arcSetup").value.trim(),
      development: $("arcDevelopment").value.trim(),
      turning_point: $("arcTurning").value.trim(),
      resolution: $("arcResolution").value.trim()
    };
  }

  function writeStoryArcForm(value) {
    const next = Object.assign(planner.createStoryArc(readForm()), value || {});
    $("arcHook").value = next.hook || "";
    $("arcSetup").value = next.setup || "";
    $("arcDevelopment").value = next.development || "";
    $("arcTurning").value = next.turning_point || "";
    $("arcResolution").value = next.resolution || "";
    storyArc = next;
  }

  function readContinuityForm() {
    return {
      subject: $("continuitySubject").value.trim(),
      location: $("continuityLocation").value.trim(),
      props: $("continuityProps").value.trim(),
      visual_language: $("continuityStyle").value.trim()
    };
  }

  function writeContinuityForm(value) {
    continuity = Object.assign({subject:"",location:"",props:"",visual_language:$("style").value}, value || {});
    $("continuitySubject").value = continuity.subject || "";
    $("continuityLocation").value = continuity.location || "";
    $("continuityProps").value = continuity.props || "";
    $("continuityStyle").value = continuity.visual_language || $("style").value;
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
    const target = brief.target_duration;
    const count = target <= 30 ? 3 : target <= 90 ? 5 : target <= 180 ? 7 : 9;
    const seconds = Math.max(3, Math.round(target / count));
    storyArc = planner.createStoryArc(brief);
    writeStoryArcForm(storyArc);
    if (!continuity.visual_language) writeContinuityForm({visual_language:brief.style});
    scenes = [];
    for (let i = 0; i < count; i++) {
      const base = templates[i % templates.length];
      const plan = planner.createScenePlan(i, count, brief);
      scenes.push({
        id: Date.now() + i,
        title: plan.role_label + ": " + base.title,
        narration: i === 0 ? base.narration.replace("ابدأ بسؤال", "انطلق من الفكرة") : base.narration,
        visual: base.visual,
        image_file: "",
        seconds,
        ...plan
      });
    }
    const remainder = target - scenes.reduce((sum, scene) => sum + scene.seconds, 0);
    scenes[scenes.length - 1].seconds += remainder;
    selectedScene = 0;
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

    const makeInput = (value, className, placeholder, maxLength, handler) => {
      const el = document.createElement("input");
      el.className = className;
      el.value = value || "";
      el.placeholder = placeholder || "";
      el.maxLength = maxLength || 180;
      el.addEventListener("input", () => { handler(el.value); scheduleSave(); });
      return el;
    };
    const makeTextarea = (value, className, placeholder, maxLength, handler) => {
      const el = document.createElement("textarea");
      el.className = className;
      el.value = value || "";
      el.placeholder = placeholder || "";
      el.maxLength = maxLength || 500;
      el.rows = 2;
      el.addEventListener("input", () => { handler(el.value); scheduleSave(); });
      return el;
    };
    const makeSelect = (value, className, options, handler) => {
      const el = document.createElement("select");
      el.className = className;
      options.forEach(([key,label]) => {
        const option = document.createElement("option");
        option.value = key; option.textContent = label;
        el.append(option);
      });
      el.value = value || options[0][0];
      el.addEventListener("change", () => { handler(el.value); scheduleSave(); });
      return el;
    };

    const title = makeInput(scene.title, "scene-title", "عنوان المشهد", 100, value => { scene.title = value; updatePreview(); });
    title.setAttribute("aria-label", "عنوان المشهد " + (index + 1));

    const role = makeSelect(scene.narrative_role, "scene-role", [
      ["hook","الخطاف"],["setup","التمهيد"],["development","التطوير"],
      ["turning_point","نقطة التحول"],["resolution","الخاتمة"]
    ], value => { scene.narrative_role = value; });
    role.setAttribute("aria-label", "الدور السردي للمشهد");

    const purpose = makeTextarea(scene.purpose, "scene-purpose", "لماذا يوجد هذا المشهد؟ ما الذي يجب أن يفهمه المشاهد؟", 500, value => { scene.purpose = value; });
    const narration = makeTextarea(scene.narration, "scene-description", "نص التعليق الصوتي أو الجملة التي تظهر للمشاهد", 700, value => {
      scene.narration = value;
      updateSceneTiming(timing, scene);
      updateTimingSummary();
    });
    narration.setAttribute("aria-label", "نص التعليق للمشهد " + (index + 1));

    const timing = document.createElement("span");
    timing.className = "scene-timing";
    updateSceneTiming(timing, scene);

    const subject = makeTextarea(scene.subject_action, "scene-shot-detail", "الموضوع والفعل: من أو ما الذي نراه؟ وماذا يحدث؟", 500, value => { scene.subject_action = value; });
    const visual = makeTextarea(scene.visual, "scene-visual", "التكوين البصري: العدسة، الحركة، البيئة، الخلفية...", 500, value => { scene.visual = value; });

    const frameLabel = document.createElement("label");
    frameLabel.className = "scene-inline-field";
    const frameCaption = document.createElement("span");
    frameCaption.textContent = "حجم / زاوية اللقطة";
    const framing = makeSelect(scene.framing, "scene-framing", [
      ["establishing","تأسيسية"],["wide","واسعة"],["medium","متوسطة"],["close_up","قريبة"],
      ["detail","تفصيلية"],["over_shoulder","فوق الكتف"],["pov","من منظور العنصر"],["aerial","علوية"]
    ], value => { scene.framing = value; });
    frameLabel.append(frameCaption, framing);

    const lightingLabel = document.createElement("label");
    lightingLabel.className = "scene-inline-field";
    const lightingCaption = document.createElement("span");
    lightingCaption.textContent = "الإضاءة";
    const lighting = makeInput(scene.lighting, "scene-lighting", "مثلاً: ضوء جانبي ناعم، ضباب خفيف...", 180, value => { scene.lighting = value; });
    lightingLabel.append(lightingCaption, lighting);

    const overlayLabel = document.createElement("label");
    overlayLabel.className = "scene-inline-field";
    const overlayCaption = document.createElement("span");
    overlayCaption.textContent = "النص الظاهر على الشاشة";
    const overlay = makeInput(scene.on_screen_text, "scene-overlay-text", "عنوان أو معلومة قصيرة — اتركه فارغاً إن لم يلزم", 180, value => { scene.on_screen_text = value; });
    overlayLabel.append(overlayCaption, overlay);

    const soundLabel = document.createElement("label");
    soundLabel.className = "scene-inline-field";
    const soundCaption = document.createElement("span");
    soundCaption.textContent = "إشارة صوتية";
    const sound = makeInput(scene.sound_cue, "scene-sound-cue", "موسيقى، جوّ، انتقال صوتي، أو صمت مقصود...", 180, value => { scene.sound_cue = value; });
    soundLabel.append(soundCaption, sound);

    const transitionLabel = document.createElement("label");
    transitionLabel.className = "scene-inline-field";
    const transitionCaption = document.createElement("span");
    transitionCaption.textContent = "الانتقال";
    const transition = makeSelect(scene.transition, "scene-transition", [
      ["cut","قطع مباشر"],["fade_in","تلاشي دخول"],["fade_out","تلاشي خروج"],
      ["dissolve","مزج ناعم"],["match_cut","قطع تطابقي"]
    ], value => { scene.transition = value; });
    transitionLabel.append(transitionCaption, transition);

    const continuity = makeTextarea(scene.continuity_note, "scene-continuity", "ملاحظات استمرارية خاصة بهذه اللقطة...", 350, value => { scene.continuity_note = value; });

    const assetWrap = document.createElement("label");
    assetWrap.className = "scene-asset-wrap";
    const assetLabel = document.createElement("span");
    assetLabel.textContent = "مسار الصورة داخل jobs/assets/";
    const asset = makeInput(scene.image_file, "scene-asset", "assets/scene-01.webp", 180, value => { scene.image_file = value.trim(); updatePreview(); });
    asset.dir = "ltr";
    assetWrap.append(assetLabel, asset);

    const cameraWrap = document.createElement("div");
    cameraWrap.className = "scene-meta";
    const cameraLabel = document.createElement("span");
    cameraLabel.textContent = "CAMERA MOVE";
    const camera = makeSelect(scene.camera_move, "scene-camera", [
      ["push_in","اقتراب بطيء"],["pull_out","ابتعاد"],["pan_left","تحريك لليسار"],
      ["pan_right","تحريك لليمين"],["pan_up","تحريك للأعلى"],["pan_down","تحريك للأسفل"],["static","ثابتة"]
    ], value => { scene.camera_move = value; updatePreview(); });
    cameraWrap.append(cameraLabel, camera);

    const details = document.createElement("details");
    details.className = "scene-production-details";
    const summary = document.createElement("summary");
    summary.textContent = "تفاصيل الإخراج والاستمرارية";
    const detailGrid = document.createElement("div");
    detailGrid.className = "scene-detail-grid";
    detailGrid.append(frameLabel, lightingLabel, overlayLabel, soundLabel, transitionLabel);
    details.append(summary, detailGrid, continuity);

    content.append(title, role, purpose, narration, timing, subject, visual, assetWrap, cameraWrap, details);

    const tools = document.createElement("div");
    tools.className = "scene-tools";
    const makeTool = (text, titleText, disabled, handler) => {
      const button = document.createElement("button");
      button.className = "tiny-button"; button.type = "button"; button.textContent = text;
      button.title = titleText; button.disabled = disabled;
      button.addEventListener("click", event => { event.stopPropagation(); handler(); });
      return button;
    };
    tools.append(
      makeTool("↑","تحريك للأعلى",index===0,()=>moveScene(index,-1)),
      makeTool("↓","تحريك للأسفل",index===scenes.length-1,()=>moveScene(index,1)),
      makeTool("×","حذف المشهد",false,()=>deleteScene(index))
    );

    const duration = document.createElement("input");
    duration.className = "duration-input"; duration.type = "number";
    duration.min = "3"; duration.max = "90"; duration.value = String(scene.seconds);
    duration.setAttribute("aria-label", "مدة المشهد بالثواني");
    duration.addEventListener("change", () => {
      scene.seconds = Math.max(3, Math.min(90, Number(duration.value) || 3));
      duration.value = String(scene.seconds);
      updateSceneTiming(timing, scene); renderTimeline(); updateTimingSummary(); scheduleSave();
    });
    const right = document.createElement("div");
    right.className = "scene-side";
    right.append(duration, tools);
    card.append(number, content, right);
    card.addEventListener("click", () => { selectedScene = index; renderSceneSelection(); });
    return card;
  }

  function updateSceneTiming(node, scene) {
    const timing = planner.analyzeSceneTiming(scene);
    node.textContent = "تقدير الإلقاء: " + timing.estimatedSeconds + " ث من " + timing.availableSeconds + " ث — " + timing.message;
    node.dataset.status = timing.status;
  }

  function updateTimingSummary() {
    const report = planner.analyzeProjectTiming(scenes);
    const parts = [
      "زمن الإلقاء التقريبي: " + report.estimatedVoiceSeconds + " ث",
      "زمن المشاهد: " + report.sceneSeconds + " ث"
    ];
    if (report.over) parts.push(report.over + " مشهد أطول نصاً من مدته");
    if (report.under) parts.push(report.under + " مشهد يحتاج مادة إضافية أو صمتاً مقصوداً");
    if (report.empty) parts.push(report.empty + " مشهد بلا نص صوتي");
    $("scriptTimingSummary").textContent = parts.join(" · ");
    $("scriptTimingSummary").dataset.status = report.over ? "warning" : "normal";
  }

  function renderAll() {
    const list = $("sceneList");
    list.replaceChildren(...scenes.map(createSceneCard));
    $("sceneCount").textContent = scenes.length + " مشاهد";
    $("timelineCount").textContent = String(scenes.length).padStart(2, "0");
    renderTimeline();
    renderSceneSelection();
    updateTimingSummary();
  }

  function renderSceneSelection() {
    [...$("sceneList").children].forEach((card, index) => card.classList.toggle("selected", index === selectedScene));
    updatePreview();
  }

  function renderTimeline() {
    const total = totalSeconds();
    $("runtimeTotal").textContent = timecode(total);
    const track = $("timelineTrack");
    track.replaceChildren();
    scenes.forEach((scene) => {
      const segment = document.createElement("span");
      segment.className = "timeline-segment";
      segment.style.flex = String(Math.max(1, Number(scene.seconds) || 1));
      segment.title = scene.title + " — " + scene.seconds + "s";
      track.append(segment);
    });
  }

  function moveScene(index, delta) {
    const next = index + delta;
    if (next < 0 || next >= scenes.length) return;
    [scenes[index], scenes[next]] = [scenes[next], scenes[index]];
    selectedScene = next;
    renderAll();
    scheduleSave();
  }

  function deleteScene(index) {
    if (scenes.length <= 1) { alert("يجب أن يحتوي المشروع على مشهد واحد على الأقل."); return; }
    scenes.splice(index, 1);
    selectedScene = Math.min(selectedScene, scenes.length - 1);
    renderAll();
    scheduleSave();
  }

  function addScene() {
    const plan = planner.createScenePlan(scenes.length, scenes.length + 1, readForm());
    scenes.push({...plan, id:Date.now(), title:"مشهد جديد", narration:"اكتب الرسالة التي تريد إيصالها في هذا المشهد.", visual:"حدد العنصر الرئيسي والحركة والإضاءة والإحساس البصري.", image_file:"", seconds:10});
    selectedScene = scenes.length - 1;
    renderAll();
    scheduleSave();
  }

  function updatePreview() {
    const scene = scenes[selectedScene];
    if (!scene) return;
    $("previewMeta").textContent = "SCENE " + String(selectedScene + 1).padStart(2,"0") + " / " + String(scenes.length).padStart(2,"0");
    $("previewTime").textContent = timecode(scene.seconds);
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
    const story = readStoryArcForm();
    const continuityData = readContinuityForm();
    const safeScenes = scenes.map((scene, index) => ({
      ...scene,
      title: String(scene.title || "مشهد " + (index+1)).slice(0,100),
      purpose: String(scene.purpose || "").slice(0,500),
      narration: String(scene.narration || "").slice(0,700),
      visual: String(scene.visual || "").slice(0,500),
      subject_action: String(scene.subject_action || "").slice(0,500),
      framing: scene.framing || "establishing",
      lighting: String(scene.lighting || "").slice(0,180),
      on_screen_text: String(scene.on_screen_text || "").slice(0,180),
      sound_cue: String(scene.sound_cue || "").slice(0,180),
      transition: scene.transition || "cut",
      continuity_note: String(scene.continuity_note || "").slice(0,350),
      image_file: String(scene.image_file || "").trim() || null,
      camera_move: scene.camera_move || "push_in",
      seconds: Math.max(3, Math.min(90, Number(scene.seconds) || 3))
    }));
    return planner.validateProject({
      project_schema_version: 2,
      schema_version: 1,
      title: brief.title.slice(0,90),
      idea: brief.idea.slice(0,500),
      audience: brief.audience,
      platform: brief.platform,
      tone: brief.tone,
      language: brief.language,
      style: brief.style,
      aspect: brief.aspect,
      fps: 24,
      resolution: "1080p",
      voiceover_file: brief.voiceover_file || null,
      music_file: brief.music_file || null,
      music_volume: brief.music_volume,
      story_arc: story,
      continuity: continuityData,
      scenes: safeScenes
    });
  }

  function downloadJob() {
    try {
      const job = buildJob();
      const blob = new Blob([JSON.stringify(job, null, 2)], {type:"application/json;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const slug = (job.title || "cineforge").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,"-").replace(/^-|-$/g,"").slice(0,40) || "cineforge";
      anchor.href = url; anchor.download = "cineforge-" + slug + ".json";
      document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setSavedState("تم تنزيل JSON");
    } catch (error) { alert(error.message); }
  }

  function updateMusicVolumeLabel() {
    $("musicVolumeValue").textContent = Math.round(Number($("musicVolume").value) * 100) + "%";
  }

  function scheduleSave() {
    $("saveState").textContent = "يحفظ…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const state = {form:readForm(), story_arc:readStoryArcForm(), continuity:readContinuityForm(), scenes, selectedScene};
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        $("saveState").textContent = "محفوظ محلياً";
      } catch { $("saveState").textContent = "تعذّر الحفظ المحلي"; }
    }, 250);
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
      $("audience").value = form.audience || "المشاهد المهتم";
      $("platform").value = form.platform || "youtube";
      $("tone").value = form.tone || "وثائقي مشوّق وهادئ";
      $("voiceoverFile").value = form.voiceover_file || "";
      $("musicFile").value = form.music_file || "";
      $("musicVolume").value = String(form.music_volume ?? 0.18);
      updateMusicVolumeLabel();
      scenes = Array.isArray(stored.scenes) ? stored.scenes.slice(0,40) : [];
      writeStoryArcForm(stored.story_arc);
      writeContinuityForm(stored.continuity);
      selectedScene = Math.max(0,Math.min(Number(stored.selectedScene)||0,scenes.length-1));
      return scenes.length > 0;
    } catch { return false; }
  }

  function importDemo() {
    const job = defaultProject();
    storyArc = planner.createStoryArc(readForm());
    writeStoryArcForm(storyArc);
    writeContinuityForm({visual_language:readForm().style});
    scenes = job.scenes.map((scene, index) => ({
      ...planner.createScenePlan(index, job.scenes.length, readForm()),
      ...scene,
      id:scene.id
    }));
    selectedScene = 0;
    renderAll();
    scheduleSave();
  }

  $("generateButton").addEventListener("click", makeOutline);
  $("addSceneButton").addEventListener("click", addScene);
  $("downloadButton").addEventListener("click", downloadJob);
  $("printButton").addEventListener("click", () => window.print());
  $("helpButton").addEventListener("click", () => $("helpDialog").showModal());
  $("closeHelp").addEventListener("click", () => $("helpDialog").close());
  $("musicVolume").addEventListener("input", () => { updateMusicVolumeLabel(); scheduleSave(); });
  ["arcHook","arcSetup","arcDevelopment","arcTurning","arcResolution"].forEach(id => {
    $(id).addEventListener("input", () => { storyArc = readStoryArcForm(); scheduleSave(); });
  });
  ["continuitySubject","continuityLocation","continuityProps","continuityStyle"].forEach(id => {
    $(id).addEventListener("input", () => { continuity = readContinuityForm(); scheduleSave(); });
  });
  ["projectTitle","projectIdea","language","style","aspect","targetDuration","audience","platform","tone","voiceoverFile","musicFile"].forEach(id => {
    $(id).addEventListener("input", () => { updatePreview(); scheduleSave(); });
    $(id).addEventListener("change", () => { updatePreview(); scheduleSave(); });
  });

  if (!restoreState()) importDemo();
  renderAll();
})();
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "cineforge-studio-project-v1";
  const storyPlanImporter = window.CineForgeStoryPlanImporter;
  if (!storyPlanImporter) throw new Error("CineForge Story Plan importer failed to load.");
  let importedStoryPlan = null;
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
    importedStoryPlan = imported.storyContext;
    selectedScene = 0;
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
    const title = document.createElement("input");
    title.className = "scene-title";
    title.value = scene.title;
    title.maxLength = 100;
    title.setAttribute("aria-label", "عنوان المشهد " + (index + 1));
    title.addEventListener("input", () => { scene.title = title.value; updatePreview(); scheduleSave(); });

    const narration = document.createElement("textarea");
    narration.className = "scene-description";
    narration.value = scene.narration;
    narration.maxLength = 700;
    narration.rows = 2;
    narration.placeholder = "نص التعليق أو الجملة التي تظهر للمشاهد";
    narration.setAttribute("aria-label", "نص المشهد " + (index + 1));
    narration.addEventListener("input", () => { scene.narration = narration.value; scheduleSave(); });

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
    content.append(title, narration, visual, assetWrap, meta);

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
      scene.seconds = Math.max(3, Math.min(90, Number(duration.value) || 3));
      duration.value = String(scene.seconds);
      renderTimeline(); scheduleSave();
    });
    const right = document.createElement("div");
    right.className = "scene-side";
    right.append(duration, tools);
    card.append(number, content, right);
    card.addEventListener("click", () => { selectedScene = index; renderSceneSelection(); });
    return card;
  }

  function renderAll() {
    const list = $("sceneList");
    list.replaceChildren(...scenes.map(createSceneCard));
    $("sceneCount").textContent = scenes.length + " مشاهد";
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
    scenes.push({id: Date.now(), title:"مشهد جديد", narration:"اكتب الرسالة التي تريد إيصالها في هذا المشهد.", visual:"حدد العنصر الرئيسي والحركة والإضاءة والإحساس البصري.", image_file:"", camera_move:"push_in", seconds:10});
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
    if (scenes.length > 40) throw new Error("الحد الأقصى 40 مشهداً.");
    const safeScenes = scenes.map((scene, index) => ({
      title: String(scene.title || "مشهد " + (index+1)).slice(0,100),
      narration: String(scene.narration || "").slice(0,700),
      visual: String(scene.visual || "").slice(0,500),
      image_file: String(scene.image_file || "").trim() || null,
      camera_move: scene.camera_move || "push_in",
      seconds: Math.max(3, Math.min(90, Number(scene.seconds) || 3))
    }));
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
      scenes: safeScenes
    };
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
        const state = {form:readForm(), scenes, selectedScene, storyPlan:importedStoryPlan};
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
      $("voiceoverFile").value = form.voiceover_file || "";
      $("musicFile").value = form.music_file || "";
      $("musicVolume").value = String(form.music_volume ?? 0.18);
      updateMusicVolumeLabel();
      scenes = Array.isArray(stored.scenes) ? stored.scenes.slice(0,40) : [];
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
  $("importStoryButton").addEventListener("click", () => $("storyPlanFile").click());
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
  $("downloadButton").addEventListener("click", downloadJob);
  $("printButton").addEventListener("click", () => window.print());
  $("helpButton").addEventListener("click", () => $("helpDialog").showModal());
  $("closeHelp").addEventListener("click", () => $("helpDialog").close());
  $("musicVolume").addEventListener("input", () => { updateMusicVolumeLabel(); scheduleSave(); });
  ["projectTitle","projectIdea","language","style","aspect","targetDuration","voiceoverFile","musicFile"].forEach(id => {
    $(id).addEventListener("input", () => { updatePreview(); scheduleSave(); });
    $(id).addEventListener("change", () => { updatePreview(); scheduleSave(); });
  });

  if (!restoreState()) importDemo();
  renderAll();
})();
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "cineforge-studio-project-v1";
  const storyPlanImporter = window.CineForgeStoryPlanImporter;
  const narrationFit = window.CineForgeNarrationFit;
  const mediaBin = window.CineForgeMediaBin;
  const projectEngine = window.CineForgeProjectEngine;
  const projectStorage = window.CineForgeProjectStorage;
  if (!mediaBin) throw new Error("CineForge Media Bin failed to load.");
  if (!projectEngine) throw new Error("CineForge Project Engine failed to load.");
  if (!projectStorage) throw new Error("CineForge Project Storage failed to load.");
  if (!storyPlanImporter) throw new Error("CineForge Story Plan importer failed to load.");
  if (!narrationFit) throw new Error("CineForge narration-fit analyzer failed to load.");
  let importedStoryPlan = null;
  let projectDocument = null;
  let saveChain = Promise.resolve();
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
  let mediaPreviewUrls = [];

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
    content.append(title, narration, fitBadge, visual, assetWrap, meta);

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
      renderTimeline(); updateNarrationFitBadge(fitBadge, scene); scheduleSave();
    });
    const right = document.createElement("div");
    right.className = "scene-side";
    right.append(duration, tools);
    card.append(number, content, right);
    card.addEventListener("click", () => { selectedScene = index; renderSceneSelection(); scheduleSave(); });
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
    });
    const ruler = $("timelineRuler");
    const lanes = $("multiTrackTimeline");
    if (!ruler || !lanes) return;
    ruler.replaceChildren();
    const step = total <= 60 ? 10 : total <= 180 ? 30 : 60;
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
              if (sceneIndex>=0) { selectedScene=sceneIndex; renderSceneSelection(); scheduleSave(); }
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
          } else {
            button.disabled=true;
            button.setAttribute("aria-label",clip.name+" — معاينة مسار");
          }
          body.append(button);
        });
      }
      if (track.type==="video") {
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
  }

  function reorderScene(from, to) {
    if (from<0 || to<0 || from>=scenes.length || to>=scenes.length || from===to) return;
    const moved=scenes.splice(from,1)[0];
    scenes.splice(to,0,moved);
    selectedScene=to;
    renderAll();
    scheduleSave();
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
        detail.textContent = mediaKindLabel(item.kind) + " · " + formatBytes(item.size);
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

  async function downloadProjectPackage() {
    try {
      const records = await mediaBin.list();
      const job = buildJob();
      const paths = new Map(records.map(item => [mediaBin.projectPath(item), item]));
      const referencedPaths = [
        ...job.scenes.map(scene => scene.image_file).filter(Boolean),
        job.voiceover_file,
        job.music_file
      ].filter(Boolean);
      const missing = [...new Set(referencedPaths.filter(path => !paths.has(path)))];
      if (missing.length) {
        throw new Error("الحزمة لن تكون مكتملة. أضف هذه الملفات إلى مكتبة الوسائط ثم أعد ربطها:\n" + missing.slice(0,8).join("\n"));
      }
      const slug = (job.title || "cineforge").normalize("NFKC")
        .replace(/[^\p{L}\p{N}-]+/gu,"-").replace(/^-|-$/g,"").slice(0,48) || "cineforge";
      const manifestAssets = records.map(item => ({
        id:item.id, name:item.name, kind:item.kind, mime:item.mime, size:item.size,
        sha256:item.sha256, source_type:item.source_type, source_ref:item.source_ref,
        license:item.license, notes:item.notes, created_at:item.created_at,
        project_path:mediaBin.projectPath(item)
      }));
      job.project_manifest = {
        schema:"cineforge.project",
        schema_version:2,
        created_at:new Date().toISOString(),
        renderer_job_schema_version:1,
        asset_count:manifestAssets.length
      };
      job.media_manifest = manifestAssets;
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
        asset_count:manifestAssets.length
      };
      const jobRoot = "apps/cineforge-studio/jobs/";
      const entries = [
        {name:jobRoot + slug + ".json",data:JSON.stringify(job,null,2) + "\n"},
        {name:projectFilePath,data:JSON.stringify(fullProject,null,2) + "\n"},
        {name:"apps/cineforge-studio/media-manifests/media-manifest-" + slug + ".json",data:JSON.stringify({
          schema:"cineforge.media-manifest",schema_version:1,project_title:job.title,assets:manifestAssets
        },null,2) + "\n"},
        {name:"CINEFORGE-PACKAGE-README.txt",data:
          "CineForge project package\n\n" +
          "Extract this ZIP at the repository root and preserve the folder structure.\n" +
          "The render job is under apps/cineforge-studio/jobs/.\n" +
          "Media paths in the job are relative to that jobs/ folder.\n" +
          "Commit the JSON and its assets/audio files together before running the CineForge workflow.\n" +
          "This package contains local media copies and their provenance metadata.\n"}
      ];
      for (const item of records) {
        const stored = await mediaBin.get(item.id);
        if (!stored || !stored.blob) throw new Error("الملف مفقود من التخزين المحلي: " + item.name);
        entries.push({name:jobRoot + mediaBin.projectPath(item),data:stored.blob});
      }
      const zip = await mediaBin.buildZip(entries);
      downloadBlob(zip,"cineforge-" + slug + "-project.zip");
      setSavedState("تم إنشاء حزمة المشروع");
    } catch (error) {
      alert("تعذّر إنشاء حزمة المشروع:\n" + (error.message || "خطأ غير معروف"));
    }
  }

  function updateMusicVolumeLabel() {
    $("musicVolumeValue").textContent = Math.round(Number($("musicVolume").value) * 100) + "%";
  }

  function makeProjectDocument() {
    const state={form:readForm(),scenes,selectedScene,storyPlan:importedStoryPlan};
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
      applyProjectDocument(normalized,editor);
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
    importedStoryPlan=state.storyPlan;
    selectedScene=state.selectedScene;
    projectDocument=normalized;
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
      applyProjectDocument(project);
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
  $("downloadButton").addEventListener("click", downloadJob);
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
          form:readForm(),scenes,selectedScene,storyPlan:importedStoryPlan
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
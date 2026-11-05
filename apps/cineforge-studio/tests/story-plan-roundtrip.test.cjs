const test = require("node:test");
const assert = require("node:assert/strict");
const importer = require("../story-plan-import.js");
const projectEngine = require("../project-engine.js");

test("story planner export survives import, project save, reload and renderer-job metadata projection", () => {
  const source = {
    schema:"cineforge.story-plan",
    schema_version:2,
    title:"رحلة إلى المرصد",
    audience:"طلاب",
    goal:"فهم طريقة رصد الكواكب",
    premise:"كيف نعرف أن كوكباً بعيداً موجود؟",
    format:"وثائقي",
    tone:"فضولي",
    target_minutes:3,
    wpm:135,
    beats:[
      {title:"الخطاف",prompt:"لقطة تلسكوب",content:"هل يمكن رؤية عالم بعيد؟",share:20,narrative_role:"hook",purpose:"فتح سؤال مركزي",continuity_note:"التلسكوب نفسه يظهر في المشهدين الأول والثالث."},
      {title:"السياق",prompt:"قبة المرصد",content:"نبدأ من المرصد.",share:30,narrative_role:"context",purpose:"تحديد المكان والزمن",continuity_note:"الإضاءة ليلية باردة."},
      {title:"الخلاصة",prompt:"سماء واسعة",content:"نراجع ما تعلمناه.",share:50,narrative_role:"closing",purpose:"إغلاق السؤال بالدليل",continuity_note:"نعود إلى زاوية الافتتاح."}
    ],
    characters:[{name:"الباحثة",notes:"معطف أزرق"}],
    locations:[{name:"المرصد",notes:"قبة زجاجية"}],
    props:[{name:"التلسكوب",notes:"هيكل نحاسي"}],
    sources:[{name:"مرجع تجريبي",url:"https://example.org",status:"تم التحقق"}],
    narration:"نص سردي كامل"
  };
  const imported=importer.convert(source);
  const project=projectEngine.createProject({
    form:{title:imported.title,idea:imported.idea,language:"ar",style:"documentary",aspect:"16:9",target_duration:imported.targetSeconds,voiceover_file:"",music_file:"",music_volume:0.18},
    scenes:imported.scenes,
    selectedScene:0,
    storyPlan:imported.storyContext
  });
  const saved=JSON.parse(JSON.stringify(project));
  const editor=projectEngine.toEditorState(projectEngine.normalizeProject(saved));
  const reSaved=projectEngine.createProject({
    id:project.id,
    form:editor.form,
    scenes:editor.scenes,
    selectedScene:editor.selectedScene,
    storyPlan:editor.storyPlan
  },project);
  const rendererSceneMetadata=reSaved.scenes.map(scene=>({
    narrative_role:scene.narrative_role,
    purpose:scene.purpose,
    continuity_note:scene.continuity_note
  }));
  assert.equal(reSaved.scenes.reduce((sum,scene)=>sum+scene.seconds,0),180);
  assert.deepEqual(rendererSceneMetadata,source.beats.map(beat=>({
    narrative_role:beat.narrative_role,
    purpose:beat.purpose,
    continuity_note:beat.continuity_note
  })));
  assert.equal(reSaved.story_context.characters[0].name,"الباحثة");
  assert.equal(reSaved.story_context.locations[0].name,"المرصد");
  assert.equal(reSaved.story_context.props[0].name,"التلسكوب");
  assert.equal(reSaved.story_context.sources[0].status,"تم التحقق");
  assert.equal(projectEngine.rendererCompatibility(reSaved).ok,true);
});

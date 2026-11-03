const test = require("node:test");
const assert = require("node:assert/strict");
const planner = require("../story-planner.js");

test("builds a five-part story arc from the actual brief", () => {
  const arc = planner.createStoryArc({idea:"كيف يعمل التلسكوب؟", audience:"طلاب المدارس"});
  assert.deepEqual(Object.keys(arc), ["hook","setup","development","turning_point","resolution"]);
  assert.match(arc.hook, /طلاب المدارس/);
  assert.match(arc.setup, /التلسكوب/);
});

test("assigns a five-scene narrative progression in order", () => {
  const plan = Array.from({length:5}, (_, index) => planner.createScenePlan(index, 5));
  assert.deepEqual(plan.map(scene => scene.narrative_role),
    ["hook","setup","development","turning_point","resolution"]);
  assert.ok(plan.every(scene => scene.purpose.length > 20));
  assert.equal(plan[0].camera_move, "push_in");
  assert.equal(plan[4].camera_move, "pull_out");
});

test("creates a clear arc for a short three-scene video", () => {
  const plan = Array.from({length:3}, (_, index) => planner.createScenePlan(index, 3));
  assert.deepEqual(plan.map(scene => scene.narrative_role), ["hook","development","resolution"]);
});

test("estimates narration duration and flags overlong scenes", () => {
  const short = planner.analyzeSceneTiming({narration:"كلمة واحدة", seconds:12});
  const long = planner.analyzeSceneTiming({narration:Array(45).fill("كلمة").join(" "), seconds:5});
  assert.equal(short.status, "under");
  assert.equal(long.status, "over");
  assert.ok(long.estimatedSeconds > 5);
});

test("aggregates script timing across all scenes", () => {
  const report = planner.analyzeProjectTiming([
    {narration:"جملة قصيرة",seconds:12},
    {narration:Array(40).fill("كلمة").join(" "),seconds:5},
    {narration:"",seconds:8}
  ]);
  assert.equal(report.rows.length, 3);
  assert.equal(report.over, 1);
  assert.equal(report.empty, 1);
  assert.equal(report.sceneSeconds, 25);
});

test("round-trips story, shot, continuity and renderer fields without loss", () => {
  const input = {
    schema_version:1,title:"مشروع اختبار",idea:"فكرة",
    story_arc:{hook:"افتتاح",setup:"تمهيد",development:"تطوير",turning_point:"تحول",resolution:"خاتمة"},
    continuity:{subject:"الشخصية الرئيسية",location:"المختبر",props:"دفتر",visual_language:"cinematic"},
    scenes:[{
      title:"لقطة",narration:"نص",visual:"وصف",seconds:8,
      narrative_role:"hook",purpose:"سبب المشهد",subject_action:"يظهر العنصر",
      framing:"wide",lighting:"ضوء جانبي",on_screen_text:"عنوان",
      sound_cue:"مؤثر",transition:"fade_in",continuity_note:"نفس الملابس",
      image_file:"assets/opening.webp",camera_move:"push_in"
    }]
  };
  const output = planner.validateProject(input);
  assert.equal(output.story_arc.hook, "افتتاح");
  assert.equal(output.continuity.subject, "الشخصية الرئيسية");
  assert.equal(output.scenes[0].subject_action, "يظهر العنصر");
  assert.equal(output.scenes[0].framing, "wide");
  assert.equal(output.scenes[0].image_file, "assets/opening.webp");
  assert.equal(output.scenes[0].camera_move, "push_in");
});

test("normalizes older scene manifests while retaining the v1 renderer schema", () => {
  const output = planner.validateProject({
    schema_version:1,title:"قديمة",
    scenes:[{title:"قديم",narration:"",visual:"",seconds:8}]
  });
  assert.equal(output.schema_version, 1);
  assert.equal(output.project_schema_version, 2);
  assert.equal(output.scenes[0].narrative_role, "resolution");
});

test("rejects more than forty scenes and an invalid timing budget", () => {
  const scenes = Array.from({length:41}, () => ({title:"x",seconds:3}));
  assert.throws(() => planner.validateProject({scenes}), /1–40/);
  const tooLong = Array.from({length:11}, () => ({title:"x",seconds:90}));
  assert.throws(() => planner.validateProject({scenes:tooLong}), /900 seconds/);
});

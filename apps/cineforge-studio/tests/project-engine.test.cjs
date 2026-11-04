const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../project-engine.js");

function editorState() {
  return {
    form:{title:"اختبار",idea:"فكرة",language:"ar",style:"cinematic",aspect:"16:9",target_duration:30,voiceover_file:"audio/voice.wav",music_file:"audio/music.wav",music_volume:0.2},
    scenes:[
      {id:"s1",title:"الأول",narration:"نص",visual:"وصف",seconds:10,image_file:"assets/a.webp"},
      {id:"s2",title:"الثاني",narration:"نص ثان",visual:"وصف ثان",seconds:8}
    ],
    selectedScene:0
  };
}

test("creates a versioned project with deterministic multi-track timing", () => {
  const project=engine.createProject(editorState(),null,"2026-11-04T10:00:00.000Z");
  assert.equal(project.schema,"cineforge.project");
  assert.equal(project.schema_version,2);
  assert.equal(project.timeline.duration,18);
  assert.deepEqual(project.timeline.tracks.map(track=>track.type),["video","voiceover","music"]);
  assert.equal(project.timeline.tracks[0].clips[1].start,10);
  assert.equal(project.timeline.tracks[1].clips[0].source,"audio/voice.wav");
  assert.equal(engine.validateProject(project).valid,true);
});

test("keeps project identity and revision when content is unchanged", () => {
  const first=engine.createProject(editorState(),null,"2026-11-04T10:00:00.000Z");
  const second=engine.createProject(editorState(),first,"2026-11-04T10:01:00.000Z");
  assert.equal(second.id,first.id);
  assert.equal(second.revision,first.revision);
  assert.equal(second.updated_at,first.updated_at);
});

test("increments revision when project content changes", () => {
  const first=engine.createProject(editorState(),null,"2026-11-04T10:00:00.000Z");
  const state=editorState(); state.scenes[0].title="تعديل";
  const second=engine.createProject(state,first,"2026-11-04T10:01:00.000Z");
  assert.equal(second.revision,first.revision+1);
});

test("migrates the legacy local editor state", () => {
  const legacy={form:editorState().form,scenes:editorState().scenes,selectedScene:1,storyPlan:{format:"وثائقي"}};
  const project=engine.normalizeProject(legacy);
  assert.equal(project.schema_version,2);
  assert.equal(project.selected_scene_id,"s2");
  assert.equal(project.story_context.format,"وثائقي");
  assert.equal(engine.toEditorState(project).selectedScene,1);
});

test("rejects duplicate scene ids and project duration overflow", () => {
  const duplicate=editorState(); duplicate.scenes[1].id="s1";
  assert.throws(()=>engine.createProject(duplicate),/فريدة/);
  const long=editorState(); long.scenes=Array.from({length:11},(_,i)=>({id:"s"+i,seconds:90}));
  assert.throws(()=>engine.createProject(long),/900/);
});

test("move snaps to neighbouring clip boundaries and rejects collision", () => {
  const project=engine.createProject(editorState());
  const moved=engine.moveClip(project,"track-video-main","video-s2",9.8,{tolerance:0.4});
  assert.equal(moved.timeline.tracks[0].clips[1].start,10);
  assert.throws(()=>engine.moveClip(project,"track-video-main","video-s2",5,{snap:false}),/متداخلة/);
});

test("trim start preserves source offset and trim end changes duration", () => {
  const project=engine.createProject(editorState());
  const start=engine.trimClip(project,"track-video-main","video-s1","start",2,{snap:false});
  const clip=start.timeline.tracks[0].clips[0];
  assert.equal(clip.start,2);
  assert.equal(clip.source_in,2);
  assert.equal(clip.duration,8);
  const end=engine.trimClip(project,"track-video-main","video-s1","end",7,{snap:false});
  assert.equal(end.timeline.tracks[0].clips[0].duration,7);
});

test("splits a clip without losing the source range", () => {
  const project=engine.createProject(editorState());
  const result=engine.splitClip(project,"track-video-main","video-s1",4);
  const clips=result.project.timeline.tracks[0].clips;
  assert.equal(clips.length,3);
  assert.equal(clips[1].start,4);
  assert.equal(clips[1].source_in,4);
  assert.equal(clips[1].duration,6);
  assert.notEqual(clips[1].id,"video-s1");
});

test("removes a clip and detects that the renderer cannot use the resulting gap", () => {
  const project=engine.createProject(editorState());
  const edited=engine.removeClip(project,"track-video-main","video-s1");
  assert.equal(edited.timeline.tracks[0].clips.length,1);
  assert.equal(engine.rendererCompatibility(edited).ok,false);
});

test("renderer adapter accepts only contiguous picture clips and one aligned audio clip per lane", () => {
  const project=engine.createProject(editorState());
  assert.equal(engine.rendererCompatibility(project).ok,true);
  const changed=engine.moveClip(project,"track-voiceover","voiceover-main",2,{snap:false});
  assert.equal(engine.rendererCompatibility(changed).ok,false);
});

test("rejects overlapping clips in a non-overlap track and invalid scene references", () => {
  const project=engine.createProject(editorState());
  const invalid=JSON.parse(JSON.stringify(project));
  invalid.timeline.tracks[0].clips[1].start=5;
  assert.throws(()=>engine.validateProject(invalid),/متداخلة/);
  const wrong=JSON.parse(JSON.stringify(project));
  wrong.timeline.tracks[0].clips[0].scene_id="missing";
  assert.throws(()=>engine.validateProject(wrong),/غير موجود/);
});

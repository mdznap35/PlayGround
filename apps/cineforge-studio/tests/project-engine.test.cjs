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
  assert.deepEqual(project.captions,[]);
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

test("renderer compatibility rejects image clip order drift", () => {
  const project=engine.createProject(editorState());
  const clips=project.timeline.tracks[0].clips;
  [clips[0],clips[1]]=[clips[1],clips[0]];
  let cursor=0;
  clips.forEach(clip=>{clip.start=cursor;cursor+=clip.duration;});
  project.timeline.duration=cursor;
  const result=engine.rendererCompatibility(project);
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/ترتيب/);
});

test("renderer compatibility rejects scene duration drift", () => {
  const project=engine.createProject(editorState());
  project.timeline.tracks[0].clips[0].duration=9;
  project.timeline.tracks[0].clips[1].start=9;
  project.timeline.duration=17;
  const result=engine.rendererCompatibility(project);
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/مدة/);
});

test("rejects an incorrect stored timeline duration", () => {
  const project=engine.createProject(editorState());
  project.timeline.duration+=1;
  assert.throws(()=>engine.validateProject(project),/مدة الخط الزمني/);
});

test("renderer compatibility rejects orphan subtitle clips and overlay tracks", () => {
  const project=engine.createProject(editorState());
  project.timeline.tracks.push({
    id:"track-subtitles",type:"subtitle",name:"Subtitles",enabled:true,allow_overlap:false,
    clips:[{id:"subtitle-1",name:"Caption",source:"",text:"Caption",scene_id:"s1",start:0,source_in:0,duration:2}]
  });
  const result=engine.rendererCompatibility(project);
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/غير محفوظة/);
  const overlay=engine.createProject(editorState());
  overlay.timeline.tracks.push({id:"overlay",type:"overlay",name:"Overlay",enabled:true,allow_overlap:true,clips:[{id:"o1",name:"Title",start:0,source_in:0,duration:1}]});
  assert.equal(engine.rendererCompatibility(overlay).ok,false);
});

test("stores validated caption cues and synchronized subtitle timeline clips", () => {
  const state=editorState();
  state.captions=[
    {id:"cap-1",scene_id:"s1",start:1,end:3,text:"مرحباً بالعالم"},
    {id:"cap-2",scene_id:"s2",start:11,end:14,text:"المشهد الثاني"}
  ];
  const project=engine.createProject(state);
  const track=project.timeline.tracks.find(item=>item.type==="subtitle");
  assert.equal(track.clips.length,2);
  assert.equal(track.clips[0].text,"مرحباً بالعالم");
  assert.equal(engine.rendererCompatibility(project).ok,true);
  const restored=engine.toEditorState(engine.normalizeProject(JSON.parse(JSON.stringify(project))));
  assert.deepEqual(restored.captions,state.captions);
});

test("preserves older project-v2 files without captions", () => {
  const project=engine.createProject(editorState());
  delete project.captions;
  const restored=engine.normalizeProject(project);
  assert.deepEqual(restored.captions,[]);
  assert.equal(engine.rendererCompatibility(restored).ok,true);
});

test("rejects captions that overlap or point outside their scene", () => {
  const state=editorState();
  state.captions=[
    {id:"cap-1",scene_id:"s1",start:1,end:4,text:"الأول"},
    {id:"cap-2",scene_id:"s1",start:3,end:5,text:"الثاني"}
  ];
  assert.throws(()=>engine.createProject(state),/متداخلة/);
  state.captions=[{id:"cap-3",scene_id:"s1",start:9,end:11,text:"خارج المشهد"}];
  assert.throws(()=>engine.createProject(state),/مدة المشهد|خارج مدة/);
});

test("renderer compatibility rejects audio source and duration drift", () => {
  const project=engine.createProject(editorState());
  const voiceover=project.timeline.tracks.find(track=>track.type==="voiceover");
  voiceover.clips[0].source="audio/other.wav";
  let result=engine.rendererCompatibility(project);
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/ملف voiceover/);
  voiceover.clips[0].source="audio/voice.wav";
  voiceover.clips[0].duration-=1;
  project.timeline.duration=18;
  result=engine.rendererCompatibility(project);
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/مدة مسار voiceover/);
});

test("renderer compatibility rejects duplicate music lanes", () => {
  const project=engine.createProject(editorState());
  project.timeline.tracks.push(JSON.parse(JSON.stringify(project.timeline.tracks.find(track=>track.type==="music"))));
  project.timeline.tracks[3].id="track-music-copy";
  assert.equal(engine.rendererCompatibility(project).ok,false);
});


test("preserves scene narrative role, purpose and continuity through project round-trip", () => {
  const state=editorState();
  state.scenes[0].narrative_role="hook";
  state.scenes[0].purpose="فتح سؤال يثير الفضول";
  state.scenes[0].continuity_note="المعطف الأزرق ثابت في جميع لقطات المرصد.";
  const project=engine.createProject(state);
  const restored=engine.toEditorState(engine.normalizeProject(JSON.parse(JSON.stringify(project))));
  assert.equal(restored.scenes[0].narrative_role,"hook");
  assert.equal(restored.scenes[0].purpose,"فتح سؤال يثير الفضول");
  assert.equal(restored.scenes[0].continuity_note,"المعطف الأزرق ثابت في جميع لقطات المرصد.");
});


test("projects narrative metadata into the renderer job without changing scene timing or asset paths", () => {
  const state=editorState();
  state.scenes[0].narrative_role="hook";
  state.scenes[0].purpose="فتح سؤال مركزي";
  state.scenes[0].continuity_note="المعطف الأزرق لا يتغير.";
  const projected=engine.toRendererScenes(state.scenes);
  assert.deepEqual(projected[0],{
    id:"s1",title:"الأول",narration:"نص",visual:"وصف",narrative_role:"hook",
    purpose:"فتح سؤال مركزي",continuity_note:"المعطف الأزرق لا يتغير.",
    image_file:"assets/a.webp",camera_move:"push_in",seconds:10
  });
  assert.equal(projected[1].image_file,null);
});

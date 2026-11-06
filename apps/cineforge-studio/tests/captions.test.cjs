const test = require("node:test");
const assert = require("node:assert/strict");
const captions = require("../captions.js");

const scenes = [
  {id:"s1",seconds:5},
  {id:"s2",seconds:4}
];

test("parses Arabic SRT with BOM and Windows line endings", () => {
  const input = "\uFEFF1\r\n00:00:00,500 --> 00:00:02,250\r\nمرحباً بالعالم\r\n\r\n2\r\n00:00:05,000 --> 00:00:08,000\r\nالمشهد الثاني";
  const parsed = captions.parseSrt(input).map(cue => ({...cue,scene_id:captions.sceneAt(scenes,(cue.start+cue.end)/2)}));
  assert.equal(parsed[0].start,0.5);
  assert.equal(parsed[0].end,2.25);
  assert.equal(parsed[0].text,"مرحباً بالعالم");
  assert.equal(parsed[1].scene_id,"s2");
  assert.equal(captions.validate(parsed,{duration:9,scenes}).length,2);
});

test("round-trips Arabic SRT and WebVTT timestamps and text", () => {
  const source = [
    {id:"a",scene_id:"s1",start:0.125,end:1.75,text:"السَّلَامُ عَلَيْكُمْ"},
    {id:"b",scene_id:"s2",start:5,end:8.5,text:"هذه ترجمة عربية"}
  ];
  const options = {duration:9,scenes};
  const srt = captions.exportSrt(source,options);
  const vtt = captions.exportVtt(source,options);
  const fromSrt = captions.parseSrt(srt);
  const fromVtt = captions.parseVtt(vtt);
  assert.equal(fromSrt[0].text,source[0].text);
  assert.equal(fromVtt[1].start,5);
  assert.equal(fromVtt[1].end,8.5);
  assert.equal(fromVtt[0].text,source[0].text);
});

test("parses WebVTT cue settings and optional cue identifiers", () => {
  const parsed = captions.parseVtt("WEBVTT - CineForge\n\nopening\n00:00:01.000 --> 00:00:03.000 align:start position:20%\nعنوان الافتتاح\n");
  assert.equal(parsed[0].id,"opening");
  assert.equal(parsed[0].text,"عنوان الافتتاح");
});

test("rejects malformed timestamps and missing WebVTT header", () => {
  assert.throws(() => captions.parseSrt("1\n00:90:00,000 --> 00:00:02,000\nbad"),/طابع زمني|الدقائق/);
  assert.throws(() => captions.parseVtt("00:00:01.000 --> 00:00:02.000\nbad"),/WEBVTT/);
});

test("rejects overlapping cues and duplicate identifiers", () => {
  const overlapping = [
    {id:"a",scene_id:"s1",start:0,end:2,text:"الأول"},
    {id:"b",scene_id:"s1",start:1.9,end:3,text:"الثاني"}
  ];
  assert.throws(() => captions.validate(overlapping,{duration:9,scenes}),/متداخلة/);
  assert.throws(() => captions.validate([{...overlapping[0]},{...overlapping[0],start:3,end:4}],{duration:9,scenes}),/فريدة/);
});

test("rejects cue outside project or linked scene and malformed text", () => {
  assert.throws(() => captions.validate([{id:"a",scene_id:"s1",start:4,end:6,text:"خارج المشهد"}],{duration:9,scenes}),/مدة المشهد/);
  assert.throws(() => captions.validate([{id:"a",scene_id:"s2",start:8,end:10,text:"بعد المشروع"}],{duration:9,scenes}),/نهاية الفيديو/);
  assert.throws(() => captions.validate([{id:"a",scene_id:"s1",start:0,end:1,text:"x".repeat(181)}],{duration:9,scenes}),/180/);
  assert.throws(() => captions.validate([{id:"a",scene_id:"missing",start:0,end:1,text:"نص"}],{duration:9,scenes}),/غير موجود/);
});

test("maps a timestamp to the scene interval", () => {
  assert.equal(captions.sceneAt(scenes,4.9),"s1");
  assert.equal(captions.sceneAt(scenes,5),"s2");
  assert.equal(captions.sceneAt(scenes,8.99),"s2");
});


test("rebases scene-linked cues when the storyboard order changes", () => {
  const original = [{id:"s1",seconds:5},{id:"s2",seconds:4},{id:"s3",seconds:3}];
  const reordered = [{id:"s2",seconds:4},{id:"s1",seconds:5},{id:"s3",seconds:3}];
  const cues = [
    {id:"one",scene_id:"s1",start:2,end:4,text:"الأول"},
    {id:"two",scene_id:"s2",start:6,end:7,text:"الثاني"},
    {id:"three",scene_id:"s3",start:9.5,end:11,text:"الثالث"}
  ];
  const result = captions.rebase(cues, original, reordered);
  assert.deepEqual(result.map(cue => [cue.id,cue.start,cue.end]), [
    ["two",1,2],["one",6,8],["three",9.5,11]
  ]);
  assert.equal(captions.validate(result,{duration:12,scenes:reordered}).length,3);
});

test("drops deleted-scene cues and cues outside a shortened scene while shifting later scenes", () => {
  const original = [{id:"s1",seconds:5},{id:"s2",seconds:4},{id:"s3",seconds:3}];
  const changed = [{id:"s2",seconds:2},{id:"s3",seconds:3}];
  const cues = [
    {id:"deleted",scene_id:"s1",start:1,end:2,text:"يُحذف مع المشهد"},
    {id:"kept",scene_id:"s2",start:6,end:7,text:"يبقى"},
    {id:"out-of-range",scene_id:"s2",start:8.5,end:8.9,text:"خارج المدة الجديدة"},
    {id:"shifted",scene_id:"s3",start:9.5,end:11,text:"يتحرك مع المشهد"}
  ];
  const result = captions.rebase(cues, original, changed);
  assert.deepEqual(result.map(cue => [cue.id,cue.start,cue.end]), [
    ["kept",1,2],["shifted",2.5,4]
  ]);
  assert.equal(captions.validate(result,{duration:5,scenes:changed}).length,2);
});

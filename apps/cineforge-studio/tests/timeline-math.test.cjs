const test = require("node:test");
const assert = require("node:assert/strict");
const timeline = require("../timeline-math.js");
const scenes = [{id:"one",seconds:10},{id:"two",seconds:8},{id:"three",seconds:12}];

test("computes cumulative scene starts without mutating scene data", () => {
  assert.equal(timeline.totalDuration(scenes),30);
  assert.equal(timeline.sceneStart(scenes,0),0);
  assert.equal(timeline.sceneStart(scenes,1),10);
  assert.equal(timeline.sceneStart(scenes,2),18);
  assert.equal(timeline.sceneStart(scenes,99),30);
  assert.equal(scenes[1].seconds,8);
});
test("selects the next scene at an exact cut boundary", () => {
  assert.equal(timeline.sceneIndexAt(scenes,0),0);
  assert.equal(timeline.sceneIndexAt(scenes,9.999),0);
  assert.equal(timeline.sceneIndexAt(scenes,10),1);
  assert.equal(timeline.sceneIndexAt(scenes,18),2);
});
test("keeps the last scene selected at the exact timeline end", () => {
  assert.equal(timeline.sceneIndexAt(scenes,30),2);
  assert.equal(timeline.sceneIndexAt(scenes,300),2);
});
test("handles empty timelines and clamps invalid times safely", () => {
  assert.equal(timeline.sceneIndexAt([],0),-1);
  assert.equal(timeline.sceneStart([],0),0);
  assert.equal(timeline.totalDuration(null),0);
  assert.equal(timeline.clampTime(-5,30),0);
  assert.equal(timeline.clampTime(45,30),30);
  assert.equal(timeline.clampTime(Infinity,30),0);
  assert.equal(timeline.clampTime(12,NaN),0);
});
test("calculates a bounded normalized playhead progress", () => {
  assert.equal(timeline.progress(0,30),0);
  assert.equal(timeline.progress(15,30),0.5);
  assert.equal(timeline.progress(99,30),1);
  assert.equal(timeline.progress(10,0),0);
});
test("converts frame positions using the requested frame rate", () => {
  assert.equal(timeline.secondsFromFrame(24,24),1);
  assert.equal(timeline.secondsFromFrame(30,30),1);
  assert.equal(timeline.secondsFromFrame(-1,24),0);
  assert.equal(timeline.secondsFromFrame(48,0),2);
});
test("chooses readable ruler intervals for short, medium and long timelines", () => {
  assert.equal(timeline.tickStep(60),10);
  assert.equal(timeline.tickStep(61),30);
  assert.equal(timeline.tickStep(180),30);
  assert.equal(timeline.tickStep(181),60);
});

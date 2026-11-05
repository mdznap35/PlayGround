(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CineForgeTimelineMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function durationOf(scene) {
    const value = Number(scene && scene.seconds);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }
  function totalDuration(scenes) {
    return (Array.isArray(scenes) ? scenes : []).reduce((sum, scene) => sum + durationOf(scene), 0);
  }
  function clampTime(seconds, duration) {
    const max = Number.isFinite(Number(duration)) ? Math.max(0, Number(duration)) : 0;
    const value = Number(seconds);
    if (!Number.isFinite(value)) return 0;
    return Math.min(max, Math.max(0, value));
  }
  function sceneStart(scenes, index) {
    if (!Array.isArray(scenes) || !scenes.length) return 0;
    const end = Math.max(0, Math.min(scenes.length, Math.floor(Number(index) || 0)));
    let cursor = 0;
    for (let i = 0; i < end; i += 1) cursor += durationOf(scenes[i]);
    return cursor;
  }
  function sceneIndexAt(scenes, seconds) {
    if (!Array.isArray(scenes) || scenes.length === 0) return -1;
    const time = clampTime(seconds, totalDuration(scenes));
    let cursor = 0;
    for (let i = 0; i < scenes.length; i += 1) {
      const end = cursor + durationOf(scenes[i]);
      if (time < end || i === scenes.length - 1) return i;
      cursor = end;
    }
    return scenes.length - 1;
  }
  function progress(seconds, duration) {
    const total = Number(duration);
    if (!Number.isFinite(total) || total <= 0) return 0;
    return clampTime(seconds, total) / total;
  }
  function secondsFromFrame(frame, fps) {
    const rate = Number.isFinite(Number(fps)) && Number(fps) > 0 ? Number(fps) : 24;
    const number = Number(frame);
    return Number.isFinite(number) ? Math.max(0, Math.floor(number)) / rate : 0;
  }
  function tickStep(duration) {
    const total = Math.max(0, Number(duration) || 0);
    return total <= 60 ? 10 : total <= 180 ? 30 : 60;
  }
  return {totalDuration,clampTime,sceneStart,sceneIndexAt,progress,secondsFromFrame,tickStep};
});

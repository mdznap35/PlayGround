const test = require("node:test");
const assert = require("node:assert/strict");
const importer = require("../story-plan-import.js");

function plan(overrides = {}) {
  return {
    schema: "cineforge.story-plan",
    schema_version: 2,
    title: "رحلة في الفضاء",
    audience: "طلاب المدارس",
    goal: "شرح الفكرة",
    premise: "كيف نكتشف الكواكب البعيدة؟",
    target_minutes: 3,
    wpm: 135,
    beats: [
      { title: "الخطاف", prompt: "سؤال بصري", content: "هل نحن وحدنا؟", share: 8 },
      { title: "السياق", prompt: "مقدمة", content: "نراقب السماء.", share: 12 },
      { title: "البداية", prompt: "تلسكوب", content: "نحلل الضوء.", share: 10 },
      { title: "التطوير", prompt: "بيانات", content: "تظهر الإشارات.", share: 30 },
      { title: "التحول", prompt: "عبور كوكب", content: "نقيس التغير.", share: 15 },
      { title: "النتيجة", prompt: "مقارنة", content: "نراجع الدليل.", share: 17 },
      { title: "الخاتمة", prompt: "مشهد واسع", content: "يبقى السؤال.", share: 8 }
    ],
    characters: [{ name: "العالمة", notes: "معطف أزرق ثابت" }],
    locations: [{ name: "المرصد", notes: "قبة زجاجية" }],
    props: [{ name: "التلسكوب", notes: "نموذج بصري ثابت" }],
    sources: [{ name: "مصدر موثق", url: "https://example.org", status: "تم التحقق" }],
    ...overrides
  };
}

test("imports Arabic story plan into renderer-safe scene durations", () => {
  const result = importer.convert(plan());
  assert.equal(result.scenes.length, 7);
  assert.equal(result.title, "رحلة في الفضاء");
  assert.equal(result.idea, "كيف نكتشف الكواكب البعيدة؟");
  assert.equal(result.scenes.reduce((sum, scene) => sum + scene.seconds, 0), 180);
  assert.ok(result.scenes.every(scene => scene.seconds >= 3 && scene.seconds <= 90));
  assert.equal(result.scenes[0].narration, "هل نحن وحدنا؟");
  assert.equal(result.scenes[0].visual, "سؤال بصري");
});

test("preserves continuity and source provenance in a bounded metadata snapshot", () => {
  const result = importer.convert(plan());
  assert.equal(result.storyContext.characters[0].name, "العالمة");
  assert.equal(result.storyContext.locations[0].name, "المرصد");
  assert.equal(result.storyContext.props[0].name, "التلسكوب");
  assert.equal(result.storyContext.sources[0].status, "تم التحقق");
});

test("distributes duration evenly when all beat weights are zero", () => {
  const input = plan({ target_minutes: 1, beats: Array.from({length:5}, (_, i) => ({
    title: "Beat " + i, prompt: "", content: "", share: 0
  })) });
  const result = importer.convert(input);
  assert.equal(result.scenes.reduce((sum, scene) => sum + scene.seconds, 0), 60);
  assert.equal(Math.max(...result.scenes.map(scene => scene.seconds)) - Math.min(...result.scenes.map(scene => scene.seconds)), 0);
});

test("rejects unsupported schema and malformed documents", () => {
  assert.throws(() => importer.convert(null), /JSON/);
  assert.throws(() => importer.convert(plan({ schema: "other" })), /غير مدعومة/);
  assert.throws(() => importer.convert(plan({ beats: [] })), /1–40/);
});

test("rejects plans whose duration cannot be allocated within renderer limits", () => {
  assert.throws(() => importer.convert(plan({ target_minutes: 16 })), /15 دقيقة/);
  assert.throws(() => importer.convert(plan({ target_minutes: 1, beats: Array(40).fill({ title:"مشهد",share:1 }) })), /توزيع هذه المدة/);
  assert.throws(() => importer.convert(plan({ target_minutes: 0.1, beats: Array(40).fill({ title:"مشهد",share:1 }) })), /توزيع هذه المدة/);
});

test("clamps arbitrary beat weights and bounds imported text", () => {
  const input = plan({ title: "A".repeat(300), target_minutes: 1, beats: [{ title: "T".repeat(300), prompt:"P", content:"C", share: 1000 }] });
  const result = importer.convert(input);
  assert.equal(result.title.length, 90);
  assert.equal(result.scenes[0].title.length, 100);
  assert.ok(result.scenes[0].seconds >= 3);
});

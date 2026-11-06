const test = require("node:test");
const assert = require("node:assert/strict");
const pacing = require("../narration-fit.js");

test("counts Arabic and English words without counting punctuation", () => {
  const result = pacing.analyze("مرحباً، يا عالم! Hello, world. 2026", 10, "mixed");
  assert.equal(result.words, 6);
  assert.equal(result.referenceWpm, 140);
});

test("returns a safe empty state for blank narration", () => {
  const result = pacing.analyze("   … — ", 12, "ar");
  assert.equal(result.status, "empty");
  assert.equal(result.words, 0);
  assert.match(result.label, /لا يوجد/);
});

test("classifies a short narration as intentional visual breathing room", () => {
  const result = pacing.analyze("ابدأ الآن", 60, "ar");
  assert.equal(result.status, "sparse");
  assert.ok(result.estimatedSeconds < 60);
});

test("classifies a narration with a reasonable pause margin as balanced", () => {
  const result = pacing.analyze("هذه جملة عربية قصيرة لاختبار إيقاع التعليق الصوتي بشكل تقريبي قبل تسجيل المقطع النهائي", 10, "ar");
  assert.equal(result.status, "balanced");
  assert.ok(result.coverage > 0.45 && result.coverage <= 0.9);
});

test("warns when the narration estimate is close to the scene duration", () => {
  const result = pacing.analyze("one two three four five six seven eight nine ten", 4, "en");
  assert.equal(result.status, "tight");
});

test("warns when the narration is likely to exceed the scene duration", () => {
  const result = pacing.analyze("هذه كلمات كثيرة جداً يجب أن تتجاوز الوقت المتاح للمشهد بشكل واضح عند قراءتها", 3, "ar");
  assert.equal(result.status, "overrun");
});

test("uses a conservative fallback for unknown languages and invalid durations", () => {
  const result = pacing.analyze("اختبار بسيط", 0, "unknown");
  assert.equal(result.referenceWpm, 130);
  assert.equal(result.status, "overrun");
  assert.equal(result.duration, 0);
});

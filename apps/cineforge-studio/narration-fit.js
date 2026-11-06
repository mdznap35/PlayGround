/* Lightweight, deterministic narration pacing estimates for CineForge.
 * This is an editorial aid, not speech recognition or a guarantee of spoken duration.
 */
(function attachNarrationFit(root) {
  "use strict";

  const WORD_RATES = Object.freeze({ ar: 130, en: 150, mixed: 140 });

  function analyze(text, seconds, language) {
    const source = typeof text === "string" ? text : "";
    const tokens = source.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || [];
    const words = tokens.length;
    const duration = Number(seconds);
    const validDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
    const rate = WORD_RATES[language] || WORD_RATES.ar;

    if (!words) {
      return {
        words: 0, duration: validDuration, estimatedSeconds: 0,
        coverage: 0, wordsPerMinute: 0, referenceWpm: rate,
        status: "empty", label: "لا يوجد نص تعليق",
        detail: "أضف نص التعليق لمعرفة تقدير الإيقاع."
      };
    }

    const estimatedSeconds = Math.max(1, Math.ceil(words * 60 / rate));
    const coverage = validDuration ? estimatedSeconds / validDuration : Infinity;
    const wordsPerMinute = validDuration ? words * 60 / validDuration : Infinity;
    let status, label, hint;

    if (coverage < 0.45) {
      status = "sparse";
      label = "مساحة للصورة والصمت";
      hint = "النص قصير نسبةً إلى مدة المشهد؛ قد يكون ذلك مناسباً إذا كان هناك شرح بصري أو وقفة مقصودة.";
    } else if (coverage <= 0.9) {
      status = "balanced";
      label = "إيقاع مريح مبدئياً";
      hint = "التقدير يترك هامشاً للتنفس البصري والوقفات.";
    } else if (coverage <= 1.1) {
      status = "tight";
      label = "قريب من حدّ الوقت";
      hint = "قد يحتاج الإلقاء إلى سرعة أو قد تحتاج الجملة إلى اختصار بسيط.";
    } else {
      status = "overrun";
      label = "النص أطول من الوقت غالباً";
      hint = "جرّب زيادة مدة المشهد أو اختصار التعليق.";
    }

    const durationLabel = validDuration ? Math.round(validDuration) + " ث" : "مدة غير صالحة";
    const estimateLabel = estimatedSeconds + " ث تقريباً";
    const detail = words + " كلمة · تقدير التعليق " + estimateLabel + " مقابل " +
      durationLabel + " · المعدل المرجعي " + rate + " كلمة/دقيقة. " + hint;

    return { words, duration: validDuration, estimatedSeconds, coverage,
      wordsPerMinute, referenceWpm: rate, status, label, detail };
  }

  const api = Object.freeze({ analyze, wordRates: WORD_RATES });
  root.CineForgeNarrationFit = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

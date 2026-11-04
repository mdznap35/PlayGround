# المخطط السحابي الاحترافي الشامل — CineForge Studio

**الإصدار:** 1.0 | **تاريخ البحث:** 2026-11-04  
**المستودع:** mdznap35/PlayGround  
**فرع التنفيذ:** feat/cineforge-cinematic-media-v2  
**الواجهة:** https://cineforge-studio-b92r.onrender.com/

> هذه خطة هندسية مبنية على مراجعة المشروع والوثائق الرسمية المتاحة بتاريخ البحث. الأدوات المذكورة ليست كلها مدمجة. لا نعلن عن أي محرك بأنه عامل إلا بعد وصله وإنتاج ملف حقيقي وفحصه.

## 1. القرار التنفيذي

لن نبني محركات الفيديو والصوت من الصفر، ولن نحمّل Render مسؤولية المعالجة الثقيلة. نبني CineForge كواجهة ومتحكم إنتاج سحابي، والمحركات تعمل في بيئات منفصلة:

1. Render Static Site: واجهة الاستوديو فقط.
2. Cloudflare Workers: API خفيف، تحقق من الجلسات، وتوجيه المهام وروابط رفع/تنزيل مؤقتة.
3. Cloudflare D1: بيانات المشاريع والمشاهد والمهام والحقوق والإصدارات.
4. Cloudflare R2: ملفات الصور والصوت والفيديو والمخرجات ضمن سقوف مجانية.
5. GitHub: الكود والاختبارات والوثائق وملفات workflow؛ لا ملفات شخصية.
6. Kaggle وGoogle Colab: جلسات GPU مجانية متقطعة يبدأها المستخدم، وليست خوادم دائمة.
7. Hugging Face ZeroGPU: تجارب قصيرة وعروض محدودة، وليس إنتاج فيديو طويل.
8. ComfyUI: طبقة workflows لتشغيل نماذج الصور والفيديو والصوت.
9. FFmpeg وFFprobe: التجميع النهائي، الصوت، الترجمة، التحويل، وفحص الناتج.
10. Motion Canvas وOpenTimelineIO: الرسوم المتحركة وتبادل بيانات الخط الزمني.

يبقى محرر CineForge والرندر التقليدي قابلين للاستخدام عند غياب GPU أو انتهاء الحصة. الذكاء الاصطناعي ميزة اختيارية لا توقف بقية النظام.

## 2. محركات الفيديو المرشحة

| المحرك | الوظيفة | المتطلبات/القيود | القرار |
|---|---|---|---|
| CogVideoX-2B | نص إلى فيديو | خيار أول لإثبات التشغيل؛ مدخل النص الأصلي إنجليزي. ذاكرة Diffusers تتغير بشدة حسب الدقة والكمّية والتحسينات؛ لا نعتمد أرقام الحد الأدنى دون تجربة فعلية | أول POC |
| Wan 2.2 TI2V-5B | نص/صورة إلى فيديو | قوي ومفتوح بترخيص Apache 2.0؛ المسار الرسمي المنشور يحتاج نحو 24GB VRAM، وملفات الأوزان كبيرة (نحو 34GB وفق بطاقة النموذج) | هدف جودة أعلى عند توفر GPU |
| Wan 2.2 A14B | نص/صورة إلى فيديو | نموذج كبير جداً ومتعدد المكونات؛ يتطلب موارد GPU أعلى بكثير | مؤجل |
| LongCat-Video | نص/صورة إلى فيديو واستكمال مقاطع | 13.6B، ترخيص MIT، مصمم أيضاً لاستكمال الفيديو؛ لم نعثر في هذه الجولة على حد VRAM رسمي ثابت نعتمد عليه | مرشح متقدم |
| LTX-2.5 | فيديو وصوت متزامنان وmulti-shot | الحد الأدنى الرسمي: 32GB+ VRAM، و32GB RAM، و100GB مساحة؛ أوزانه تحت LTX Community License وليست Apache | أقوى هدف متقدم، وليس بداية مجانية |
| HunyuanVideo 1.5 | نص/صورة إلى فيديو | 14GB VRAM مع offload حسب المستودع، لكن الترخيص المنشور يستثني الاتحاد الأوروبي والمملكة المتحدة وكوريا الجنوبية | لا نعتمده حالياً بسبب نطاق الترخيص |
| Mochi 1 | نص إلى فيديو | أوزان Apache 2.0 لكن ذاكرة GPU مرتفعة جداً | مرجع بحثي |
| Pyramid Flow miniFLUX | نص/صورة إلى فيديو | مرشح مفتوح إضافي؛ يلزم فحص توافق BF16 والذاكرة قبل التشغيل | بديل تجريبي |

### ترتيب الاختبار

- POC-A: CogVideoX-2B على Kaggle أو Colab بعد فحص GPU.
- POC-B: Wan 2.2 TI2V-5B إذا توفرت 24GB VRAM.
- POC-C: LTX-2.5 فقط على GPU بذاكرة 32GB+ و100GB مساحة.
- POC-D: LongCat إذا ظهرت متطلبات تشغيل رسمية واضحة وتوافرت البيئة.

لا نبدأ تنزيل نموذج كبير قبل إنشاء manifest يذكر أسماء الملفات وأحجامها الفعلية وإجمالي النقل والتخزين وRAM/VRAM ووقت التشغيل والترخيص. لا توجد وعود بتوليد مجاني غير محدود.

مصادر:
- CogVideoX: https://github.com/zai-org/CogVideo
- CogVideoX memory table: https://github.com/huggingface/diffusers/blob/main/docs/source/en/training/cogvideox.md
- Wan 2.2: https://github.com/Wan-Video/Wan2.2
- Wan TI2V-5B: https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B
- LongCat: https://github.com/meituan-longcat/LongCat-Video
- LTX-2.5 requirements: https://docs.ltx.io/open-source-model/getting-started/system-requirements
- LTX license: https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x
- HunyuanVideo 1.5: https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5

## 3. منصات GPU المجانية التي يمكن البناء عليها

| المنصة | ما توثقه رسمياً | أفضل استعمال | الحدود |
|---|---|---|---|
| Kaggle Notebooks | GPU مجاني؛ الوثائق تذكر Tesla P100 وحصة أسبوعية تقارب 30 ساعة، مع تغير الإتاحة | جلسات تجارب أطول نسبياً | قد يوجد انتظار، وP100 لا يشغّل كل النماذج |
| Google Colab Free | CPU/GPU مجانيان لكن النوع والتوفر والحصة متغيرة؛ الجلسة قد تصل إلى 12 ساعة بحسب التوفر | بديل احتياطي عند توافق GPU | لا ضمان لنوع GPU أو توافره |
| Hugging Face ZeroGPU | استخدام Spaces الموجودة مجاني؛ الحصة المنشورة للحساب المجاني 5 دقائق GPU يومياً | تجربة واجهة أو اختبار قصير جداً | ليست منصة إنتاج لفيلم أو دفعات طويلة |
| GitHub Actions | دقائق ضمن خطة GitHub، وstandard runners العامة متاحة وفق سياسة GitHub | اختبارات وFFmpeg CPU وQA | لا GPU دائم |
| Render Free | مناسب لاستضافة واجهة Static Site | واجهة CineForge | ليس تخزيناً دائماً ولا عامل GPU |

**استراتيجية التشغيل:** المستخدم يفتح Notebook من رابط CineForge؛ Notebook يفحص GPU وVRAM وRAM والقرص وCUDA؛ يعرض ملاءمة النموذج؛ يطبع manifest؛ ثم ينزّل الأوزان ويولد لقطة اختبار واحدة بعد الموافقة على النموذج والحجم. بعدها يفحص FFprobe الناتج ويرفعه إلى التخزين أو يتيحه للتنزيل. لا نبقي الجلسة حية ولا نتحايل على حدود أي منصة.

مصادر:
- Kaggle Notebooks: https://www.kaggle.com/docs/notebooks
- Kaggle GPU quota: https://www.kaggle.com/docs/efficient-gpu-usage
- Colab FAQ: https://research.google.com/colaboratory/faq.html
- HF ZeroGPU: https://huggingface.co/docs/hub/en/spaces-zerogpu
- GitHub allowances: https://docs.github.com/en/billing/reference/product-usage-included

## 4. ComfyUI: أقصر طريق لتجميع المحركات

ComfyUI ليس نموذجاً، بل مدير workflows. يدعم عبر منظومته نماذج صورة وفيديو وصوت، وحفظ واسترجاع workflows بصيغة JSON، وأدوات مثل inpainting وoutpainting وupscaling وframe interpolation وsegmentation بحسب العقد المستخدمة.

المسار المقترح:
CineForge → Provider Adapter → ComfyUI API → Queue/Status/History → فحص الناتج → التخزين → Timeline.

قواعد الربط:
- ComfyUI يعمل في جلسة GPU منفصلة، وليس داخل Render.
- لا نكشف واجهته للعامة دون مصادقة.
- نحتفظ بملفات workflow JSON في GitHub، ولا نرفع الأوزان الكبيرة للمستودع.
- نثبت إصدارات العقد الخارجية ونراجع مصدرها وترخيصها.
- لكل مهمة idempotency key لمنع تكرار التوليد عند إعادة المحاولة.
- نتحقق من MIME والحجم والمدة والدقة والبصمة قبل قبول أي ناتج.

المصادر:
- https://github.com/Comfy-Org/ComfyUI
- https://github.com/Comfy-Org/ComfyUI/blob/master/openapi.yaml
- https://comfy.org/workflows/

## 5. الصور والمواد المرئية

| المشروع | الوظيفة | القرار |
|---|---|---|
| FLUX.1-schnell | توليد صور مرجعية وkeyframes؛ الأوزان Apache 2.0 | مرشح قوي، لكن يحتاج GPU وملفات كبيرة |
| Qwen-Image | توليد صور وفهم نصي؛ Apache 2.0؛ ملفات المستودع المنشورة نحو 57.7GB | مرشح عالي الموارد، لا أول نموذج |
| SDXL | منظومة صور ناضجة وLoRA واسعة | بديل عملي بعد تدقيق ترخيص كل checkpoint |
| rembg | إزالة خلفية الشخصيات والعناصر | أداة مساعدة مع تدقيق ترخيص الأوزان |
| Real-ESRGAN | تكبير وتحسين الصور | عامل سحابي اختياري |
| Openverse / Wikimedia Commons | صور ومواد مفتوحة الترخيص | كل ملف يحتاج سجل مؤلف ورخصة |
| Pexels API | صور وفيديو مجانية بشروط API وحدود طلب | مصدر إضافي مع إسناد واحترام الشروط |
| Freesound | مؤثرات صوتية | التحقق من ترخيص كل تسجيل |

**الاستمرارية البصرية:** ننشئ صورة مرجعية معتمدة لكل شخصية وموقع، ثم نعيد استخدامها في توليد اللقطات. لا نعد بثبات مثالي للشخصية بين مقاطع مستقلة؛ نعتمد المراجع البصرية والانتقاء البشري.

مصادر:
- https://huggingface.co/black-forest-labs/FLUX.1-schnell
- https://github.com/black-forest-labs/flux/blob/main/docs/text-to-image.md
- https://huggingface.co/Qwen/Qwen-Image
- https://github.com/danielgatis/rembg
- https://github.com/xinntao/Real-ESRGAN
- https://docs.openverse.org/
- https://www.pexels.com/api/documentation/
- https://freesound.org/docs/api/

## 6. الصوت والكلام والموسيقى

| الأداة | المهمة | القيود | القرار |
|---|---|---|---|
| Whisper.cpp | تفريغ الكلام العربي/الإنجليزي وتوقيتات أولية | MIT؛ يجب اختيار نموذج multilingual لا English-only | أولوية عالية |
| Piper | تحويل النص إلى كلام | يوجد صوت عربي أردني ar_JO؛ البرنامج GPL-3.0-or-later ورخصة كل صوت تختلف | تجربة بعد تدقيق بطاقة الصوت |
| ACE-Step 1.5 | توليد موسيقى ومهام تحرير صوتية | MIT؛ يدعم أنماطاً متعددة؛ نماذج XL تحتاج VRAM أعلى (12GB+ مع offload) | محرك موسيقى أساسي للتجربة |
| Stable Audio 3 Small | موسيقى قصيرة ومؤثرات | النماذج الصغيرة المنشورة 433M ومسار CPU بحد أقصى معلن 120 ثانية؛ الأوزان تحت Stability Community License | مرشح ممتاز للمؤثرات والمقاطع القصيرة |
| Freesound | مكتبة مؤثرات | تراخيص فردية مختلفة | مصدر SFX |
| FFmpeg filters | Ducking وLoudness normalization والمزج | لا يحتاج نموذج AI | دمج مباشر |
| pyannote.audio | فصل المتحدثين | نماذج وموارد GPU وشروط وصول لبعض الأوزان | مرحلة لاحقة |
| MusicGen | توليد موسيقى | كود MIT لكن أوزان النماذج المعروفة CC-BY-NC 4.0 | لا نعتمده لخط إنتاج عام |

المصادر:
- https://github.com/ggml-org/whisper.cpp
- https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/VOICES.md
- https://github.com/ace-step/ACE-Step-1.5
- https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/INSTALL.md
- https://github.com/Stability-AI/stable-audio-3
- https://stability.ai/news-updates/meet-stable-audio-3-the-model-family-built-for-artistic-experimentation-with-open-weight-models
- https://ffmpeg.org/ffmpeg-filters.html

## 7. المونتاج والرسوم والتصدير

- FFmpeg/FFprobe: محرك التركيب والإخراج والفحص الحالي.
- Motion Canvas: رسوم متجهة وعناوين وإنفوغرافيك متحرك متزامن مع الصوت.
- OpenTimelineIO: معيار تبادل بيانات الخط الزمني، وليس محرراً جاهزاً.
- OpenColorIO: إدارة ألوان وACES لسير عمل متقدم.
- VMAF: مقارنة جودة الضغط بصرياً عند توفر libvmaf.
- Blender: إنتاج مشاهد 3D وCompositing في عامل سحابي منفصل عند توفر الموارد.
- Shotcut/Kdenlive/Olive: مراجع معمارية لتجربة Timeline، لا ننسخ شيفراتها قبل مراجعة الترخيص.

المصادر:
- https://ffmpeg.org/
- https://motioncanvas.io/docs/
- https://github.com/AcademySoftwareFoundation/OpenTimelineIO
- https://opencolorio.org/
- https://github.com/Netflix/vmaf
- https://www.blender.org/

## 8. التخزين والبنية السحابية

**الخيار الأول للدراسة والتنفيذ:** Cloudflare Workers + D1 + R2.

- Workers: API خفيف، جلسات، توجيه، وروابط موقعة.
- D1: أسماء المشاريع والمشاهد والمهام والحقوق والنسخ والـmetadata.
- R2: ملفات الوسائط والفيديو والمخرجات.
- الرفع والتنزيل مباشرة بين المتصفح وR2 عبر روابط قصيرة العمر، لا تمرير ملفات الفيديو الكبيرة عبر Worker.
- Quota Guard: حدود تخزين وعمليات وتنبيهات وتنظيف ملفات مؤقتة.

حصة R2 المجانية المنشورة وقت البحث: 10GB-month Standard storage، مليون Class A، 10 ملايين Class B شهرياً، وبدون رسوم egress ضمن الحصة؛ الزيادة قد تصبح مدفوعة. Workers وD1 لهما حصص وحدود منفصلة، ولذلك لا نستخدمهما لمعالجة الفيديو أو تخزين ملفات الفيديو داخل قاعدة البيانات.

بدائل:
- Supabase Free: بديل للبيانات الصغيرة، لكن حدود حجم الملف والتخزين والنقل والخمول تجعله أقل ملاءمة للفيديو الكبير.
- GitHub Artifacts: اختبارات ومخرجات مؤقتة فقط، وليست أرشيفاً دائماً.
- IndexedDB: مسودة محلية لا نسخة احتياطية سحابية.

المصادر:
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/r2/platform/limits/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/d1/platform/limits/
- https://supabase.com/docs/guides/storage/uploads/file-limits

## 9. بنية النظام النهائية

Android Browser
→ Render Static: CineForge UI
→ Cloudflare Worker API
→ D1: projects/scenes/assets/rights/jobs
→ R2: source assets/generated clips/exports
→ Provider Router
→ Kaggle GPU / Colab GPU / HF ZeroGPU
→ ComfyUI workflows and model adapters
→ validated assets with provenance
→ Story + Timeline + Audio + Subtitle Editor
→ FFmpeg/FFprobe CPU render and QA
→ R2 export + project manifest + downloadable MP4

### أمان وحدود الثقة
- لا مفاتيح API في JavaScript أو JSON أو Git.
- لا كشف لخادم ComfyUI أو Notebook دون حماية.
- روابط الرفع قصيرة العمر ومحددة الحجم والنوع.
- كل ملف يفحص MIME والبصمة والحجم والمدة.
- كل مهمة لها idempotency key وسجل حالة.
- لا رفع تلقائي لملفات شخصية إلى خدمات AI.
- لا استخدام Notebook كخادم دائم أو لتجاوز حصص المنصة.

## 10. مصنع اللقطات AI Shot Factory

1. استخراج وصف منظم من المشهد: الشخصية، الفعل، الموقع، الجو، التكوين، الكاميرا، الحركة والمدة.
2. بناء Prompt إنجليزي عند الحاجة مع إبقاء النص العربي الأصلي.
3. اختيار صورة مرجعية معتمدة للشخصية والمكان.
4. اختيار المحرك وفق GPU واللغة والترخيص والحصة.
5. فحص مسبق للموارد والحصة.
6. إرسال مهمة واحدة مع idempotency key.
7. متابعة الطابور والحالة دون إعادة إرسال.
8. استلام الناتج وفحصه.
9. معاينة بشرية قبل إضافته إلى Timeline.
10. تسجيل provider/model/version/prompt/parameters/license/SHA-256.
11. عند تعذر GPU، العودة إلى مسار الصور والحركة وFFmpeg دون توقف المشروع.

## 11. خطة التنفيذ بجولات كبيرة

### الجولة A — إغلاق الأساس (P0)
- Story Planner → Editor → Job JSON → Render → Restore.
- إظهار Continuity Bible داخل بطاقات المشاهد.
- manifest بإصدار واضح وتوافق مع المشاريع القديمة.
- Media Bin وسجل مصدر/حقوق وبصمات.
- فحص الأصول المفقودة.

**قبول:** مشروع عربي يمر من الخطة إلى MP4 مع بقاء الاستمرارية والمدد والأصول.

### الجولة B — البنية السحابية (P1)
- Worker API + D1 schema + R2 bucket.
- رفع مباشر بموقّع قصير المدة.
- Job states وqueue/retry/cancel/idempotency.
- Quota Guard وتنظيف الملفات المؤقتة.
- استعادة مشروع من جهاز آخر.

**قبول:** رفع واستعادة وحذف ملف اصطناعي بنجاح دون إدخال بيانات خاصة.

### الجولة C — إثبات GPU الحقيقي (P1 بالتوازي)
- Notebook منفصل لـCogVideoX-2B.
- فحص GPU/VRAM/RAM/disk/CUDA قبل التنزيل.
- manifest دقيق لأحجام الملفات.
- تنزيل الأوزان بعد موافقة محددة على النموذج والحجم.
- توليد لقطة قصيرة واحدة وفحصها بـFFprobe.
- قياس الوقت والذاكرة والحجم ومقارنة الناتج بالمسار التقليدي.
- قرار GO / CONDITIONAL / NO-GO.

**قبول:** ملف AI حقيقي واحد صالح، موثق، قابل للتكرار من الهاتف دون دفع.

### الجولة D — مصنع الصور واللقطات (P2)
- ComfyUI منفصل.
- Workflows JSON للصور المرجعية وT2V/I2V وupscale وإزالة الخلفية.
- صور مرجعية للشخصيات والأماكن.
- Keyframes قبل الفيديو لتقليل هدر GPU.
- أكثر من Provider عبر Adapter موحد.

**قبول:** لقطة مولدة موثقة تضاف إلى Timeline وتبقى بعد إعادة فتح المشروع.

### الجولة E — الصوت الكامل (P2)
- Whisper.cpp للتفريغ العربي وSRT أولي.
- Piper للصوت العربي بعد مراجعة ترخيص الصوت.
- ACE-Step للموسيقى.
- Stable Audio 3 Small للمؤثرات.
- Freesound لمكتبة SFX.
- FFmpeg للمزج وDucking وLoudnorm وفحص clipping/silence.

**قبول:** تعليق وموسيقى ومؤثرات وترجمة متزامنة وقابلة للتحرير مع سجل حقوق.

### الجولة F — Timeline سينمائي (P2/P3)
- مسارات Video/Image/Title/Subtitle/Voice/Music/SFX.
- قص وتقسيم وترتيب وتحريك بأدوات لمس.
- انتقالات وkeyframes وحركات كاميرا.
- Motion Canvas للعناوين والرسوم.
- OpenTimelineIO للاستيراد والتصدير.
- قوالب 16:9 و9:16 و1:1.

**قبول:** تحرير كامل من الهاتف وإخراج مطابق للـTimeline.

### الجولة G — الجودة والإطلاق (P3)
- QA تقني ومرئي وصوتي.
- فحص black frames/silence/clipping/subtitle overflow.
- تقارير FFprobe وVMAF عند توفره.
- تصدير متعدد وmanifest وSHA-256.
- نسخ إصدارات واستعادة واختبار Android.
- دليل عربي واضح.

**قبول نهائي:** من الهاتف فقط، فكرة → قصة → أصول → صوت وترجمة → مونتاج → MP4 + نسخة مشروع قابلة للاستعادة.

## 12. تعريف المجانية

- Open-source/self-hosted: الكود أو الأوزان متاحة، لكن GPU والتخزين قد يكونان مكلفين.
- Free recurring quota: حصة مجانية متجددة لكنها محدودة.
- Free demo/shared endpoint: تجربة مشتركة، ليست إنتاجاً مضموناً.
- Free trial/credits: رصيد لمرة واحدة، لا نصنفه مجانياً دائماً.

لا نفعّل خطة مدفوعة أو API مدفوعاً تلقائياً. عند انتهاء الحصة تتوقف المهمة برسالة واضحة. لا توجد وعود بGPU مجاني دائم أو توليد غير محدود.

## 13. حالة التنفيذ الحالية

**موجود في المشروع:** واجهة Render، مخطط قصة، محرر مشاهد، Pillow، FFmpeg، FFprobe، GitHub Actions CPU، واختبارات Node/Python ورندر عينة سابق ناجح.

**موجود كخطة/مرشح فقط:** CogVideoX، Wan، LTX، LongCat، ComfyUI، FLUX، Qwen-Image، Whisper.cpp، Piper، ACE-Step، Stable Audio 3، Cloudflare D1/R2/Workers.

**لم ينفذ بعد:** Worker/D1/R2، GPU Notebook، تنزيل أوزان، توصيل ComfyUI، توليد فيديو AI حقيقي من داخل CineForge، Timeline متعدد المسارات، واختبار هاتف شامل.

المهمة الحالية لإثبات توليد فيديو مجاني: https://github.com/mdznap35/PlayGround/issues/20

## 14. المصادر المركزية
- CogVideoX: https://github.com/zai-org/CogVideo
- Wan 2.2: https://github.com/Wan-Video/Wan2.2
- LongCat: https://github.com/meituan-longcat/LongCat-Video
- LTX-2.5: https://github.com/Lightricks/LTX-2
- ComfyUI: https://github.com/Comfy-Org/ComfyUI
- Kaggle: https://www.kaggle.com/docs/notebooks
- Colab: https://research.google.com/colaboratory/faq.html
- ZeroGPU: https://huggingface.co/docs/hub/en/spaces-zerogpu
- R2: https://developers.cloudflare.com/r2/pricing/
- ACE-Step: https://github.com/ace-step/ACE-Step-1.5
- Stable Audio 3: https://github.com/Stability-AI/stable-audio-3
- Whisper.cpp: https://github.com/ggml-org/whisper.cpp
- Piper: https://github.com/OHF-Voice/piper1-gpl
- FFmpeg: https://ffmpeg.org/
- Motion Canvas: https://motioncanvas.io/docs/
- OpenTimelineIO: https://github.com/AcademySoftwareFoundation/OpenTimelineIO

**القرار النهائي:** أفضل نظام مجاني ليس خادماً واحداً مجانياً؛ بل منظومة تتحمل انقطاع GPU، وتستفيد من جلسات GPU المجانية المتاحة، وتحفظ حالة كل مهمة وملفاتها، وتنتج الفيديو عبر FFmpeg، وتبقى قابلة للعمل حتى عند غياب الذكاء الاصطناعي.

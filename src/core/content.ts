/* ContentSystem: curated data with STABLE ids. New content = new entries,
   never engine changes. validateContent() runs in tests. */

import type { SkillId, ZoneId } from './types';

export interface ActivityMeta {
  id: string;
  zone: ZoneId;
  title: string;
  emoji: string;
  voice: string;   // spoken instruction (Arabic, no reading required)
  voiceEn?: string;
  skills: SkillId[];
}

export interface QuestStep { id: string; text: string; zone: ZoneId; activityId?: string; }
export interface QuestDef { id: string; title: string; emoji: string; story: string; steps: QuestStep[]; rewardCoins: number; }

export interface ProjectStepDef { id: string; title: string; voice: string; }
/** Data-driven world gifts: finishing a project places real things in the world. */
export interface WorldGift {
  companion?: string; // emoji inhabitant, e.g. '🤖' wanders by the workshop
  film?: boolean;     // store the creation as a watchable film (cast from step data)
  plants?: number;    // garden plants added
}
export interface ProjectDef {
  id: string; title: string; emoji: string; intro: string;
  skills: SkillId[];
  steps: ProjectStepDef[];
  rewardBuilding?: string;
  worldGift?: WorldGift;
}

export interface StoryNode {
  id: string; text: string; emoji: string;
  choices?: { label: string; emoji: string; next: string; value?: string }[];
  end?: boolean;
}
export interface StoryDef { id: string; title: string; emoji: string; start: string; nodes: Record<string, StoryNode>; skills: SkillId[]; }

export interface Destination { id: string; name: string; emoji: string; fact: string; animal: string; food: string; }

export const ZONES: { id: ZoneId; name: string; emoji: string; hint: string }[] = [
  { id: 'home', name: 'بيتي', emoji: '🏠', hint: 'مكانك الدافئ' },
  { id: 'lab', name: 'المختبر', emoji: '🔬', hint: 'جرّب واكتشف' },
  { id: 'body', name: 'جسمي', emoji: '🫀', hint: 'رحلة داخل الجسم' },
  { id: 'mind', name: 'العقل', emoji: '🧠', hint: 'ألعاب التفكير' },
  { id: 'make', name: 'الورشة', emoji: '🎨', hint: 'ارسم وابنِ' },
  { id: 'robot', name: 'الروبوت', emoji: '🤖', hint: 'برمجة بالصور' },
  { id: 'explorer', name: 'بوابة العالم', emoji: '🌍', hint: 'سافر واستكشف' },
  { id: 'space', name: 'الفضاء', emoji: '🚀', hint: 'مهمة فضائية' },
  { id: 'impossible', name: 'غرفة المستحيل', emoji: '🌀', hint: 'شو عم يصير؟' },
  { id: 'stories', name: 'القصص', emoji: '📖', hint: 'اختر المغامرة' },
  { id: 'music', name: 'الموسيقى', emoji: '🎵', hint: 'اصنع لحنك' },
  { id: 'values', name: 'نور', emoji: '🕌', hint: 'قصص وقيم جميلة' },
  { id: 'city', name: 'مدينتي', emoji: '🏙️', hint: 'ابنِ عالمك' },
  { id: 'museum', name: 'متحفي', emoji: '🏛️', hint: 'هذا ما صنعته' },
];

export const ACTIVITIES: ActivityMeta[] = [
  { id: 'float-sink', zone: 'lab', title: 'يطفو أم يغوص؟', emoji: '🌊', voice: 'خلّينا نتوقع! أي شي بيطفو فوق المي؟ جرّب وشوف!', skills: ['prediction', 'observation', 'nature'] },
  { id: 'light-shadow', zone: 'lab', title: 'الضوء والظل', emoji: '💡', voice: 'حرّك المصباح! شوف كيف الظل بيكبر وبيصغر. جرّب بنفسك!', skills: ['observation', 'prediction', 'spatial'] },
  { id: 'magnet', zone: 'lab', title: 'المغناطيس السحري', emoji: '🧲', voice: 'قرّب المغناطيس من الأشياء. شو بينجذب؟ توقّع أولاً!', skills: ['prediction', 'classification', 'observation'] },
  { id: 'breath', zone: 'body', title: 'رحلة النفس', emoji: '🫁', voice: 'خذ نفساً عميقاً معي… شوف الهواء وين بيروح!', skills: ['observation', 'selfcare'] },
  { id: 'heart', zone: 'body', title: 'قلبي يدق', emoji: '💓', voice: 'حط إيدك على قلبك. تحرك معي وشوف كيف بيدق أسرع!', skills: ['observation', 'selfcare'] },
  { id: 'senses', zone: 'body', title: 'الحواس الخمس', emoji: '👁️', voice: 'اسمع… شوف… المس! طابق كل صوت مع صاحبه.', skills: ['listening', 'classification', 'observation'] },
  { id: 'memory-pairs', zone: 'mind', title: 'لعبة الذاكرة', emoji: '🃏', voice: 'افتح البطاقات وتذكّر أماكنها. بتقدر تلاقي كل الثنائيات؟', skills: ['memory', 'observation'] },
  { id: 'patterns', zone: 'mind', title: 'أكمل النمط', emoji: '🔷', voice: 'شوف الترتيب… شو اللي ناقص؟ كمّل النمط!', skills: ['patterns', 'sequencing', 'logic'] },
  { id: 'sorting', zone: 'mind', title: 'رتّب وصنّف', emoji: '🧺', voice: 'ساعدني! كل شي بمكانه. وين بيروح كل غرض؟', skills: ['classification', 'comparison', 'instructions'] },
  { id: 'bridge-count', zone: 'make', title: 'جسر الأرقام', emoji: '🌉', voice: 'الجسر بده قطع بعدد معين! عِد معي وركّب.', skills: ['counting', 'quantity', 'construction', 'planning'] },
  { id: 'shapes-tower', zone: 'make', title: 'برج الأشكال', emoji: '🗼', voice: 'ابنِ أعلى برج! قارن الأحجام واختار القطعة الصح.', skills: ['shapes', 'comparison', 'spatial', 'construction'] },
  { id: 'shop', zone: 'home', title: 'متجر نوفا', emoji: '🛒', voice: 'معك عملات! اشترِ ما تحتاجه. شو الفرق بين نحتاج ونتمنى؟', skills: ['money', 'comparison', 'addition'] },
  { id: 'weather-dress', zone: 'home', title: 'لبس الطقس', emoji: '🧥', voice: 'الجو اليوم ممطر! شو لازم نلبس؟ اختار الصح.', skills: ['observation', 'selfcare', 'classification'] },
  { id: 'robot-fix', zone: 'robot', title: 'إصلاح الروبوت', emoji: '🤖', voice: 'الروبوت ضايع! أعطه أوامر بالصور ووصّله للبطارية.', skills: ['sequence', 'planning', 'debugging', 'directions'] },
  { id: 'word-spots', zone: 'explorer', title: 'كلمات العالم', emoji: '🔤', voice: 'اسمع الكلمة بالإنجليزية، بعدين المس الصورة الصح!', voiceEn: 'Listen and tap!', skills: ['listening', 'vocabulary', 'naming'] },
  { id: 'train', zone: 'explorer', title: 'مهمة القطار', emoji: '🚂', voice: 'القطار بده يوصل بالوقت! ساعده يختار الطريق الصح.', skills: ['time', 'directions', 'planning'] },
  { id: 'space-launch', zone: 'space', title: 'إطلاق الصاروخ', emoji: '🚀', voice: 'جهّز الصاروخ! عِد تنازلياً وانطلق للنجوم!', skills: ['counting', 'sequencing', 'space'] },
  { id: 'garden', zone: 'explorer', title: 'حديقتي', emoji: '🌱', voice: 'ازرع واسقِ وراقب! شو بيحتاج النبات ليعيش؟', skills: ['nature', 'animals', 'prediction'] },
  { id: 'emotions', zone: 'home', title: 'مشاعري', emoji: '😊', voice: 'شوف الوجه… شو حاسس؟ امتى حسيت هيك انت؟', skills: ['emotions', 'communication', 'description'] },
  { id: 'odd-one', zone: 'mind', title: 'الشي المختلف', emoji: '🔍', voice: 'شي واحد مختلف عن البقية! لاقيه بسرعة!', skills: ['observation', 'classification', 'flexibility'] },
  { id: 'grove-keep', zone: 'explorer', title: 'غابة نوفا', emoji: '🌳', voice: 'الغابة نايمة والمي محبوسة! حرّك الحجارة وخلي المي توصل!', skills: ['prediction', 'observation', 'sequencing', 'nature', 'problemSolving', 'spatial'] },
  { id: 'lamp-plan', zone: 'city', title: 'مدينة الضوء', emoji: '🏮', voice: 'المدينة نايمة! حرّك المرايا ووصّل الضو لكل الشوارع!', skills: ['spatial', 'logic', 'planning', 'sequencing', 'prediction', 'debugging'] },
  { id: 'star-echo', zone: 'space', title: 'رسالة النجوم', emoji: '🌠', voice: 'السماء عم تحكي! اسمع منيح والمس النجوم متل ما سمعتها!', skills: ['memory', 'patterns', 'listening', 'sequencing', 'sound', 'emotions', 'prediction'] },
];

export const QUESTS: QuestDef[] = [
  { id: 'q-robot', title: 'إصلاح الروبوت', emoji: '🤖', story: 'روبوت نوفا تعطّل! ساعده يرجع يشتغل.', steps: [{ id: 's1', text: 'روح على الروبوت وأعطه الأوامر', zone: 'robot', activityId: 'robot-fix' }, { id: 's2', text: 'ابنِ له بيتاً في مدينتك', zone: 'city' }], rewardCoins: 15 },
  { id: 'q-bridge', title: 'بناء الجسر', emoji: '🌉', story: 'النهر يفصل بين صديقين! ابنِ جسراً يوصلهما.', steps: [{ id: 's1', text: 'عِد القطع وابنِ الجسر', zone: 'make', activityId: 'bridge-count' }, { id: 's2', text: 'اختبر الجسر في مشروعك', zone: 'city' }], rewardCoins: 15 },
  { id: 'q-science', title: 'عالِم صغير', emoji: '🔬', story: 'ماذا يطفو وماذا يغوص؟ اكتشف بنفسك!', steps: [{ id: 's1', text: 'توقّع وجرّب في المختبر', zone: 'lab', activityId: 'float-sink' }, { id: 's2', text: 'جرّب المغناطيس السحري', zone: 'lab', activityId: 'magnet' }], rewardCoins: 12 },
  { id: 'q-body', title: 'رحلة الجسم', emoji: '🫀', story: 'ادخل في رحلة داخل جسمك!', steps: [{ id: 's1', text: 'تتبّع رحلة النفس', zone: 'body', activityId: 'breath' }, { id: 's2', text: 'اكتشف دقات قلبك', zone: 'body', activityId: 'heart' }], rewardCoins: 12 },
  { id: 'q-train', title: 'مهمة القطار', emoji: '🚂', story: 'القطار تأخّر! وصّله بالوقت.', steps: [{ id: 's1', text: 'ساعد القطار يختار الطريق', zone: 'explorer', activityId: 'train' }, { id: 's2', text: 'تعلّم كلمات السفر', zone: 'explorer', activityId: 'word-spots' }], rewardCoins: 12 },
  { id: 'q-logic', title: 'تحدي العقل', emoji: '🧠', story: 'ثلاثة ألغاز ذكية بانتظارك!', steps: [{ id: 's1', text: 'العب لعبة الذاكرة', zone: 'mind', activityId: 'memory-pairs' }, { id: 's2', text: 'أكمل النمط', zone: 'mind', activityId: 'patterns' }], rewardCoins: 12 },
  { id: 'q-world', title: 'رحلة حول العالم', emoji: '🌍', story: 'زر ثلاث بلدان واجمع أختام جوازك!', steps: [{ id: 's1', text: 'سافر من بوابة العالم', zone: 'explorer' }, { id: 's2', text: 'ازرع حديقتك', zone: 'explorer', activityId: 'garden' }], rewardCoins: 14 },
  { id: 'q-story', title: 'صانع الحكايات', emoji: '📖', story: 'اصنع قصتك الخاصة وشاهدها!', steps: [{ id: 's1', text: 'اختر مغامرة قصة', zone: 'stories' }, { id: 's2', text: 'اصنع فيلمك الأول', zone: 'make' }], rewardCoins: 14 },
  { id: 'q-space', title: 'مهمة فضائية', emoji: '🚀', story: 'إلى النجوم! أطلق صاروخك.', steps: [{ id: 's1', text: 'أطلق الصاروخ', zone: 'space', activityId: 'space-launch' }, { id: 's2', text: 'ابنِ محطة فضاء في مدينتك', zone: 'city' }], rewardCoins: 16 },
  { id: 'q-first-project', title: 'أول مشروع كامل', emoji: '🏆', story: 'مشروعك الأول من الفكرة حتى العرض!', steps: [{ id: 's1', text: 'ابدأ أي مشروع', zone: 'city' }, { id: 's2', text: 'اعرضه في متحفك', zone: 'museum' }], rewardCoins: 20 },
];

export const PROJECTS: ProjectDef[] = [
  { id: 'p-bridge', title: 'مشروع الجسر', emoji: '🌉', intro: 'صمّم جسراً يعبر النهر ويتحمّل الأثقال!', skills: ['counting', 'planning', 'construction', 'problemSolving', 'spatial'], steps: [{ id: 'mat', title: 'اختر المواد', voice: 'خشب قوي أم حبال خفيفة؟ كل مادة لها قوة!' }, { id: 'len', title: 'حدّد الطول', voice: 'كم قطعة يحتاج الجسر؟ عِد معي!' }, { id: 'build', title: 'ابنِ الجسر', voice: 'ركّب القطع واحدة واحدة!' }, { id: 'test', title: 'اختبر الجسر', voice: 'خلّينا نشوف إذا بيتحمّل! توقّع أولاً!' }], rewardBuilding: 'bridge' },
  { id: 'p-city', title: 'مدينة صغيرة', emoji: '🏙️', intro: 'ابنِ مدينة فيها كل ما يحتاجه الناس!', skills: ['planning', 'systems', 'construction'], steps: [{ id: 'plan', title: 'خطّط المدينة', voice: 'شو بتحتاج المدينة أولاً؟ بيت؟ مدرسة؟' }, { id: 'build', title: 'ابنِ المباني', voice: 'ابنِ ثلاثة مبانٍ على الأقل!' }, { id: 'life', title: 'شغّل الحياة', voice: 'شاهد مدينتك تنبض بالحركة!' }], rewardBuilding: 'school' },
  { id: 'p-robot', title: 'صديقي الروبوت', emoji: '🤖', intro: 'ابنِ روبوتك ثم برمجه لينفّذ مهمة!', skills: ['construction', 'sequence', 'debugging', 'invention', 'planning'], steps: [{ id: 'parts', title: 'ركّب الأجزاء', voice: 'اختر الرأس والجسم والعجلات!' }, { id: 'code', title: 'برمج المهمة', voice: 'أعطه أوامر ليوصل للنجمة!' }, { id: 'fix', title: 'أصلح الأخطاء', voice: 'ما وصل؟ غيّر الأوامر وحاول!' }], rewardBuilding: 'workshop', worldGift: { companion: '🤖' } },
  { id: 'p-film', title: 'فيلمي الأول', emoji: '🎬', intro: 'اختر الشخصيات والمشاهد واصنع فيلمك!', skills: ['storytelling', 'composition', 'sound'], steps: [{ id: 'chars', title: 'اختر الشخصيات', voice: 'مين أبطال فيلمك؟' }, { id: 'scenes', title: 'ركّب المشاهد', voice: 'رتّب ثلاثة مشاهد بالترتيب!' }, { id: 'music', title: 'أضف الموسيقى', voice: 'لحّن موسيقى لفيلمك!' }], rewardBuilding: 'cinema', worldGift: { film: true } },
  { id: 'p-space', title: 'رحلة فضائية', emoji: '🚀', intro: 'ابنِ مركبتك وجهّزها ثم انطلق!', skills: ['counting', 'planning', 'space', 'systems'], steps: [{ id: 'ship', title: 'ابنِ المركبة', voice: 'اختر الأجزاء: جسم، أجنحة، محرك!' }, { id: 'fuel', title: 'جهّز الوقود', voice: 'كم وحدة وقود تحتاج الرحلة؟' }, { id: 'fly', title: 'نفّذ المهمة', voice: 'انطلق! اجمع النجوم وتجنّب الصخور!' }], rewardBuilding: 'station' },
  { id: 'p-garden', title: 'محمية طبيعية', emoji: '🌱', intro: 'اصنع بيئة متوازنة تعيش فيها الحيوانات والنباتات!', skills: ['nature', 'animals', 'systems', 'prediction'], steps: [{ id: 'env', title: 'اختر البيئة', voice: 'غابة؟ صحراء؟ بحر؟' }, { id: 'life', title: 'أضف الكائنات', voice: 'اختر حيوانات ونباتات مناسبة!' }, { id: 'balance', title: 'راقب التوازن', voice: 'هل الجميع سعيد؟ عدّل إذا لزم!' }], rewardBuilding: 'park', worldGift: { plants: 3 } },
];

export const BUILDINGS: { id: string; name: string; emoji: string; cost: number; quest?: string }[] = [
  { id: 'home', name: 'البيت', emoji: '🏠', cost: 0 },
  { id: 'school', name: 'المدرسة', emoji: '🏫', cost: 30 },
  { id: 'lab', name: 'المختبر', emoji: '🔬', cost: 40 },
  { id: 'workshop', name: 'الورشة', emoji: '🔨', cost: 35 },
  { id: 'shop', name: 'المتجر', emoji: '🏪', cost: 25 },
  { id: 'hospital', name: 'المستشفى', emoji: '🏥', cost: 45 },
  { id: 'park', name: 'الحديقة', emoji: '🌳', cost: 20 },
  { id: 'station', name: 'محطة القطار', emoji: '🚉', cost: 35 },
  { id: 'bridge', name: 'الجسر', emoji: '🌉', cost: 30 },
  { id: 'cinema', name: 'السينما', emoji: '🎬', cost: 40 },
  { id: 'spacestation', name: 'محطة الفضاء', emoji: '🛰️', cost: 60 },
  { id: 'mosque', name: 'المسجد', emoji: '🕌', cost: 0 },
];

export const STORIES: StoryDef[] = [
  {
    id: 'st-forest', title: 'غابة الأصوات', emoji: '🌲', skills: ['listening', 'prediction', 'vocabulary'],
    start: 'n1',
    nodes: {
      n1: { id: 'n1', text: 'في غابة خضراء، سمع لولو صوتاً غريباً… شو ممكن يكون؟', emoji: '🌲', choices: [{ label: 'عصفور', emoji: '🐦', next: 'n2' }, { label: 'نهر', emoji: '🌊', next: 'n3' }] },
      n2: { id: 'n2', text: 'نعم! عصفور صغير ضايع. Bird! العصفور يقول: ساعدني ألاقي بيتي.', emoji: '🐦', choices: [{ label: 'ساعده', emoji: '💛', next: 'end1' }, { label: 'نادِ أصدقاءه', emoji: '📣', next: 'end2' }] },
      n3: { id: 'n3', text: 'نهر صغير يغني! Water! الماء يجري ويضحك. شو بتشوف بالنهر؟', emoji: '🌊', choices: [{ label: 'سمكة', emoji: '🐟', next: 'end2' }, { label: 'قارب ورقي', emoji: '⛵', next: 'end1' }] },
      end1: { id: 'end1', text: 'أحسنت! لولو تعلّم أن المساعدة تجعل الغابة أجمل. النهاية! 🎉', emoji: '🎉', end: true },
      end2: { id: 'end2', text: 'رائع! الغابة كلها تحتفل معك. أصدقاء جدد ومغامرة جميلة! 🎉', emoji: '🎉', end: true },
    },
  },
  {
    id: 'st-sea', title: 'مغامرة البحر', emoji: '🌊', skills: ['prediction', 'sequencing', 'emotions'],
    start: 'n1',
    nodes: {
      n1: { id: 'n1', text: 'القارب الصغير يتمايل… العاصفة قادمة! شو نعمل أولاً؟', emoji: '⛵', choices: [{ label: 'نلبس سترة النجاة', emoji: '🦺', next: 'n2' }, { label: 'نطلب مساعدة', emoji: '🙋', next: 'n2' }] },
      n2: { id: 'n2', text: 'ممتاز! السلامة أولاً. بعد العاصفة، ظهرت جزيرة… نستكشفها؟', emoji: '🏝️', choices: [{ label: 'نعم! لنستكشف', emoji: '🔍', next: 'end1' }, { label: 'نعود للبيت', emoji: '🏠', next: 'end2' }] },
      end1: { id: 'end1', text: 'الجزيرة مليئة بالفواكه والأصدقاء! الشجاعة تكافأ دائماً! 🎉', emoji: '🎉', end: true },
      end2: { id: 'end2', text: 'العودة للبيت الدافئ أحلى شعور. العائلة كانت بانتظارك! 🎉', emoji: '🎉', end: true },
    },
  },
];

export const DESTINATIONS: Destination[] = [
  { id: 'd-palestine', name: 'فلسطين', emoji: '🫒', fact: 'أرض الزيتون والبرتقال، وفيها المسجد الأقصى.', animal: '🐦 طائر الحسون', food: '🥙 المسخن' },
  { id: 'd-japan', name: 'اليابان', emoji: '🗼', fact: 'بلد القطارات السريعة وزهر الكرز.', animal: '🐼 دب الباندا قريب منها', food: '🍙 كرات الأرز' },
  { id: 'd-egypt', name: 'مصر', emoji: '🐪', fact: 'فيها الأهرامات ونهر النيل الطويل.', animal: '🐪 الجمل', food: '🍲 الكشري' },
  { id: 'd-brazil', name: 'البرازيل', emoji: '🦜', fact: 'غابات الأمازون الخضراء الكبيرة.', animal: '🦜 الببغاء', food: '🍌 الفواكه' },
  { id: 'd-norway', name: 'النرويج', emoji: '❄️', fact: 'ثلج كثير وشفق قطبي ملوّن!', animal: '🦌 الرنّة', food: '🐟 السمك' },
  { id: 'd-kenya', name: 'كينيا', emoji: '🦁', fact: 'سهول واسعة تعيش فيها الأسود والفيلة.', animal: '🦁 الأسد', food: '🌽 الذرة' },
];

/* Curated values content — every item carries its source. AI must NEVER invent these. */
export interface ValueItem { id: string; title: string; text: string; source: string; emoji: string; }
export const VALUES: ValueItem[] = [
  { id: 'v-honesty', title: 'الصدق', emoji: '💛', text: 'المسلم صادق: يقول الحقيقة دائماً. قال رسول الله ﷺ: «عليكم بالصدق فإن الصدق يهدي إلى البر».', source: 'متفق عليه: البخاري (6094) ومسلم (2607)' },
  { id: 'v-parents', title: 'بر الوالدين', emoji: '🤲', text: 'نحب أمنا وأبانا ونساعدهما ونتكلم معهما بلطف. قال الله تعالى: «وبالوالدين إحساناً».', source: 'سورة البقرة، الآية 83' },
  { id: 'v-mercy', title: 'الرحمة', emoji: '🕊️', text: 'نرحم الصغار والحيوانات. قال رسول الله ﷺ: «الراحمون يرحمهم الرحمن».', source: 'سنن أبي داود (4941) والترمذي (1924)' },
  { id: 'v-wudu', title: 'الوضوء', emoji: '💧', text: 'نتوضأ بالماء الطهور: نغسل اليدين والوجه والذراعين ونمسح الرأس ونغسل القدمين.', source: 'صفة الوضوء الثابتة — يُعلَّم عملياً مع الأهل' },
  { id: 'v-salah', title: 'الصلاة', emoji: '🕌', text: 'نصلي خمس صلوات في اليوم. الصلاة لقاء جميل مع الله.', source: 'حديث الصلوات الخمس — متفق عليه' },
  { id: 'v-dua', title: 'دعاء الصباح', emoji: '🌅', text: '«اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور».', source: 'سنن الترمذي (3391)' },
];

export const EN_WORDS: { en: string; ar: string; emoji: string }[] = [
  { en: 'Book', ar: 'كتاب', emoji: '📕' },
  { en: 'Cat', ar: 'قطة', emoji: '🐱' },
  { en: 'Sun', ar: 'شمس', emoji: '☀️' },
  { en: 'Tree', ar: 'شجرة', emoji: '🌳' },
  { en: 'Bird', ar: 'عصفور', emoji: '🐦' },
  { en: 'Water', ar: 'ماء', emoji: '💧' },
  { en: 'Train', ar: 'قطار', emoji: '🚂' },
  { en: 'Star', ar: 'نجمة', emoji: '⭐' },
];

export function validateContent(): string[] {
  return validateRegistries({
    activities: ACTIVITIES, quests: QUESTS, projects: PROJECTS,
    stories: STORIES, values: VALUES, destinations: DESTINATIONS,
    buildings: BUILDINGS, zones: ZONES,
  });
}

/** Pure registry validator (testable with crafted data; see tests). */
export function validateRegistries(r: {
  activities: ActivityMeta[]; quests: QuestDef[]; projects: ProjectDef[];
  stories: StoryDef[]; values: ValueItem[];
  destinations: Destination[]; buildings: { id: string }[]; zones: { id: string }[];
}): string[] {
  const errors: string[] = [];
  const zoneIds = new Set([...r.zones.map((z) => z.id), 'parents']);
  const actIds = new Set<string>();
  for (const a of r.activities) {
    if (actIds.has(a.id)) errors.push(`duplicate activity ${a.id}`);
    actIds.add(a.id);
    if (!a.voice) errors.push(`activity ${a.id} missing voice`);
    if (!a.skills.length) errors.push(`activity ${a.id} has no skills`);
    if (!zoneIds.has(a.zone)) errors.push(`activity ${a.id} unknown zone ${a.zone}`);
  }
  const questIds = new Set<string>();
  for (const q of r.quests) {
    if (questIds.has(q.id)) errors.push(`duplicate quest ${q.id}`);
    questIds.add(q.id);
    for (const s of q.steps) {
      if (s.activityId && !actIds.has(s.activityId)) errors.push(`quest ${q.id} step ${s.id} unknown activity ${s.activityId}`);
      if (!zoneIds.has(s.zone)) errors.push(`quest ${q.id} step ${s.id} unknown zone ${s.zone}`);
    }
  }
  const buildingIds = new Set(r.buildings.map((b) => b.id));
  for (const p of r.projects) {
    if (!p.steps.length) errors.push(`project ${p.id} has no steps`);
    if (p.rewardBuilding && !buildingIds.has(p.rewardBuilding)) errors.push(`project ${p.id} unknown rewardBuilding ${p.rewardBuilding}`);
    if (p.worldGift?.companion !== undefined && !p.worldGift.companion) errors.push(`project ${p.id} empty companion gift`);
    const seen = new Set<string>();
    for (const s of p.steps) {
      if (seen.has(s.id)) errors.push(`project ${p.id} duplicate step ${s.id}`);
      seen.add(s.id);
      if (!s.voice) errors.push(`project ${p.id} step ${s.id} missing voice`);
    }
  }
  for (const st of r.stories) {
    if (!st.nodes[st.start]) errors.push(`story ${st.id} bad start`);
    for (const [nid, n] of Object.entries(st.nodes)) {
      if (n.id !== nid) errors.push(`story ${st.id} node key/id mismatch ${nid}`);
      for (const c of n.choices ?? []) {
        if (!st.nodes[c.next]) errors.push(`story ${st.id} node ${nid} bad next ${c.next}`);
        if (!c.label) errors.push(`story ${st.id} node ${nid} empty choice label`);
      }
    }
  }
  for (const v of r.values) {
    if (!v.source) errors.push(`value ${v.id} missing source`);
  }
  // cross-registry id collisions (save data + analytics key on these).
  // NOTE: buildings live in a separate namespace (world.buildings) and may
  // legitimately share a concept id with an activity (e.g. activity 'shop'
  // vs building 'shop') — so buildings are checked only against themselves.
  const seen = new Map<string, string>();
  const claim = (id: string, where: string) => {
    const prev = seen.get(id);
    if (prev) errors.push(`duplicate id ${id} in ${prev} and ${where}`);
    else seen.set(id, where);
  };
  for (const a of r.activities) claim(a.id, 'activities');
  for (const q of r.quests) claim(q.id, 'quests');
  for (const p of r.projects) claim(p.id, 'projects');
  for (const s of r.stories) claim(s.id, 'stories');
  for (const v of r.values) claim(v.id, 'values');
  for (const d of r.destinations) claim(d.id, 'destinations');
  const seenBuildings = new Set<string>();
  for (const b of r.buildings) {
    if (seenBuildings.has(b.id)) errors.push(`duplicate building ${b.id}`);
    seenBuildings.add(b.id);
  }
  return errors;
}

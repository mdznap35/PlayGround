/* NOVA shared types. IDs are stable strings — never rename content IDs. */

export type ZoneId =
  | 'home' | 'lab' | 'body' | 'mind' | 'make' | 'robot'
  | 'explorer' | 'space' | 'impossible' | 'stories' | 'music'
  | 'values' | 'city' | 'museum' | 'parents';

export type SkillId =
  // thinking
  | 'observation' | 'memory' | 'classification' | 'patterns' | 'sequencing'
  | 'prediction' | 'planning' | 'flexibility' | 'problemSolving' | 'spatial'
  // math
  | 'quantity' | 'counting' | 'comparison' | 'addition' | 'subtraction'
  | 'shapes' | 'measurement' | 'time' | 'money' | 'directions'
  // language
  | 'listening' | 'vocabulary' | 'instructions' | 'sentences' | 'naming' | 'description'
  // creativity
  | 'construction' | 'composition' | 'storytelling' | 'color' | 'sound' | 'invention'
  // technology
  | 'sequence' | 'logic' | 'conditions' | 'repetition' | 'debugging' | 'systems'
  // world
  | 'nature' | 'animals' | 'geography' | 'professions' | 'transport' | 'culture' | 'space'
  // life
  | 'selfcare' | 'safety' | 'emotions' | 'communication' | 'values';

export interface AttemptEvidence {
  activityId: string;
  skillIds: SkillId[];
  success: boolean;
  durationMs: number;
  tries: number;
  hintsUsed: number;
  errorKind?: string;
  at: number;
}

export interface SkillState {
  strength: number; // 0..1 EMA of success
  plays: number;
  successes: number;
  lastPlayedAt: number;
  needsHelp: boolean;
  contexts: string[]; // activityIds where this skill was practiced (transfer tracking)
}

export interface ProjectStepState {
  stepId: string;
  done: boolean;
  data?: Record<string, unknown>;
}

export interface ProjectSave {
  defId: string;
  status: 'active' | 'done';
  steps: ProjectStepState[];
  startedAt: number;
  updatedAt: number;
  artifact?: Artifact;
}

export interface Artifact {
  kind: string;
  title: string;
  emoji: string;
  description: string;
  createdAt: number;
}

export interface MuseumItem extends Artifact {
  id: string;
  projectId?: string;
}

export interface QuestProgress {
  questId: string;
  stepsDone: string[];
  done: boolean;
}

export interface WorldState {
  buildings: string[];      // building ids placed in city
  unlockedZones: ZoneId[];  // zones unlocked by play
  companions: string[];     // creations that came alive (robot/dragon names)
  coins: number;
  films: { title: string; scenes: string[] }[];
  garden: { plants: number; animals: string[] };
}

export interface Settings {
  voice: boolean;
  voiceRate: number;
  music: boolean;
  sfx: boolean;
  reduceMotion: boolean;
  aiAssist: boolean;
}

export interface SaveData {
  version: number;
  childName: string;
  createdAt: number;
  skills: Record<string, SkillState>;
  attempts: AttemptEvidence[];
  projects: ProjectSave[];
  museum: MuseumItem[];
  quests: QuestProgress[];
  world: WorldState;
  settings: Settings;
  passport: string[]; // destination ids visited
  spotlight: Record<string, number>; // theme affinity counters
  onboard: string[]; // guided first-steps completed (see src/world/guide.ts)
}

export interface ActivityContext {
  say(text: string, opts?: { en?: string; priority?: boolean }): void;
  hint(level: number, text: string): void;
  report(ev: Omit<AttemptEvidence, 'at'>): void;
  earnCoins(n: number, reason: string): void;
  spotlight(theme: string): void;
}

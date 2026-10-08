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

export type Difficulty = 0 | 1 | 2; // gentle → brave → hero (also recorded per attempt)

export interface AttemptEvidence {
  activityId: string;
  skillIds: SkillId[];
  success: boolean;
  durationMs: number;
  tries: number;
  hintsUsed: number;
  errorKind?: string;
  /** child tried a different approach than the previous attempt (self-correction signal) */
  strategyChanged?: boolean;
  /** difficulty level this attempt ran at — evidence for mastery/transfer, not a score */
  difficulty?: Difficulty;
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

/** Nova identity — chosen by the child, worn everywhere she appears. */
export type NovaTint = 'violet' | 'teal' | 'coral' | 'sunny';
export type NovaCharm = 'none' | 'leaf' | 'star' | 'shell';
export interface Avatar {
  tint: NovaTint;
  charm: NovaCharm;
  /** true once the child has actively chosen (vs default) */
  claimed: boolean;
}

/** Hatch memory — how the child kept the pod (ownership via history). */
export interface HatchSave {
  hatchedAt: number;
  tint: string;
  pattern: string;
  chirpBase: number;
  podCount: number;
  temperament: string;
  mark: string;
  memory: { warmth: number; gentleness: number; song: number; overEvents: number };
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
  avatar: Avatar; // my Nova — tint + charm, rendered in every scene
  hatch?: HatchSave; // creative-reset slice: pod → Nova memory (optional, no migration)
  /** in-progress pod snapshot (jury: kids get interrupted). Cleared on hatch. */
  hatchProgress?: {
    temperament: string; warmth: number; shelter: number; song: number;
    memory: { warmth: number; gentleness: number; song: number; overEvents: number };
    at: number;
  };
  /** grove expedition: the forest that forgot how to grow (optional, no migration) */
  grove?: { blooms: number; bestChain: number; completedAt: number; firefly: boolean };
  /** grove in-progress snapshot (cleared on chain completion) */
  groveProgress?: {
    seed: number; diff: 0 | 1 | 2;
    stages: number[]; growth: number[];
    damStones: Record<string, number>;
    at: number;
  };
  /** lamplight expedition: city of light (optional, no migration) */
  lamplight?: { lit: number; completedAt: number; towers: number };
  /** starmail expedition: message from the stars (optional, no migration) */
  starmail?: { rounds: number; completedAt: number; motif: number[]; starTint: string };
}

export interface ActivityContext {
  say(text: string, opts?: { en?: string; priority?: boolean }): void;
  hint(level: number, text: string): void;
  report(ev: Omit<AttemptEvidence, 'at'>): void;
  earnCoins(n: number, reason: string): void;
  spotlight(theme: string): void;
}

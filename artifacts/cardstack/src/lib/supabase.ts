import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ExamTarget = "JAMB" | "WAEC" | "NECO" | "JAMB+WAEC";
export type Subject =
  | "English"
  | "Maths"
  | "Biology"
  | "Chemistry"
  | "Physics"
  | "Government"
  | "Literature"
  | "Economics"
  | "Geography"
  | "CRS";

export type Difficulty = "easy" | "medium" | "hard";
export type QuizMode = "standard" | "mock";
export type ExamType = "JAMB" | "WAEC" | "NECO";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  exam_target: ExamTarget;
  subjects: Subject[];
  xp: number;
  streak: number;
  last_study_date: string | null;
  is_pro: boolean;
  created_at: string;
  daily_goal_minutes: number | null;
  readiness_score: number | null;
  referral_code: string | null;
}

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  subject: Subject;
  is_public: boolean;
  created_at: string;
  card_count?: number;
}

export interface Card {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  difficulty: Difficulty;
  next_review_date: string;
  interval: number;
  ease_factor: number;
  created_at: string;
}

export interface QuizSession {
  id: string;
  user_id: string;
  deck_id: string;
  score: number;
  total: number;
  mode: QuizMode;
  subject?: string;
  completed_at: string;
}

export interface PastQuestion {
  id: string;
  subject: Subject;
  year: number;
  exam_type: ExamType;
  question: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  code: string;
  completed: boolean;
  created_at: string;
}

// SM-2 Algorithm
export function computeSM2(
  card: Pick<Card, "interval" | "ease_factor">,
  rating: "again" | "hard" | "good" | "easy"
): { interval: number; ease_factor: number; next_review_date: string } {
  let { interval, ease_factor } = card;

  switch (rating) {
    case "again":
      interval = 1;
      ease_factor = Math.max(1.3, ease_factor - 0.2);
      break;
    case "hard":
      interval = Math.max(1, Math.round(interval * 1.2));
      ease_factor = Math.max(1.3, ease_factor - 0.15);
      break;
    case "good":
      interval = Math.max(1, Math.round(interval * ease_factor));
      break;
    case "easy":
      interval = Math.max(1, Math.round(interval * ease_factor * 1.3));
      ease_factor = ease_factor + 0.1;
      break;
  }

  const next = new Date();
  next.setDate(next.getDate() + interval);

  return {
    interval,
    ease_factor,
    next_review_date: next.toISOString().split("T")[0],
  };
}

// XP & Level helpers
export function getLevel(xp: number): {
  level: string;
  nextThreshold: number;
  progress: number;
} {
  if (xp < 500) return { level: "Student", nextThreshold: 500, progress: xp / 500 };
  if (xp < 1500) return { level: "Scholar", nextThreshold: 1500, progress: (xp - 500) / 1000 };
  if (xp < 4000) return { level: "Academic", nextThreshold: 4000, progress: (xp - 1500) / 2500 };
  return { level: "Legend", nextThreshold: 4000, progress: 1 };
}

// Compute exam readiness score
export function computeReadiness(avgMockScore: number, cardsMasteredPct: number): number {
  return Math.round(Math.min(100, avgMockScore * 0.6 + cardsMasteredPct * 0.4));
}

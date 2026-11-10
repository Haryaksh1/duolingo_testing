export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Quest = {
  id: string;
  title: string;
  progress: number;
  target: number;
};

export type Me = {
  id: number;
  display_name: string;
  avatar: string;
  course: { title: string; flag: string };
  xp: number;
  gems: number;
  hearts: number;
  max_hearts: number;
  next_heart_at: string | null;
  refill_cost: number;
  streak: number;
  streak_extended_today: boolean;
  longest_streak: number;
  daily_goal: number;
  daily_xp: number;
  today: string;
  quests: Quest[];
};

export type Skill = {
  id: number;
  title: string;
  icon: string;
  state: "completed" | "active" | "locked";
  lessons_done: number;
  lessons_total: number;
  next_lesson_id: number;
};

export type Unit = {
  id: number;
  position: number;
  title: string;
  description: string;
  color: "green" | "blue" | "purple";
  skills: Skill[];
};

type Base = { id: number; prompt: string };
export type Exercise =
  | (Base & { type: "select"; options: { text: string; image: string }[] })
  | (Base & {
      type: "fill";
      before: string;
      after: string;
      translation: string;
      options: string[];
    })
  | (Base & {
      type: "translate";
      source: string;
      source_lang: "es" | "en";
      tiles: string[];
    })
  | (Base & { type: "match"; pairs: [string, string][] })
  | (Base & { type: "type"; source: string })
  | (Base & { type: "listen"; text: string });

export type Answer = string | string[] | string[][];

export type Session = {
  id: number;
  kind: "lesson" | "practice" | "timed";
  lesson_id: number | null;
  title: string;
  hearts: number;
  time_limit: number | null;
  exercises: Exercise[];
};

export type AnswerResult = {
  correct: boolean;
  solution: string;
  hearts: number;
  out_of_hearts: boolean;
};

export type UnlockedAchievement = {
  code: string;
  title: string;
  icon: string;
  reward_gems: number;
};

export type CompleteResult = {
  xp: number;
  gems: number;
  mistakes: number;
  accuracy: number;
  first_completion: boolean;
  streak_extended: boolean;
  achievements: UnlockedAchievement[];
  me: Me;
};

export type Achievement = {
  code: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  threshold: number;
  unlocked_at: string | null;
  reward_gems: number;
};

export type Profile = {
  me: Me;
  created_at: string;
  stats: {
    xp: number;
    streak: number;
    lessons: number;
    perfect: number;
    to_review: number;
  };
  achievements: Achievement[];
  history: { day: string; xp: number }[];
};

export type Leaderboard = {
  league: string;
  week_start: string;
  days_left: number;
  rows: {
    rank: number;
    id: number;
    display_name: string;
    avatar: string;
    weekly_xp: number;
    is_me: boolean;
  }[];
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data.detail === "string" ? data.detail : res.statusText;
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export const api = {
  me: () => request<Me>("/api/me"),
  path: () => request<{ units: Unit[] }>("/api/path"),
  profile: () => request<Profile>("/api/profile"),
  leaderboard: () => request<Leaderboard>("/api/leaderboard"),
  updateMe: (body: { display_name?: string; daily_goal?: number }) =>
    request<Me>("/api/me", { method: "PATCH", body: JSON.stringify(body) }),
  refillHearts: () => post<Me>("/api/hearts/refill"),
  startSession: (body: { kind: Session["kind"]; lesson_id?: number }) =>
    post<Session>("/api/sessions", body),
  answer: (sessionId: number, exerciseId: number, answer: Answer) =>
    post<AnswerResult>(`/api/sessions/${sessionId}/answer`, {
      exercise_id: exerciseId,
      answer,
    }),
  complete: (sessionId: number) =>
    post<CompleteResult>(`/api/sessions/${sessionId}/complete`),
  advanceDay: () => post<Me>("/api/dev/advance-day"),
  reset: () => post<{ ok: boolean }>("/api/dev/reset"),
};

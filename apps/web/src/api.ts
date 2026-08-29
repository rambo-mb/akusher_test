import type {
  AnswerRequest,
  AnswerResponse,
  AuthResponse,
  FinishResponse,
  LeaderboardEntry,
  MeStats,
  StartQuizRequest,
  StartQuizResponse,
} from "@aku/shared";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

let token: string | null = localStorage.getItem("token");

async function req<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Xatolik");
  }
  return res.json() as Promise<T>;
}

export const api = {
  async auth(initData: string): Promise<AuthResponse> {
    const res = await req<AuthResponse>("/api/auth", "POST", { initData });
    token = res.token;
    localStorage.setItem("token", res.token);
    return res;
  },
  start(body: StartQuizRequest) {
    return req<StartQuizResponse>("/api/quiz/start", "POST", body);
  },
  answer(attemptId: number, body: AnswerRequest) {
    return req<AnswerResponse>(`/api/quiz/${attemptId}/answer`, "POST", body);
  },
  finish(attemptId: number) {
    return req<FinishResponse>(`/api/quiz/${attemptId}/finish`, "POST");
  },
  stats() {
    return req<MeStats>("/api/stats/me");
  },
  mistakesCount() {
    return req<{ count: number }>("/api/mistakes/count");
  },
  leaderboard() {
    return req<LeaderboardEntry[]>("/api/leaderboard");
  },
};

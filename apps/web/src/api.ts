import type {
  AdminQuestion,
  AdminQuestionsResponse,
  AdminStats,
  AdminUser,
  AdminUserDetail,
  AnswerRequest,
  AnswerResponse,
  AuthResponse,
  FinishResponse,
  LeaderboardEntry,
  MeStats,
  StartQuizRequest,
  StartQuizResponse,
  UserStatus,
  AttemptHistory,
  WeakQuestion,
} from "@aku/shared";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

let token: string | null = localStorage.getItem("token");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(err.error ?? "Xatolik", res.status);
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
  updateDailyGoal(goal: number) {
    return req<{ ok: boolean; dailyGoal: number }>("/api/me/daily-goal", "PUT", { goal });
  },
  referral() {
    return req<{ link: string; invited: number; bonusDays: number }>("/api/referral");
  },
  attempts() {
    return req<AttemptHistory[]>("/api/attempts");
  },
  attempt(id: number) {
    return req<FinishResponse>(`/api/attempts/${id}`);
  },
  statsWeak() {
    return req<WeakQuestion[]>("/api/stats/weak");
  },
  mistakesCount() {
    return req<{ count: number }>("/api/mistakes/count");
  },
  bookmarksCount() {
    return req<{ count: number }>("/api/bookmarks/count");
  },
  bookmarkToggle(questionId: number) {
    return req<{ bookmarked: boolean }>(`/api/bookmarks/${questionId}/toggle`, "POST");
  },
  adminQuestions(params: { filter?: string; search?: string; skip?: number; take?: number }) {
    const q = new URLSearchParams();
    if (params.filter) q.set("filter", params.filter);
    if (params.search) q.set("search", params.search);
    if (params.skip) q.set("skip", String(params.skip));
    if (params.take) q.set("take", String(params.take));
    return req<AdminQuestionsResponse>(`/api/admin/questions?${q.toString()}`);
  },
  adminUpdateQuestion(id: number, patch: Partial<AdminQuestion>) {
    return req<{ ok: boolean; needsReview: boolean }>(`/api/admin/questions/${id}`, "PUT", patch);
  },
  adminReimport() {
    return req<{ total: number; created: number; updated: number }>("/api/admin/reimport", "POST");
  },
  leaderboard() {
    return req<LeaderboardEntry[]>("/api/leaderboard");
  },
  requestAccess() {
    return req<{ status: UserStatus }>("/api/access/request", "POST");
  },
  adminUsers() {
    return req<{ users: AdminUser[]; stats: AdminStats }>("/api/admin/users");
  },
  adminUserDetail(id: number) {
    return req<AdminUserDetail>(`/api/admin/users/${id}`);
  },
  adminApprove(id: number, days: number) {
    return req<{ id: number; status: UserStatus; accessUntil: string | null }>(
      `/api/admin/users/${id}/approve`,
      "POST",
      { days },
    );
  },
  adminBlock(id: number) {
    return req<{ id: number; status: UserStatus }>(`/api/admin/users/${id}/block`, "POST");
  },
  adminBroadcast(text: string) {
    return req<{ sent: number; total: number }>("/api/admin/broadcast", "POST", { text });
  },
};

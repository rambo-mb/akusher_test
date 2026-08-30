// Frontend va backend o'rtasida umumiy tiplar

export type QuizMode = "random" | "exam" | "study" | "mistakes" | "bookmarks";

export const QUIZ_MODES: { id: QuizMode; title: string; description: string }[] = [
  { id: "random", title: "Random test", description: "Tasodifiy N ta savol" },
  { id: "exam", title: "Imtihon", description: "Vaqt chegarasi bilan real imtihon" },
  { id: "study", title: "O'rganish", description: "Har javobdan keyin darhol natija" },
  { id: "mistakes", title: "Takrorlash", description: "Xato savollar (interval bilan)" },
  { id: "bookmarks", title: "Belgilangan", description: "🔖 saqlagan savollaringiz" },
];

// Boshlash so'rovi
export interface StartQuizRequest {
  mode: QuizMode;
  count: number;
}

// Savol (frontendga to'g'ri javobsiz yuboriladi)
export interface QuizQuestion {
  id: number;
  number: number;
  topic: string;
  stem: string;
  options: string[];
  bookmarked: boolean;
}

export interface StartQuizResponse {
  attemptId: number;
  mode: QuizMode;
  timeLimitSec: number | null; // faqat exam rejimida
  questions: QuizQuestion[];
}

// Javob yuborish
export interface AnswerRequest {
  questionId: number;
  selectedIndex: number;
}

export interface AnswerResponse {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string | null;
}

export interface ReviewItem {
  questionId: number;
  number: number;
  stem: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number; // -1 = javob berilmagan
  isCorrect: boolean;
  explanation: string | null;
}

export interface FinishResponse {
  attemptId: number;
  total: number;
  correctCount: number;
  score: number; // foizda 0..100
  items: ReviewItem[]; // barcha savollar bo'yicha to'liq ko'rib chiqish
}

// DB status: pending|approved|blocked. "expired" — hisoblangan holat (approved + muddat o'tgan).
export type UserStatus = "pending" | "approved" | "blocked" | "expired";

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    firstName: string;
    username: string | null;
    status: UserStatus;
    isAdmin: boolean;
    telegramId: string;
    accessUntil: string | null; // ISO sana yoki null (cheksiz)
    trialUsed: boolean; // bepul sinov ishlatilganmi
  };
  config?: {
    adminUsername?: string;
    priceInfo?: string;
  };
}

export interface AdminUser {
  id: number;
  telegramId: string;
  firstName: string;
  username: string | null;
  status: UserStatus;
  accessUntil: string | null;
  createdAt: string;
  answered: number;
}

export interface AdminStats {
  total: number;
  pending: number;
  approved: number;
  blocked: number;
}

export interface AdminUserDetail extends AdminUser {
  attempts: number;
  correct: number;
  accuracy: number;
  lastActive: string | null;
}

// Admin savol muharriri
export interface AdminQuestion {
  id: number;
  number: number;
  topic: string;
  stem: string;
  options: string[];
  correctIndex: number;
  needsReview: boolean;
  explanation: string | null;
  category: string | null;
}

export interface AdminQuestionsResponse {
  questions: AdminQuestion[];
  total: number;
  needsReview: number;
}

// Obuna muddati variantlari (kun); 0 = cheksiz
export const ACCESS_DURATIONS: { label: string; days: number }[] = [
  { label: "30 kun", days: 30 },
  { label: "90 kun", days: 90 },
  { label: "1 yil", days: 365 },
  { label: "Cheksiz", days: 0 },
];

export interface MeStats {
  totalAttempts: number;
  totalAnswered: number;
  totalCorrect: number;
  accuracy: number; // 0..100
  mistakesCount: number;
  bestScore: number;
  streak: number;
  dailyGoal: number;
  answeredToday: number;
  masteredCount: number;
}

export interface AttemptHistory {
  id: number;
  mode: QuizMode;
  count: number;
  correctCount: number;
  score: number;
  finishedAt: string;
}

export interface WeakQuestion {
  questionId: number;
  stem: string;
  wrongCount: number;
  box: number;
}

export interface LeaderboardEntry {
  rank: number;
  firstName: string;
  username: string | null;
  totalCorrect: number;
  accuracy: number;
  isMe: boolean;
}

// Imtihon rejimida bir savolga ajratiladigan vaqt (soniya)
export const EXAM_SECONDS_PER_QUESTION = 50;
// Tanlash mumkin bo'lgan savol sonlari
export const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50];

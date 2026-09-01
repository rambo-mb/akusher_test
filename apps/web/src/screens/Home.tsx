import { useEffect, useState } from "react";
import type { MeStats, QuizMode, StartQuizResponse } from "@aku/shared";
import { QUESTION_COUNT_OPTIONS, QUIZ_MODES } from "@aku/shared";
import { api, ApiError } from "../api.js";
import { tap } from "../telegram.js";
import { useLang } from "../i18n.js";

export function Home(props: {
  isAdmin: boolean;
  onStart: (data: StartQuizResponse) => void;
  onLockedOut: () => void;
  onStats: () => void;
  onLeaderboard: () => void;
  onAdmin: () => void;
  onAdminQuestions: () => void;
  onHistory: () => void;
  onAchievements: () => void;
  onReferral: () => void;
  onCertificate: () => void;
  onGuide: () => void;
}) {
  const { t, lang, setLang } = useLang();
  const [mode, setMode] = useState<QuizMode>("random");
  const [count, setCount] = useState(20);
  const [mistakes, setMistakes] = useState(0);
  const [bookmarks, setBookmarks] = useState(0);
  const [stats, setStats] = useState<MeStats | null>(null);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.mistakesCount().then((r) => setMistakes(r.count)).catch(() => {});
    api.bookmarksCount().then((r) => setBookmarks(r.count)).catch(() => {});
    api.stats().then(setStats).catch(() => {});
    api.categories().then(setCategories).catch(() => {});
  }, []);

  const badgeCount = (id: QuizMode) =>
    id === "mistakes" ? mistakes : id === "bookmarks" ? bookmarks : -1;

  async function start() {
    setLoading(true);
    setErr(null);
    try {
      const data = await api.startQuiz(mode, count, category, lang);
      props.onStart(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        props.onLockedOut();
        return;
      }
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function changeGoal() {
    if (!stats) return;
    tap();
    const goals = [10, 20, 30, 50];
    const nextIdx = (goals.indexOf(stats.dailyGoal) + 1) % goals.length;
    const nextGoal = goals[nextIdx] || 20;
    setStats({ ...stats, dailyGoal: nextGoal });
    api.updateDailyGoal(nextGoal).catch(() => {});
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, marginTop: 8 }}>
        <img src="/logo.svg" alt="Logo" style={{ width: 40, height: 40 }} />
        <h1 style={{ margin: 0, textAlign: "left", flex: 1 }}>{t("home.title")}</h1>
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--tg-secondary-bg)" }}>
          {(["uz", "ru"] as const).map((l) => (
            <button
              key={l}
              onClick={() => { tap(); setLang(l); }}
              style={{
                padding: "4px 10px",
                border: "none",
                background: lang === l ? "var(--tg-button)" : "transparent",
                color: lang === l ? "var(--tg-button-text)" : "var(--tg-hint)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: lang === l ? "bold" : "normal",
                transition: "all 0.2s",
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <p className="subtitle" style={{ textAlign: "left", marginBottom: 24 }}>{t("home.subtitle")}</p>

      {stats && (
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "var(--tg-secondary-bg)", padding: "4px 8px", borderRadius: 12, fontWeight: "bold", fontSize: 14 }}>
              🔥 {t("home.days", { n: stats.streak })}
            </div>
            <div style={{ fontSize: 12, color: "var(--tg-hint)" }}>{t("home.continuous")}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }} onClick={changeGoal}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: "bold" }}>{t("home.goal")}</div>
              <div style={{ fontSize: 12, color: "var(--tg-hint)" }}>{stats.answeredToday} / {stats.dailyGoal}</div>
            </div>
            <svg width="40" height="40" style={{ cursor: "pointer" }}>
              <circle cx="20" cy="20" r="16" fill="none" stroke="var(--tg-secondary-bg)" strokeWidth="4" />
              <circle
                cx="20" cy="20" r="16" fill="none" stroke="var(--tg-button)" strokeWidth="4"
                strokeDasharray={2 * Math.PI * 16}
                strokeDashoffset={2 * Math.PI * 16 * (1 - Math.min(1, stats.answeredToday / stats.dailyGoal))}
                transform="rotate(-90 20 20)"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
          </div>
        </div>
      )}

      {stats && stats.totalAnswered > 0 && (
        <div className="statstrip">
          <div>
            <div className="sv">{stats.accuracy}%</div>
            <div className="sl">{t("home.accuracy")}</div>
          </div>
          <div>
            <div className="sv">{stats.bestScore}%</div>
            <div className="sl">{t("home.best")}</div>
          </div>
          <div>
            <div className="sv">{stats.totalAnswered}</div>
            <div className="sl">{t("home.answered")}</div>
          </div>
        </div>
      )}

      <div className="mode-grid">
        {QUIZ_MODES.map((m) => {
          const bc = badgeCount(m.id);
          const disabled = bc === 0;
          return (
            <button
              key={m.id}
              className={`mode ${mode === m.id ? "active" : ""} ${disabled ? "disabled" : ""}`}
              disabled={disabled}
              onClick={() => { tap(); setMode(m.id); }}
            >
              <div className="mtitle">{t(`mode.${m.id}.title`)}</div>
              <div className="mdesc">{t(`mode.${m.id}.desc`)}</div>
              {bc > 0 && <span className="badge">{t("badge.count", { n: bc })}</span>}
            </button>
          );
        })}
      </div>

      {categories.length > 0 && mode === "random" && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("home.categories")}</div>
          <div className="count-row" style={{ flexWrap: "wrap", justifyContent: "flex-start" }}>
            <button
              className={`chip ${!category ? "active" : ""}`}
              onClick={() => { tap(); setCategory(undefined); }}
              style={{ fontSize: 13, padding: "6px 12px" }}
            >
              {t("home.all")}
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                className={`chip ${category === c.name ? "active" : ""}`}
                onClick={() => { tap(); setCategory(c.name); }}
                style={{ fontSize: 13, padding: "6px 12px" }}
              >
                {c.name} ({c.count})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("home.count")}</div>
        <div className="count-row">
          {QUESTION_COUNT_OPTIONS.map((c) => (
            <button
              key={c}
              className={`chip ${count === c ? "active" : ""}`}
              onClick={() => { tap(); setCount(c); }}
            >
              {c}
            </button>
          ))}
        </div>
        <button className="primary" onClick={start} disabled={loading}>
          {loading ? t("home.starting") : t("home.start")}
        </button>
        {err && <p className="review-note" style={{ color: "var(--red)" }}>{err}</p>}
      </div>

      <button className="ghost" onClick={props.onStats}>{t("nav.stats")}</button>
      <button className="ghost" onClick={props.onHistory}>{t("nav.history")}</button>
      <button className="ghost" onClick={props.onAchievements}>{t("nav.achievements")}</button>
      <button className="ghost" onClick={props.onCertificate}>{t("nav.certificate")}</button>
      <button className="ghost" onClick={props.onReferral}>{t("nav.referral")}</button>
      <button className="ghost" onClick={props.onLeaderboard}>{t("nav.leaderboard")}</button>
      <button className="ghost" onClick={props.onGuide}>{t("nav.guide")}</button>

      {props.isAdmin && (
        <>
          <button className="ghost admin-btn" onClick={props.onAdmin}>{t("nav.users")}</button>
          <button className="ghost admin-btn" onClick={props.onAdminQuestions}>{t("nav.editor")}</button>
        </>
      )}
    </>
  );
}

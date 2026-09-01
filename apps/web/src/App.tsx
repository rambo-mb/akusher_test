import { useEffect, useState, useCallback, useMemo } from "react";
import type { AuthResponse, FinishResponse, MeStats, StartQuizResponse } from "@aku/shared";
import { api } from "./api.js";
import { getInitData, getTgLangCode } from "./telegram.js";
import { Home } from "./screens/Home.js";
import { Quiz } from "./screens/Quiz.js";
import { Result } from "./screens/Result.js";
import { Stats } from "./screens/Stats.js";
import { Leaderboard } from "./screens/Leaderboard.js";
import { Gate } from "./screens/Gate.js";
import { Admin } from "./screens/Admin.js";
import { AdminQuestions } from "./screens/AdminQuestions.js";
import { Splash } from "./components/Splash.js";
import { Achievements } from "./screens/Achievements.js";
import { History } from "./screens/History.js";
import { Onboarding } from "./screens/Onboarding.js";
import { Referral } from "./screens/Referral.js";
import { Certificate } from "./screens/Certificate.js";
import { LangContext, normalizeLangCode, translate } from "./i18n.js";
import type { Lang } from "./i18n.js";

type AuthUser = AuthResponse["user"];

type View =
  | { name: "home" }
  | { name: "quiz"; data: StartQuizResponse }
  | { name: "result"; data: FinishResponse }
  | { name: "stats" }
  | { name: "leaderboard" }
  | { name: "admin" }
  | { name: "adminQuestions" }
  | { name: "certificate" }
  | { name: "achievements" }
  | { name: "history" }
  | { name: "referral" }
  | { name: "guide" };

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [config, setConfig] = useState<AuthResponse["config"] | null>(null);
  const [view, setView] = useState<View>({ name: "home" });
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem("aku_onboarded"));
  const [stats, setStats] = useState<MeStats | null>(null);
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("aku_lang") as Lang | null;
    if (stored === "uz" || stored === "ru") return stored;
    return normalizeLangCode(getTgLangCode());
  });

  const allowed =
    !!user &&
    (user.isAdmin || user.status === "approved" || (user.status === "pending" && !user.trialUsed));

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("aku_lang", l);
    api.updateLanguage(l).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );

  const ctx = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  useEffect(() => {
    if (allowed) {
      api.stats().then(setStats).catch(() => {});
    }
  }, [allowed]);

  useEffect(() => {
    const initData = getInitData();
    if (!initData) {
      setError("app.openInTg");
      return;
    }
    api
      .auth(initData)
      .then((res) => {
        setUser(res.user);
        setConfig(res.config);
        const userLang = res.user.language as Lang;
        if (userLang === "uz" || userLang === "ru") setLangState(userLang);
        setReady(true);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error)
    return (
      <LangContext.Provider value={ctx}>
        <div className="app">
          <div className="center">{t(error)}</div>
        </div>
      </LangContext.Provider>
    );

  if (!ready)
    return (
      <LangContext.Provider value={ctx}>
        <Splash />
      </LangContext.Provider>
    );

  if (showOnboarding) {
    return (
      <LangContext.Provider value={ctx}>
        <div className="app">
          <Onboarding
            onComplete={() => {
              localStorage.setItem("aku_onboarded", "true");
              setShowOnboarding(false);
            }}
          />
        </div>
      </LangContext.Provider>
    );
  }

  const lockAfterTrial = () => {
    if (user && !user.isAdmin && user.status !== "approved") {
      setUser({ ...user, trialUsed: true });
    }
  };

  return (
    <LangContext.Provider value={ctx}>
      <div className="app">
        {!allowed && user && (
          <Gate
            user={user}
            config={config ?? undefined}
            onApproved={() => setUser({ ...user!, status: "approved" })}
          />
        )}

        {allowed && view.name === "home" && (
          <Home
            isAdmin={user!.isAdmin}
            onStart={(data) => setView({ name: "quiz", data })}
            onLockedOut={lockAfterTrial}
            onStats={() => setView({ name: "stats" })}
            onLeaderboard={() => setView({ name: "leaderboard" })}
            onAdmin={() => setView({ name: "admin" })}
            onAdminQuestions={() => setView({ name: "adminQuestions" })}
            onAchievements={() => setView({ name: "achievements" })}
            onHistory={() => setView({ name: "history" })}
            onReferral={() => setView({ name: "referral" })}
            onCertificate={() => setView({ name: "certificate" })}
            onGuide={() => setView({ name: "guide" })}
          />
        )}
        {allowed && view.name === "quiz" && (
          <Quiz
            data={view.data}
            onFinish={(res) => setView({ name: "result", data: res })}
            onExit={() => setView({ name: "home" })}
          />
        )}
        {allowed && view.name === "result" && (
          <Result
            data={view.data}
            botUsername={config?.botUsername}
            onHome={() => {
              lockAfterTrial();
              setView({ name: "home" });
            }}
          />
        )}
        {allowed && view.name === "stats" && <Stats onBack={() => setView({ name: "home" })} />}
        {allowed && view.name === "leaderboard" && (
          <Leaderboard onBack={() => setView({ name: "home" })} />
        )}
        {allowed && view.name === "admin" && <Admin onBack={() => setView({ name: "home" })} />}
        {allowed && view.name === "adminQuestions" && (
          <AdminQuestions onBack={() => setView({ name: "home" })} />
        )}
        {allowed && view.name === "certificate" && (
          <Certificate stats={stats} user={user!} onBack={() => setView({ name: "home" })} />
        )}
        {allowed && view.name === "achievements" && (
          <Achievements onBack={() => setView({ name: "home" })} />
        )}
        {allowed && view.name === "history" && (
          <History
            onBack={() => setView({ name: "home" })}
            onOpenAttempt={(res) => setView({ name: "result", data: res })}
          />
        )}
        {allowed && view.name === "referral" && (
          <Referral onBack={() => setView({ name: "home" })} />
        )}
        {allowed && view.name === "guide" && (
          <Onboarding guide onComplete={() => setView({ name: "home" })} />
        )}
      </div>
    </LangContext.Provider>
  );
}

import { useEffect, useState } from "react";
import type { AuthResponse, FinishResponse, MeStats, StartQuizResponse } from "@aku/shared";
import { api } from "./api.js";
import { getInitData } from "./telegram.js";
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
  | { name: "referral" };

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [config, setConfig] = useState<AuthResponse["config"] | null>(null);
  const [view, setView] = useState<View>({ name: "home" });
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem("aku_onboarded"));

  const [stats, setStats] = useState<MeStats | null>(null);

  // Ruxsat: admin, tasdiqlangan, YOKI pending (bepul sinov hali ishlatilmagan)
  const allowed =
    !!user &&
    (user.isAdmin || user.status === "approved" || (user.status === "pending" && !user.trialUsed));

  useEffect(() => {
    if (allowed) {
      api.stats().then(setStats).catch(() => {});
    }
  }, [allowed]);

  useEffect(() => {
    const initData = getInitData();
    if (!initData) {
      setError("Ilovani Telegram ichida oching.");
      return;
    }
    api
      .auth(initData)
      .then((res) => {
        setUser(res.user);
        setConfig(res.config);
        setReady(true);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="app"><div className="center">{error}</div></div>;
  if (!ready) {
    return <Splash />;
  }

  if (showOnboarding) {
    return (
      <div className="app">
        <Onboarding onComplete={() => {
          localStorage.setItem("aku_onboarded", "true");
          setShowOnboarding(false);
        }} />
      </div>
    );
  }

  // Bepul sinovдан keyin (tasdiqlanmagan foydalanuvchi) — Gate'ga o'tkazamiz
  const lockAfterTrial = () => {
    if (user && !user.isAdmin && user.status !== "approved") {
      setUser({ ...user, trialUsed: true });
    }
  };

  return (
    <div className="app">
      {!allowed && user && (
        <Gate
          user={user}
          config={config ?? undefined}
          onApproved={() => setUser({ ...user, status: "approved" })}
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
            lockAfterTrial(); // sinov foydalanuvchisini natijadan keyin Gate'ga o'tkazadi
            setView({ name: "home" });
          }}
        />
      )}
      {allowed && view.name === "stats" && <Stats onBack={() => setView({ name: "home" })} />}
      {allowed && view.name === "leaderboard" && <Leaderboard onBack={() => setView({ name: "home" })} />}
      {allowed && view.name === "admin" && <Admin onBack={() => setView({ name: "home" })} />}
      {allowed && view.name === "adminQuestions" && (
        <AdminQuestions onBack={() => setView({ name: "home" })} />
      )}

      {allowed && view.name === "certificate" && (
        <Certificate 
          stats={stats} 
          user={user!} 
          onBack={() => setView({ name: "home" })} 
        />
      )}
      {allowed && view.name === "achievements" && (
        <Achievements onBack={() => setView({ name: "home" })} />
      )}
      {allowed && view.name === "history" && (
        <History onBack={() => setView({ name: "home" })} onOpenAttempt={(res) => setView({ name: "result", data: res })} />
      )}
      {allowed && view.name === "referral" && (
        <Referral onBack={() => setView({ name: "home" })} />
      )}
    </div>
  );
}

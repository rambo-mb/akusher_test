import { useEffect, useState } from "react";
import type { AuthResponse, FinishResponse, StartQuizResponse } from "@aku/shared";
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
import { Achievements } from "./screens/Achievements.js";
import { History } from "./screens/History.js";
import { Onboarding } from "./screens/Onboarding.js";
import { Skeleton } from "./components/Skeleton.js";

type AuthUser = AuthResponse["user"];

type View =
  | { name: "home" }
  | { name: "quiz"; data: StartQuizResponse }
  | { name: "result"; data: FinishResponse }
  | { name: "stats" }
  | { name: "leaderboard" }
  | { name: "admin" }
  | { name: "adminQuestions" }
  | { name: "achievements" }
  | { name: "history" };

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [config, setConfig] = useState<AuthResponse["config"] | null>(null);
  const [view, setView] = useState<View>({ name: "home" });
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem("aku_onboarded"));

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
    return <Skeleton />;
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

  const allowed = user?.status === "approved" || user?.isAdmin;

  return (
    <div className="app">
      {!allowed && user && (
        <Gate
          user={user}
          config={config}
          onApproved={() => setUser({ ...user, status: "approved" })}
        />
      )}

      {allowed && view.name === "home" && (
        <Home
          isAdmin={user.isAdmin}
          onStart={(data) => setView({ name: "quiz", data })}
          onStats={() => setView({ name: "stats" })}
          onLeaderboard={() => setView({ name: "leaderboard" })}
          onAdmin={() => setView({ name: "admin" })}
          onAdminQuestions={() => setView({ name: "adminQuestions" })}
          onAchievements={() => setView({ name: "achievements" })}
          onHistory={() => setView({ name: "history" })}
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
        <Result data={view.data} onHome={() => setView({ name: "home" })} />
      )}
      {allowed && view.name === "stats" && <Stats onBack={() => setView({ name: "home" })} />}
      {allowed && view.name === "leaderboard" && <Leaderboard onBack={() => setView({ name: "home" })} />}
      {allowed && view.name === "admin" && <Admin onBack={() => setView({ name: "home" })} />}
      {allowed && view.name === "adminQuestions" && (
        <AdminQuestions onBack={() => setView({ name: "home" })} />
      )}
      {allowed && view.name === "achievements" && (
        <Achievements onBack={() => setView({ name: "home" })} />
      )}
      {allowed && view.name === "history" && (
        <History onBack={() => setView({ name: "home" })} onOpenAttempt={(res) => setView({ name: "result", data: res })} />
      )}
    </div>
  );
}

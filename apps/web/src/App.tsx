import { useEffect, useState } from "react";
import type { FinishResponse, StartQuizResponse } from "@aku/shared";
import { api } from "./api.js";
import { getInitData } from "./telegram.js";
import { Home } from "./screens/Home.js";
import { Quiz } from "./screens/Quiz.js";
import { Result } from "./screens/Result.js";
import { Stats } from "./screens/Stats.js";
import { Leaderboard } from "./screens/Leaderboard.js";

type View =
  | { name: "home" }
  | { name: "quiz"; data: StartQuizResponse }
  | { name: "result"; data: FinishResponse }
  | { name: "stats" }
  | { name: "leaderboard" };

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ name: "home" });

  useEffect(() => {
    const initData = getInitData();
    if (!initData) {
      setError("Ilovani Telegram ichida oching.");
      return;
    }
    api
      .auth(initData)
      .then(() => setReady(true))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="app"><div className="center">{error}</div></div>;
  if (!ready) return <div className="app"><div className="center">Yuklanmoqda…</div></div>;

  return (
    <div className="app">
      {view.name === "home" && (
        <Home
          onStart={(data) => setView({ name: "quiz", data })}
          onStats={() => setView({ name: "stats" })}
          onLeaderboard={() => setView({ name: "leaderboard" })}
        />
      )}
      {view.name === "quiz" && (
        <Quiz
          data={view.data}
          onFinish={(res) => setView({ name: "result", data: res })}
          onExit={() => setView({ name: "home" })}
        />
      )}
      {view.name === "result" && (
        <Result data={view.data} onHome={() => setView({ name: "home" })} />
      )}
      {view.name === "stats" && <Stats onBack={() => setView({ name: "home" })} />}
      {view.name === "leaderboard" && <Leaderboard onBack={() => setView({ name: "home" })} />}
    </div>
  );
}

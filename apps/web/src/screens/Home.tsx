import { useEffect, useState } from "react";
import type { QuizMode, StartQuizResponse } from "@aku/shared";
import { QUESTION_COUNT_OPTIONS, QUIZ_MODES } from "@aku/shared";
import { api } from "../api.js";
import { tap } from "../telegram.js";

export function Home(props: {
  onStart: (data: StartQuizResponse) => void;
  onStats: () => void;
  onLeaderboard: () => void;
}) {
  const [mode, setMode] = useState<QuizMode>("random");
  const [count, setCount] = useState(20);
  const [mistakes, setMistakes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.mistakesCount().then((r) => setMistakes(r.count)).catch(() => {});
  }, []);

  async function start() {
    setLoading(true);
    setErr(null);
    try {
      const data = await api.start({ mode, count });
      props.onStart(data);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>Akusherlik va ginekologiya</h1>
      <p className="subtitle">Imtihonga tayyorlanish — test rejimini tanlang</p>

      <div className="mode-grid">
        {QUIZ_MODES.map((m) => (
          <button
            key={m.id}
            className={`mode ${mode === m.id ? "active" : ""}`}
            onClick={() => {
              tap();
              setMode(m.id);
            }}
          >
            <div className="mtitle">{m.title}</div>
            <div className="mdesc">{m.description}</div>
            {m.id === "mistakes" && mistakes > 0 && <span className="badge">{mistakes} ta</span>}
          </button>
        ))}
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Savollar soni</div>
        <div className="count-row">
          {QUESTION_COUNT_OPTIONS.map((c) => (
            <button
              key={c}
              className={`chip ${count === c ? "active" : ""}`}
              onClick={() => {
                tap();
                setCount(c);
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <button className="primary" onClick={start} disabled={loading}>
          {loading ? "Tayyorlanmoqda…" : "Boshlash"}
        </button>
        {err && <p className="review-note" style={{ color: "var(--red)" }}>{err}</p>}
      </div>

      <button className="ghost" onClick={props.onStats}>📊 Mening statistikam</button>
      <button className="ghost" onClick={props.onLeaderboard}>🏆 Reyting</button>
    </>
  );
}

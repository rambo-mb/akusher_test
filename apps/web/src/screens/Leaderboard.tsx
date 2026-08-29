import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@aku/shared";
import { api } from "../api.js";

export function Leaderboard(props: { onBack: () => void }) {
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.leaderboard().then(setRows).catch((e) => setErr(e.message));
  }, []);

  const medal = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : r);

  return (
    <>
      <h1>🏆 Reyting</h1>
      <p className="subtitle">To'g'ri javoblar soni bo'yicha</p>
      {err && <div className="center">{err}</div>}
      {!rows && !err && <div className="center">Yuklanmoqda…</div>}
      {rows && rows.length === 0 && <div className="center">Hali natijalar yo'q</div>}
      {rows && rows.length > 0 && (
        <div className="card">
          {rows.map((r) => (
            <div key={r.rank} className={`lb-row ${r.isMe ? "me" : ""}`}>
              <span className="lb-rank">{medal(r.rank)}</span>
              <span className="lb-name">
                {r.firstName}
                {r.username ? ` (@${r.username})` : ""}
                {r.isMe ? " — siz" : ""}
              </span>
              <span className="lb-val">
                {r.totalCorrect} · {r.accuracy}%
              </span>
            </div>
          ))}
        </div>
      )}
      <button className="ghost" onClick={props.onBack}>
        ← Orqaga
      </button>
    </>
  );
}

import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@aku/shared";
import { api } from "../api.js";
import { Skeleton } from "../components/Skeleton.js";
import { useTelegramBackButton, inTg } from "../telegram.js";

export function Leaderboard(props: { onBack: () => void }) {
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.leaderboard().then(setRows).catch((e) => setErr(e.message));
  }, []);

  useTelegramBackButton(props.onBack);

  const medal = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : r);

  return (
    <>
      <div className="header-row" style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        {!inTg && <button className="ghost" onClick={props.onBack} style={{ margin: 0, width: "auto", padding: "8px 12px" }}>← Orqaga</button>}
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ margin: 0 }}>🏆 Reyting</h1>
          <p className="subtitle" style={{ margin: 0 }}>To'g'ri javoblar soni bo'yicha</p>
        </div>
        {!inTg && <div style={{ width: 80 }} />}
      </div>
      {err && <div className="center">{err}</div>}
      {!rows && !err && <Skeleton />}
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
    </>
  );
}

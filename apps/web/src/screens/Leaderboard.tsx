import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "@aku/shared";
import { api } from "../api.js";
import { Skeleton } from "../components/Skeleton.js";
import { useTelegramBackButton, inTg } from "../telegram.js";
import { useLang } from "../i18n.js";

export function Leaderboard(props: { onBack: () => void }) {
  const { t } = useLang();
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
        {!inTg && (
          <button className="ghost" onClick={props.onBack} style={{ margin: 0, width: "auto", padding: "8px 12px" }}>
            {t("back")}
          </button>
        )}
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ margin: 0 }}>{t("lb.title")}</h1>
          <p className="subtitle" style={{ margin: 0 }}>{t("lb.sub")}</p>
        </div>
        {!inTg && <div style={{ width: 80 }} />}
      </div>
      {err && <div className="center">{err}</div>}
      {!rows && !err && <Skeleton />}
      {rows && rows.length === 0 && <div className="center">{t("lb.empty")}</div>}
      {rows && rows.length > 0 && (
        <div className="card">
          {rows.map((r) => (
            <div key={r.rank} className={`lb-row ${r.isMe ? "me" : ""}`}>
              <span className="lb-rank">{medal(r.rank)}</span>
              <span className="lb-name">
                {r.displayName || r.firstName}
                {r.isMe ? t("lb.you") : ""}
                {r.isMe && (
                  <button
                    onClick={() => {
                      const newName = prompt(t("lb.newNamePrompt"), r.displayName || r.firstName);
                      if (newName !== null && newName.trim().length > 0) {
                        api.updateDisplayName(newName).then(() => {
                          const updated = rows.map((row) =>
                            row.rank === r.rank ? { ...row, displayName: newName } : row,
                          );
                          setRows(updated);
                        });
                      }
                    }}
                    style={{
                      marginLeft: 8,
                      padding: "2px 6px",
                      fontSize: 10,
                      borderRadius: 4,
                      background: "var(--tg-secondary-bg)",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--tg-text)",
                    }}
                  >
                    ✏️
                  </button>
                )}
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

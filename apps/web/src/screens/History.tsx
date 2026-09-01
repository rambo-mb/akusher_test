import { useEffect, useState } from "react";
import type { AttemptHistory, FinishResponse } from "@aku/shared";
import { api } from "../api.js";
import { tap, alertMsg, useTelegramBackButton, inTg } from "../telegram.js";
import { Skeleton } from "../components/Skeleton.js";
import { useLang } from "../i18n.js";

export function History(props: { onBack: () => void; onOpenAttempt: (res: FinishResponse) => void }) {
  const { t } = useLang();
  const [attempts, setAttempts] = useState<AttemptHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .attempts()
      .then(setAttempts)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useTelegramBackButton(props.onBack);

  async function openAttempt(id: number) {
    try {
      tap();
      const res = await api.attempt(id);
      props.onOpenAttempt(res);
    } catch (e) {
      alertMsg(t("hist.error") + (e as Error).message);
    }
  }

  if (loading) return <Skeleton />;
  if (error) return <div className="center">{error}</div>;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        {!inTg && (
          <button className="ghost" onClick={props.onBack} style={{ margin: 0, width: "auto", padding: "8px 12px" }}>
            {t("back")}
          </button>
        )}
        <h2 style={{ flex: 1, textAlign: "center", margin: 0 }}>{t("hist.title")}</h2>
        {!inTg && <div style={{ width: 80 }} />}
      </div>
      <div className="card">
        {attempts.length === 0 ? (
          <div className="review-note" style={{ textAlign: "center", padding: "20px 0" }}>
            {t("hist.empty")}
          </div>
        ) : (
          attempts.map((a, i) => (
            <div
              key={a.id}
              onClick={() => openAttempt(a.id)}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 0",
                borderBottom:
                  i < attempts.length - 1
                    ? "1px solid color-mix(in srgb, var(--tg-hint) 20%, transparent)"
                    : "none",
                cursor: "pointer",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{a.mode.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: "var(--tg-hint)" }}>
                  {new Date(a.finishedAt).toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: 16,
                    color:
                      a.score >= 80 ? "var(--green)" : a.score >= 60 ? "orange" : "var(--red)",
                  }}
                >
                  {a.score}%
                </div>
                <div style={{ fontSize: 12, color: "var(--tg-hint)" }}>
                  {a.correctCount} / {a.count}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

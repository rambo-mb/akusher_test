import { useState } from "react";
import type { AuthResponse, UserStatus } from "@aku/shared";
import { api } from "../api.js";
import { getInitData, openTelegramLink } from "../telegram.js";
import { useLang } from "../i18n.js";

export function Gate(props: {
  user: AuthResponse["user"];
  config?: AuthResponse["config"];
  onApproved: () => void;
}) {
  const { t, lang, setLang } = useLang();
  const [status, setStatus] = useState<UserStatus>(props.user.status);
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function request() {
    setBusy(true);
    setErr(null);
    try {
      const r = await api.requestAccess();
      if (r.status === "approved") return props.onApproved();
      setStatus(r.status);
      if (r.status === "pending") setRequested(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function recheck() {
    setBusy(true);
    setErr(null);
    try {
      const res = await api.auth(getInitData());
      if (res.user.isAdmin || res.user.status === "approved") return props.onApproved();
      setStatus(res.user.status);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const LangToggle = () => (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginBottom: 8 }}>
      {(["uz", "ru"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding: "3px 8px",
            border: "none",
            borderRadius: 6,
            background: lang === l ? "var(--tg-button)" : "var(--tg-secondary-bg)",
            color: lang === l ? "var(--tg-button-text)" : "var(--tg-hint)",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: lang === l ? "bold" : "normal",
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  if (status === "blocked") {
    return (
      <div className="gate">
        <LangToggle />
        <div className="gate-emoji">⛔</div>
        <h1>{t("gate.blockedTitle")}</h1>
        <p className="subtitle">{t("gate.blockedSub")}</p>
        <p className="gate-id">{t("gate.idLabel")}: {props.user.telegramId}</p>
      </div>
    );
  }

  const expired = status === "expired";
  const trialEnded = status === "pending" && props.user.trialUsed;

  const emoji = expired ? "⏰" : trialEnded ? "🎁" : "🔒";
  const title = expired
    ? t("gate.expiredTitle")
    : trialEnded
      ? t("gate.trialTitle")
      : t("gate.needTitle");
  const sub = expired
    ? t("gate.expiredSub")
    : trialEnded
      ? t("gate.trialSub")
      : t("gate.needSub");

  return (
    <div className="gate">
      <LangToggle />
      <div className="gate-emoji">{emoji}</div>
      <h1>{title}</h1>
      <p className="subtitle">{sub}</p>

      {props.config?.cardNumber && (
        <div className="card" style={{ marginBottom: 16, textAlign: "left" }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16 }}>{t("gate.payTitle")}</div>
          <div style={{ marginBottom: 4 }}>
            💳 <b>{t("gate.card")}:</b>{" "}
            <code style={{ userSelect: "all", background: "var(--tg-secondary-bg)", padding: "2px 6px", borderRadius: 4 }}>
              {props.config.cardNumber}
            </code>
          </div>
          {props.config.priceInfo && (
            <div style={{ marginBottom: 8 }}>💰 <b>{t("gate.amount")}:</b> {props.config.priceInfo}</div>
          )}
          <div className="review-note" style={{ marginTop: 8, color: "var(--tg-hint)" }}>
            {t("gate.payNote")}
          </div>
        </div>
      )}

      {!requested ? (
        <button className="primary" onClick={request} disabled={busy}>
          {busy ? t("gate.sending") : expired ? t("gate.reqRenew") : t("gate.reqAccess")}
        </button>
      ) : (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>⏳</div>
          <div style={{ fontWeight: 600 }}>{t("gate.sentTitle")}</div>
          <div className="review-note">{t("gate.sentSub")}</div>
          <button className="ghost" onClick={recheck} disabled={busy} style={{ marginTop: 10 }}>
            {busy ? t("gate.checking") : t("gate.checkStatus")}
          </button>
        </div>
      )}

      {props.config?.adminUsername && (
        <button
          className="primary"
          onClick={() => openTelegramLink(`https://t.me/${props.config!.adminUsername}`)}
          style={{ marginTop: 8, background: "var(--green)" }}
        >
          {t("gate.contactAdmin")}
        </button>
      )}

      <p className="gate-id">{t("gate.yourId")}: {props.user.telegramId}</p>
      {err && <p className="review-note" style={{ color: "var(--red)" }}>{err}</p>}
    </div>
  );
}

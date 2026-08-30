import { useState } from "react";
import type { AuthResponse, UserStatus } from "@aku/shared";
import { api } from "../api.js";
import { getInitData, openTelegramLink } from "../telegram.js";

export function Gate(props: { user: AuthResponse["user"]; config?: AuthResponse["config"]; onApproved: () => void }) {
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

  if (status === "blocked") {
    return (
      <div className="gate">
        <div className="gate-emoji">⛔</div>
        <h1>Ruxsat yo'q</h1>
        <p className="subtitle">Kechirasiz, sizga ushbu botdan foydalanish ruxsati berilmagan.</p>
        <p className="gate-id">ID: {props.user.telegramId}</p>
      </div>
    );
  }

  const expired = status === "expired";
  const trialEnded = status === "pending" && props.user.trialUsed;

  const emoji = expired ? "⏰" : trialEnded ? "🎁" : "🔒";
  const title = expired ? "Obunangiz tugadi" : trialEnded ? "Bepul sinov tugadi" : "Ruxsat kerak";
  const sub = expired
    ? "Davom etish uchun obunani yangilang — admin tasdiqlaydi."
    : trialEnded
      ? "Bepul testдан foydalandingiz. Davom etish uchun to'lov qiling — admin bilan bog'laning."
      : "Bu bot yopiq. Foydalanish uchun admindan ruxsat oling.";

  return (
    <div className="gate">
      <div className="gate-emoji">{emoji}</div>
      <h1>{title}</h1>
      <p className="subtitle">{sub}</p>

      {props.config?.priceInfo && (
        <div className="card" style={{ marginBottom: 16, whiteSpace: "pre-wrap", textAlign: "center" }}>
          {props.config.priceInfo}
        </div>
      )}

      {!requested ? (
        <button className="primary" onClick={request} disabled={busy}>
          {busy ? "Yuborilmoqda…" : expired ? "♻️ Yangilash so'rash" : "📩 Ruxsat so'rash"}
        </button>
      ) : (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>⏳</div>
          <div style={{ fontWeight: 600 }}>So'rovingiz yuborildi</div>
          <div className="review-note">Admin tasdiqlagach davom etasiz.</div>
          <button className="ghost" onClick={recheck} disabled={busy} style={{ marginTop: 10 }}>
            {busy ? "Tekshirilmoqda…" : "🔄 Holatni tekshirish"}
          </button>
        </div>
      )}

      {props.config?.adminUsername && (
        <button
          className="primary"
          onClick={() => openTelegramLink(`https://t.me/${props.config!.adminUsername}`)}
          style={{ marginTop: 8, background: "var(--green)" }}
        >
          💬 Admin bilan bog'lanish (to'lov)
        </button>
      )}

      <p className="gate-id">Sizning ID: {props.user.telegramId}</p>
      {err && <p className="review-note" style={{ color: "var(--red)" }}>{err}</p>}
    </div>
  );
}

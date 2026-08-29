import { useEffect, useState } from "react";
import type { AdminStats, AdminUser, AdminUserDetail, UserStatus } from "@aku/shared";
import { ACCESS_DURATIONS } from "@aku/shared";
import { Skeleton } from "../components/Skeleton.js";
import { api } from "../api.js";
import { tap, inTg, useTelegramBackButton } from "../telegram.js";

const STATUS_LABEL: Record<UserStatus, string> = {
  pending: "Kutilmoqda",
  approved: "Ruxsatli",
  blocked: "Bloklangan",
  expired: "Muddat tugagan",
};

function daysLeft(iso: string | null): number {
  if (!iso) return 0;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export function Admin(props: { onBack: () => void }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [busyId, setBusyId] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | UserStatus>("all");
  const [selectedId, setSelectedId] = useState(0);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [bcOpen, setBcOpen] = useState(false);
  const [bcText, setBcText] = useState("");
  const [bcMsg, setBcMsg] = useState<string | null>(null);

  useTelegramBackButton(props.onBack);

  async function load() {
    try {
      const d = await api.adminUsers();
      setUsers(d.users);
      setStats(d.stats);
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function selectUser(id: number) {
    tap();
    if (selectedId === id) {
      setSelectedId(0);
      setDetail(null);
      return;
    }
    setSelectedId(id);
    setDetail(null);
    try {
      setDetail(await api.adminUserDetail(id));
    } catch {
      /* ignore */
    }
  }

  async function refreshDetail(id: number) {
    if (selectedId === id) {
      try {
        setDetail(await api.adminUserDetail(id));
      } catch {
        /* ignore */
      }
    }
  }

  async function approve(id: number, days: number) {
    tap();
    setBusyId(id);
    setErr(null);
    try {
      await api.adminApprove(id, days);
      await load();
      await refreshDetail(id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(0);
    }
  }

  async function block(id: number) {
    tap();
    setBusyId(id);
    setErr(null);
    try {
      await api.adminBlock(id);
      await load();
      await refreshDetail(id);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(0);
    }
  }

  async function sendBroadcast() {
    const t = bcText.trim();
    if (!t) return;
    setBusyId(-1);
    setBcMsg(null);
    try {
      const r = await api.adminBroadcast(t);
      setBcMsg(`✅ ${r.sent}/${r.total} ga yuborildi`);
      setBcText("");
    } catch (e) {
      setBcMsg((e as Error).message);
    } finally {
      setBusyId(0);
    }
  }

  const shown = (users ?? []).filter((u) => filter === "all" || u.status === filter);

  return (
    <>
      <div className="header-row" style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        {!inTg && <button className="ghost" onClick={props.onBack} style={{ margin: 0, width: "auto", padding: "8px 12px" }}>← Orqaga</button>}
        <h1 style={{ flex: 1, textAlign: "center", margin: 0, fontSize: 20 }}>Foydalanuvchilar</h1>
        {!inTg && <div style={{ width: 80 }} />}
      </div>

      {stats && (
        <div className="statstrip">
          <div>
            <div className="sv" style={{ color: "#e08e0b" }}>{stats.pending}</div>
            <div className="sl">Kutilyapti</div>
          </div>
          <div>
            <div className="sv" style={{ color: "var(--green)" }}>{stats.approved}</div>
            <div className="sl">Ruxsatli</div>
          </div>
          <div>
            <div className="sv">{stats.total}</div>
            <div className="sl">Jami</div>
          </div>
        </div>
      )}

      <button className="ghost" onClick={() => setBcOpen((o) => !o)}>📢 Xabar yuborish</button>
      {bcOpen && (
        <div className="card">
          <textarea
            className="ta"
            rows={3}
            value={bcText}
            onChange={(e) => setBcText(e.target.value)}
            placeholder="Barcha faol foydalanuvchilarga xabar…"
          />
          <button
            className="primary"
            disabled={busyId === -1 || !bcText.trim()}
            onClick={sendBroadcast}
          >
            {busyId === -1 ? "Yuborilmoqda…" : "Yuborish"}
          </button>
          {bcMsg && <p className="review-note">{bcMsg}</p>}
        </div>
      )}

      <div className="tabs">
        {(["all", "pending", "approved", "blocked"] as const).map((f) => (
          <div key={f} className={`tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "Hammasi" : STATUS_LABEL[f]}
          </div>
        ))}
      </div>

      {err && <p className="review-note" style={{ color: "var(--red)" }}>{err}</p>}
      {!users && <Skeleton />}
      {users && shown.length === 0 && <div className="center">Bo'sh</div>}

      {shown.map((u) => {
        const open = selectedId === u.id;
        const sub =
          u.status === "approved"
            ? u.accessUntil
              ? `${daysLeft(u.accessUntil)} kun qoldi`
              : "♾ muddatsiz"
            : u.status === "expired"
              ? "muddat tugagan"
              : "";
        return (
          <div key={u.id}>
            <div className={`user-row ${open ? "open" : ""}`} onClick={() => selectUser(u.id)}>
              <div className="user-main">
                <div className="user-name">
                  {u.firstName}
                  {u.username && <span className="user-uname"> @{u.username}</span>}
                </div>
                <div className="user-meta">
                  <span className={`ubadge ${u.status}`}>{STATUS_LABEL[u.status]}</span>
                  <span className="user-sub">
                    · {u.answered} javob{sub ? ` · ${sub}` : ""}
                  </span>
                </div>
              </div>
              <span className="user-chev">{open ? "▲" : "▼"}</span>
            </div>

            {open && (
              <div className="user-panel">
                {detail ? (
                  <div className="user-detail">
                    <span>📝 {detail.attempts} test · 🎯 {detail.accuracy}% aniqlik</span>
                    <span>🆔 {u.telegramId}</span>
                  </div>
                ) : (
                  <Skeleton />
                )}
                <div className="dur-label">
                  {u.status === "approved" ? "Muddat qo'shish:" : "Ruxsat berish:"}
                </div>
                <div className="dur-row">
                  {ACCESS_DURATIONS.map((d) => (
                    <button
                      key={d.days}
                      className="dur-btn"
                      disabled={busyId === u.id}
                      onClick={() => approve(u.id, d.days)}
                    >
                      {u.status === "approved" && d.days > 0 ? `+${d.label}` : d.label}
                    </button>
                  ))}
                </div>
                {u.status !== "blocked" && (
                  <button
                    className="btn-block-full"
                    disabled={busyId === u.id}
                    onClick={() => block(u.id)}
                  >
                    ⛔ Bloklash
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {!inTg && (
        <button className="ghost" onClick={props.onBack} style={{ marginTop: 12 }}>
          ← Orqaga
        </button>
      )}
    </>
  );
}

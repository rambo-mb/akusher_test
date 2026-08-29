import { useEffect, useState } from "react";
import type { AdminStats, AdminUser, UserStatus } from "@aku/shared";
import { api } from "../api.js";
import { tap } from "../telegram.js";

const STATUS_LABEL: Record<UserStatus, string> = {
  pending: "Kutilmoqda",
  approved: "Ruxsatli",
  blocked: "Bloklangan",
};

export function Admin(props: { onBack: () => void }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [busyId, setBusyId] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | UserStatus>("all");

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

  async function act(id: number, action: "approve" | "block") {
    tap();
    setBusyId(id);
    setErr(null);
    try {
      if (action === "approve") await api.adminApprove(id);
      else await api.adminBlock(id);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(0);
    }
  }

  const shown = (users ?? []).filter((u) => filter === "all" || u.status === filter);

  return (
    <>
      <h1>👥 Foydalanuvchilar</h1>

      {stats && (
        <div className="statstrip">
          <div>
            <div className="sv">{stats.pending}</div>
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

      <div className="tabs">
        {(["all", "pending", "approved", "blocked"] as const).map((f) => (
          <div key={f} className={`tab ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "Hammasi" : STATUS_LABEL[f]}
          </div>
        ))}
      </div>

      {err && <p className="review-note" style={{ color: "var(--red)" }}>{err}</p>}
      {!users && <div className="center">Yuklanmoqda…</div>}
      {users && shown.length === 0 && <div className="center">Bo'sh</div>}

      {shown.map((u) => (
        <div key={u.id} className="user-row">
          <div className="user-main">
            <div className="user-name">
              {u.firstName}
              {u.username && <span className="user-uname"> @{u.username}</span>}
            </div>
            <div className="user-meta">
              <span className={`ubadge ${u.status}`}>{STATUS_LABEL[u.status]}</span>
              <span className="user-sub">· {u.answered} javob · ID {u.telegramId}</span>
            </div>
          </div>
          <div className="user-actions">
            {u.status !== "approved" && (
              <button className="btn-approve" disabled={busyId === u.id} onClick={() => act(u.id, "approve")}>
                ✓
              </button>
            )}
            {u.status !== "blocked" && (
              <button className="btn-block" disabled={busyId === u.id} onClick={() => act(u.id, "block")}>
                ⛔
              </button>
            )}
          </div>
        </div>
      ))}

      <button className="ghost" onClick={props.onBack} style={{ marginTop: 12 }}>
        ← Orqaga
      </button>
    </>
  );
}

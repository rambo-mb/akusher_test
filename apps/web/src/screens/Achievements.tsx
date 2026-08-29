import { useEffect, useState } from "react";
import type { MeStats } from "@aku/shared";
import { api } from "../api.js";
import { Skeleton } from "../components/Skeleton.js";
import { useTelegramBackButton, inTg } from "../telegram.js";

export function Achievements(props: { onBack: () => void }) {
  const [stats, setStats] = useState<MeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats().then(setStats).finally(() => setLoading(false));
  }, []);

  useTelegramBackButton(props.onBack);

  if (loading || !stats) {
    return <Skeleton />;
  }

  const achs = [
    { title: "Birinchi Qadam", desc: "Birinchi testni yakunlang", done: stats.totalAttempts > 0, icon: "👶" },
    { title: "Bilimdon 100", desc: "100 ta savolga javob bering", done: stats.totalAnswered >= 100, icon: "💯" },
    { title: "Mutaxassis 500", desc: "500 ta savolga javob bering", done: stats.totalAnswered >= 500, icon: "🎓" },
    { title: "Hafta Qahramoni", desc: "7 kunlik davomiylik (streak)", done: stats.streak >= 7, icon: "🔥" },
    { title: "Mergan", desc: "Kamida 90% aniqlik (50+ savolda)", done: stats.accuracy >= 90 && stats.totalAnswered >= 50, icon: "🎯" },
    { title: "O'zlashtirilgan 50", desc: "50 ta savolni to'liq o'zlashtirish", done: stats.masteredCount >= 50, icon: "🧠" },
    { title: "A'lochi", desc: "Testda 100% natija", done: stats.bestScore === 100, icon: "⭐" }
  ];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        {!inTg && <button className="ghost" onClick={props.onBack} style={{ margin: 0, width: "auto", padding: "8px 12px" }}>← Orqaga</button>}
        <h2 style={{ flex: 1, textAlign: "center", margin: 0 }}>🏅 Yutuqlar</h2>
        {!inTg && <div style={{ width: 80 }} />}
      </div>
      <div className="card">
        {achs.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: i < achs.length - 1 ? "1px solid color-mix(in srgb, var(--tg-hint) 20%, transparent)" : "none", opacity: a.done ? 1 : 0.5 }}>
            <div style={{ fontSize: 32, marginRight: 16 }}>{a.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{a.title}</div>
              <div style={{ fontSize: 14, color: "var(--tg-hint)" }}>{a.desc}</div>
            </div>
            <div style={{ fontSize: 20 }}>{a.done ? "✅" : "🔒"}</div>
          </div>
        ))}
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import type { MeStats, AttemptHistory, WeakQuestion } from "@aku/shared";
import { api } from "../api.js";
import { Skeleton } from "../components/Skeleton.js";
import { useTelegramBackButton, inTg } from "../telegram.js";

export function Stats(props: { onBack: () => void }) {
  const [s, setS] = useState<MeStats | null>(null);
  const [attempts, setAttempts] = useState<AttemptHistory[]>([]);
  const [weak, setWeak] = useState<WeakQuestion[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.stats(),
      api.attempts(),
      api.statsWeak()
    ])
      .then(([statsData, attemptsData, weakData]) => {
        setS(statsData);
        setAttempts(attemptsData.slice().reverse()); // older to newer for chart
        setWeak(weakData);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useTelegramBackButton(props.onBack);

  return (
    <>
      <div className="header-row" style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        {!inTg && <button className="ghost" onClick={props.onBack} style={{ margin: 0, width: "auto", padding: "8px 12px" }}>← Orqaga</button>}
        <h2 style={{ flex: 1, textAlign: "center", margin: 0 }}>📊 Statistika</h2>
        {!inTg && <div style={{ width: 80 }} />}
      </div>
      {err && <div className="center">{err}</div>}
      {loading && <Skeleton />}
      
      {!loading && attempts.length > 0 && (
        <div className="card" style={{ padding: "20px 10px" }}>
          <div style={{ fontWeight: 600, marginBottom: 16, textAlign: "center" }}>Natijalar (So'nggi testlar)</div>
          <Chart data={attempts.map(a => a.score)} />
        </div>
      )}

      {!loading && s && (
        <div className="card">
          <Row label="Tugatilgan testlar" value={s.totalAttempts} />
          <Row label="Javob berilgan savollar" value={s.totalAnswered} />
          <Row label="To'g'ri javoblar" value={s.totalCorrect} />
          <Row label="Aniqlik" value={`${s.accuracy}%`} />
          <Row label="Eng yaxshi natija" value={`${s.bestScore}%`} />
          <Row label="Xatolar (takrorlash uchun)" value={s.mistakesCount} />
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ color: "var(--tg-hint)" }}>Kunlik eslatmalar</span>
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={s.remindersOn} 
                onChange={(e) => {
                  const on = e.target.checked;
                  setS({ ...s, remindersOn: on });
                  api.updateReminders(on).catch(() => {});
                }} 
                style={{ marginRight: 8, transform: "scale(1.2)" }}
              />
              <span>{s.remindersOn ? "Yoqilgan" : "O'chirilgan"}</span>
            </label>
          </div>
        </div>
      )}

      {!loading && weak.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Eng ko'p xato qilingan savollar</div>
          {weak.map(w => (
            <div key={w.questionId} style={{ padding: "8px 0", borderBottom: "1px solid color-mix(in srgb, var(--tg-hint) 20%, transparent)" }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>{w.stem}</div>
              <div style={{ fontSize: 11, color: "var(--tg-hint)" }}>
                Xatolar soni: <span style={{ color: "var(--red)", fontWeight: "bold" }}>{w.wrongCount}</span> | O'zlashtirish: {w.box}/5
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Row(props: { label: string; value: string | number }) {
  return (
    <div className="stat-row">
      <span>{props.label}</span>
      <span className="v">{props.value}</span>
    </div>
  );
}

function Chart({ data }: { data: number[] }) {
  if (data.length < 2) return <div className="center" style={{ padding: 10 }}>Grafik uchun yetarli ma'lumot yo'q</div>;
  
  const width = 300;
  const height = 100;
  const padding = 10;
  const maxVal = 100;
  
  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - (val / maxVal) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="120" style={{ display: "block" }}>
      <polyline
        fill="none"
        stroke="var(--tg-button)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {data.map((val, i) => {
        const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - (val / maxVal) * (height - 2 * padding);
        return <circle key={i} cx={x} cy={y} r="4" fill="var(--tg-bg)" stroke="var(--tg-button)" strokeWidth="2" />;
      })}
    </svg>
  );
}

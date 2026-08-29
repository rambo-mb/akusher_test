import { useEffect, useState } from "react";
import type { MeStats } from "@aku/shared";
import { api } from "../api.js";

export function Stats(props: { onBack: () => void }) {
  const [s, setS] = useState<MeStats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.stats().then(setS).catch((e) => setErr(e.message));
  }, []);

  return (
    <>
      <h1>📊 Statistika</h1>
      {err && <div className="center">{err}</div>}
      {!s && !err && <div className="center">Yuklanmoqda…</div>}
      {s && (
        <div className="card">
          <Row label="Tugatilgan testlar" value={s.totalAttempts} />
          <Row label="Javob berilgan savollar" value={s.totalAnswered} />
          <Row label="To'g'ri javoblar" value={s.totalCorrect} />
          <Row label="Aniqlik" value={`${s.accuracy}%`} />
          <Row label="Eng yaxshi natija" value={`${s.bestScore}%`} />
          <Row label="Xatolar (takrorlash uchun)" value={s.mistakesCount} />
        </div>
      )}
      <button className="ghost" onClick={props.onBack}>
        ← Orqaga
      </button>
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

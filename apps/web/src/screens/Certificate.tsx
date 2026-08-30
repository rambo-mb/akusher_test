import { useTelegramBackButton, inTg } from "../telegram.js";
import type { MeStats, AuthResponse } from "@aku/shared";

export function Certificate(props: {
  stats: MeStats | null;
  user: AuthResponse["user"];
  onBack: () => void;
}) {
  useTelegramBackButton(props.onBack);
  const date = new Date().toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" });
  const correct = props.stats?.totalCorrect ?? 0;
  const accuracy = props.stats?.accuracy ?? 0;

  return (
    <>
      <div className="header-row" style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        {!inTg && (
          <button className="ghost" onClick={props.onBack} style={{ margin: 0, width: "auto", padding: "8px 12px" }}>
            ← Orqaga
          </button>
        )}
        <h2 style={{ flex: 1, textAlign: "center", margin: 0 }}>🏆 Sertifikat</h2>
        {!inTg && <div style={{ width: 80 }} />}
      </div>

      <div className="cert-wrap">
        <div className="cert">
          <div className="cert-ring" />
          <div className="cert-emblem">🏅</div>
          <div className="cert-kicker">SERTIFIKAT</div>
          <div className="cert-sub">Ushbu sertifikat</div>
          <div className="cert-name">{props.user.firstName}</div>
          <div className="cert-sub">ga taqdim etiladi</div>

          <div className="cert-stats">
            <div>
              <div className="cert-stat-v">{correct}</div>
              <div className="cert-stat-l">To'g'ri javob</div>
            </div>
            <div className="cert-divider" />
            <div>
              <div className="cert-stat-v">{accuracy}%</div>
              <div className="cert-stat-l">Aniqlik</div>
            </div>
          </div>

          <div className="cert-foot">
            <span>Akusherlik va Ginekologiya</span>
            <span>{date}</span>
          </div>
        </div>
      </div>

      <p style={{ textAlign: "center", color: "var(--tg-hint)", fontSize: 14, marginTop: 8 }}>
        📸 Saqlash uchun ekrandan surat (screenshot) oling.
      </p>
    </>
  );
}

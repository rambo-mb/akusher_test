import { useTelegramBackButton, inTg } from "../telegram.js";
import type { MeStats, AuthResponse } from "@aku/shared";

export function Certificate(props: {
  stats: MeStats | null;
  user: AuthResponse["user"];
  onBack: () => void;
}) {
  useTelegramBackButton(props.onBack);

  return (
    <>
      <div className="header-row" style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        {!inTg && (
          <button
            className="ghost"
            onClick={props.onBack}
            style={{ margin: 0, width: "auto", padding: "8px 12px" }}
          >
            ← Orqaga
          </button>
        )}
        <h2 style={{ flex: 1, textAlign: "center", margin: 0 }}>🏆 Sertifikat</h2>
        {!inTg && <div style={{ width: 80 }} />}
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "20px 10px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, var(--tg-button), var(--green))",
            color: "#fff",
            padding: 32,
            borderRadius: 16,
            textAlign: "center",
            width: "100%",
            maxWidth: 400,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}
        >
          <h1 style={{ margin: "0 0 16px 0", fontSize: 28 }}>Sertifikat</h1>
          <p style={{ fontSize: 16, opacity: 0.9, marginBottom: 8 }}>Ushbu sertifikat</p>
          <h2 style={{ margin: "0 0 16px 0", fontSize: 24, borderBottom: "2px solid rgba(255,255,255,0.5)", paddingBottom: 8 }}>
            {props.user.firstName}
          </h2>
          <p style={{ fontSize: 16, opacity: 0.9, marginBottom: 24 }}>ga taqdim etiladi</p>
          
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 12, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 14 }}>Jami to'g'ri javoblar:</p>
            <h3 style={{ margin: "4px 0 0 0", fontSize: 24 }}>{props.stats?.totalCorrect ?? 0}</h3>
          </div>
          
          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 24, marginBottom: 0 }}>
            Akusherlik va Ginekologiya
          </p>
        </div>
      </div>
      
      <p style={{ textAlign: "center", color: "var(--tg-hint)", fontSize: 14, marginTop: 16 }}>
        Sertifikatni saqlash uchun ekran sifrini (screenshot) oling.
      </p>
    </>
  );
}

import { useTelegramBackButton, inTg } from "../telegram.js";
import type { MeStats, AuthResponse } from "@aku/shared";
import { useLang } from "../i18n.js";

export function Certificate(props: {
  stats: MeStats | null;
  user: AuthResponse["user"];
  onBack: () => void;
}) {
  const { t, lang } = useLang();
  useTelegramBackButton(props.onBack);
  const date = new Date().toLocaleDateString(lang === "ru" ? "ru-RU" : "uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const correct = props.stats?.totalCorrect ?? 0;
  const accuracy = props.stats?.accuracy ?? 0;

  return (
    <>
      <div className="header-row" style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        {!inTg && (
          <button className="ghost" onClick={props.onBack} style={{ margin: 0, width: "auto", padding: "8px 12px" }}>
            {t("back")}
          </button>
        )}
        <h2 style={{ flex: 1, textAlign: "center", margin: 0 }}>{t("cert.title")}</h2>
        {!inTg && <div style={{ width: 80 }} />}
      </div>

      <div className="cert-wrap">
        <div className="cert">
          <div className="cert-ring" />
          <div className="cert-emblem">🏅</div>
          <div className="cert-kicker">{t("cert.kicker")}</div>
          <div className="cert-sub">{t("cert.sub1")}</div>
          <div className="cert-name">{props.user.firstName}</div>
          <div className="cert-sub">{t("cert.sub2")}</div>

          <div className="cert-stats">
            <div>
              <div className="cert-stat-v">{correct}</div>
              <div className="cert-stat-l">{t("cert.correct")}</div>
            </div>
            <div className="cert-divider" />
            <div>
              <div className="cert-stat-v">{accuracy}%</div>
              <div className="cert-stat-l">{t("cert.accuracy")}</div>
            </div>
          </div>

          <div className="cert-foot">
            <span>{t("cert.subject")}</span>
            <span>{date}</span>
          </div>
        </div>
      </div>

      <p style={{ textAlign: "center", color: "var(--tg-hint)", fontSize: 14, marginTop: 8 }}>
        {t("cert.save")}
      </p>
    </>
  );
}

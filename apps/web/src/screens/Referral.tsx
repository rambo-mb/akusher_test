import { useEffect, useState } from "react";
import { api } from "../api.js";
import { openTelegramLink, useTelegramBackButton, tap, haptic, inTg } from "../telegram.js";
import { Skeleton } from "../components/Skeleton.js";
import { useLang } from "../i18n.js";

export function Referral(props: { onBack: () => void }) {
  const { t } = useLang();
  useTelegramBackButton(props.onBack);
  const [data, setData] = useState<{ link: string; invited: number; bonusDays: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.referral().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="center" style={{ color: "var(--red)" }}>{error}</div>;
  if (!data) return <Skeleton />;

  function share() {
    tap();
    const text = t("ref.shareText");
    openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(data!.link)}&text=${encodeURIComponent(text)}`,
    );
  }

  async function copy() {
    tap();
    try {
      await navigator.clipboard.writeText(data!.link);
      setCopied(true);
      haptic("success");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <>
      <div className="ref-hero">
        <div className="ref-hero-emoji">🎁</div>
        <h1 style={{ margin: "4px 0" }}>{t("ref.title")}</h1>
        <p className="subtitle" style={{ marginBottom: 18 }}>
          {t("ref.subPre")}{" "}
          <b style={{ color: "var(--green)" }}>+{data.bonusDays} {t("ref.days")}</b>{" "}
          {t("ref.subPost")}
        </p>
      </div>

      <div className="statstrip" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <div className="sv">{data.invited}</div>
          <div className="sl">{t("ref.invited")}</div>
        </div>
        <div>
          <div className="sv" style={{ color: "var(--green)" }}>+{data.bonusDays}</div>
          <div className="sl">{t("ref.bonusDays")}</div>
        </div>
      </div>

      <div className="card">
        <div className="fl">{t("ref.yourLink")}</div>
        <div className="ref-link-box">{data.link}</div>
        <div className="ref-actions">
          <button className="ghost" style={{ margin: 0, flex: 1 }} onClick={copy}>
            {copied ? t("ref.copied") : t("ref.copy")}
          </button>
          <button className="primary" style={{ margin: 0, flex: 1 }} onClick={share}>
            {t("ref.share")}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="fl">{t("ref.howTitle")}</div>
        <div className="ref-step">
          <span className="ref-step-n">1</span>
          <span>{t("ref.step1")}</span>
        </div>
        <div className="ref-step">
          <span className="ref-step-n">2</span>
          <span>{t("ref.step2")}</span>
        </div>
        <div className="ref-step">
          <span className="ref-step-n">3</span>
          <span>
            {t("ref.step3pre")} <b>+{data.bonusDays} {t("ref.days")}</b> {t("ref.step3post")}
          </span>
        </div>
      </div>

      {!inTg && (
        <button className="ghost" onClick={props.onBack}>{t("back")}</button>
      )}
    </>
  );
}

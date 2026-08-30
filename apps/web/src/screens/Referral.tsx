import { useEffect, useState } from "react";
import { api } from "../api.js";
import { openTelegramLink, useTelegramBackButton, tap, haptic, inTg } from "../telegram.js";
import { Skeleton } from "../components/Skeleton.js";

export function Referral(props: { onBack: () => void }) {
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
    const text =
      "Men akusherlik va ginekologiya imtihoniga shu bot orqali tayyorlanyapman! Sen ham qo'shil 👇";
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
      /* clipboard yopiq bo'lishi mumkin */
    }
  }

  return (
    <>
      <div className="ref-hero">
        <div className="ref-hero-emoji">🎁</div>
        <h1 style={{ margin: "4px 0" }}>Do'st taklif qil</h1>
        <p className="subtitle" style={{ marginBottom: 18 }}>
          Har bir obuna sotib olgan do'st uchun sizga <b style={{ color: "var(--green)" }}>+7 kun</b> bonus!
        </p>
      </div>

      <div className="statstrip" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <div className="sv">{data.invited}</div>
          <div className="sl">Taklif qilingan</div>
        </div>
        <div>
          <div className="sv" style={{ color: "var(--green)" }}>+{data.bonusDays}</div>
          <div className="sl">Bonus kun</div>
        </div>
      </div>

      <div className="card">
        <div className="fl">Sizning taklif havolangiz</div>
        <div className="ref-link-box">{data.link}</div>
        <div className="ref-actions">
          <button className="ghost" style={{ margin: 0, flex: 1 }} onClick={copy}>
            {copied ? "✅ Nusxalandi" : "📋 Nusxalash"}
          </button>
          <button className="primary" style={{ margin: 0, flex: 1 }} onClick={share}>
            📤 Ulashish
          </button>
        </div>
      </div>

      <div className="card">
        <div className="fl">Qanday ishlaydi?</div>
        <div className="ref-step"><span className="ref-step-n">1</span><span>Havolani do'stlaringizga yuboring</span></div>
        <div className="ref-step"><span className="ref-step-n">2</span><span>Ular bot orqali obuna sotib oladi</span></div>
        <div className="ref-step"><span className="ref-step-n">3</span><span>Sizga avtomatik <b>+7 kun</b> qo'shiladi 🎉</span></div>
      </div>

      {!inTg && (
        <button className="ghost" onClick={props.onBack}>← Orqaga</button>
      )}
    </>
  );
}

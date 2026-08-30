import { useEffect, useState } from "react";
import { api } from "../api.js";
import { openTelegramLink, useTelegramBackButton } from "../telegram.js";
import { Skeleton } from "../components/Skeleton.js";

export function Referral(props: { onBack: () => void }) {
  useTelegramBackButton(props.onBack);
  const [data, setData] = useState<{ link: string; invited: number; bonusDays: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.referral().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="app"><div className="center" style={{color: "var(--red)"}}>{error}</div></div>;
  if (!data) return <Skeleton />;

  function handleShare() {
    const text = "Men akusherlik va ginekologiya bo'yicha imtihonlarga shu bot orqali tayyorlanyapman! Sen ham qo'shil 👇";
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(data!.link)}&text=${encodeURIComponent(text)}`;
    openTelegramLink(shareUrl);
  }

  return (
    <div className="app fade-slide">
      <h1>🎁 Do'st taklif qil</h1>
      <p className="subtitle">Do'stlaringizni taklif qiling va bepul obuna kunlariga ega bo'ling!</p>

      <div className="card">
        <h3 style={{ margin: "0 0 16px" }}>Sizning havolangiz</h3>
        <div style={{
          background: "var(--tg-bg)",
          padding: "12px",
          borderRadius: "8px",
          wordBreak: "break-all",
          fontSize: "14px",
          marginBottom: "16px",
          border: "1px solid var(--tg-hint)"
        }}>
          {data.link}
        </div>
        <button className="btn" onClick={handleShare}>📤 Ulashish</button>
      </div>

      <div className="statstrip" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <div className="sv">{data.invited}</div>
          <div className="sl">Taklif qilingan</div>
        </div>
        <div>
          <div className="sv">+{data.bonusDays}</div>
          <div className="sl">Bonus kunlar</div>
        </div>
      </div>
      
      <p style={{ fontSize: 13, color: "var(--tg-hint)", lineHeight: 1.5, textAlign: "center" }}>
        Qachonki siz taklif qilgan do'stingiz obuna xarid qilsa, sizning hisobingizga avtomatik tarzda +7 kun qo'shiladi.
      </p>
    </div>
  );
}

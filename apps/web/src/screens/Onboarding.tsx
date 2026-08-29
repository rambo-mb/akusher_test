import { useState } from "react";
import { useTelegramMainButton, tap } from "../telegram.js";

const SLIDES = [
  {
    title: "Akusherlik Test Bot",
    desc: "Tibbiyot xodimlari va talabalar uchun maxsus ishlab chiqilgan test dasturi.",
    emoji: "🩺",
  },
  {
    title: "Interaktiv ta'lim",
    desc: "Xatolaringizni tahlil qiling, kunlik maqsadlar qo'ying va reytingda ko'tariling.",
    emoji: "📈",
  },
  {
    title: "Oson tayyorgarlik",
    desc: "Imtihonlarga istalgan vaqtda, qulay formatda tayyorlaning.",
    emoji: "🎓",
  }
];

export function Onboarding(props: { onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  function next() {
    tap();
    if (index < SLIDES.length - 1) {
      setIndex(i => i + 1);
    } else {
      localStorage.setItem("aku_onboarded", "1");
      props.onComplete();
    }
  }

  useTelegramMainButton(index < SLIDES.length - 1 ? "Keyingi" : "Boshlash", next);

  return (
    <div className="center qbody" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "70vh", padding: 20 }}>
      <div style={{ fontSize: 80, marginBottom: 20 }}>{slide.emoji}</div>
      <h2 style={{ fontSize: 24, marginBottom: 12 }}>{slide.title}</h2>
      <p style={{ color: "var(--tg-hint)", fontSize: 16, lineHeight: 1.5 }}>{slide.desc}</p>
      
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 40 }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{
            width: i === index ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: i === index ? "var(--tg-button)" : "var(--tg-secondary-bg)",
            transition: "all 0.3s ease"
          }} />
        ))}
      </div>
    </div>
  );
}

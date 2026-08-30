import { useState } from "react";
import { useTelegramMainButton, useTelegramBackButton, tap } from "../telegram.js";

const SLIDES = [
  {
    emoji: "🩺",
    title: "Xush kelibsiz!",
    desc: "Akusherlik va ginekologiya imtihoniga tayyorgarlik uchun 600+ test savoli. Har kuni mashq qilib bilimingizni oshiring.",
  },
  {
    emoji: "🎯",
    title: "Test rejimlari",
    desc: "• Random — tasodifiy savollar\n• Imtihon — vaqt chegarasi bilan\n• O'rganish — darhol to'g'ri/noto'g'ri\n• Qiyin rejim — tez (15s), izohsiz",
  },
  {
    emoji: "🔁",
    title: "Belgilash va takrorlash",
    desc: "Yoqqan savolni 🔖 belgilang — «Belgilangan» rejimida qayta ishlang. Xato savollaringiz «Takrorlash» rejimida interval bilan qaytadi (yaxshi esda qolishi uchun).",
  },
  {
    emoji: "🔥",
    title: "Streak va maqsad",
    desc: "Har kuni mashq qilib davomiylik (streak) yig'ing, kunlik maqsadingizni bajaring, yutuqlar (🏅) oching va reytingda yuqoriga ko'tariling.",
  },
  {
    emoji: "💳",
    title: "Obuna va bonus",
    desc: "Bir marta BEPUL sinab ko'rasiz. Davom etish uchun admin bilan bog'lanib obuna oling. Do'st taklif qilsangiz — har bir obuna uchun sizga +7 kun bonus!",
  },
  {
    emoji: "🎓",
    title: "Tayyor!",
    desc: "Omad tilaymiz. Savol yoki muammo bo'lsa — botga yozing, admin javob beradi.",
  },
];

export function Onboarding(props: { onComplete: () => void; guide?: boolean }) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  function next() {
    tap();
    if (!isLast) {
      setIndex((i) => i + 1);
    } else {
      if (!props.guide) localStorage.setItem("aku_onboarded", "1");
      props.onComplete();
    }
  }

  // Qo'llanma rejimida istalgan vaqtda chiqib ketish mumkin
  useTelegramBackButton(props.guide ? props.onComplete : () => {});
  useTelegramMainButton(isLast ? (props.guide ? "Yopish" : "Boshlash") : "Keyingi", next);

  return (
    <div
      className="center qbody"
      key={index}
      style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "72vh", padding: 20 }}
    >
      <div style={{ fontSize: 80, marginBottom: 20 }}>{slide.emoji}</div>
      <h2 style={{ fontSize: 24, marginBottom: 12 }}>{slide.title}</h2>
      <p style={{ color: "var(--tg-hint)", fontSize: 16, lineHeight: 1.6, whiteSpace: "pre-line", textAlign: "left", maxWidth: 340, margin: "0 auto" }}>
        {slide.desc}
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 36 }}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            onClick={() => { tap(); setIndex(i); }}
            style={{
              width: i === index ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === index ? "var(--tg-button)" : "var(--tg-secondary-bg)",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      {props.guide && (
        <button className="ghost" style={{ marginTop: 28, maxWidth: 200, marginLeft: "auto", marginRight: "auto" }} onClick={props.onComplete}>
          Yopish
        </button>
      )}
    </div>
  );
}

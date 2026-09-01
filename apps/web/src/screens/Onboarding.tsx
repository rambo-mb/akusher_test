import { useState } from "react";
import { useTelegramMainButton, useTelegramBackButton, tap } from "../telegram.js";
import { useLang } from "../i18n.js";

const SLIDE_KEYS = [
  { emoji: "🩺", ti: "onb.0.title", di: "onb.0.desc" },
  { emoji: "🎯", ti: "onb.1.title", di: "onb.1.desc" },
  { emoji: "🔁", ti: "onb.2.title", di: "onb.2.desc" },
  { emoji: "🔥", ti: "onb.3.title", di: "onb.3.desc" },
  { emoji: "💳", ti: "onb.4.title", di: "onb.4.desc" },
  { emoji: "🎓", ti: "onb.5.title", di: "onb.5.desc" },
];

export function Onboarding(props: { onComplete: () => void; guide?: boolean }) {
  const { t } = useLang();
  const [index, setIndex] = useState(0);
  const slideKey = SLIDE_KEYS[index];
  const isLast = index === SLIDE_KEYS.length - 1;

  function next() {
    tap();
    if (!isLast) {
      setIndex((i) => i + 1);
    } else {
      if (!props.guide) localStorage.setItem("aku_onboarded", "1");
      props.onComplete();
    }
  }

  useTelegramBackButton(props.guide ? props.onComplete : () => {});
  useTelegramMainButton(
    isLast ? (props.guide ? t("onb.close") : t("onb.start")) : t("onb.next"),
    next,
  );

  return (
    <div
      className="center qbody"
      key={index}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: "72vh",
        padding: 20,
      }}
    >
      <div style={{ fontSize: 80, marginBottom: 20 }}>{slideKey.emoji}</div>
      <h2 style={{ fontSize: 24, marginBottom: 12 }}>{t(slideKey.ti)}</h2>
      <p
        style={{
          color: "var(--tg-hint)",
          fontSize: 16,
          lineHeight: 1.6,
          whiteSpace: "pre-line",
          textAlign: "left",
          maxWidth: 340,
          margin: "0 auto",
        }}
      >
        {t(slideKey.di)}
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 36 }}>
        {SLIDE_KEYS.map((_, i) => (
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
        <button
          className="ghost"
          style={{ marginTop: 28, maxWidth: 200, marginLeft: "auto", marginRight: "auto" }}
          onClick={props.onComplete}
        >
          {t("onb.close")}
        </button>
      )}
    </div>
  );
}

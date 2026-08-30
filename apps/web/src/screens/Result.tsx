import { useState, useEffect } from "react";
import { useTelegramMainButton, openTelegramLink } from "../telegram.js";
import type { FinishResponse } from "@aku/shared";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function Result(props: { data: FinishResponse; botUsername?: string; onHome: () => void }) {
  const { total, correctCount, score, items } = props.data;
  const wrongCount = items.filter((i) => !i.isCorrect).length;
  const emoji = score >= 80 ? "🎉" : score >= 60 ? "👍" : "📚";
  const color = score >= 80 ? "var(--green)" : score >= 50 ? "var(--tg-button)" : "var(--red)";
  const [filter, setFilter] = useState<"all" | "wrong">("all");
  const [animScore, setAnimScore] = useState(0);

  useEffect(() => {
    let frame: number;
    let current = 0;
    const animate = () => {
      current += (score - current) * 0.1;
      if (score - current < 0.5) current = score;
      setAnimScore(current);
      if (current < score) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const shown = filter === "wrong" ? items.filter((i) => !i.isCorrect) : items;

  useTelegramMainButton("Bosh sahifa", props.onHome);

  return (
    <>
      <h1 style={{ textAlign: "center" }}>Natija {emoji}</h1>
      
      <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="50" fill="none" stroke="var(--tg-secondary-bg)" strokeWidth="12" />
          <circle
            cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="12"
            strokeDasharray={2 * Math.PI * 50}
            strokeDashoffset={2 * Math.PI * 50 * (1 - animScore / 100)}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
          <text x="60" y="65" textAnchor="middle" fontSize="28" fontWeight="bold" fill="var(--tg-text)">
            {Math.round(animScore)}%
          </text>
        </svg>
      </div>
      <div className="result-sub">
        {total} tadan <b style={{ color: "var(--green)" }}>{correctCount} to'g'ri</b>
        {wrongCount > 0 && (
          <>
            {" · "}
            <b style={{ color: "var(--red)" }}>{wrongCount} xato</b>
          </>
        )}
      </div>
      
      {props.botUsername && (
        <button 
          className="btn" 
          style={{ marginBottom: 16 }} 
          onClick={() => {
            const text = `Men akusherlik testida ${Math.round(score)}% oldim! Sen ham sinab ko'r 👉`;
            openTelegramLink(`https://t.me/share/url?url=https://t.me/${props.botUsername}&text=${encodeURIComponent(text)}`);
          }}
        >
          📤 Natijani ulashish
        </button>
      )}

      {items.length > 0 && (
        <>
          <div className="tabs">
            <div className={`tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
              Hammasi ({items.length})
            </div>
            <div className={`tab ${filter === "wrong" ? "active" : ""}`} onClick={() => setFilter("wrong")}>
              Xatolar ({wrongCount})
            </div>
          </div>

          {shown.map((it) => (
            <div key={it.questionId} className="card review-card">
              <div className="wq">
                <span className={it.isCorrect ? "ok" : "no-mark"}>{it.isCorrect ? "✓" : "✕"}</span>{" "}
                {it.number}. {it.stem}
              </div>
              {it.options.map((opt, i) => {
                const isCorrect = i === it.correctIndex;
                const isPicked = i === it.selectedIndex;
                let cls = "rev-opt";
                if (isCorrect) cls += " correct";
                else if (isPicked) cls += " wrong";
                return (
                  <div key={i} className={cls}>
                    <span className="letter">{LETTERS[i]}</span>
                    <span>{opt}</span>
                    {isCorrect && <span className="tagr ok"> to'g'ri</span>}
                    {isPicked && !isCorrect && <span className="tagr no"> siz</span>}
                  </div>
                );
              })}
              {it.explanation && props.data.mode !== "hard" && (
                <div className="explain">
                  <span className="explain-t">💡 Izoh</span>
                  {it.explanation}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* MainButton replaces the button below */}
    </>
  );
}

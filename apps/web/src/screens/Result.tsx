import { useState } from "react";
import type { FinishResponse } from "@aku/shared";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function Result(props: { data: FinishResponse; onHome: () => void }) {
  const { total, correctCount, score, items } = props.data;
  const wrongCount = items.filter((i) => !i.isCorrect).length;
  const emoji = score >= 80 ? "🎉" : score >= 60 ? "👍" : "📚";
  const color = score >= 80 ? "var(--green)" : score >= 50 ? "var(--tg-button)" : "var(--red)";
  const [filter, setFilter] = useState<"all" | "wrong">("all");

  const shown = filter === "wrong" ? items.filter((i) => !i.isCorrect) : items;

  return (
    <>
      <h1>Natija {emoji}</h1>
      <div className="result-score" style={{ color }}>{score}%</div>
      <div className="result-sub">
        {total} tadan <b style={{ color: "var(--green)" }}>{correctCount} to'g'ri</b>
        {wrongCount > 0 && (
          <>
            {" · "}
            <b style={{ color: "var(--red)" }}>{wrongCount} xato</b>
          </>
        )}
      </div>

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
              {it.explanation && (
                <div className="explain">
                  <span className="explain-t">💡 Izoh</span>
                  {it.explanation}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <button className="primary" onClick={props.onHome} style={{ marginTop: 8 }}>
        Bosh sahifa
      </button>
    </>
  );
}

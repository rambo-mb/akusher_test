import type { FinishResponse } from "@aku/shared";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function Result(props: { data: FinishResponse; onHome: () => void }) {
  const { total, correctCount, score, wrong } = props.data;
  const emoji = score >= 80 ? "🎉" : score >= 60 ? "👍" : "📚";

  return (
    <>
      <h1>Natija {emoji}</h1>
      <div className="result-score">{score}%</div>
      <div className="result-sub">
        {total} tadan {correctCount} ta to'g'ri
      </div>

      {wrong.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Xatolar ({wrong.length})</div>
          {wrong.map((w) => (
            <div key={w.questionId} className="wrong-item">
              <div className="wq">
                {w.number}. {w.stem}
              </div>
              <div className="wa no">
                {LETTERS[w.selectedIndex]}. {w.options[w.selectedIndex]}
              </div>
              <div className="wa ok">
                {LETTERS[w.correctIndex]}. {w.options[w.correctIndex]}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="primary" onClick={props.onHome}>
        Bosh sahifa
      </button>
    </>
  );
}

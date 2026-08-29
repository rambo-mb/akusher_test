import { useCallback, useEffect, useRef, useState } from "react";
import type { FinishResponse, StartQuizResponse } from "@aku/shared";
import { api } from "../api.js";
import { haptic, tap } from "../telegram.js";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function Quiz(props: {
  data: StartQuizResponse;
  onFinish: (res: FinishResponse) => void;
  onExit: () => void;
}) {
  const { attemptId, mode, questions, timeLimitSec } = props.data;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<number | null>(null); // study rejimida to'g'ri indeks
  const [busy, setBusy] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimitSec ?? 0);
  const finishing = useRef(false);

  const q = questions[index];
  const isStudy = mode === "study";
  const isLast = index === questions.length - 1;

  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    const res = await api.finish(attemptId);
    props.onFinish(res);
  }, [attemptId, props]);

  // Imtihon taymeri
  useEffect(() => {
    if (mode !== "exam" || !timeLimitSec) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [mode, timeLimitSec, finish]);

  async function choose(i: number) {
    if (selected !== null || busy) return;
    tap();
    setSelected(i);
    setBusy(true);
    try {
      const res = await api.answer(attemptId, { questionId: q.id, selectedIndex: i });
      if (isStudy) {
        setRevealed(res.correctIndex);
        haptic(res.isCorrect ? "success" : "error");
      }
    } catch {
      // yozib bo'lmasa ham davom etamiz
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (selected === null) return;
    if (isLast) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(null);
  }

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <>
      <div className="progress">
        <div style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
      </div>
      <div className="qmeta">
        <span>
          {index + 1} / {questions.length}
        </span>
        {mode === "exam" && (
          <span className={`timer ${timeLeft <= 30 ? "low" : ""}`}>
            ⏱ {mm}:{ss}
          </span>
        )}
        <span onClick={props.onExit} style={{ cursor: "pointer" }}>
          Chiqish
        </span>
      </div>

      <div className="stem">{q.stem}</div>

      {q.options.map((opt, i) => {
        let cls = "option";
        if (isStudy && revealed !== null) {
          if (i === revealed) cls += " correct";
          else if (i === selected) cls += " wrong";
        } else if (i === selected) {
          cls += " selected";
        }
        return (
          <button
            key={i}
            className={cls}
            disabled={selected !== null}
            onClick={() => choose(i)}
          >
            <span className="letter">{LETTERS[i]}</span>
            <span>{opt}</span>
          </button>
        );
      })}

      <button className="primary" onClick={next} disabled={selected === null || busy} style={{ marginTop: 8 }}>
        {isLast ? "Yakunlash" : "Keyingi"}
      </button>
    </>
  );
}

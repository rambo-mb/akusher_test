import { useEffect, useRef, useState } from "react";
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
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState<Record<number, number>>({}); // qId -> correctIndex (study)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(timeLimitSec ?? 0);
  const [explanations, setExplanations] = useState<Record<number, string | null>>({});
  const [bookmarks, setBookmarks] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(questions.map((qq) => [qq.id, qq.bookmarked])),
  );
  const committed = useRef<Set<number>>(new Set());
  const finishing = useRef(false);

  const q = questions[index];
  const isStudy = mode === "study";
  const isLast = index === questions.length - 1;
  const selected = selections[q.id] ?? null;
  const isRevealed = isStudy && revealed[q.id] !== undefined;

  async function submitAnswer(qid: number, sel: number) {
    if (committed.current.has(qid)) return null;
    try {
      const res = await api.answer(attemptId, { questionId: qid, selectedIndex: sel });
      committed.current.add(qid);
      return res;
    } catch {
      return null; // yozib bo'lmasa ham davom etamiz
    }
  }

  async function doFinish() {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    setError(null);
    // Joriy savol javobini yozamiz (agar hali yozilmagan bo'lsa)
    if (selected !== null) await submitAnswer(q.id, selected);
    try {
      const res = await api.finish(attemptId);
      props.onFinish(res);
    } catch (e) {
      setError((e as Error).message || "Yakunlashda xatolik");
      finishing.current = false;
      setBusy(false);
    }
  }

  // Imtihon taymeri (stale closure'dan qochish uchun ref)
  const finishRef = useRef(doFinish);
  finishRef.current = doFinish;
  useEffect(() => {
    if (mode !== "exam" || !timeLimitSec) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          finishRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [mode, timeLimitSec]);

  async function choose(i: number) {
    if (isRevealed || busy) return;
    tap();
    setSelections((s) => ({ ...s, [q.id]: i }));
    // O'rganish rejimida: darhol yozib, to'g'ri javobni ochamiz
    if (isStudy) {
      setBusy(true);
      const res = await submitAnswer(q.id, i);
      if (res) {
        setRevealed((r) => ({ ...r, [q.id]: res.correctIndex }));
        setExplanations((e) => ({ ...e, [q.id]: res.explanation }));
        haptic(res.isCorrect ? "success" : "error");
      }
      setBusy(false);
    }
  }

  async function toggleBookmark() {
    tap();
    const cur = bookmarks[q.id] ?? false;
    setBookmarks((b) => ({ ...b, [q.id]: !cur })); // optimistik
    try {
      const r = await api.bookmarkToggle(q.id);
      setBookmarks((b) => ({ ...b, [q.id]: r.bookmarked }));
    } catch {
      setBookmarks((b) => ({ ...b, [q.id]: cur })); // qaytaramiz
    }
  }

  async function next() {
    if (selected === null || busy) return;
    if (isLast) {
      await doFinish();
      return;
    }
    // Boshqa rejimlarда javobni shu yerда yozamiz (o'zgartirilgan bo'lsa oxirgisi)
    if (!isStudy) {
      setBusy(true);
      await submitAnswer(q.id, selected);
      setBusy(false);
    }
    setIndex((i) => i + 1);
  }

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const answeredCount = Object.keys(selections).length;

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
        <span className="qmeta-right">
          <span className="bmark" onClick={toggleBookmark} title="Belgilash">
            {bookmarks[q.id] ? "🔖" : "🏷️"}
          </span>
          <span
            onClick={() => {
              if (window.confirm("Testdan chiqasizmi? Joriy natija saqlanmaydi.")) props.onExit();
            }}
            style={{ cursor: "pointer" }}
          >
            ✕
          </span>
        </span>
      </div>

      <div className="qbody" key={index}>
        <div className="stem">{q.stem}</div>

        {q.options.map((opt, i) => {
          let cls = "option";
          if (isRevealed) {
            if (i === revealed[q.id]) cls += " correct";
            else if (i === selected) cls += " wrong";
          } else if (i === selected) {
            cls += " selected";
          }
          return (
            <button key={i} className={cls} disabled={isRevealed} onClick={() => choose(i)}>
              <span className="letter">{LETTERS[i]}</span>
              <span>{opt}</span>
            </button>
          );
        })}

        {isRevealed && explanations[q.id] && (
          <div className="explain">
            <span className="explain-t">💡 Izoh</span>
            {explanations[q.id]}
          </div>
        )}
      </div>

      {error && <p className="review-note" style={{ color: "var(--red)" }}>{error}</p>}

      <button
        className="primary"
        onClick={next}
        disabled={selected === null || busy}
        style={{ marginTop: 8 }}
      >
        {busy ? "…" : isLast ? "Yakunlash" : "Keyingi"}
      </button>

      {!isStudy && (
        <p className="review-note" style={{ textAlign: "center" }}>
          Javobni tanlang — kerak bo'lsa o'zgartirishingiz mumkin. {answeredCount}/{questions.length} belgilandi.
        </p>
      )}
    </>
  );
}

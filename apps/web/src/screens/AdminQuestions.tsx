import { useEffect, useState } from "react";
import type { AdminQuestion } from "@aku/shared";
import { api } from "../api.js";
import { tap } from "../telegram.js";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const TAKE = 20;

export function AdminQuestions(props: { onBack: () => void }) {
  const [filter, setFilter] = useState<"needsReview" | "all">("needsReview");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AdminQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [needsReview, setNeedsReview] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editId, setEditId] = useState(0);
  const [draft, setDraft] = useState<AdminQuestion | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(reset: boolean) {
    setLoading(true);
    setErr(null);
    try {
      const skip = reset ? 0 : items.length;
      const r = await api.adminQuestions({ filter, search: search.trim(), skip, take: TAKE });
      setTotal(r.total);
      setNeedsReview(r.needsReview);
      setItems(reset ? r.questions : [...items, ...r.questions]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function edit(q: AdminQuestion) {
    tap();
    if (editId === q.id) {
      setEditId(0);
      setDraft(null);
      return;
    }
    setEditId(q.id);
    setDraft({ ...q, options: [...q.options] });
    setErr(null);
  }

  async function save() {
    if (!draft) return;
    const opts = draft.options.map((o) => o.trim()).filter(Boolean);
    if (!draft.stem.trim()) return setErr("Savol matni bo'sh");
    if (opts.length < 2) return setErr("Kamida 2 ta variant kerak");
    if (draft.correctIndex < 0 || draft.correctIndex >= opts.length)
      return setErr("To'g'ri javobni belgilang");
    setSaving(true);
    setErr(null);
    try {
      await api.adminUpdateQuestion(draft.id, {
        stem: draft.stem.trim(),
        options: opts,
        correctIndex: draft.correctIndex,
        explanation: draft.explanation ?? "",
        category: draft.category ?? "",
        needsReview: draft.needsReview,
      });
      setEditId(0);
      setDraft(null);
      load(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1>✏️ Savol muharriri</h1>
      <p className="subtitle">Tuzatilmagan: {needsReview} · Ko'rsatilyapti: {total}</p>

      <div className="tabs">
        <div className={`tab ${filter === "needsReview" ? "active" : ""}`} onClick={() => setFilter("needsReview")}>
          Tuzatilmagan
        </div>
        <div className={`tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          Hammasi
        </div>
      </div>

      <div className="search-row">
        <input
          className="ta search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Savol matnidan qidirish…"
          onKeyDown={(e) => {
            if (e.key === "Enter") load(true);
          }}
        />
        <button className="dur-btn" style={{ flex: "0 0 auto" }} onClick={() => load(true)}>
          🔍
        </button>
      </div>

      {err && <p className="review-note" style={{ color: "var(--red)" }}>{err}</p>}

      {items.map((q) => {
        const open = editId === q.id;
        return (
          <div key={q.id}>
            <div className={`user-row ${open ? "open" : ""}`} onClick={() => edit(q)}>
              <div className="user-main">
                <div className="user-name">
                  {q.number}. {q.stem.slice(0, 64)}
                  {q.stem.length > 64 ? "…" : ""}
                </div>
                <div className="user-meta">
                  {q.needsReview && <span className="ubadge pending">Tuzatilmagan</span>}
                  <span className="user-sub">{q.options.length} variant</span>
                </div>
              </div>
              <span className="user-chev">{open ? "▲" : "▼"}</span>
            </div>

            {open && draft && (
              <div className="user-panel">
                <label className="fl">Savol matni</label>
                <textarea
                  className="ta"
                  rows={2}
                  value={draft.stem}
                  onChange={(e) => setDraft({ ...draft, stem: e.target.value })}
                />

                <label className="fl">Variantlar (to'g'risini belgilang ⦿)</label>
                {draft.options.map((o, i) => (
                  <div key={i} className="opt-edit">
                    <input
                      type="radio"
                      checked={draft.correctIndex === i}
                      onChange={() => setDraft({ ...draft, correctIndex: i })}
                    />
                    <span className="letter">{LETTERS[i]}</span>
                    <input
                      className="ta opt-input"
                      value={o}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          options: draft.options.map((x, idx) => (idx === i ? e.target.value : x)),
                        })
                      }
                    />
                    <button
                      className="opt-rm"
                      onClick={() =>
                        setDraft(() => {
                          const options = draft.options.filter((_, idx) => idx !== i);
                          let ci = draft.correctIndex;
                          if (i === ci) ci = 0;
                          else if (i < ci) ci -= 1;
                          return { ...draft, options, correctIndex: ci };
                        })
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button className="ghost" onClick={() => setDraft({ ...draft, options: [...draft.options, ""] })}>
                  + Variant qo'shish
                </button>

                <label className="fl">Izoh (ixtiyoriy)</label>
                <textarea
                  className="ta"
                  rows={2}
                  value={draft.explanation ?? ""}
                  onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
                  placeholder="Nega bu javob to'g'ri…"
                />

                <label className="cb">
                  <input
                    type="checkbox"
                    checked={draft.needsReview}
                    onChange={(e) => setDraft({ ...draft, needsReview: e.target.checked })}
                  />
                  Hali tuzatilmagan (belgilangan qoladi, testga chiqmaydi)
                </label>

                <button className="primary" disabled={saving} onClick={save}>
                  {saving ? "Saqlanmoqda…" : "💾 Saqlash"}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {loading && items.length === 0 && <div className="center">Yuklanmoqda…</div>}
      {!loading && items.length === 0 && <div className="center">Topilmadi</div>}
      {items.length < total && (
        <button className="ghost" onClick={() => load(false)} disabled={loading}>
          {loading ? "…" : "Yana yuklash"}
        </button>
      )}

      <button className="ghost" onClick={props.onBack} style={{ marginTop: 12 }}>
        ← Orqaga
      </button>
    </>
  );
}

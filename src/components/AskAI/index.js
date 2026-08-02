import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";

const SUGGESTIONS = [
  "What is a Queue in Volcano?",
  "How do I deploy Volcano on Kubernetes?",
  "How does the scheduler work?",
  "How can I start contributing to Volcano?",
];

export default function AskAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("volcano-ask-ai-open", onOpen);

    const buttons = document.querySelectorAll(".ask-ai-nav-btn");
    buttons.forEach((btn) => btn.addEventListener("click", onOpen));

    return () => {
      window.removeEventListener("volcano-ask-ai-open", onOpen);
      buttons.forEach((btn) => btn.removeEventListener("click", onOpen));
    };
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, busy, open]);

  const ask = useCallback(async (question) => {
    const q = question.trim();
    if (!q || busy) return;

    setError(null);
    setBusy(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);

    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
        },
      ]);
    } catch (e) {
      setError(
        e.message ||
          "Ask AI is unavailable. Use `netlify dev` locally, or check the Netlify AI Gateway on deploy.",
      );
    } finally {
      setBusy(false);
    }
  }, [busy, messages]);

  const onSubmit = (e) => {
    e.preventDefault();
    ask(input);
  };

  return (
    <div className={styles.root}>
      {open && (
        <div
          className={styles.panel}
          role="dialog"
          aria-label="Ask AI about Volcano"
        >
          <div className={styles.header}>
            <div>
              <div className={styles.title}>Ask AI</div>
              <div className={styles.subtitle}>
                Answers from official Volcano docs
              </div>
            </div>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setOpen(false)}
              aria-label="Close Ask AI"
            >
              ×
            </button>
          </div>

          <div className={styles.messages} ref={listRef}>
            {messages.length === 0 && (
              <div className={styles.welcome}>
                <p>
                  Ask questions about Volcano concepts, scheduling, and
                  contributing. Answers include links to the docs.
                </p>
                <div className={styles.suggestions}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={styles.suggestion}
                      onClick={() => ask(s)}
                      disabled={busy}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user" ? styles.userMsg : styles.assistantMsg
                }
              >
                <div className={styles.bubble}>{m.content}</div>
                {m.sources?.length > 0 && (
                  <ul className={styles.sources}>
                    {m.sources.map((s) => (
                      <li key={s.url}>
                        <a href={s.url}>{s.title || s.url}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {busy && (
              <div className={styles.assistantMsg}>
                <div className={styles.bubble}>Thinking…</div>
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}
          </div>

          <form className={styles.form} onSubmit={onSubmit}>
            <input
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Volcano…"
              maxLength={500}
              disabled={busy}
              aria-label="Question"
            />
            <button
              type="submit"
              className={styles.send}
              disabled={busy || !input.trim()}
            >
              Ask
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close Ask AI" : "Open Ask AI"}
      >
        {open ? "Close" : "Ask AI"}
      </button>
    </div>
  );
}

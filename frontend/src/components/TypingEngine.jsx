import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { sounds } from "@/lib/sounds";

/**
 * TypingEngine — listens to raw keyboard events, tracks correct/incorrect chars,
 * computes live WPM & accuracy, and invokes onComplete(stats) when text fully typed.
 *
 * Props:
 *  - text: string to type
 *  - onProgress(stats) called each keystroke
 *  - onComplete(stats) when done
 *  - onError() optional, when wrong char typed
 *  - active: boolean — when false, ignores keystrokes
 */
export default function TypingEngine({ text, onProgress, onComplete, onError, active = true, autoFocus = true }) {
  const [typed, setTyped] = useState("");
  const [errors, setErrors] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [shake, setShake] = useState(false);
  const containerRef = useRef(null);
  const completedRef = useRef(false);

  // reset when text changes
  useEffect(() => {
    setTyped("");
    setErrors(0);
    setTotalKeystrokes(0);
    setStartTime(null);
    completedRef.current = false;
    if (autoFocus && containerRef.current) containerRef.current.focus();
  }, [text, autoFocus]);

  const computeStats = useCallback((typedStr, errCount, totalKeys, started) => {
    const elapsedMs = started ? Date.now() - started : 0;
    const minutes = elapsedMs / 60000;
    const correctChars = typedStr.split("").filter((c, i) => c === text[i]).length;
    const wpm = minutes > 0 ? (correctChars / 5) / minutes : 0;
    const accuracy = totalKeys > 0 ? (totalKeys - errCount) / totalKeys * 100 : 100;
    return {
      wpm: Math.round(wpm * 10) / 10,
      accuracy: Math.round(accuracy * 10) / 10,
      elapsed_seconds: elapsedMs / 1000,
      characters_typed: typedStr.length,
      correct_characters: correctChars,
      errors: errCount,
      total_keystrokes: totalKeys,
      progress: typedStr.length / text.length,
    };
  }, [text]);

  const handleKey = useCallback((e) => {
    if (!active) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (completedRef.current) return;

    // Allow backspace
    if (e.key === "Backspace") {
      e.preventDefault();
      setTyped((prev) => prev.slice(0, -1));
      return;
    }

    // Ignore non-character keys
    if (e.key.length !== 1 && e.key !== "Enter") return;
    e.preventDefault();
    const char = e.key === "Enter" ? "\n" : e.key;
    const idx = typed.length;
    if (idx >= text.length) return;

    const expected = text[idx];
    const correct = char === expected;
    const newTyped = typed + char;

    setTyped(newTyped);
    setTotalKeystrokes((k) => k + 1);
    let nextErrors = errors;
    if (!correct) {
      nextErrors = errors + 1;
      setErrors(nextErrors);
      setShake(true);
      setTimeout(() => setShake(false), 220);
      sounds.keyWrong();
      if (onError) onError();
    } else {
      sounds.keyCorrect();
    }

    const started = startTime ?? Date.now();
    if (!startTime) setStartTime(started);

    const stats = computeStats(newTyped, nextErrors, totalKeystrokes + 1, started);
    if (onProgress) onProgress(stats);

    if (newTyped.length >= text.length) {
      completedRef.current = true;
      if (onComplete) onComplete(stats);
    }
  }, [active, typed, text, errors, startTime, totalKeystrokes, computeStats, onProgress, onComplete, onError]);

  useEffect(() => {
    if (!active) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey, active]);

  const rendered = useMemo(() => {
    return text.split("").map((char, i) => {
      let cls = "char-pending";
      if (i < typed.length) {
        cls = typed[i] === char ? "char-correct" : "char-incorrect";
      } else if (i === typed.length) {
        cls = "char-current";
      }
      // key is stable: position is fixed for a given `text` (which resets the component).
      return <span key={`${i}-${char}`} className={cls}>{char}</span>;
    });
  }, [text, typed]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      data-testid="typing-input-area"
      className={`outline-none select-none ${shake ? "animate-shake" : ""}`}
    >
      <div className="font-mono text-2xl sm:text-3xl leading-relaxed tracking-wide whitespace-pre-wrap break-words">
        {rendered}
      </div>
    </div>
  );
}

import React, { useState, useCallback } from "react";
import api from "@/lib/api";
import TypingEngine from "@/components/TypingEngine";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, Target, Clock, AlertTriangle, RefreshCw, FileText, Trophy } from "lucide-react";
import { sounds } from "@/lib/sounds";
import { toast } from "sonner";

const SAMPLE = "Paste your own text here, or write something — anything. Then press Begin to start typing. The dojo accepts all words.";

export default function Playground() {
  const { refresh } = useAuth();
  const [draft, setDraft] = useState("");
  const [text, setText] = useState(""); // active passage
  const [stats, setStats] = useState({ wpm: 0, accuracy: 100, elapsed_seconds: 0, errors: 0, characters_typed: 0, progress: 0 });
  const [finalStats, setFinalStats] = useState(null);
  const [result, setResult] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  const begin = () => {
    const passage = draft.trim();
    if (passage.length < 10) {
      toast.error("Passage must be at least 10 characters.");
      return;
    }
    setText(passage);
    setFinalStats(null);
    setResult(null);
    setStats({ wpm: 0, accuracy: 100, elapsed_seconds: 0, errors: 0, characters_typed: 0, progress: 0 });
    setResetKey((k) => k + 1);
  };

  const reset = () => {
    setText("");
    setFinalStats(null);
    setResult(null);
  };

  const onComplete = useCallback(async (s) => {
    setFinalStats(s);
    sounds.victory();
    try {
      const { data } = await api.post("/sessions", {
        mode: "custom",
        item_id: null,
        item_title: text.slice(0, 60),
        wpm: s.wpm,
        accuracy: s.accuracy,
        duration_seconds: s.elapsed_seconds,
        characters_typed: s.characters_typed,
        errors: s.errors,
      });
      setResult(data);
      refresh();
      if (data.level_up) { sounds.levelUp(); toast.success(`LEVEL UP — LV.${data.new_level}`); }
      if (data.new_achievements?.length) {
        sounds.achievement();
        toast.success(`Achievement: ${data.achievements_meta.map(a => a.name).join(", ")}`);
      }
    } catch {
      toast.error("Failed to save session.");
    }
  }, [text, refresh]);

  return (
    <div data-testid="playground-page" className="max-w-5xl mx-auto px-6 py-10 scanlines">
      <div className="mb-8">
        <div className="label-xs mb-2 text-neon-cyan flex items-center gap-2"><FileText size={14}/> // CUSTOM.PLAYGROUND</div>
        <h1 className="font-display text-5xl sm:text-7xl tracking-tighter uppercase">Bring Your <span className="text-neon-cyan">Own Words</span></h1>
        <p className="text-zinc-400 mt-3 font-body max-w-2xl">Paste anything — a poem, a Wikipedia article, your bio. Train against your own text and earn XP.</p>
      </div>

      {!text && !finalStats && (
        <div className="dojo-card !p-8" data-testid="playground-input-stage">
          <label className="label-xs block mb-3">Paste / Write Passage</label>
          <textarea
            data-testid="playground-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            placeholder={SAMPLE}
            className="w-full bg-ink-900 border border-white/15 px-4 py-3 font-mono text-white focus:border-neon-cyan focus:outline-none transition resize-y min-h-[180px]"
          />
          <div className="mt-2 text-xs font-mono text-zinc-500">{draft.length} chars · ~{Math.round(draft.split(/\s+/).filter(Boolean).length)} words</div>
          <div className="mt-6 flex gap-3">
            <button onClick={begin} data-testid="playground-begin-button" className="btn-neon">Begin</button>
            <button onClick={() => setDraft(SAMPLE)} className="btn-ghost" data-testid="playground-sample-button">Insert Sample</button>
          </div>
        </div>
      )}

      {text && !finalStats && (
        <>
          <div className="hud-frame p-6 mb-6 grain">
            <div className="flex items-center justify-between mb-3">
              <div className="label-xs">// CUSTOM.ACTIVE</div>
              <button onClick={reset} className="text-xs uppercase tracking-[0.2em] text-zinc-400 hover:text-neon-magenta">Cancel</button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <Stat icon={Zap} label="WPM" value={stats.wpm.toFixed(0)} color="text-neon-cyan" />
              <Stat icon={Target} label="ACC" value={`${stats.accuracy.toFixed(0)}%`} color="text-neon-green" />
              <Stat icon={Clock} label="TIME" value={`${stats.elapsed_seconds.toFixed(0)}s`} color="text-white" />
              <Stat icon={AlertTriangle} label="ERR" value={stats.errors} color="text-neon-magenta" />
            </div>
            <div className="mt-4 hp-bar-shell">
              <div className="hp-bar-fill !bg-gradient-to-r !from-neon-cyan !to-neon-cyan/70" style={{ width: `${stats.progress * 100}%`, boxShadow: "0 0 12px rgba(0,240,255,0.5)" }} />
            </div>
          </div>
          <div className="dojo-card !p-8" data-testid="playground-typing-area">
            <TypingEngine key={resetKey} text={text} onProgress={setStats} onComplete={onComplete} active />
            <div className="mt-8 text-center text-xs uppercase tracking-[0.3em] text-zinc-500">Click here, then type. Backspace allowed.</div>
          </div>
        </>
      )}

      {finalStats && (
        <div data-testid="playground-results" className="hud-frame p-10 grain text-center">
          <div className="label-xs mb-2 text-neon-cyan">// CUSTOM.COMPLETE</div>
          <h2 className="font-display text-6xl tracking-tighter uppercase mb-8 text-glow-cyan">Done</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div><div className="label-xs">WPM</div><div className="font-display text-4xl text-neon-cyan">{finalStats.wpm.toFixed(1)}</div></div>
            <div><div className="label-xs">Accuracy</div><div className="font-display text-4xl text-neon-green">{finalStats.accuracy.toFixed(1)}%</div></div>
            <div><div className="label-xs">Time</div><div className="font-display text-4xl text-white">{finalStats.elapsed_seconds.toFixed(1)}s</div></div>
            <div><div className="label-xs">Errors</div><div className="font-display text-4xl text-neon-magenta">{finalStats.errors}</div></div>
          </div>
          {result && (
            <div className="border-t border-white/10 pt-6 mb-8">
              <div className="font-mono text-lg text-neon-orange">+{result.xp_gain} XP</div>
              <div className="text-sm text-zinc-400 mt-1">LV.{result.new_level} · Streak: {result.streak}d</div>
              {result.new_achievements?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {result.achievements_meta.map((a) => (
                    <span key={a.id} className="px-3 py-1 border border-neon-orange/40 text-neon-orange text-xs uppercase tracking-widest flex items-center gap-1.5">
                      <Trophy size={12} /> {a.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={begin} data-testid="playground-retry" className="btn-neon inline-flex items-center gap-2"><RefreshCw size={16}/> Re-type</button>
            <button onClick={reset} data-testid="playground-new" className="btn-ghost">New Passage</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5"><Icon size={12} className={color} /><span className="label-xs">{label}</span></div>
      <div className={`font-display text-2xl tracking-tight ${color}`}>{value}</div>
    </div>
  );
}

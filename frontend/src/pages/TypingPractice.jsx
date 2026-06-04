import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import TypingEngine from "@/components/TypingEngine";
import { useAuth } from "@/contexts/AuthContext";
import { sounds } from "@/lib/sounds";
import { Zap, Target, Clock, AlertTriangle, RefreshCw, ArrowLeft, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function TypingPractice() {
  const { mode, id } = useParams(); // mode: "lesson" | "quote"
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [item, setItem] = useState(null);
  const [stats, setStats] = useState({ wpm: 0, accuracy: 100, elapsed_seconds: 0, errors: 0, characters_typed: 0, progress: 0 });
  const [finalStats, setFinalStats] = useState(null);
  const [result, setResult] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    (async () => {
      const endpoint = mode === "lesson" ? `/lessons/${id}` : `/quotes/${id}`;
      try {
        const { data } = await api.get(endpoint);
        setItem(data);
      } catch {
        toast.error("Could not load item.");
        navigate(mode === "lesson" ? "/lessons" : "/quotes");
      }
    })();
  }, [mode, id, navigate, resetKey]);

  const onComplete = useCallback(async (s) => {
    setFinalStats(s);
    try {
      const { data } = await api.post("/sessions", {
        mode,
        item_id: id,
        item_title: item?.title || item?.text?.slice(0, 60),
        wpm: s.wpm,
        accuracy: s.accuracy,
        duration_seconds: s.elapsed_seconds,
        characters_typed: s.characters_typed,
        errors: s.errors,
      });
      setResult(data);
      refresh();
      if (data.new_achievements?.length) {
        sounds.achievement();
        toast.success(`Achievement unlocked: ${data.achievements_meta.map(a => a.name).join(", ")}`);
      }
      if (data.level_up) { sounds.levelUp(); toast.success(`LEVEL UP — LV.${data.new_level}`); }
    } catch (err) {
      toast.error("Could not save session.");
    }
  }, [mode, id, item, refresh]);

  const reset = () => {
    setFinalStats(null);
    setResult(null);
    setStats({ wpm: 0, accuracy: 100, elapsed_seconds: 0, errors: 0, characters_typed: 0, progress: 0 });
    setResetKey((k) => k + 1);
  };

  if (!item) {
    return <div className="p-12 text-center font-display text-3xl text-neon-cyan animate-pulse">LOADING TRIAL...</div>;
  }

  const text = item.text;
  const isComplete = !!finalStats;

  return (
    <div data-testid="typing-practice-page" className="max-w-5xl mx-auto px-6 py-8 scanlines">
      <button onClick={() => navigate(mode === "lesson" ? "/lessons" : "/quotes")} data-testid="back-button" className="text-xs uppercase tracking-[0.2em] text-zinc-400 hover:text-neon-cyan flex items-center gap-2 mb-6">
        <ArrowLeft size={14} /> Back
      </button>

      {/* HUD */}
      <div className="hud-frame p-6 mb-6 grain">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <div className="flex-1">
            <div className="label-xs mb-1">// {mode.toUpperCase()}.ACTIVE</div>
            <div className="font-display text-3xl tracking-tight uppercase">
              {item.title || item.character}
              {item.anime && <span className="text-sm tracking-widest text-zinc-500 ml-3">// {item.anime}</span>}
            </div>
          </div>
          <div className="flex gap-6">
            <Stat icon={Zap} label="WPM" value={stats.wpm.toFixed(0)} color="text-neon-cyan" />
            <Stat icon={Target} label="ACC" value={`${stats.accuracy.toFixed(0)}%`} color="text-neon-green" />
            <Stat icon={Clock} label="TIME" value={`${stats.elapsed_seconds.toFixed(0)}s`} color="text-white" />
            <Stat icon={AlertTriangle} label="ERR" value={stats.errors} color="text-neon-magenta" />
          </div>
        </div>
        {/* Progress */}
        <div className="mt-4 hp-bar-shell">
          <div className="hp-bar-fill !bg-gradient-to-r !from-neon-cyan !to-neon-cyan/70" style={{ width: `${stats.progress * 100}%`, boxShadow: "0 0 12px rgba(0,240,255,0.5)" }} />
        </div>
      </div>

      {/* Typing area */}
      {!isComplete ? (
        <div className="dojo-card !p-8" data-testid="typing-area-wrapper">
          <TypingEngine
            key={resetKey}
            text={text}
            onProgress={setStats}
            onComplete={onComplete}
            active={!isComplete}
          />
          <div className="mt-8 text-center text-xs uppercase tracking-[0.3em] text-zinc-500">
            Click anywhere here, then start typing. Backspace allowed.
          </div>
        </div>
      ) : (
        <ResultsCard finalStats={finalStats} result={result} onRetry={reset} mode={mode} />
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5">
        <Icon size={14} className={color} />
        <span className="label-xs">{label}</span>
      </div>
      <div className={`font-display text-3xl tracking-tight ${color}`}>{value}</div>
    </div>
  );
}

function ResultsCard({ finalStats, result, onRetry, mode }) {
  return (
    <div data-testid="results-card" className="hud-frame p-10 grain text-center">
      <div className="label-xs mb-2 text-neon-cyan">// TRIAL.COMPLETE</div>
      <h2 className="font-display text-6xl tracking-tighter uppercase mb-8 text-glow-cyan">Victory</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <ResultStat label="WPM" value={finalStats.wpm.toFixed(1)} color="text-neon-cyan" testid="result-wpm" />
        <ResultStat label="Accuracy" value={`${finalStats.accuracy.toFixed(1)}%`} color="text-neon-green" testid="result-accuracy" />
        <ResultStat label="Time" value={`${finalStats.elapsed_seconds.toFixed(1)}s`} color="text-white" testid="result-time" />
        <ResultStat label="Errors" value={finalStats.errors} color="text-neon-magenta" testid="result-errors" />
      </div>
      {result && (
        <div className="border-t border-white/10 pt-6 mb-8">
          <div className="font-mono text-lg text-neon-orange" data-testid="result-xp">+{result.xp_gain} XP</div>
          <div className="text-sm text-zinc-400 mt-1">
            {result.level_up && <span className="text-neon-cyan font-display tracking-wider"> LEVEL UP! </span>}
            Now LV.{result.new_level} · Streak: {result.streak}d
          </div>
          {result.new_achievements?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center" data-testid="new-achievements">
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
        <button onClick={onRetry} data-testid="results-retry" className="btn-neon inline-flex items-center gap-2">
          <RefreshCw size={16} /> Try Again
        </button>
        <Link to={mode === "lesson" ? "/lessons" : "/quotes"} data-testid="results-back" className="btn-ghost">Back to {mode === "lesson" ? "Lessons" : "Quotes"}</Link>
        <Link to="/dashboard" data-testid="results-dashboard" className="btn-ghost">Dashboard</Link>
      </div>
    </div>
  );
}

function ResultStat({ label, value, color, testid }) {
  return (
    <div data-testid={testid}>
      <div className="label-xs mb-1">{label}</div>
      <div className={`font-display text-4xl tracking-tight ${color}`}>{value}</div>
    </div>
  );
}

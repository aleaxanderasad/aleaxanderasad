import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import TypingEngine from "@/components/TypingEngine";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarCheck, Zap, Target, Clock, AlertTriangle, RefreshCw, Trophy, CheckCircle2 } from "lucide-react";
import { sounds } from "@/lib/sounds";
import { toast } from "sonner";

export default function DailyChallenge() {
  const { refresh } = useAuth();
  const [daily, setDaily] = useState(null);
  const [status, setStatus] = useState(null);
  const [active, setActive] = useState(false);
  const [stats, setStats] = useState({ wpm: 0, accuracy: 100, elapsed_seconds: 0, errors: 0, characters_typed: 0, progress: 0 });
  const [finalStats, setFinalStats] = useState(null);
  const [result, setResult] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    (async () => {
      const [d, s] = await Promise.all([
        api.get("/daily"),
        api.get("/daily/status"),
      ]);
      setDaily(d.data);
      setStatus(s.data);
    })();
  }, []);

  const onComplete = useCallback(async (s) => {
    setFinalStats(s);
    setActive(false);
    sounds.victory();
    try {
      const { data } = await api.post("/sessions", {
        mode: "daily",
        item_id: daily.date,
        item_title: daily.title,
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
      setStatus({ ...status, completed_today: true });
    } catch {
      toast.error("Could not save session.");
    }
  }, [daily, status, refresh]);

  if (!daily) return <div className="p-12 text-center font-display text-3xl text-neon-cyan animate-pulse">LOADING DAILY...</div>;

  return (
    <div data-testid="daily-page" className="max-w-5xl mx-auto px-6 py-10 scanlines">
      <div className="mb-8 flex flex-wrap items-end gap-6 justify-between">
        <div>
          <div className="label-xs mb-2 text-neon-orange flex items-center gap-2"><CalendarCheck size={14}/> // DAILY.CHALLENGE</div>
          <h1 className="font-display text-5xl sm:text-7xl tracking-tighter uppercase">{daily.title}</h1>
          <p className="text-zinc-400 mt-3 font-body">A single passage. Once per day. <span className="text-neon-orange">2× XP</span> reward.</p>
        </div>
        {status?.completed_today && !finalStats && (
          <div data-testid="daily-completed-badge" className="flex items-center gap-2 px-4 py-2 border border-neon-green/40 text-neon-green text-xs uppercase tracking-[0.2em]">
            <CheckCircle2 size={14}/> Completed Today
          </div>
        )}
      </div>

      {!active && !finalStats && (
        <div className="hud-frame p-8 grain text-center">
          <p className="font-body text-lg text-zinc-300 max-w-2xl mx-auto italic mb-6">"{daily.passage}"</p>
          <button
            onClick={() => { setActive(true); setResetKey((k)=>k+1); sounds.raceStart(); }}
            data-testid="daily-begin-button"
            className="btn-neon"
          >
            {status?.completed_today ? "Re-Type (no extra XP)" : "Begin Daily Trial"}
          </button>
        </div>
      )}

      {active && (
        <>
          <div className="hud-frame p-6 mb-6 grain">
            <div className="grid grid-cols-4 gap-4">
              <Stat icon={Zap} label="WPM" value={stats.wpm.toFixed(0)} color="text-neon-cyan" />
              <Stat icon={Target} label="ACC" value={`${stats.accuracy.toFixed(0)}%`} color="text-neon-green" />
              <Stat icon={Clock} label="TIME" value={`${stats.elapsed_seconds.toFixed(0)}s`} color="text-white" />
              <Stat icon={AlertTriangle} label="ERR" value={stats.errors} color="text-neon-magenta" />
            </div>
            <div className="mt-4 hp-bar-shell">
              <div className="hp-bar-fill !bg-gradient-to-r !from-neon-orange !to-neon-orange/70" style={{ width: `${stats.progress * 100}%`, boxShadow: "0 0 12px rgba(255,94,0,0.5)" }} />
            </div>
          </div>
          <div className="dojo-card !p-8" data-testid="daily-typing-area">
            <TypingEngine key={resetKey} text={daily.passage} onProgress={setStats} onComplete={onComplete} active />
          </div>
        </>
      )}

      {finalStats && (
        <div data-testid="daily-results" className="hud-frame p-10 grain text-center">
          <div className="label-xs mb-2 text-neon-orange">// DAILY.COMPLETE</div>
          <h2 className="font-display text-6xl tracking-tighter uppercase mb-2 text-glow-cyan">Trial Cleared</h2>
          <div className="text-neon-orange text-xs tracking-[0.3em] uppercase mb-8">2× XP Reward</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div><div className="label-xs">WPM</div><div className="font-display text-4xl text-neon-cyan">{finalStats.wpm.toFixed(1)}</div></div>
            <div><div className="label-xs">Accuracy</div><div className="font-display text-4xl text-neon-green">{finalStats.accuracy.toFixed(1)}%</div></div>
            <div><div className="label-xs">Time</div><div className="font-display text-4xl text-white">{finalStats.elapsed_seconds.toFixed(1)}s</div></div>
            <div><div className="label-xs">Errors</div><div className="font-display text-4xl text-neon-magenta">{finalStats.errors}</div></div>
          </div>
          {result && (
            <div className="border-t border-white/10 pt-6 mb-8">
              <div className="font-mono text-xl text-neon-orange" data-testid="daily-xp">+{result.xp_gain} XP (2× bonus)</div>
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
            <Link to="/dashboard" data-testid="daily-back-dashboard" className="btn-neon">Back to Dashboard</Link>
            <button onClick={() => { setFinalStats(null); setResult(null); setActive(true); setResetKey((k)=>k+1); }} data-testid="daily-retry" className="btn-ghost inline-flex items-center gap-2"><RefreshCw size={14}/> Try Again</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5"><Icon size={12} className={color}/><span className="label-xs">{label}</span></div>
      <div className={`font-display text-2xl ${color}`}>{value}</div>
    </div>
  );
}

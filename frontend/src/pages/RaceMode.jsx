import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import TypingEngine from "@/components/TypingEngine";
import { useAuth } from "@/contexts/AuthContext";
import { Flag, RefreshCw, Trophy, Zap } from "lucide-react";
import { sounds } from "@/lib/sounds";
import { toast } from "sonner";

const TICK_MS = 100;

export default function RaceMode() {
  const { user, refresh } = useAuth();
  const [passage, setPassage] = useState("");
  const [bots, setBots] = useState([]);
  const [botProgress, setBotProgress] = useState({}); // id -> 0..1
  const [stats, setStats] = useState({ wpm: 0, accuracy: 100, elapsed_seconds: 0, errors: 0, characters_typed: 0, progress: 0 });
  const [stage, setStage] = useState("lobby"); // lobby | countdown | racing | done
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState(null);
  const [result, setResult] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const startTimeRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/race");
      setPassage(data.passage);
      setBots(data.bots);
    })();
    return () => clearInterval(tickRef.current);
  }, []);

  const startRace = () => {
    setStage("countdown");
    setCountdown(3);
    setWinner(null);
    setResult(null);
    setBotProgress(Object.fromEntries(bots.map((b) => [b.id, 0])));
    setStats({ wpm: 0, accuracy: 100, elapsed_seconds: 0, errors: 0, characters_typed: 0, progress: 0 });

    let n = 3;
    sounds.raceStart();
    const cd = setInterval(() => {
      n -= 1;
      setCountdown(n);
      if (n <= 0) {
        clearInterval(cd);
        beginRacing();
      }
    }, 1000);
  };

  const beginRacing = () => {
    setStage("racing");
    setResetKey((k) => k + 1);
    startTimeRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const elapsedMin = (Date.now() - startTimeRef.current) / 60000;
      setBotProgress((prev) => {
        const next = { ...prev };
        bots.forEach((b) => {
          // bot progress = (wpm * 5 chars/min * elapsed) / passageLength
          const charsTyped = b.wpm * 5 * elapsedMin;
          next[b.id] = Math.min(1, charsTyped / passage.length);
        });
        // detect first finisher among bots
        const finishedBot = bots.find((b) => next[b.id] >= 1);
        if (finishedBot && !winner) {
          // bot already crossed line — we'll resolve in onComplete or when user gives up
        }
        return next;
      });
    }, TICK_MS);
  };

  const endRace = useCallback(async (userProgress, finalUserStats) => {
    clearInterval(tickRef.current);
    setStage("done");

    // Determine winner: highest progress at this moment
    const all = [
      { id: "you", name: user?.name || "You", progress: userProgress, wpm: finalUserStats?.wpm || stats.wpm },
      ...bots.map((b) => ({ id: b.id, name: b.name, progress: botProgress[b.id] || 0, wpm: b.wpm })),
    ];
    all.sort((a, b) => b.progress - a.progress);
    const placement = all.findIndex((x) => x.id === "you") + 1;
    const won = placement === 1;
    setWinner({ placement, all });

    if (won) sounds.victory(); else sounds.defeat();

    if (finalUserStats) {
      try {
        const { data } = await api.post("/sessions", {
          mode: "race",
          item_id: "race",
          item_title: `Race · #${placement}`,
          wpm: finalUserStats.wpm,
          accuracy: finalUserStats.accuracy,
          duration_seconds: finalUserStats.elapsed_seconds,
          characters_typed: finalUserStats.characters_typed,
          errors: finalUserStats.errors,
          won,
        });
        setResult(data);
        refresh();
        if (data.level_up) { sounds.levelUp(); toast.success(`LEVEL UP — LV.${data.new_level}`); }
        if (data.new_achievements?.length) { sounds.achievement(); toast.success(`Achievement: ${data.achievements_meta.map(a=>a.name).join(", ")}`); }
      } catch {
        toast.error("Race save failed.");
      }
    }
  }, [bots, botProgress, stats.wpm, user, refresh]);

  const onProgress = (s) => {
    setStats(s);
    // If any bot has already reached 100%, we let user keep going but a bot will win if they finish later.
  };

  const onComplete = (s) => endRace(1.0, s);

  const giveUp = () => {
    endRace(stats.progress, stats);
  };

  return (
    <div data-testid="race-page" className="max-w-5xl mx-auto px-6 py-10 scanlines">
      <div className="mb-8">
        <div className="label-xs mb-2 text-neon-magenta flex items-center gap-2"><Flag size={14}/> // RACE.SECTOR</div>
        <h1 className="font-display text-5xl sm:text-7xl tracking-tighter uppercase">Race the <span className="text-neon-magenta">Bots</span></h1>
        <p className="text-zinc-400 mt-3 font-body max-w-2xl">Three opponents. One passage. First to the end wins +100 XP bonus.</p>
      </div>

      {/* Lobby */}
      {stage === "lobby" && (
        <div className="hud-frame p-8 grain">
          <div className="label-xs mb-4">// OPPONENTS</div>
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {bots.map((b) => (
              <div key={b.id} data-testid={`race-bot-${b.id}`} className="dojo-card !p-4 flex items-center gap-3">
                <img src={b.avatar} alt={b.name} className="w-12 h-12 border" style={{ borderColor: b.color }} />
                <div>
                  <div className="font-display text-lg tracking-wide uppercase">{b.name}</div>
                  <div className="text-xs font-mono" style={{ color: b.color }}>{b.wpm} WPM</div>
                </div>
              </div>
            ))}
          </div>
          <div className="font-mono text-sm text-zinc-400 mb-6 italic">"{passage.slice(0, 100)}..."</div>
          <button onClick={startRace} data-testid="race-start-button" className="btn-neon">Start Race</button>
        </div>
      )}

      {/* Countdown */}
      {stage === "countdown" && (
        <div data-testid="race-countdown" className="hud-frame p-16 text-center grain">
          <div className="label-xs mb-4">// RACE.STARTS.IN</div>
          <div className="font-display text-9xl text-neon-cyan text-glow-cyan animate-pulse-glow">{countdown || "GO"}</div>
        </div>
      )}

      {/* Racing */}
      {(stage === "racing" || stage === "done") && (
        <>
          <div className="hud-frame p-6 mb-6 grain" data-testid="race-track">
            <Track name={user?.name || "YOU"} avatar={user?.avatar} progress={stats.progress} color="#00F0FF" isYou wpm={stats.wpm.toFixed(0)} />
            {bots.map((b) => (
              <Track key={b.id} testid={`race-track-${b.id}`} name={b.name} avatar={b.avatar} progress={botProgress[b.id] || 0} color={b.color} wpm={b.wpm} />
            ))}
          </div>

          {stage === "racing" && (
            <div className="dojo-card !p-8" data-testid="race-typing-area">
              <TypingEngine key={resetKey} text={passage} onProgress={onProgress} onComplete={onComplete} active />
              <div className="mt-6 text-center">
                <button onClick={giveUp} className="text-xs uppercase tracking-[0.2em] text-zinc-500 hover:text-neon-magenta">Forfeit Race</button>
              </div>
            </div>
          )}

          {stage === "done" && winner && (
            <div data-testid="race-result" className="hud-frame p-10 grain text-center">
              <div className="label-xs mb-2">// RACE.COMPLETE</div>
              <h2 className={`font-display text-6xl tracking-tighter uppercase mb-6 ${winner.placement === 1 ? "text-neon-cyan text-glow-cyan" : "text-neon-magenta"}`}>
                {winner.placement === 1 ? "Victory" : `#${winner.placement} Place`}
              </h2>
              <div className="space-y-2 max-w-md mx-auto mb-8">
                {winner.all.map((r, i) => (
                  <div key={r.id} className={`flex items-center justify-between px-4 py-2 border ${r.id === "you" ? "border-neon-cyan bg-neon-cyan/10" : "border-white/10"}`}>
                    <span className="font-mono text-sm">#{i+1} {r.name}</span>
                    <span className="font-mono text-xs text-zinc-400">{(r.progress * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              {result && (
                <div className="border-t border-white/10 pt-6 mb-6">
                  <div className="font-mono text-lg text-neon-orange" data-testid="race-xp">+{result.xp_gain} XP</div>
                  <div className="text-sm text-zinc-400 mt-1">LV.{result.new_level}</div>
                </div>
              )}
              <div className="flex flex-wrap gap-3 justify-center">
                <button onClick={startRace} data-testid="race-rematch" className="btn-neon inline-flex items-center gap-2"><RefreshCw size={14}/> Rematch</button>
                <Link to="/dashboard" data-testid="race-back" className="btn-ghost">Dashboard</Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Track({ name, avatar, progress, color, isYou = false, wpm, testid }) {
  return (
    <div className="mb-3 last:mb-0" data-testid={testid}>
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className={isYou ? "text-neon-cyan" : "text-zinc-400"}>{isYou ? "▶ " : ""}{name}{isYou && " (YOU)"}</span>
        <span className="text-zinc-500">{wpm} WPM · {(progress * 100).toFixed(0)}%</span>
      </div>
      <div className="relative h-10 bg-ink-900 border border-white/10">
        {/* finish line */}
        <div className="absolute right-0 top-0 bottom-0 w-1" style={{ background: "repeating-linear-gradient(0deg, #fff 0 6px, #000 6px 12px)" }} />
        {/* avatar marker */}
        <img
          src={avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${name}`}
          alt=""
          className="absolute top-1/2 w-9 h-9 -translate-y-1/2 border-2 transition-all duration-100"
          style={{ left: `calc(${Math.min(100, progress * 100)}% - 18px)`, borderColor: color, boxShadow: `0 0 12px ${color}` }}
        />
      </div>
    </div>
  );
}

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import TypingEngine from "@/components/TypingEngine";
import { useAuth } from "@/contexts/AuthContext";
import { Skull, Zap, Target, Heart, ArrowLeft, RefreshCw, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function BossFight() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [bosses, setBosses] = useState([]);
  const [boss, setBoss] = useState(null);
  const [bossHp, setBossHp] = useState(0);
  const [maxHp, setMaxHp] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [active, setActive] = useState(false);
  const [stats, setStats] = useState({ wpm: 0, accuracy: 100, elapsed_seconds: 0, errors: 0, characters_typed: 0, progress: 0 });
  const [finished, setFinished] = useState(null); // { won, finalStats, result }
  const [flashRed, setFlashRed] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const timerRef = useRef(null);

  // Load bosses list when no id
  useEffect(() => {
    (async () => {
      if (id) {
        try {
          const { data } = await api.get(`/bosses/${id}`);
          setBoss(data);
          setBossHp(data.hp);
          setMaxHp(data.hp);
          setTimeLeft(data.time_limit);
        } catch { navigate("/boss"); }
      } else {
        const { data } = await api.get("/bosses");
        setBosses(data);
      }
    })();
    return () => clearInterval(timerRef.current);
  }, [id, navigate, resetKey]);

  const damageBoss = useCallback((dmg) => {
    setBossHp((hp) => Math.max(0, hp - dmg));
  }, []);

  const startFight = () => {
    if (!boss) return;
    setActive(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const endFight = useCallback(async (won, finalStats) => {
    clearInterval(timerRef.current);
    setActive(false);
    try {
      const { data } = await api.post("/sessions", {
        mode: "boss",
        item_id: boss.id,
        item_title: boss.name,
        wpm: finalStats.wpm,
        accuracy: finalStats.accuracy,
        duration_seconds: finalStats.elapsed_seconds,
        characters_typed: finalStats.characters_typed,
        errors: finalStats.errors,
        won,
      });
      setFinished({ won, finalStats, result: data });
      refresh();
      if (won) toast.success(`${boss.name} DEFEATED`);
      else toast.error(`${boss.name} survived. Try again.`);
    } catch {
      setFinished({ won, finalStats, result: null });
    }
  }, [boss, refresh]);

  // When boss HP reaches 0 → win
  useEffect(() => {
    if (active && bossHp <= 0 && boss) {
      endFight(true, { ...stats, characters_typed: stats.characters_typed || 1 });
    }
  }, [bossHp, active, boss, stats, endFight]);

  // When time runs out
  useEffect(() => {
    if (active && timeLeft <= 0 && boss) {
      endFight(false, stats);
    }
  }, [timeLeft, active, boss, stats, endFight]);

  const onProgress = (s) => {
    setStats(s);
    // damage based on progress delta
    const lastProgress = stats.progress || 0;
    const delta = s.progress - lastProgress;
    if (delta > 0) {
      const meetsAcc = s.accuracy >= boss.min_accuracy;
      const meetsSpd = s.wpm >= boss.min_wpm;
      const multiplier = meetsAcc && meetsSpd ? 1.5 : (meetsAcc || meetsSpd ? 1.0 : 0.6);
      damageBoss(Math.ceil(delta * maxHp * multiplier));
    }
  };

  const onError = () => {
    setFlashRed(true);
    setTimeout(() => setFlashRed(false), 180);
  };

  const onComplete = (s) => {
    // Looping logic: passage finished, but boss may still have HP. We auto-reset typing engine.
    if (bossHp > 0) {
      // continue with same text
      setResetKey((k) => k + 1);
    } else {
      endFight(true, s);
    }
  };

  const reset = () => {
    setFinished(null);
    setActive(false);
    setStats({ wpm: 0, accuracy: 100, elapsed_seconds: 0, errors: 0, characters_typed: 0, progress: 0 });
    setResetKey((k) => k + 1);
    if (boss) {
      setBossHp(boss.hp);
      setTimeLeft(boss.time_limit);
    }
  };

  // BOSS LIST
  if (!id) {
    return (
      <div data-testid="boss-list-page" className="max-w-6xl mx-auto px-6 py-10 scanlines">
        <div className="mb-10">
          <div className="label-xs mb-2 text-neon-magenta">// COMBAT.SECTOR</div>
          <h1 className="font-display text-5xl sm:text-7xl tracking-tighter uppercase">Boss <span className="text-neon-magenta">Fight</span></h1>
          <p className="text-zinc-400 mt-3 max-w-2xl font-body">Three bosses. Each demands speed AND accuracy. Survive the clock. Defeat the HP bar.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {bosses.map((b) => (
            <Link key={b.id} to={`/boss/${b.id}`} data-testid={`boss-card-${b.id}`} className="dojo-card group block">
              <Skull size={32} className="text-neon-magenta mb-3 group-hover:scale-110 transition" />
              <div className="font-display text-2xl tracking-wide uppercase mb-1">{b.name}</div>
              <div className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-4">{b.tier}</div>
              <div className="space-y-1 font-mono text-xs text-zinc-400">
                <div>HP: <span className="text-neon-magenta">{b.hp}</span></div>
                <div>Time: <span className="text-white">{b.time_limit}s</span></div>
                <div>Min WPM: <span className="text-neon-cyan">{b.min_wpm}</span></div>
                <div>Min ACC: <span className="text-neon-green">{b.min_accuracy}%</span></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (!boss) return <div className="p-12 text-center font-display text-3xl text-neon-cyan animate-pulse">SUMMONING BOSS...</div>;

  return (
    <div data-testid="boss-fight-page" className={`max-w-5xl mx-auto px-6 py-8 scanlines ${flashRed ? "ring-2 ring-neon-magenta" : ""} transition-all`}>
      <button onClick={() => navigate("/boss")} data-testid="boss-back" className="text-xs uppercase tracking-[0.2em] text-zinc-400 hover:text-neon-cyan flex items-center gap-2 mb-6">
        <ArrowLeft size={14} /> Retreat
      </button>

      {/* Boss HUD */}
      <div className="hud-frame p-6 mb-6 grain glow-magenta">
        <div className="flex items-center gap-4 mb-4">
          <Skull size={32} className="text-neon-magenta" />
          <div className="flex-1">
            <div className="label-xs">// BOSS.ENCOUNTER</div>
            <div className="font-display text-3xl tracking-tight uppercase text-glow-magenta">{boss.name}</div>
          </div>
          <div className="text-right">
            <div className="label-xs">Time</div>
            <div className={`font-display text-3xl ${timeLeft < 10 ? "text-neon-magenta animate-pulse" : "text-white"}`}>{timeLeft}s</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Heart size={14} className="text-neon-magenta" />
          <span className="label-xs flex-1">BOSS HP</span>
          <span className="font-mono text-xs text-neon-magenta">{bossHp} / {maxHp}</span>
        </div>
        <div className="hp-bar-shell"><div className="hp-bar-fill" style={{ width: `${(bossHp / maxHp) * 100}%` }} /></div>

        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-white/10">
          <MiniStat icon={Zap} label="WPM" value={stats.wpm.toFixed(0)} req={boss.min_wpm} color="text-neon-cyan" />
          <MiniStat icon={Target} label="ACC" value={`${stats.accuracy.toFixed(0)}%`} req={`${boss.min_accuracy}%`} color="text-neon-green" />
          <div><div className="label-xs">Damage Mult</div><div className="font-display text-xl text-neon-orange">{stats.accuracy >= boss.min_accuracy && stats.wpm >= boss.min_wpm ? "x1.5" : (stats.accuracy >= boss.min_accuracy || stats.wpm >= boss.min_wpm ? "x1.0" : "x0.6")}</div></div>
          <div><div className="label-xs">Errors</div><div className="font-display text-xl text-neon-magenta">{stats.errors}</div></div>
        </div>
      </div>

      {!active && !finished && (
        <div className="dojo-card text-center !p-10">
          <p className="text-zinc-300 font-body mb-6 max-w-xl mx-auto">
            Boss has <span className="text-neon-magenta">{boss.hp} HP</span>. You have <span className="text-white">{boss.time_limit}s</span>.
            Maintain ≥{boss.min_wpm} WPM AND ≥{boss.min_accuracy}% for max damage. Passage repeats until boss falls.
          </p>
          <button onClick={startFight} data-testid="boss-start-button" className="btn-neon">Engage</button>
        </div>
      )}

      {active && (
        <div className="dojo-card !p-8" data-testid="boss-typing-area">
          <TypingEngine
            key={resetKey}
            text={boss.text}
            onProgress={onProgress}
            onComplete={onComplete}
            onError={onError}
            active={active}
          />
        </div>
      )}

      {finished && (
        <div data-testid="boss-result" className="hud-frame p-10 grain text-center">
          <div className="label-xs mb-2">// COMBAT.RESULT</div>
          <h2 className={`font-display text-6xl tracking-tighter uppercase mb-6 ${finished.won ? "text-neon-cyan text-glow-cyan" : "text-neon-magenta text-glow-magenta"}`}>
            {finished.won ? "Victory" : "Defeated"}
          </h2>
          <div className="grid grid-cols-4 gap-4 mb-8 max-w-xl mx-auto">
            <div><div className="label-xs">WPM</div><div className="font-display text-3xl text-neon-cyan">{finished.finalStats.wpm.toFixed(1)}</div></div>
            <div><div className="label-xs">ACC</div><div className="font-display text-3xl text-neon-green">{finished.finalStats.accuracy.toFixed(1)}%</div></div>
            <div><div className="label-xs">Time</div><div className="font-display text-3xl text-white">{finished.finalStats.elapsed_seconds.toFixed(0)}s</div></div>
            <div><div className="label-xs">Errors</div><div className="font-display text-3xl text-neon-magenta">{finished.finalStats.errors}</div></div>
          </div>
          {finished.result && (
            <div className="mb-6">
              <div className="font-mono text-lg text-neon-orange" data-testid="boss-xp-gain">+{finished.result.xp_gain} XP</div>
              {finished.result.new_achievements?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  {finished.result.achievements_meta.map((a) => (
                    <span key={a.id} className="px-3 py-1 border border-neon-orange/40 text-neon-orange text-xs uppercase tracking-widest flex items-center gap-1.5">
                      <Trophy size={12} /> {a.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex justify-center gap-3">
            <button onClick={reset} data-testid="boss-retry" className="btn-neon inline-flex items-center gap-2"><RefreshCw size={14} /> Rematch</button>
            <Link to="/boss" data-testid="boss-back-to-list" className="btn-ghost">Back to Bosses</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, req, color }) {
  return (
    <div>
      <div className="flex items-center gap-1.5"><Icon size={12} className={color} /><span className="label-xs">{label}</span></div>
      <div className={`font-display text-xl ${color}`}>{value}</div>
      <div className="text-[10px] text-zinc-500 font-mono">req: {req}</div>
    </div>
  );
}

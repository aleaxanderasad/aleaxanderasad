import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Trophy, Lock, Sword, Zap, Flame, Bolt, Target, Calendar, Skull, Scroll } from "lucide-react";

const ICONS = { swords: Sword, zap: Zap, flame: Flame, bolt: Bolt, target: Target, calendar: Calendar, skull: Skull, scroll: Scroll };

export default function Achievements() {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await api.get("/achievements");
      setData(res.data);
    })();
  }, []);

  if (!data) return <div className="p-12 text-center font-display text-3xl text-neon-cyan animate-pulse">LOADING...</div>;

  const unlocked = new Set(data.unlocked);

  return (
    <div data-testid="achievements-page" className="max-w-6xl mx-auto px-6 py-10 scanlines">
      <div className="mb-10">
        <div className="label-xs mb-2 text-neon-orange">// HALL.OF.HONOR</div>
        <h1 className="font-display text-5xl sm:text-7xl tracking-tighter uppercase">Achievements</h1>
        <p className="text-zinc-400 mt-3 font-body">
          {unlocked.size} / {data.all.length} unlocked. Each badge marks a step on the path to mastery.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.all.map((a) => {
          const isUnlocked = unlocked.has(a.id);
          const Icon = ICONS[a.icon] || Trophy;
          return (
            <div
              key={a.id}
              data-testid={`achievement-${a.id}`}
              className={`dojo-card transition-all ${isUnlocked ? "border-neon-orange/50 glow-cyan" : "opacity-50"}`}
              style={isUnlocked ? { boxShadow: "0 0 20px rgba(255,94,0,0.25)" } : {}}
            >
              <div className={`mb-3 ${isUnlocked ? "text-neon-orange" : "text-zinc-600"}`}>
                {isUnlocked ? <Icon size={32} /> : <Lock size={32} />}
              </div>
              <div className="font-display text-xl tracking-wide uppercase mb-1">{a.name}</div>
              <div className="text-xs text-zinc-400 font-body">{a.desc}</div>
              {isUnlocked && <div className="text-[10px] text-neon-orange tracking-[0.3em] uppercase mt-3">// UNLOCKED</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

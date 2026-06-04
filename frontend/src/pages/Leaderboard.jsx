import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Zap, Star, Flame } from "lucide-react";

const METRICS = [
  { key: "wpm", label: "Best WPM", icon: Zap, color: "text-neon-cyan" },
  { key: "xp", label: "Total XP", icon: Star, color: "text-neon-orange" },
  { key: "streak", label: "Streak", icon: Flame, color: "text-neon-magenta" },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const [metric, setMetric] = useState("wpm");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await api.get(`/leaderboard?metric=${metric}`);
      setRows(data);
      setLoading(false);
    })();
  }, [metric]);

  const metricMeta = METRICS.find((m) => m.key === metric);

  return (
    <div data-testid="leaderboard-page" className="max-w-5xl mx-auto px-6 py-10 scanlines">
      <div className="mb-8">
        <div className="label-xs mb-2 text-neon-cyan">// GLOBAL.RANKING</div>
        <h1 className="font-display text-5xl sm:text-7xl tracking-tighter uppercase">Leaderboard</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {METRICS.map((m) => (
          <button
            key={m.key}
            data-testid={`leaderboard-tab-${m.key}`}
            onClick={() => setMetric(m.key)}
            className={`px-4 py-2 text-xs uppercase tracking-[0.2em] font-heading transition border ${
              metric === m.key
                ? "bg-neon-cyan text-black border-neon-cyan"
                : "bg-transparent text-zinc-400 border-white/10 hover:border-neon-cyan"
            }`}
          >
            <m.icon size={14} className="inline mr-2" /> {m.label}
          </button>
        ))}
      </div>

      <div className="dojo-card !p-0 overflow-hidden">
        {loading ? <div className="p-10 text-center text-zinc-500 font-mono">Loading rankings...</div> :
          <table className="w-full" data-testid="leaderboard-table">
            <thead>
              <tr className="bg-ink-700 text-left text-xs uppercase tracking-[0.2em] text-zinc-400">
                <th className="px-4 py-3 w-16">#</th>
                <th className="px-4 py-3">Disciple</th>
                <th className="px-4 py-3 text-right">LV</th>
                <th className="px-4 py-3 text-right">{metricMeta.label}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={4} className="p-10 text-center text-zinc-500 font-mono">No disciples yet. Be the first.</td></tr>
              )}
              {rows.map((r, i) => {
                const isMe = user && r.id === user.id;
                const valueKey = metric === "wpm" ? "best_wpm" : metric;
                const value = metric === "wpm" ? r.best_wpm.toFixed(1) : r[valueKey];
                return (
                  <tr key={r.id} data-testid={`leaderboard-row-${i}`} className={`border-t border-white/5 transition ${isMe ? "bg-neon-cyan/10" : "hover:bg-white/5"}`}>
                    <td className="px-4 py-3">
                      {i === 0 ? <Trophy size={18} className="text-neon-orange" /> :
                       i === 1 ? <Trophy size={18} className="text-zinc-300" /> :
                       i === 2 ? <Trophy size={18} className="text-amber-700" /> :
                       <span className="font-mono text-zinc-500">{String(i + 1).padStart(2, "0")}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={r.avatar} alt="" className="w-8 h-8 border border-white/15" />
                        <span className={`font-display tracking-wider uppercase ${isMe ? "text-neon-cyan text-glow-cyan" : ""}`}>{r.name}{isMe && " (YOU)"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neon-cyan">LV.{r.level}</td>
                    <td className={`px-4 py-3 text-right font-display text-2xl ${metricMeta.color}`}>{value}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
      </div>
    </div>
  );
}

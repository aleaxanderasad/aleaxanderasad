import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, Target, Clock, AlertTriangle, Calendar } from "lucide-react";

const HEADER_BG = "https://images.unsplash.com/photo-1650502151014-8aef95a211c7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHw0fHxhbmltZSUyMGxhbmRzY2FwZSUyMHNjZW5lcnklMjBuaWdodHxlbnwwfHx8fDE3ODA1NDM4MzB8MA&ixlib=rb-4.1.0&q=85";

export default function Profile() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/sessions/history");
      setHistory(data);
    })();
  }, []);

  if (!user) return null;

  return (
    <div data-testid="profile-page" className="max-w-5xl mx-auto pb-12 scanlines">
      {/* Banner */}
      <div className="relative h-56 overflow-hidden">
        <img src={HEADER_BG} alt="" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ink-900" />
      </div>

      <div className="px-6 -mt-20 relative">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-8">
          <img src={user.avatar} alt={user.name} className="w-32 h-32 border-2 border-neon-cyan glow-cyan" />
          <div className="flex-1 pb-2">
            <div className="label-xs">// DISCIPLE.PROFILE</div>
            <h1 className="font-display text-5xl sm:text-6xl tracking-tighter uppercase">{user.name}</h1>
            <div className="font-mono text-sm text-zinc-400 mt-1">{user.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat label="Level" value={user.level} color="text-neon-cyan" />
          <Stat label="Best WPM" value={user.best_wpm.toFixed(1)} color="text-neon-green" />
          <Stat label="Total XP" value={user.xp} color="text-neon-orange" />
          <Stat label="Streak" value={`${user.streak}d`} color="text-neon-magenta" />
        </div>

        <div className="dojo-card !p-0 overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="label-xs">// SESSION.HISTORY ({history.length})</div>
            <Calendar size={14} className="text-zinc-500" />
          </div>
          {history.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 font-mono">No sessions yet. Start your first trial.</div>
          ) : (
            <table className="w-full" data-testid="profile-history-table">
              <thead>
                <tr className="bg-ink-700 text-left text-xs uppercase tracking-[0.2em] text-zinc-400">
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3 text-right">WPM</th>
                  <th className="px-4 py-3 text-right">ACC</th>
                  <th className="px-4 py-3 text-right">XP</th>
                  <th className="px-4 py-3 text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {history.map((s, i) => (
                  <tr key={s.id || i} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-mono text-xs uppercase">{s.mode}{s.won === false ? " ✕" : s.won === true ? " ✓" : ""}</td>
                    <td className="px-4 py-3 text-sm text-zinc-300 truncate max-w-[200px]">{s.item_title || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-neon-cyan">{s.wpm.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right font-mono text-neon-green">{s.accuracy.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-mono text-neon-orange">+{s.xp_gain}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-zinc-500">{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="dojo-card !p-5">
      <div className="label-xs mb-1">{label}</div>
      <div className={`font-display text-4xl tracking-tight ${color}`}>{value}</div>
    </div>
  );
}

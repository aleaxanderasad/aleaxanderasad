import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Zap, Flame, Trophy, Target, BookOpen, Quote as QuoteIcon, Skull, ArrowRight } from "lucide-react";

const xpForLevel = (lvl) => 100 * lvl * lvl;

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/stats/me");
        setStats(data);
        refresh();
      } catch (err) {
        console.error("Failed to load dashboard stats:", err.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !stats) {
    return <div data-testid="dashboard-loading" className="p-12 text-center font-display text-3xl text-neon-cyan animate-pulse">LOADING...</div>;
  }

  const u = stats.user;
  const xpFloor = xpForLevel(u.level - 1) || 0;
  const xpCeil = xpForLevel(u.level);
  const xpProgress = ((u.xp - xpFloor) / (xpCeil - xpFloor)) * 100;

  const chartData = stats.sessions.map((s, i) => ({
    n: i + 1,
    wpm: s.wpm,
    accuracy: s.accuracy,
  }));

  return (
    <div data-testid="dashboard-page" className="max-w-7xl mx-auto px-6 py-10 scanlines">
      {/* Hero strip */}
      <div className="hud-frame p-8 mb-8 grain">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <img src={u.avatar} alt={u.name} className="w-24 h-24 border-2 border-neon-cyan glow-cyan" />
          <div className="flex-1">
            <div className="label-xs mb-1">// DISCIPLE.PROFILE</div>
            <h1 className="font-display text-5xl tracking-tight uppercase">{u.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm font-mono">
              <span className="text-neon-cyan">LV.{u.level}</span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-300">{u.xp} XP</span>
              <span className="text-zinc-500">|</span>
              <span className="text-neon-orange flex items-center gap-1"><Flame size={14} /> {u.streak}d streak</span>
            </div>
          </div>
          <Link to="/lessons" data-testid="dashboard-start-cta" className="btn-neon inline-flex items-center gap-2">
            Continue Training <ArrowRight size={16} />
          </Link>
        </div>

        {/* XP bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs font-mono mb-1.5 text-zinc-400">
            <span>LV.{u.level}</span>
            <span>{u.xp - xpFloor} / {xpCeil - xpFloor} XP</span>
            <span>LV.{u.level + 1}</span>
          </div>
          <div className="hp-bar-shell">
            <div className="hp-bar-fill !bg-gradient-to-r !from-neon-cyan !to-neon-cyan/70" style={{ width: `${Math.min(100, xpProgress)}%`, boxShadow: "0 0 12px rgba(0,240,255,0.5)" }} />
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatTile label="Best WPM" value={u.best_wpm.toFixed(1)} icon={Zap} color="text-neon-cyan" testid="stat-best-wpm" />
        <StatTile label="Total Sessions" value={u.total_sessions} icon={Target} color="text-neon-magenta" testid="stat-total-sessions" />
        <StatTile label="Achievements" value={`${stats.achievements_unlocked.length}/${stats.all_achievements.length}`} icon={Trophy} color="text-neon-orange" testid="stat-achievements" />
        <StatTile label="Day Streak" value={u.streak} icon={Flame} color="text-neon-green" testid="stat-streak" />
      </div>

      {/* Chart + Quick links */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 dojo-card" data-testid="dashboard-chart">
          <div className="label-xs mb-4">// WPM.HISTORY (last {chartData.length})</div>
          {chartData.length === 0 ? (
            <div className="text-zinc-500 py-12 text-center font-mono">No sessions yet. Start your first lesson.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis dataKey="n" stroke="#52525B" tick={{ fontFamily: "JetBrains Mono", fontSize: 11 }} />
                <YAxis stroke="#52525B" tick={{ fontFamily: "JetBrains Mono", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0A0A0A", border: "1px solid #00F0FF", fontFamily: "JetBrains Mono" }} />
                <Line type="monotone" dataKey="wpm" stroke="#00F0FF" strokeWidth={2} dot={{ fill: "#00F0FF", r: 3 }} />
                <Line type="monotone" dataKey="accuracy" stroke="#FF003C" strokeWidth={2} dot={{ fill: "#FF003C", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="space-y-4">
          <QuickLink to="/lessons" icon={BookOpen} title="Lessons" desc="12 tiered trials" testid="quick-lessons" />
          <QuickLink to="/quotes" icon={QuoteIcon} title="Anime Quotes" desc="Type iconic lines" testid="quick-quotes" />
          <QuickLink to="/boss" icon={Skull} title="Boss Fight" desc="Defeat the void" testid="quick-boss" />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, color, testid }) {
  return (
    <div data-testid={testid} className="dojo-card !p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="label-xs">{label}</span>
        <Icon size={16} className={color} />
      </div>
      <div className={`font-display text-4xl tracking-tight ${color}`}>{value}</div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, desc, testid }) {
  return (
    <Link to={to} data-testid={testid} className="dojo-card flex items-center gap-4 group">
      <Icon size={24} className="text-neon-cyan group-hover:scale-110 transition" />
      <div className="flex-1">
        <div className="font-display text-xl tracking-wide uppercase">{title}</div>
        <div className="text-xs text-zinc-400 font-body">{desc}</div>
      </div>
      <ArrowRight size={16} className="text-zinc-500 group-hover:text-neon-cyan transition" />
    </Link>
  );
}

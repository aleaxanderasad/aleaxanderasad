import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sword, Zap, Trophy, Flame, Target, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const HERO_BG = "https://images.unsplash.com/photo-1707999464758-0ad86b14290f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHwyfHxjeWJlcnB1bmslMjBjaXR5JTIwbmVvbiUyMGRhcmt8ZW58MHx8fHwxNzgwNTQzODMwfDA&ixlib=rb-4.1.0&q=85";
const QUOTE_BG = "https://images.pexels.com/photos/28122495/pexels-photo-28122495.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const features = [
  { icon: BookOpen, label: "Tiered Lessons", desc: "Home row → Symbols → Speed. Beginner to Master in 12 trials." },
  { icon: Zap, label: "Live Combat HUD", desc: "WPM, accuracy, error glow. Every keystroke is a strike." },
  { icon: Sword, label: "Boss Battles", desc: "Defeat Cyber Samurai, Void Sensei. Speed depletes their HP." },
  { icon: Trophy, label: "Global Ranking", desc: "Climb the dojo leaderboard. Top 20 are immortalized." },
  { icon: Flame, label: "Daily Streaks", desc: "Train every dawn. Your fire grows with each session." },
  { icon: Target, label: "XP & Levels", desc: "Earn XP per session. Unlock 8 anime-styled achievements." },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="scanlines">
      {/* HERO */}
      <section data-testid="hero-section" className="relative min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-900/50 via-ink-900/80 to-ink-900" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8">
            <div className="label-xs mb-4 flex items-center gap-3" data-testid="hero-tagline">
              <span className="w-8 h-px bg-neon-cyan" />
              ENTER THE NEO-TOKYO DOJO
            </div>
            <h1 className="font-display text-6xl sm:text-8xl lg:text-9xl leading-[0.9] tracking-tighter uppercase mb-6">
              <span className="block">Master the</span>
              <span className="block text-neon-cyan text-glow-cyan">Keystroke</span>
              <span className="block">Become the <span className="text-neon-magenta text-glow-magenta">Legend</span></span>
            </h1>
            <p className="text-zinc-300 text-lg max-w-xl mb-10 leading-relaxed font-body">
              A typing dojo forged in the heart of an anime universe. Train through 12 tiered lessons, battle bosses,
              and climb the global ranking — one keystroke at a time.
            </p>
            <div className="flex flex-wrap gap-4">
              {user ? (
                <Link to="/dashboard" data-testid="hero-cta-dashboard" className="btn-neon inline-flex items-center gap-2">
                  Enter Dashboard <ArrowRight size={18} />
                </Link>
              ) : (
                <>
                  <Link to="/register" data-testid="hero-cta-register" className="btn-neon inline-flex items-center gap-2">
                    Begin Training <ArrowRight size={18} />
                  </Link>
                  <Link to="/login" data-testid="hero-cta-login" className="btn-ghost">
                    I Have an Account
                  </Link>
                </>
              )}
            </div>

            <div className="mt-16 flex gap-10 text-left">
              <div><div className="font-display text-4xl text-neon-cyan">12</div><div className="label-xs">Trials</div></div>
              <div><div className="font-display text-4xl text-neon-magenta">3</div><div className="label-xs">Bosses</div></div>
              <div><div className="font-display text-4xl text-neon-orange">8</div><div className="label-xs">Achievements</div></div>
            </div>
          </div>

          <div className="lg:col-span-4 hidden lg:block">
            <div className="hud-frame p-8 grain">
              <div className="label-xs mb-4">// SYSTEM.READOUT</div>
              <div className="font-mono text-sm text-zinc-400 space-y-2">
                <div><span className="text-neon-cyan">[OK]</span> Dojo network online</div>
                <div><span className="text-neon-cyan">[OK]</span> Keystroke sensor armed</div>
                <div><span className="text-neon-cyan">[OK]</span> Boss AI initialized</div>
                <div><span className="text-neon-magenta">[!]</span> Awaiting next trainee...</div>
              </div>
              <div className="divider-neon my-6" />
              <div className="font-mono text-xs text-zinc-500">
                <div>// 2.4k+ keystrokes/min recorded</div>
                <div>// peak WPM: 142</div>
                <div>// active disciples: 0341</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section data-testid="features-section" className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 max-w-2xl">
            <div className="label-xs mb-4">// 0X.01 — CAPABILITIES</div>
            <h2 className="font-display text-5xl sm:text-7xl tracking-tighter uppercase">
              Train Like<br/><span className="text-neon-cyan text-glow-cyan">An Anime Protagonist</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10">
            {features.map((f) => (
              <div key={f.label} className="bg-ink-900 p-8 hover:bg-ink-800 transition-all duration-300 group">
                <f.icon className="text-neon-cyan mb-4 group-hover:text-glow-cyan group-hover:scale-110 transition-transform" size={28} />
                <div className="font-display text-2xl tracking-wide uppercase mb-2">{f.label}</div>
                <div className="text-zinc-400 text-sm leading-relaxed font-body">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTES BANNER */}
      <section data-testid="quotes-banner" className="relative py-24 px-6 overflow-hidden border-t border-b border-white/10">
        <div className="absolute inset-0">
          <img src={QUOTE_BG} alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-ink-900/70" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="label-xs mb-6 text-neon-magenta">// QUOTE.MODE</div>
          <p className="font-display text-4xl sm:text-6xl tracking-tight uppercase leading-tight mb-6">
            "If you don't take risks, <span className="text-neon-cyan">you can't create a future</span>."
          </p>
          <p className="text-zinc-400 text-sm tracking-[0.3em] uppercase">— Monkey D. Luffy, One Piece</p>
          <Link to={user ? "/quotes" : "/register"} data-testid="quotes-banner-cta" className="btn-ghost mt-10 inline-block">
            Type Iconic Anime Quotes
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-5xl sm:text-7xl tracking-tighter uppercase mb-6">
            Your <span className="text-neon-magenta">Keyboard</span> is a <span className="text-neon-cyan">Katana</span>
          </h2>
          <p className="text-zinc-300 text-lg mb-10 font-body">Sharpen it in the dojo. Free, unlimited training, anime-styled forever.</p>
          {user ? (
            <Link to="/dashboard" data-testid="cta-dashboard" className="btn-neon inline-flex items-center gap-2">
              Continue Training <ArrowRight size={18} />
            </Link>
          ) : (
            <Link to="/register" data-testid="cta-register" className="btn-neon inline-flex items-center gap-2">
              Forge Your Account <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 px-6 text-center text-xs text-zinc-500 tracking-[0.3em] uppercase">
        NeoType Dojo // Forged for typists, by typists
      </footer>
    </div>
  );
}

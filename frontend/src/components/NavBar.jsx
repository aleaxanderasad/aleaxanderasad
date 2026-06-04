import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Sword, User, Trophy, Flame, BookOpen, Quote, Skull, LayoutDashboard, Menu, X } from "lucide-react";

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lessons", label: "Lessons", icon: BookOpen },
  { to: "/quotes", label: "Quotes", icon: Quote },
  { to: "/boss", label: "Boss Fight", icon: Skull },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/achievements", label: "Achievements", icon: Flame },
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header data-testid="navbar" className="sticky top-0 z-50 backdrop-blur-xl bg-ink-800/70 border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2" data-testid="navbar-logo">
          <Sword className="text-neon-cyan" size={22} />
          <span className="font-display text-2xl tracking-widest text-glow-cyan">NEOTYPE</span>
          <span className="font-display text-xs tracking-[0.4em] text-neon-magenta ml-1">DOJO</span>
        </Link>

        {user && (
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                data-testid={`nav-${l.label.toLowerCase().replace(' ', '-')}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.18em] font-heading transition-all ${
                    isActive ? "text-neon-cyan text-glow-cyan" : "text-zinc-400 hover:text-white"
                  }`
                }
              >
                <l.icon size={14} />
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/profile" data-testid="navbar-profile" className="flex items-center gap-2 group">
                <img src={user.avatar} alt={user.name} className="w-9 h-9 border border-white/15 group-hover:border-neon-cyan transition" />
                <div className="hidden md:block text-right">
                  <div className="text-xs font-mono text-neon-cyan">LV.{user.level}</div>
                  <div className="text-[10px] tracking-widest uppercase text-zinc-400">{user.name}</div>
                </div>
              </Link>
              <button onClick={handleLogout} data-testid="navbar-logout" className="hidden md:flex btn-ghost !px-3 !py-2 text-xs items-center gap-2">
                <LogOut size={14} /> Exit
              </button>
              <button onClick={() => setMenuOpen(!menuOpen)} data-testid="navbar-mobile-menu" className="lg:hidden text-white">
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="navbar-login-link" className="btn-ghost text-xs !px-4 !py-2">Login</Link>
              <Link to="/register" data-testid="navbar-register-link" className="btn-neon text-xs !px-4 !py-2">Sign Up</Link>
            </>
          )}
        </div>
      </div>

      {user && menuOpen && (
        <div data-testid="mobile-menu" className="lg:hidden border-t border-white/10 bg-ink-900">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm uppercase tracking-wider ${
                  isActive ? "text-neon-cyan bg-white/5" : "text-zinc-300"
                }`
              }
            >
              <l.icon size={16} /> {l.label}
            </NavLink>
          ))}
          <button onClick={handleLogout} className="flex items-center gap-3 px-6 py-3 text-sm uppercase tracking-wider text-neon-magenta w-full text-left">
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </header>
  );
}

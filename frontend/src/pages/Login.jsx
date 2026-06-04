import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sword, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login, formatApiError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Welcome back, disciple.");
      navigate(from, { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-6 py-12 scanlines">
      <div data-testid="login-form-container" className="hud-frame w-full max-w-md p-10 grain">
        <div className="flex items-center gap-2 mb-8">
          <Sword className="text-neon-cyan" size={22} />
          <span className="label-xs">// LOGIN.PROTOCOL</span>
        </div>
        <h1 className="font-display text-5xl tracking-tight uppercase mb-2">Re-Enter the <span className="text-neon-cyan">Dojo</span></h1>
        <p className="text-zinc-400 text-sm mb-8 font-body">Resume your training. Your XP awaits.</p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="label-xs block mb-2">Email</label>
            <input
              data-testid="login-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-ink-900 border border-white/15 px-4 py-3 font-mono text-white focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_15px_rgba(0,240,255,0.25)] transition"
              placeholder="trainee@dojo.io"
            />
          </div>
          <div>
            <label className="label-xs block mb-2">Password</label>
            <input
              data-testid="login-password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-ink-900 border border-white/15 px-4 py-3 font-mono text-white focus:border-neon-cyan focus:outline-none focus:shadow-[0_0_15px_rgba(0,240,255,0.25)] transition"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div data-testid="login-error" className="flex items-start gap-2 text-neon-magenta text-sm border border-neon-magenta/40 bg-neon-magenta/10 p-3">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}
          <button
            data-testid="login-submit-button"
            type="submit"
            disabled={submitting}
            className="btn-neon w-full"
          >
            {submitting ? "Authenticating..." : "Engage"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-zinc-400">
          New trainee?{" "}
          <Link to="/register" data-testid="login-register-link" className="text-neon-cyan hover:text-glow-cyan">Forge an account</Link>
        </div>
      </div>
    </div>
  );
}

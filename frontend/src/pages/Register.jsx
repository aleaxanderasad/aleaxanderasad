import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sword, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { register, formatApiError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(email, password, name);
      toast.success("Your dojo profile is forged.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-6 py-12 scanlines">
      <div data-testid="register-form-container" className="hud-frame w-full max-w-md p-10 grain">
        <div className="flex items-center gap-2 mb-8">
          <Sword className="text-neon-magenta" size={22} />
          <span className="label-xs">// REGISTER.PROTOCOL</span>
        </div>
        <h1 className="font-display text-5xl tracking-tight uppercase mb-2">Forge Your <span className="text-neon-magenta">Path</span></h1>
        <p className="text-zinc-400 text-sm mb-8 font-body">Begin Trial 01 in less than 30 seconds.</p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="label-xs block mb-2">Disciple Name</label>
            <input
              data-testid="register-name-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-ink-900 border border-white/15 px-4 py-3 font-mono text-white focus:border-neon-cyan focus:outline-none transition"
              placeholder="Sasuke"
            />
          </div>
          <div>
            <label className="label-xs block mb-2">Email</label>
            <input
              data-testid="register-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-ink-900 border border-white/15 px-4 py-3 font-mono text-white focus:border-neon-cyan focus:outline-none transition"
              placeholder="trainee@dojo.io"
            />
          </div>
          <div>
            <label className="label-xs block mb-2">Password (min 4 chars)</label>
            <input
              data-testid="register-password-input"
              type="password"
              required
              minLength={4}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-ink-900 border border-white/15 px-4 py-3 font-mono text-white focus:border-neon-cyan focus:outline-none transition"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div data-testid="register-error" className="flex items-start gap-2 text-neon-magenta text-sm border border-neon-magenta/40 bg-neon-magenta/10 p-3">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}
          <button
            data-testid="register-submit-button"
            type="submit"
            disabled={submitting}
            className="btn-neon w-full"
          >
            {submitting ? "Forging..." : "Begin Training"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-zinc-400">
          Already a disciple?{" "}
          <Link to="/login" data-testid="register-login-link" className="text-neon-cyan hover:text-glow-cyan">Re-enter the dojo</Link>
        </div>
      </div>
    </div>
  );
}

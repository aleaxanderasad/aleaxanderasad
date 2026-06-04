import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading || user === null) {
    return (
      <div data-testid="protected-loading" className="min-h-screen flex items-center justify-center">
        <div className="font-display text-4xl text-neon-cyan animate-pulse-glow px-6 py-3">
          LOADING...
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

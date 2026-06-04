import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import { Toaster } from "@/components/ui/sonner";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Lessons from "@/pages/Lessons";
import Quotes from "@/pages/Quotes";
import TypingPractice from "@/pages/TypingPractice";
import BossFight from "@/pages/BossFight";
import Achievements from "@/pages/Achievements";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";

function Shell({ children }) {
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}

function Routing() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-display text-4xl text-neon-cyan animate-pulse">LOADING...</div>;
  }
  return (
    <Routes>
      <Route path="/" element={<Shell><Landing /></Shell>} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Shell><Login /></Shell>} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Shell><Register /></Shell>} />

      <Route path="/dashboard" element={<ProtectedRoute><Shell><Dashboard /></Shell></ProtectedRoute>} />
      <Route path="/lessons" element={<ProtectedRoute><Shell><Lessons /></Shell></ProtectedRoute>} />
      <Route path="/quotes" element={<ProtectedRoute><Shell><Quotes /></Shell></ProtectedRoute>} />
      <Route path="/practice/:mode/:id" element={<ProtectedRoute><Shell><TypingPractice /></Shell></ProtectedRoute>} />
      <Route path="/boss" element={<ProtectedRoute><Shell><BossFight /></Shell></ProtectedRoute>} />
      <Route path="/boss/:id" element={<ProtectedRoute><Shell><BossFight /></Shell></ProtectedRoute>} />
      <Route path="/achievements" element={<ProtectedRoute><Shell><Achievements /></Shell></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Shell><Leaderboard /></Shell></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Shell><Profile /></Shell></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routing />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#12121A",
                border: "1px solid rgba(0,240,255,0.4)",
                color: "#fff",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "0.85rem",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;

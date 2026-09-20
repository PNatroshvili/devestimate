"use client";

import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (!supabase) return;
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    setLoading(false);
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-logo"><img src="/skup-mark.svg" alt="SKUP Studio" /><span>SKUP Studio</span></div>
        <LockKeyhole className="auth-icon" />
        <small>PRIVATE WORKSPACE</small>
        <h1>SKUP Studio</h1>
        <p>ეს არის SKUP Studio-ს შიდა სამუშაო სივრცე, სადაც ინახება კლიენტების მოთხოვნები, შეფასებები და ფასები.</p>
        <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" /></label>
        <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && signIn()} /></label>
        {error && <div className="auth-error">{error}</div>}
        <button className="primary auth-submit" disabled={loading || !email || !password} onClick={signIn}>
          {loading ? "Signing in..." : "Sign in"} <ArrowRight />
        </button>
        <div className="auth-note"><Sparkles /><span>Client request links remain public. The estimation dashboard stays private.</span></div>
      </section>
    </main>
  );
}

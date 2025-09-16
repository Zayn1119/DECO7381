import React, { useState } from "react";
import { registerUser, loginUser, currentUser, logoutUser } from "../lib/store";

export default function LoginHost({ onSuccess, onBack }) {
  const existed = currentUser();
  const [mode, setMode] = useState(existed ? "signed" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(existed?.email || "");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const switchMode = () => { setMsg(""); setMode(mode === "signin" ? "signup" : "signin"); };

  const doSignin = () => {
    setMsg("");
    try { loginUser({ email, password }); setMode("signed"); onSuccess?.(); }
    catch (e) { setMsg(e.message || String(e)); }
  };

  const doSignup = () => {
    setMsg("");
    try { registerUser({ name, email, password }); setMode("signed"); onSuccess?.(); }
    catch (e) { setMsg(e.message || String(e)); }
  };

  const doSignout = () => { logoutUser(); setEmail(""); setPassword(""); setName(""); setMode("signin"); };

  return (
    <div className="home-wrap">
      <div className="home-card">
        <h1 className="home-title">
          {mode === "signup" ? "Register" : mode === "signin" ? "Sign In" : "Welcome"}
        </h1>

        {mode === "signed" ? (
          <>
            <p className="home-sub">You are signed in.</p>
            <button className="conf-btn primary block" onClick={() => onSuccess?.()}>Continue</button>
            <button className="conf-btn block" style={{ marginTop: 8 }} onClick={doSignout}>Sign out</button>
          </>
        ) : (
          <>
            {mode === "signup" && (
              <>
                <label>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </>
            )}

            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />

            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

            <button className="conf-btn primary block" style={{ marginTop: 12 }} onClick={mode === "signin" ? doSignin : doSignup}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>

            <button className="conf-btn block" style={{ marginTop: 8 }} onClick={switchMode} type="button">
              {mode === "signin" ? "No account? Register" : "Already have an account? Sign in"}
            </button>
          </>
        )}

        <button className="conf-btn block" style={{ marginTop: 12 }} onClick={() => onBack?.()}>Back</button>
        {msg && <div className="conf-hint" style={{ marginTop: 12 }}>{msg}</div>}
      </div>
    </div>
  );
}

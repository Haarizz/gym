import React, { useEffect, useState } from "react";
import { Lock, KeyRound, ShieldCheck } from "lucide-react";
import { posApi } from "../api";
import { usePos } from "../PosContext";
import s from "../pos.module.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

/** Verifies the cashier's own password without touching the stored session tokens. */
async function verifyPassword(username: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { settings, session, terminalName } = usePos();
  const [mode, setMode] = useState<"password" | "pin">("password");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(t);
  }, []);

  const unlock = async () => {
    setBusy(true);
    setError("");
    const ok = mode === "password"
      ? await verifyPassword(settings.currentUsername, password)
      : (await posApi.verifyPin(pin).catch(() => ({ valid: false }))).valid;
    setBusy(false);
    if (ok) {
      posApi.logEvent("TERMINAL_UNLOCK", mode === "pin" ? "Unlocked with supervisor PIN" : "Unlocked by cashier", { posSessionId: session?.id ?? null, terminalName });
      onUnlock();
    } else {
      setError(mode === "password" ? "Incorrect password." : "Incorrect supervisor PIN.");
      setPassword("");
      setPin("");
    }
  };

  const press = (k: string) => setPin((p) => (k === "back" ? p.slice(0, -1) : p.length < 8 ? p + k : p));

  return (
    <div className={s.lock} onKeyDown={(e) => {
      if (mode === "pin") {
        if (/^\d$/.test(e.key)) press(e.key);
        else if (e.key === "Backspace") press("back");
      }
      if (e.key === "Enter") unlock();
    }} tabIndex={-1}>
      <div className={s.lockCard}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <Lock size={26} />
        </div>
        <div style={{ fontSize: 34, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
        <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 6 }}>Terminal locked{session ? ` · ${session.sessionNumber}` : ""}</div>
        <div style={{ opacity: 0.9, fontSize: 14 }}>{settings.currentUserDisplayName || settings.currentUsername}</div>

        <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "16px 0 8px" }}>
          <button type="button" className={s.key} style={{ height: 34, fontSize: 12, padding: "0 12px", background: mode === "password" ? "rgba(255,255,255,0.22)" : undefined }} onClick={() => { setMode("password"); setError(""); }}>
            <KeyRound size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />Password
          </button>
          {settings.hasSupervisorPin && (
            <button type="button" className={s.key} style={{ height: 34, fontSize: 12, padding: "0 12px", background: mode === "pin" ? "rgba(255,255,255,0.22)" : undefined }} onClick={() => { setMode("pin"); setError(""); }}>
              <ShieldCheck size={13} style={{ display: "inline", marginRight: 6, verticalAlign: -2 }} />Supervisor PIN
            </button>
          )}
        </div>

        {mode === "password" ? (
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            style={{ width: "100%", height: 46, borderRadius: 12, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.08)", color: "#fff", padding: "0 14px", fontSize: 15, outline: "none", marginTop: 6 }}
          />
        ) : (
          <>
            <div className={s.pinDots}>
              {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => <span key={i} className={`${s.pinDot} ${i < pin.length ? s.pinDotOn : ""}`} />)}
            </div>
            <div className={s.keypad}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "back"].map((k) => (
                <button key={k} type="button" className={s.key} onClick={() => (k === "C" ? setPin("") : press(k))}>{k === "back" ? "⌫" : k}</button>
              ))}
            </div>
          </>
        )}
        {error && <div style={{ color: "#FCA5A5", fontSize: 13, marginTop: 10 }}>{error}</div>}
        <button type="button" disabled={busy || (mode === "password" ? !password : pin.length < 4)} onClick={unlock}
          style={{ width: "100%", height: 48, marginTop: 14, borderRadius: 12, border: 0, background: "#2B7A78", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? "Checking…" : "Unlock"}
        </button>
      </div>
    </div>
  );
}

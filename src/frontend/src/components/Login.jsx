import { useState } from "react";

export default function Login({ onLogin }) {
  const [apiKey, setApiKey]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  async function handleSubmit() {
    if (!apiKey.trim()) {
      setError("Please enter your API key.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const base = import.meta.env.VITE_API_URL || "";
      const res  = await fetch(`${base}/api/v1/merchant/me`, {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (!res.ok) {
        setError("Invalid API key. Please check and try again.");
        return;
      }
      const data = await res.json();
      localStorage.setItem("payday_api_key", apiKey.trim());
      onLogin(apiKey.trim(), data.merchant);
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c08",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Syne', sans-serif",
      padding: 24,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 #c8f54233; } 50% { box-shadow: 0 0 0 8px #c8f54200; } }
        .login-card { animation: fadeUp 0.6s cubic-bezier(.4,0,.2,1) both; }
        .login-btn { transition: all 0.2s; }
        .login-btn:hover:not(:disabled) { background: #d4ff50 !important; transform: translateY(-1px); box-shadow: 0 8px 24px #c8f54233; }
        .login-btn:active { transform: translateY(0); }
        .key-input:focus { outline: none; border-color: #c8f542 !important; box-shadow: 0 0 0 3px #c8f54222; }
      `}</style>

      <div className="login-card" style={{
        width: "100%", maxWidth: 440,
        background: "#0d120d",
        border: "1px solid #1a261a",
        borderRadius: 20,
        padding: "48px 40px",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "#c8f542",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "pulse 3s ease infinite",
          }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#080c08" }}>P</span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.03em" }}>Payday</div>
            <div style={{ fontSize: 11, color: "#4a5c4a", letterSpacing: "0.06em", textTransform: "uppercase" }}>Merchant Console</div>
          </div>
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 14, color: "#4a5c4a", marginBottom: 32, lineHeight: 1.6 }}>
          Enter your API key to access your merchant dashboard.
        </p>

        {/* Input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: "block", fontSize: 12, fontWeight: 600,
            color: "#6a7c6a", letterSpacing: "0.06em",
            textTransform: "uppercase", marginBottom: 8,
          }}>
            API Key
          </label>
          <div style={{ position: "relative" }}>
            <input
              className="key-input"
              type={visible ? "text" : "password"}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="brk_live_••••••••••••"
              style={{
                width: "100%", padding: "14px 48px 14px 16px",
                background: "#111711", border: "1px solid #1a261a",
                borderRadius: 10, color: "#e8ede8",
                fontFamily: "'DM Mono', monospace", fontSize: 13,
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            />
            <button
              onClick={() => setVisible(v => !v)}
              style={{
                position: "absolute", right: 14, top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "#4a5c4a", fontSize: 13, padding: 4,
              }}
            >
              {visible ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#2e0d0d", border: "1px solid #4a1010",
            borderRadius: 8, padding: "10px 14px",
            fontSize: 13, color: "#ef4444", marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          className="login-btn"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "14px",
            background: "#c8f542", border: "none", borderRadius: 10,
            color: "#080c08", fontFamily: "'Syne', sans-serif",
            fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Verifying…" : "Access Dashboard →"}
        </button>

        {/* Footer */}
        <p style={{ fontSize: 12, color: "#3a4a3a", marginTop: 24, textAlign: "center" }}>
          Find your API key in your merchant settings.
        </p>
      </div>
    </div>
  );
}

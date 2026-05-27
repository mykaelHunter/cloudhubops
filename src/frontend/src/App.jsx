import { useState, useEffect } from "react";
import TransactionsTable from "./components/TransactionsTable";
import KPICard from "./components/KPICard";
import BarChart from "./components/BarChart";
import ServiceHealth from "./components/ServiceHealth";
import Login from "./components/Login";
import { useAuth } from "./context/AuthContext";
import { fetchSummary, fetchTransactions } from "./api/client";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CHART_DATA = [42, 78, 55, 91, 67, 83, 110, 95, 130, 115, 142, 160];

export default function App() {
  const { isAuthenticated, ready, login, logout, merchant } = useAuth();
  const [activeTab, setActiveTab]       = useState("overview");
  const [time, setTime]                 = useState(new Date());
  const [summary, setSummary]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 2000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function load() {
      try {
        const [s, t] = await Promise.all([fetchSummary(), fetchTransactions()]);
        setSummary(s);
        setTransactions(t || []);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAuthenticated]);

  if (!ready) return null;
  if (!isAuthenticated) return <Login onLogin={login} />;

  const greeting = time.getHours() < 12 ? "morning" : time.getHours() < 18 ? "afternoon" : "evening";
  const tabs = ["overview", "transactions", "api", "settings"];

  return (
    <div style={{ minHeight: "100vh", background: "#080c08" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080c08; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: 64,
        borderBottom: "1px solid #111711",
        position: "sticky", top: 0, background: "#080c08", zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "#c8f542", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#080c08" }}>P</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>Payday</span>
          <span style={{ color: "#2a3a2a", fontSize: 18 }}>/</span>
          <span style={{ color: "#4a5c4a", fontSize: 13 }}>Merchant Console</span>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? "#131e13" : "none",
                border: "none", cursor: "pointer",
                padding: "8px 18px", borderRadius: 8,
                fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600,
                color: activeTab === tab ? "#c8f542" : "#4a5c4a",
                transition: "all 0.2s",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#22c55e", animation: "blink 2s ease infinite",
              boxShadow: "0 0 8px #22c55e"
            }} />
            <span style={{ fontSize: 12, color: "#4a5c4a", fontFamily: "'DM Mono', monospace" }}>
              {time.toLocaleTimeString()}
            </span>
          </div>
          {merchant && (
            <span style={{ fontSize: 12, color: "#6a7c6a", fontFamily: "'DM Mono', monospace" }}>
              {merchant.name}
            </span>
          )}
          <button
            onClick={logout}
            style={{
              background: "#111711", border: "1px solid #1a261a",
              borderRadius: 8, color: "#6a7c6a",
              padding: "6px 12px", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Syne', sans-serif",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.target.style.color = "#ef4444"; e.target.style.borderColor = "#4a1010"; }}
            onMouseLeave={e => { e.target.style.color = "#6a7c6a"; e.target.style.borderColor = "#1a261a"; }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main */}
      <main style={{ padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>

        {/* Greeting — always visible */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}>
            Good {greeting} ✦
          </h1>
          <p style={{ color: "#4a5c4a", marginTop: 4, fontSize: 14 }}>
            Here's what's happening with your payments today.
          </p>
        </div>

        {loading ? (
          <div style={{ color: "#4a5c4a", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
            Loading…
          </div>

        ) : error ? (
          <div style={{
            background: "#2e0d0d", border: "1px solid #4a1010",
            borderRadius: 12, padding: "20px 24px", color: "#ef4444",
            fontFamily: "'DM Mono', monospace", fontSize: 13,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Failed to load dashboard</div>
            <div style={{ color: "#9a3030" }}>{error}</div>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 12, background: "#4a1010", border: "none",
                borderRadius: 6, color: "#ef4444", padding: "6px 12px",
                fontSize: 12, cursor: "pointer", fontFamily: "'Syne', sans-serif",
              }}
            >
              Retry
            </button>
          </div>

        ) : activeTab === "overview" ? (
          <>
            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
              <KPICard label="Total Volume" value={summary ? `$${summary.total_volume_usd.toLocaleString()}` : "—"} delta="+12.4%" sub="this month" />
              <KPICard label="Transactions" value={summary ? summary.total_transactions : "—"}                     delta="+8.1%"  sub="this month" />
              <KPICard label="Success Rate" value={summary ? `${(summary.success_rate * 100).toFixed(1)}%` : "—"} delta="+0.3%" sub="vs last month" />
              <KPICard label="Avg. Latency" value="142ms"                                                          delta="-18ms"  sub="p95 API response" />
            </div>

            {/* Chart + Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "#0d120d", border: "1px solid #131e13", borderRadius: 14, padding: "22px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Payment Volume</span>
                  <span style={{ fontSize: 11, color: "#4a5c4a", fontFamily: "'DM Mono', monospace" }}>2026 · USD</span>
                </div>
                <BarChart data={CHART_DATA} labels={MONTHS} />
              </div>

              <div style={{ background: "#0d120d", border: "1px solid #131e13", borderRadius: 14, padding: "22px 24px" }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>By Method</span>
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                  {[
                    { label: "Card",          pct: summary?.by_method?.card     ? Math.round((summary.by_method.card     / summary.total_transactions) * 100) : 68, color: "#c8f542" },
                    { label: "Bank Transfer", pct: summary?.by_method?.transfer ? Math.round((summary.by_method.transfer / summary.total_transactions) * 100) : 24, color: "#22c55e" },
                    { label: "Wallet",        pct: summary?.by_method?.wallet   ? Math.round((summary.by_method.wallet   / summary.total_transactions) * 100) : 8,  color: "#1e2a1a" },
                  ].map((m, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: "#a0b0a0" }}>{m.label}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{m.pct}%</span>
                      </div>
                      <div style={{ height: 6, background: "#131e13", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${m.pct}%`, background: m.color, borderRadius: 4,
                          boxShadow: m.color === "#c8f542" ? "0 0 8px #c8f54288" : "none",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Service Health */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              <ServiceHealth name="Payments API"   status="operational" latency="138ms" />
              <ServiceHealth name="Auth Service"   status="operational" latency="44ms"  />
              <ServiceHealth name="Webhook Worker" status="degraded"    latency="820ms" />
            </div>
          </>

        ) : activeTab === "transactions" ? (
          <TransactionsTable transactions={transactions} />

        ) : activeTab === "api" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { method: "GET",  path: "/api/v1/transactions",              desc: "List all transactions" },
              { method: "POST", path: "/api/v1/transactions",              desc: "Create a transaction" },
              { method: "GET",  path: "/api/v1/transactions/:id",          desc: "Get a transaction" },
              { method: "POST", path: "/api/v1/transactions/:id/refund",   desc: "Refund a transaction" },
              { method: "POST", path: "/api/v1/transactions/:id/capture",  desc: "Capture a pending transaction" },
              { method: "GET",  path: "/api/v1/analytics/summary",         desc: "Volume and success metrics" },
              { method: "GET",  path: "/api/v1/analytics/timeseries",      desc: "30-day daily breakdown" },
              { method: "POST", path: "/api/v1/webhooks",                  desc: "Register a webhook" },
              { method: "GET",  path: "/api/v1/webhooks",                  desc: "List webhooks" },
              { method: "GET",  path: "/health",                           desc: "Liveness probe" },
              { method: "GET",  path: "/metrics",                          desc: "Prometheus metrics" },
            ].map((route, i) => (
              <div key={i} style={{
                background: "#0d120d", border: "1px solid #131e13",
                borderRadius: 12, padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 16,
              }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600,
                  padding: "3px 8px", borderRadius: 6, minWidth: 48, textAlign: "center",
                  background: route.method === "GET" ? "#0d2e1f" : "#2a1f00",
                  color:      route.method === "GET" ? "#22c55e" : "#f59e0b",
                }}>{route.method}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#c8f542", flex: 1 }}>
                  {route.path}
                </span>
                <span style={{ fontSize: 13, color: "#4a5c4a" }}>{route.desc}</span>
              </div>
            ))}
          </div>

        ) : activeTab === "settings" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
            {[
              { label: "Merchant Name",  value: merchant?.name  || "—" },
              { label: "Email",          value: merchant?.email || "—" },
              { label: "Merchant ID",    value: merchant?.id    || "—" },
              { label: "Account Status", value: merchant?.active ? "Active" : "Inactive" },
            ].map((item, i) => (
              <div key={i} style={{
                background: "#0d120d", border: "1px solid #131e13",
                borderRadius: 12, padding: "18px 20px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 13, color: "#6a7c6a", fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#e8ede8" }}>{item.value}</span>
              </div>
            ))}

            <button
              onClick={logout}
              style={{
                marginTop: 8, background: "#2e0d0d", border: "1px solid #4a1010",
                borderRadius: 12, color: "#ef4444", padding: "14px",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Syne', sans-serif",
              }}
            >
              Sign Out
            </button>
          </div>

        ) : null}
      </main>
    </div>
  );
}

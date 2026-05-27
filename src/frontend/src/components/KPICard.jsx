export default function KPICard({ label, value, delta, sub }) {
  const isPositive = delta && !delta.startsWith("-");
  const isLatency  = label === "Avg. Latency";

  return (
    <div style={{
      background: "#0d120d",
      border: "1px solid #131e13",
      borderRadius: 14,
      padding: "20px 22px",
      animation: "fadeUp 0.5s ease both",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{
          fontSize: 12, color: "#4a5c4a", fontWeight: 600,
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          {label}
        </span>
        {delta && (
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: isLatency ? "#22c55e" : isPositive ? "#22c55e" : "#ef4444",
            fontFamily: "'DM Mono', monospace",
          }}>
            {delta}
          </span>
        )}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, marginTop: 10, letterSpacing: "-0.04em" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#3a4a3a", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

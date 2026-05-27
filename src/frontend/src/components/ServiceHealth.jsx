export default function ServiceHealth({ name, status, latency }) {
  const operational = status === "operational";
  const color = operational ? "#22c55e" : "#f59e0b";

  return (
    <div style={{
      background: "#0d120d",
      border: `1px solid ${operational ? "#131e13" : "#2a1500"}`,
      borderRadius: 14, padding: "18px 20px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: color, animation: "blink 2s ease infinite",
          }} />
          <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color }}>{status}</span>
        </div>
      </div>
      <div style={{
        marginTop: 12, fontFamily: "'DM Mono', monospace",
        fontSize: 22, fontWeight: 500,
        color: operational ? "#e8ede8" : "#f59e0b",
      }}>
        {latency}
      </div>
      <div style={{ fontSize: 11, color: "#3a4a3a", marginTop: 2 }}>avg response · last 5m</div>
    </div>
  );
}

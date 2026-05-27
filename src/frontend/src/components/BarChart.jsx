export default function BarChart({ data, labels }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, marginTop: 8 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: "100%",
            height: `${(v / max) * 100}px`,
            background: i === data.length - 1 ? "#c8f542" : "#1e2a1a",
            borderRadius: "4px 4px 0 0",
            transition: "height 0.6s cubic-bezier(.4,0,.2,1)",
            boxShadow: i === data.length - 1 ? "0 0 12px #c8f54255" : "none",
          }} />
          {labels && (
            <span style={{ fontSize: 9, color: "#4a5568", fontFamily: "'DM Mono', monospace" }}>
              {labels[i]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

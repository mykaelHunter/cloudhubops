function StatusBadge({ status }) {
  const map = {
    completed: { bg: "#0d2e1f", color: "#22c55e", label: "Completed" },
    pending:   { bg: "#2a1f00", color: "#f59e0b", label: "Pending"   },
    failed:    { bg: "#2e0d0d", color: "#ef4444", label: "Failed"    },
    refunded:  { bg: "#1a1a2e", color: "#818cf8", label: "Refunded"  },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
      fontFamily: "'DM Mono', monospace",
    }}>
      {s.label}
    </span>
  );
}

export default function TransactionsTable({ transactions = [] }) {
  const cols = ["ID", "Merchant", "Amount", "Method", "Status", "Date"];

  return (
    <div style={{ background: "#0d120d", border: "1px solid #131e13", borderRadius: 14, overflow: "hidden" }}>
      <div style={{
        padding: "18px 20px", borderBottom: "1px solid #111711",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>Recent Transactions</span>
        <span style={{ fontSize: 12, color: "#4a5c4a", fontFamily: "'DM Mono', monospace" }}>
          {transactions.length} records
        </span>
      </div>

      {/* Header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.5fr 1fr 100px 90px 110px 120px",
        gap: 12, padding: "10px 20px",
        borderBottom: "1px solid #111711",
      }}>
        {cols.map(c => (
          <span key={c} style={{
            fontSize: 11, color: "#3a4a3a", fontWeight: 600,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>{c}</span>
        ))}
      </div>

      {transactions.length === 0 ? (
        <div style={{ padding: "32px 20px", color: "#3a4a3a", fontSize: 13, textAlign: "center" }}>
          No transactions found.
        </div>
      ) : (
        transactions.map(txn => (
          <div key={txn.id} style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 100px 90px 110px 120px",
            gap: 12, padding: "14px 20px",
            borderBottom: "1px solid #0d120d",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#0a0f0a"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#4a5c4a" }}>{txn.id}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{txn.merchantId || "—"}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 600 }}>
              ${Number(txn.amount).toFixed(2)}
            </span>
            <span style={{ fontSize: 12, color: "#a0b0a0", textTransform: "capitalize" }}>{txn.method}</span>
            <StatusBadge status={txn.status} />
            <span style={{ fontSize: 12, color: "#4a5c4a" }}>
              {new Date(txn.createdAt).toLocaleDateString()}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

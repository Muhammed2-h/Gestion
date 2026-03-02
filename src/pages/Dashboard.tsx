import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  IndianRupee,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Percent,
  PlusCircle,
  Upload,
  Building2,
} from "lucide-react";
import { usePortfolioStore } from "@/store";
import { formatCurrency, formatPct } from "@/lib/utils";
import AddAccountModal from "@/components/AddAccountModal";
import AddTransactionModal from "@/components/AddTransactionModal";
import ImportCSVModal from "@/components/ImportCSVModal";
import MarketNews from "@/components/MarketNews";

const SECTOR_COLORS = [
  "#10B981",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
];

export default function Dashboard() {
  const { summary, holdings, accounts } = usePortfolioStore();
  const [modal, setModal] = useState<"account" | "transaction" | "csv" | null>(
    null,
  );

  const isEmpty = accounts.length === 0;

  // Sector allocation from real holdings
  const sectorMap = new Map<string, number>();
  for (const h of holdings) {
    const s = h.sector || "Uncategorised";
    sectorMap.set(s, (sectorMap.get(s) ?? 0) + h.current_value);
  }
  const sectorData = Array.from(sectorMap.entries()).map(
    ([sector, value], i) => ({
      sector,
      value,
      pct:
        summary.current_value > 0 ? (value / summary.current_value) * 100 : 0,
      color: SECTOR_COLORS[i % SECTOR_COLORS.length],
    }),
  );

  const topMovers = [...holdings]
    .sort(
      (a, b) => Math.abs(b.unrealized_pnl_pct) - Math.abs(a.unrealized_pnl_pct),
    )
    .slice(0, 5);

  if (isEmpty) {
    return (
      <div className="app-content animate-fade-in">
        <div
          style={{ maxWidth: 620, margin: "60px auto", textAlign: "center" }}
        >
          <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>📊</div>
          <h1 style={{ marginBottom: 10 }}>Welcome to Gestion</h1>
          <p
            style={{
              marginBottom: 32,
              color: "var(--text-muted)",
              lineHeight: 1.8,
            }}
          >
            Your Indian portfolio intelligence platform is ready.
            <br />
            Start by adding a broker account, then import your transactions.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setModal("account")}
            >
              <Building2 size={18} /> Add Broker Account
            </button>
            <button
              className="btn btn-outline btn-lg"
              onClick={() => setModal("transaction")}
            >
              <PlusCircle size={18} /> Add Transaction
            </button>
            <button
              className="btn btn-outline btn-lg"
              onClick={() => setModal("csv")}
            >
              <Upload size={18} /> Import CSV
            </button>
          </div>
          <div className="card" style={{ marginTop: 40, textAlign: "left" }}>
            <h4 style={{ marginBottom: 12 }}>🚀 Quick Start Guide</h4>
            {[
              {
                step: "1",
                title: "Add Broker Account",
                desc: "Set up your Zerodha, Upstox, or any broker account",
              },
              {
                step: "2",
                title: "Import Transactions",
                desc: "Upload your broker CSV or add trades manually",
              },
              {
                step: "3",
                title: "Update Prices",
                desc: "Set current market prices on your Holdings page to see live P&L",
              },
              {
                step: "4",
                title: "Connect API (optional)",
                desc: "Link broker API on the Integrations page for auto-sync",
              },
            ].map(({ step, title, desc }) => (
              <div
                key={step}
                style={{ display: "flex", gap: 14, marginBottom: 14 }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--color-accent-dim)",
                    border: "1px solid var(--color-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: "var(--color-accent)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {step}
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: 2,
                    }}
                  >
                    {title}
                  </div>
                  <div
                    style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                  >
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {modal === "account" && (
          <AddAccountModal onClose={() => setModal(null)} />
        )}
        {modal === "transaction" && (
          <AddTransactionModal onClose={() => setModal(null)} />
        )}
        {modal === "csv" && <ImportCSVModal onClose={() => setModal(null)} />}
      </div>
    );
  }

  const isProfit = summary.day_pnl >= 0;

  return (
    <div className="app-content animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {accounts.length} account{accounts.length !== 1 ? "s" : ""} ·{" "}
            {holdings.length} position{holdings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setModal("csv")}
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setModal("transaction")}
          >
            <PlusCircle size={14} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-4 mb-6">
        {[
          {
            label: "Net Portfolio Value",
            val: formatCurrency(summary.current_value, true),
            sub: `Invested: ${formatCurrency(summary.total_invested, true)}`,
            icon: IndianRupee,
            trend: "neutral" as const,
          },
          {
            label: "Total P&L",
            val: formatCurrency(summary.total_pnl, true),
            sub: formatPct(summary.total_pnl_pct),
            icon: BarChart2,
            trend: summary.total_pnl >= 0 ? ("up" as const) : ("down" as const),
          },
          {
            label: "Today's P&L",
            val: formatCurrency(summary.day_pnl, true),
            sub: formatPct(summary.day_pnl_pct),
            icon: isProfit ? TrendingUp : TrendingDown,
            trend: isProfit ? ("up" as const) : ("down" as const),
          },
          {
            label: "Positions",
            val: String(holdings.length),
            sub: `${accounts.length} account${accounts.length !== 1 ? "s" : ""}`,
            icon: Percent,
            trend: "neutral" as const,
          },
        ].map(({ label, val, sub, icon: Icon, trend }) => (
          <div key={label} className="stat-card animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">{label}</span>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "var(--radius-md)",
                  background:
                    trend === "up"
                      ? "var(--color-profit-bg)"
                      : trend === "down"
                        ? "var(--color-loss-bg)"
                        : "var(--color-accent-dim)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  size={17}
                  color={
                    trend === "up"
                      ? "var(--color-profit)"
                      : trend === "down"
                        ? "var(--color-loss)"
                        : "var(--color-accent)"
                  }
                />
              </div>
            </div>
            <div className="stat-value mono">{val}</div>
            <div
              className={`stat-change ${trend === "up" ? "positive" : trend === "down" ? "negative" : ""}`}
            >
              {sub}
            </div>
          </div>
        ))}
      </div>

      <div
        className="grid grid-2 mb-6 dashboard-main-grid"
        style={{
          gridTemplateColumns:
            sectorData.length > 0 ? "var(--dash-grid, 2fr 1fr)" : "1fr",
        }}
      >
        {/* Holdings value breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Top Holdings</h3>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              marginBottom: 20,
            }}
          >
            By current value
          </p>
          <div className="table-scroll-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Qty</th>
                  <th style={{ textAlign: "right" }}>Avg Cost</th>
                  <th style={{ textAlign: "right" }}>Current Price</th>
                  <th style={{ textAlign: "right" }}>P&L</th>
                </tr>
              </thead>
              <tbody>
                {topMovers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        padding: "24px",
                        color: "var(--text-muted)",
                      }}
                    >
                      No holdings yet. Add transactions to see your portfolio.
                    </td>
                  </tr>
                ) : (
                  topMovers.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <div
                          style={{
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {h.symbol}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {h.exchange}
                        </div>
                      </td>
                      <td className="col-num">{h.total_quantity}</td>
                      <td className="col-num">
                        {formatCurrency(h.average_price)}
                      </td>
                      <td
                        className="col-num"
                        style={{
                          color: "var(--text-primary)",
                          fontWeight: 600,
                        }}
                      >
                        {formatCurrency(h.current_price)}
                      </td>
                      <td
                        className="col-num"
                        style={{
                          color:
                            h.unrealized_pnl >= 0
                              ? "var(--color-profit)"
                              : "var(--color-loss)",
                          fontWeight: 600,
                        }}
                      >
                        {formatCurrency(h.unrealized_pnl, true)}
                        <div style={{ fontSize: "0.7rem" }}>
                          {formatPct(h.unrealized_pnl_pct)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Sector pie */}
          {sectorData.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 4 }}>Sector Allocation</h3>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                By current value
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={sectorData}
                    dataKey="value"
                    nameKey="sector"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={40}
                    paddingAngle={3}
                  >
                    {sectorData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={SECTOR_COLORS[i % SECTOR_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: unknown) => formatCurrency(Number(v), true)}
                    contentStyle={{
                      background: "var(--color-bg-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {sectorData.map((s, i) => (
                  <div
                    key={s.sector}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: SECTOR_COLORS[i % SECTOR_COLORS.length],
                        }}
                      />
                      <span
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {s.sector}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {s.pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market News */}
          <MarketNews />
        </div>
      </div>

      {/* Add data prompt if no prices set */}
      {holdings.length > 0 &&
        holdings.every((h) => h.current_price === h.average_price) && (
          <div
            className="card"
            style={{
              background: "var(--color-warning-bg)",
              borderColor: "rgba(245,158,11,0.25)",
              marginBottom: 20,
            }}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h4 style={{ color: "var(--color-warning)", marginBottom: 4 }}>
                  ⚡ Update Market Prices
                </h4>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Go to Holdings → click "Update Price" on each position to see
                  real P&L and sector allocation.
                </p>
              </div>
              <a
                href="/holdings"
                className="btn btn-outline btn-sm"
                style={{
                  borderColor: "var(--color-warning)",
                  color: "var(--color-warning)",
                }}
              >
                Go to Holdings →
              </a>
            </div>
          </div>
        )}

      {modal === "account" && (
        <AddAccountModal onClose={() => setModal(null)} />
      )}
      {modal === "transaction" && (
        <AddTransactionModal onClose={() => setModal(null)} />
      )}
      {modal === "csv" && <ImportCSVModal onClose={() => setModal(null)} />}
    </div>
  );
}

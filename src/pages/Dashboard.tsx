import { useState, useMemo } from "react";
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
  Activity
} from "lucide-react";
import { usePortfolioStore } from "@/store";
import { formatCurrency, formatPct } from "@/lib/utils";
import AddAccountModal from "@/components/AddAccountModal";
import AddTransactionModal from "@/components/AddTransactionModal";
import ImportCSVModal from "@/components/ImportCSVModal";
import MarketNews from "@/components/MarketNews";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";

const SECTOR_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#EF4444", "#06B6D4", "#84CC16"];
const PERIODS = ["1D", "1W", "1M", "3M", "6M", "1Y", "3Y", "5Y", "Max"];
const BENCHMARKS = ["None", "NIFTY 50", "SENSEX"];

export default function Dashboard() {
  const { summary, holdings, accounts } = usePortfolioStore();
  const [modal, setModal] = useState<"account" | "transaction" | "csv" | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("1M");
  const [selectedBenchmark, setSelectedBenchmark] = useState("None");

  const isEmpty = accounts.length === 0;

  // Sector computation
  const sectorData = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of holdings) {
      const s = h.sector || "Uncategorised";
      map.set(s, (map.get(s) ?? 0) + h.current_value);
    }
    return Array.from(map.entries()).map(([sector, value], i) => ({
      sector,
      value,
      pct: summary.current_value > 0 ? (value / summary.current_value) * 100 : 0,
      color: SECTOR_COLORS[i % SECTOR_COLORS.length],
    })).sort((a, b) => b.value - a.value);
  }, [holdings, summary.current_value]);

  const topMovers = useMemo(() => {
    return [...holdings]
      .sort((a, b) => Math.abs(b.unrealized_pnl_pct) - Math.abs(a.unrealized_pnl_pct))
      .slice(0, 5);
  }, [holdings]);

  // Intelligence computation
  const insights = useMemo(() => {
    if (isEmpty || summary.current_value === 0) return [];
    const list = [];
    if (summary.day_pnl !== 0) {
      list.push(`Your portfolio ${summary.day_pnl > 0 ? 'gained' : 'lost'} ${formatCurrency(Math.abs(summary.day_pnl), true)} today.`);
    }
    if (sectorData.length > 0) {
      list.push(`${sectorData[0].sector} contributes ${sectorData[0].pct.toFixed(1)}% of your allocation.`);
    }
    if (holdings.length >= 3) {
      const top3Val = [...holdings].sort((a, b) => b.current_value - a.current_value).slice(0, 3).reduce((acc, h) => acc + h.current_value, 0);
      const top3Pct = (top3Val / summary.current_value) * 100;
      if (top3Pct > 50) {
        list.push(`Top 3 holdings account for ${top3Pct.toFixed(1)}% of your portfolio.`);
      }
    }
    return list;
  }, [isEmpty, summary, sectorData, holdings]);

  if (isEmpty) {
    return (
      <div className="app-content animate-fade-in flex-col items-center justify-center">
        <div className="max-w-[620px] mx-auto my-[60px] text-center">
          <div className="text-4xl mb-4">📊</div>
          <h1 className="mb-2">Welcome to Gestion</h1>
          <p className="text-muted mb-6">
            Your Indian portfolio intelligence platform is ready.
            <br />
            Start by adding a broker account, then import your transactions.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            <button className="btn btn-primary btn-lg" onClick={() => setModal("account")}>
              <Building2 size={18} /> Add Broker Account
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => setModal("transaction")}>
              <PlusCircle size={18} /> Add Transaction
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => setModal("csv")}>
              <Upload size={18} /> Import CSV
            </button>
          </div>
        </div>
        {modal === "account" && <AddAccountModal onClose={() => setModal(null)} />}
        {modal === "transaction" && <AddTransactionModal onClose={() => setModal(null)} />}
        {modal === "csv" && <ImportCSVModal onClose={() => setModal(null)} />}
      </div>
    );
  }

  const isProfit = summary.day_pnl >= 0;

  return (
    <div className="app-content animate-fade-in">
      <PageHeader 
        title="Dashboard" 
        subtitle={`${accounts.length} account${accounts.length !== 1 ? "s" : ""} · ${holdings.length} position${holdings.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => setModal("csv")}>
              <Upload size={14} /> Import CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setModal("transaction")}>
              <PlusCircle size={14} /> Add Transaction
            </button>
          </>
        }
      />

      {/* ── Intelligence Banner ── */}
      {insights.length > 0 && (
        <Card className="mb-6 bg-info/10 border-info/20">
          <div className="flex items-center gap-3">
            <Activity className="text-info" size={20} />
            <div className="flex flex-wrap gap-4">
              {insights.map((insight, idx) => (
                <span key={idx} className="text-sm font-medium text-info">{insight}</span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── Top Section: Stats Hierarchy ── */}
      <div className="grid grid-4 mb-6">
        <StatCard 
          label="Portfolio Value"
          value={formatCurrency(summary.current_value, true)}
          subValue={`Invested: ${formatCurrency(summary.total_invested, true)}`}
          icon={<IndianRupee size={16} />}
          trend="neutral"
        />
        <StatCard 
          label="Total Returns"
          value={formatCurrency(summary.total_pnl, true)}
          subValue={formatPct(summary.total_pnl_pct)}
          icon={<BarChart2 size={16} />}
          trend={summary.total_pnl >= 0 ? "up" : "down"}
        />
        <StatCard 
          label="Today's Returns"
          value={formatCurrency(summary.day_pnl, true)}
          subValue={formatPct(summary.day_pnl_pct)}
          icon={isProfit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          trend={isProfit ? "up" : "down"}
        />
        <StatCard 
          label="Annualized (XIRR / CAGR)"
          value={`${summary.xirr.toFixed(1)}%`}
          subValue={`CAGR: ${summary.cagr.toFixed(1)}%`}
          icon={<Percent size={16} />}
          trend={summary.xirr >= 0 ? "up" : "down"}
        />
      </div>

      {/* ── Performance Chart ── */}
      <Card className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <h3 className="font-bold">Portfolio Performance</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-bg-secondary p-1 rounded-md border border-border">
              {PERIODS.map(p => (
                <button
                  key={p}
                  className={`px-3 py-1 text-xs font-semibold rounded-sm transition-fast ${selectedPeriod === p ? 'bg-bg-card shadow-sm text-primary' : 'text-muted hover:text-secondary'}`}
                  onClick={() => setSelectedPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <select 
              className="form-select text-xs py-1.5 px-2 w-auto bg-bg-secondary border-border" 
              value={selectedBenchmark}
              onChange={(e) => setSelectedBenchmark(e.target.value)}
            >
              {BENCHMARKS.map(b => (
                <option key={b} value={b}>{b === "None" ? "No Benchmark" : `vs ${b}`}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center justify-center border border-dashed border-border-light rounded-md h-[300px] bg-bg-secondary">
          <div className="text-center">
            <Activity className="mx-auto mb-2 text-muted" size={24} />
            <p className="text-sm text-secondary font-medium">Insufficient historical data to calculate performance</p>
            <p className="text-xs text-muted">Chart will populate as portfolio history is tracked</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-2 mb-6" style={{ gridTemplateColumns: sectorData.length > 0 ? "2fr 1fr" : "1fr" }}>
        {/* ── Holdings Overview ── */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold">Top Holdings</h3>
              <p className="text-xs text-muted mt-1">By current value</p>
            </div>
          </div>
          <div className="table-scroll-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Avg Cost</th>
                  <th className="text-right">LTP</th>
                  <th className="text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {topMovers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-6 text-muted">
                      No holdings to display.
                    </td>
                  </tr>
                ) : (
                  topMovers.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <div className="font-bold text-primary">{h.symbol}</div>
                        <div className="text-xs text-muted">{h.exchange}</div>
                      </td>
                      <td className="col-num">{h.total_quantity}</td>
                      <td className="col-num">{formatCurrency(h.average_price)}</td>
                      <td className="col-num font-semibold text-primary">{formatCurrency(h.current_price)}</td>
                      <td className={`col-num font-semibold ${h.unrealized_pnl >= 0 ? "text-profit" : "text-loss"}`}>
                        {formatCurrency(h.unrealized_pnl, true)}
                        <div className="text-xs">{formatPct(h.unrealized_pnl_pct)}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Sidebar Column ── */}
        <div className="flex flex-col gap-6">
          {sectorData.length > 0 && (
            <Card>
              <h3 className="font-bold">Sector Allocation</h3>
              <p className="text-xs text-muted mt-1 mb-4">By current value</p>
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
                      <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: unknown) => formatCurrency(Number(v), true)}
                    contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 mt-4">
                {sectorData.slice(0, 4).map((s, i) => (
                  <div key={s.sector} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                      <span className="text-xs text-secondary">{s.sector}</span>
                    </div>
                    <span className="text-xs font-semibold text-primary font-mono">{s.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <MarketNews />
        </div>
      </div>

      {modal === "account" && <AddAccountModal onClose={() => setModal(null)} />}
      {modal === "transaction" && <AddTransactionModal onClose={() => setModal(null)} />}
      {modal === "csv" && <ImportCSVModal onClose={() => setModal(null)} />}
    </div>
  );
}

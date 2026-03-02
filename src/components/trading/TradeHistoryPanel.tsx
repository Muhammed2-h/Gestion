import { usePaperTradingStore } from '../../store/usePaperTradingStore';

export default function TradeHistoryPanel() {
  const { tradeHistory } = usePaperTradingStore();

  if (tradeHistory.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>📋</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No trades yet</p>
      </div>
    );
  }

  const totalRealizedPnl = tradeHistory.reduce((s, t) => s + t.pnl, 0);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Trade History</h3>
        <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: totalRealizedPnl >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}>
          Realized P&L: {totalRealizedPnl >= 0 ? '+' : ''}${totalRealizedPnl.toFixed(2)}
        </span>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 340, overflowY: 'auto' }}>
        <table className="data-table" style={{ minWidth: 480 }}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Symbol</th>
              <th>Side</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Comm</th>
              <th style={{ textAlign: 'right' }}>P&L</th>
            </tr>
          </thead>
          <tbody>
            {tradeHistory.map(t => (
              <tr key={t.id}>
                <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {new Date(t.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td style={{ fontWeight: 700 }}>{t.symbol}</td>
                <td>
                  <span className={`badge ${t.side === 'buy' ? 'badge-profit' : 'badge-loss'}`}>
                    {t.side.toUpperCase()}
                  </span>
                </td>
                <td className="col-num">{t.quantity}</td>
                <td className="col-num">${t.price.toFixed(2)}</td>
                <td className="col-num" style={{ color: 'var(--text-muted)' }}>${t.commission.toFixed(3)}</td>
                <td className="col-num" style={{ fontWeight: 600, color: t.pnl >= 0 ? 'var(--color-profit)' : t.pnl < 0 ? 'var(--color-loss)' : 'var(--text-muted)' }}>
                  {t.pnl !== 0 ? `${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

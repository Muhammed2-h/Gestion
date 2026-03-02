import { usePortfolioStore } from '../../store/usePortfolioStore';

export default function TradeHistoryPanel() {
  const trades = usePortfolioStore(state => state.trades);

  return (
    <div className="card mt-4">
      <h3>Trade History</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Symbol</th>
            <th>Side</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Comm</th>
            <th>PnL</th>
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 && <tr><td colSpan={7}>No trades</td></tr>}
          {trades.map((t, i) => (
            <tr key={i}>
              <td>{new Date(t.timestamp).toLocaleTimeString()}</td>
              <td>{t.symbol}</td>
              <td style={{ color: t.side === 'buy' ? 'var(--color-profit)' : 'var(--color-loss)' }}>{t.side.toUpperCase()}</td>
              <td>{t.quantity.toFixed(2)}</td>
              <td>${t.price.toFixed(2)}</td>
              <td>${t.commission.toFixed(3)}</td>
              <td style={{ color: (t.pnl || 0) >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}>
                {t.pnl ? '$' + t.pnl.toFixed(2) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

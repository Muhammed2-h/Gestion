import { usePortfolioStore } from '../../store/usePortfolioStore';

export default function PositionPanel() {
  const positions = usePortfolioStore(state => state.positions);

  return (
    <div className="card mt-4">
      <h3>Open Positions</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Side</th>
            <th>Qty</th>
            <th>Avg Entry</th>
            <th>Unrealized PnL</th>
          </tr>
        </thead>
        <tbody>
          {positions.length === 0 && <tr><td colSpan={5}>No open positions</td></tr>}
          {positions.map((p, i) => (
            <tr key={i}>
              <td>{p.symbol}</td>
              <td style={{ color: p.side === 'buy' ? 'var(--color-profit)' : 'var(--color-loss)' }}>{p.side.toUpperCase()}</td>
              <td>{p.quantity.toFixed(2)}</td>
              <td>${p.averageEntryPrice.toFixed(2)}</td>
              <td style={{ color: p.unrealizedPnl >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' }}>
                ${p.unrealizedPnl.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

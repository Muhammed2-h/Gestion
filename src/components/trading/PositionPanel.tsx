import { usePaperTradingStore } from '../../store/usePaperTradingStore';

interface Props {
  currentPrice: number;
  onMessage: (msg: string, ok: boolean) => void;
}

export default function PositionPanel({ currentPrice, onMessage }: Props) {
  const { positions, closePosition } = usePaperTradingStore();

  if (positions.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>📦</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No open positions</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
        <h3 style={{ margin: 0 }}>Open Positions</h3>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 400 }}>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Side</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Avg Entry</th>
              <th style={{ textAlign: 'right' }}>LTP</th>
              <th style={{ textAlign: 'right' }}>Unreal P&L</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {positions.map(p => (
              <tr key={p.symbol}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.symbol}</td>
                <td>
                  <span className={`badge ${p.side === 'long' ? 'badge-profit' : 'badge-loss'}`}>
                    {p.side.toUpperCase()}
                  </span>
                </td>
                <td className="col-num">{p.quantity}</td>
                <td className="col-num">${p.avgEntryPrice.toFixed(2)}</td>
                <td className="col-num" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  ${p.currentPrice.toFixed(2)}
                </td>
                <td className="col-num" style={{ color: p.unrealizedPnl >= 0 ? 'var(--color-profit)' : 'var(--color-loss)', fontWeight: 600 }}>
                  {p.unrealizedPnl >= 0 ? '+' : ''}${p.unrealizedPnl.toFixed(2)}
                  <div style={{ fontSize: '0.68rem' }}>
                    ({p.unrealizedPnlPct >= 0 ? '+' : ''}{p.unrealizedPnlPct.toFixed(2)}%)
                  </div>
                </td>
                <td>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      closePosition(p.symbol, currentPrice);
                      onMessage(`Closed ${p.symbol} position`, true);
                    }}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Close
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

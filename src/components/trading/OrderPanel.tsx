import { useState } from 'react';
import { usePaperTradingStore } from '../../store/usePaperTradingStore';

interface Props {
  symbol: string;
  currentPrice: number;
  onMessage: (msg: string, ok: boolean) => void;
}

export default function OrderPanel({ symbol, currentPrice, onMessage }: Props) {
  const { submitMarketOrder, submitLimitOrder, capital } = usePaperTradingStore();

  const [side, setSide]       = useState<'buy' | 'sell'>('buy');
  const [type, setType]       = useState<'market' | 'limit' | 'stop'>('market');
  const [quantity, setQty]    = useState(1);
  const [triggerPrice, setTriggerPrice] = useState(currentPrice);

  const estimatedValue = quantity * (type === 'market' ? currentPrice : triggerPrice);
  const commission = Math.max(0.01, estimatedValue * 0.0005);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quantity <= 0) { onMessage('Enter a valid quantity', false); return; }

    if (type === 'market') {
      const result = submitMarketOrder(symbol, side, quantity, currentPrice);
      onMessage(result.message, result.ok);
    } else {
      submitLimitOrder(symbol, side, quantity, type, triggerPrice);
      onMessage(`${type.toUpperCase()} order placed @ $${triggerPrice.toFixed(2)}`, true);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>Order Panel</h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Capital: <strong style={{ color: 'var(--color-accent)' }}>${capital.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Buy / Sell toggle */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setSide('buy')}
            className="btn"
            style={{
              flex: 1, justifyContent: 'center',
              background: side === 'buy' ? '#10B981' : 'var(--color-bg-primary)',
              color: side === 'buy' ? 'white' : 'var(--text-muted)',
              border: `1px solid ${side === 'buy' ? '#10B981' : 'var(--color-border)'}`,
            }}
          >
            ▲ BUY
          </button>
          <button
            type="button"
            onClick={() => setSide('sell')}
            className="btn"
            style={{
              flex: 1, justifyContent: 'center',
              background: side === 'sell' ? '#EF4444' : 'var(--color-bg-primary)',
              color: side === 'sell' ? 'white' : 'var(--text-muted)',
              border: `1px solid ${side === 'sell' ? '#EF4444' : 'var(--color-border)'}`,
            }}
          >
            ▼ SELL
          </button>
        </div>

        {/* Order type */}
        <div className="form-group">
          <label className="form-label">Order Type</label>
          <select
            className="form-select"
            value={type}
            onChange={e => setType(e.target.value as typeof type)}
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
            <option value="stop">Stop</option>
          </select>
        </div>

        {/* Symbol (read-only) */}
        <div className="form-group">
          <label className="form-label">Symbol</label>
          <input className="form-input" value={symbol} readOnly
            style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, opacity: 0.7 }} />
        </div>

        {/* Quantity */}
        <div className="form-group">
          <label className="form-label">Quantity</label>
          <input
            type="number"
            className="form-input"
            min="1"
            step="1"
            value={quantity}
            onChange={e => setQty(Math.max(1, Number(e.target.value)))}
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>

        {/* Trigger price for limit/stop */}
        {type !== 'market' && (
          <div className="form-group">
            <label className="form-label">{type === 'limit' ? 'Limit Price' : 'Stop Price'}</label>
            <input
              type="number"
              className="form-input"
              min="0"
              step="0.01"
              value={triggerPrice}
              onChange={e => setTriggerPrice(Number(e.target.value))}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        )}

        {/* Order summary */}
        <div style={{
          background: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          fontSize: '0.78rem',
        }}>
          {[
            ['Price', type === 'market' ? `$${currentPrice.toFixed(2)} (market)` : `$${triggerPrice.toFixed(2)}`],
            ['Est. Value', `$${estimatedValue.toFixed(2)}`],
            ['Commission', `$${commission.toFixed(3)}`],
            ['Total Cost', `$${(estimatedValue + (side === 'buy' ? commission : 0)).toFixed(2)}`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="btn"
          disabled={currentPrice <= 0}
          style={{
            background: side === 'buy' ? '#10B981' : '#EF4444',
            color: 'white',
            justifyContent: 'center',
            opacity: currentPrice <= 0 ? 0.5 : 1,
          }}
        >
          {currentPrice <= 0 ? 'Waiting for price…' : `${side === 'buy' ? '▲ BUY' : '▼ SELL'} ${quantity} ${symbol}`}
        </button>
      </form>
    </div>
  );
}

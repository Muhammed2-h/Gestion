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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm m-0">Order Panel</h3>
        <span className="text-xs text-muted font-mono">
          Capital: <strong className="text-accent">${capital.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">

        {/* Buy / Sell toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSide('buy')}
            className={`btn flex-1 justify-center transition-fast ${side === 'buy' ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-bg-primary text-muted border-border'}`}
          >
            ▲ BUY
          </button>
          <button
            type="button"
            onClick={() => setSide('sell')}
            className={`btn flex-1 justify-center transition-fast ${side === 'sell' ? 'bg-[#EF4444] text-white border-[#EF4444]' : 'bg-bg-primary text-muted border-border'}`}
          >
            ▼ SELL
          </button>
        </div>

        {/* Order type */}
        <div className="form-group mb-0">
          <label className="form-label text-xs font-semibold mb-1">Order Type</label>
          <select
            className="form-select bg-bg-primary border-border text-sm"
            value={type}
            onChange={e => setType(e.target.value as typeof type)}
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
            <option value="stop">Stop</option>
          </select>
        </div>

        {/* Symbol (read-only) */}
        <div className="form-group mb-0">
          <label className="form-label text-xs font-semibold mb-1">Symbol</label>
          <input className="form-input bg-bg-primary border-border font-mono font-bold opacity-70 cursor-not-allowed" value={symbol} readOnly />
        </div>

        {/* Quantity */}
        <div className="form-group mb-0">
          <label className="form-label text-xs font-semibold mb-1">Quantity</label>
          <input
            type="number"
            className="form-input bg-bg-primary border-border font-mono"
            min="1"
            step="1"
            value={quantity}
            onChange={e => setQty(Math.max(1, Number(e.target.value)))}
          />
        </div>

        {/* Trigger price for limit/stop */}
        {type !== 'market' && (
          <div className="form-group mb-0">
            <label className="form-label text-xs font-semibold mb-1">{type === 'limit' ? 'Limit Price' : 'Stop Price'}</label>
            <input
              type="number"
              className="form-input bg-bg-primary border-border font-mono"
              min="0"
              step="0.01"
              value={triggerPrice}
              onChange={e => setTriggerPrice(Number(e.target.value))}
            />
          </div>
        )}

        {/* Order summary */}
        <div className="bg-bg-primary rounded-md p-3 text-xs flex flex-col gap-1.5 mt-2">
          {[
            ['Price', type === 'market' ? `$${currentPrice.toFixed(2)} (market)` : `$${triggerPrice.toFixed(2)}`],
            ['Est. Value', `$${estimatedValue.toFixed(2)}`],
            ['Commission', `$${commission.toFixed(3)}`],
            ['Total Cost', `$${(estimatedValue + (side === 'buy' ? commission : 0)).toFixed(2)}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-muted">{k}</span>
              <span className="font-mono font-bold">{v}</span>
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="btn mt-auto"
          disabled={currentPrice <= 0}
          style={{
            background: side === 'buy' ? '#10B981' : '#EF4444',
            color: 'white',
            justifyContent: 'center',
            opacity: currentPrice <= 0 ? 0.5 : 1,
            border: 'none',
          }}
        >
          {currentPrice <= 0 ? 'Waiting for price…' : `${side === 'buy' ? '▲ BUY' : '▼ SELL'} ${quantity} ${symbol}`}
        </button>
      </form>
    </div>
  );
}

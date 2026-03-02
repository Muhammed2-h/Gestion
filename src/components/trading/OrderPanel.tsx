import { useState } from 'react';
import { useSymbolStore } from '../../store/useSymbolStore';
import { ExecutionService } from '../../services/executionService';
import type {  OrderType, OrderSide  } from '../../engine/types';

export default function OrderPanel() {
  const { symbol } = useSymbolStore();
  const [side, setSide] = useState<OrderSide>('buy');
  const [type, setType] = useState<OrderType>('market');
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;

    await ExecutionService.getInstance().submitOrder(
      symbol,
      side,
      quantity,
      type,
      type === 'limit' || type === 'stop_limit' ? price : undefined,
      type === 'stop' || type === 'stop_limit' ? price : undefined // simplified
    );
    // Ideally clear form or show notification
  };

  return (
    <div className="card">
      <h3>Order Panel - {symbol}</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={() => setSide('buy')} className={`btn ${side==='buy'?'btn-primary':'btn-outline'}`} style={{flex: 1, background: side==='buy'?'var(--color-profit)':''}}>Buy</button>
          <button type="button" onClick={() => setSide('sell')} className={`btn ${side==='sell'?'btn-primary':'btn-outline'}`} style={{flex: 1, background: side==='sell'?'var(--color-loss)':''}}>Sell</button>
        </div>

        <div className="form-group">
          <label className="form-label">Order Type</label>
          <select className="form-select" value={type} onChange={e => setType(e.target.value as OrderType)}>
            <option value="market">Market</option>
            <option value="limit">Limit</option>
            <option value="stop">Stop</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Quantity</label>
          <input type="number" className="form-input" min="1" step="0.01" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
        </div>

        {type !== 'market' && (
          <div className="form-group">
            <label className="form-label">Price</label>
            <input type="number" className="form-input" min="0" step="0.01" value={price} onChange={e => setPrice(Number(e.target.value))} />
          </div>
        )}

        <button type="submit" className="btn btn-primary mt-2">Submit Order</button>
      </form>
    </div>
  );
}

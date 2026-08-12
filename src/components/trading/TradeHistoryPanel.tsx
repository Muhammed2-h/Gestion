import { usePaperTradingStore } from '../../store/usePaperTradingStore';
import { Badge } from '../ui/Badge';

export default function TradeHistoryPanel() {
  const { tradeHistory } = usePaperTradingStore();

  if (tradeHistory.length === 0) {
    return (
      <div className="text-center py-10 text-muted flex-1 flex flex-col items-center justify-center h-full">
        <div className="text-4xl mb-3 opacity-30">📋</div>
        <p className="text-sm font-semibold text-primary m-0">No trades yet</p>
      </div>
    );
  }

  const totalRealizedPnl = tradeHistory.reduce((s, t) => s + t.pnl, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="pb-3 mb-2 border-b border-border flex items-center justify-between">
        <h3 className="font-bold text-sm m-0">Trade History</h3>
        <span className={`text-xs font-mono font-bold ${totalRealizedPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
          Realized P&L: {totalRealizedPnl >= 0 ? '+' : ''}${totalRealizedPnl.toFixed(2)}
        </span>
      </div>
      
      <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
        <table className="data-table w-full text-xs">
          <thead className="text-xs text-muted tracking-wider uppercase sticky top-0 bg-bg-card z-10">
            <tr>
              <th className="text-left font-semibold pb-2">Time</th>
              <th className="text-left font-semibold pb-2">Symbol</th>
              <th className="text-left font-semibold pb-2">Side</th>
              <th className="text-right font-semibold pb-2">Qty</th>
              <th className="text-right font-semibold pb-2">Price</th>
              <th className="text-right font-semibold pb-2">Comm</th>
              <th className="text-right font-semibold pb-2">P&L</th>
            </tr>
          </thead>
          <tbody>
            {tradeHistory.map(t => (
              <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-bg-primary transition-fast">
                <td className="text-xs text-muted py-2">
                  {new Date(t.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="font-bold text-primary py-2">{t.symbol}</td>
                <td className="py-2">
                  <Badge variant={t.side === 'buy' ? 'profit' : 'loss'} className="text-xs py-0 px-1.5 uppercase">
                    {t.side}
                  </Badge>
                </td>
                <td className="text-right font-mono py-2">{t.quantity}</td>
                <td className="text-right font-mono py-2">${t.price.toFixed(2)}</td>
                <td className="text-right font-mono text-muted py-2">${t.commission.toFixed(3)}</td>
                <td className={`text-right font-mono font-bold py-2 ${t.pnl >= 0 ? 'text-profit' : t.pnl < 0 ? 'text-loss' : 'text-muted'}`}>
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

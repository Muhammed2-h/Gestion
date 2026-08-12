import { usePaperTradingStore } from '../../store/usePaperTradingStore';
import { Badge } from '../ui/Badge';

interface Props {
  currentPrice: number;
  onMessage: (msg: string, ok: boolean) => void;
}

export default function PositionPanel({ currentPrice, onMessage }: Props) {
  const { positions, closePosition } = usePaperTradingStore();

  if (positions.length === 0) {
    return (
      <div className="text-center py-10 text-muted flex-1 flex flex-col items-center justify-center h-full">
        <div className="text-4xl mb-3 opacity-30">📦</div>
        <p className="text-sm font-semibold text-primary m-0">No open positions</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="pb-3 mb-2 border-b border-border flex items-center justify-between">
        <h3 className="font-bold text-sm m-0">Open Positions</h3>
      </div>
      <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
        <table className="data-table w-full text-xs">
          <thead className="text-xs text-muted tracking-wider uppercase sticky top-0 bg-bg-card z-10">
            <tr>
              <th className="text-left font-semibold pb-2">Symbol</th>
              <th className="text-left font-semibold pb-2">Side</th>
              <th className="text-right font-semibold pb-2">Qty</th>
              <th className="text-right font-semibold pb-2">Avg Entry</th>
              <th className="text-right font-semibold pb-2">LTP</th>
              <th className="text-right font-semibold pb-2">Unreal P&L</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {positions.map(p => (
              <tr key={p.symbol} className="border-b border-border/50 last:border-0 hover:bg-bg-primary transition-fast">
                <td className="font-bold text-primary py-2.5">{p.symbol}</td>
                <td className="py-2.5">
                  <Badge variant={p.side === 'long' ? 'profit' : 'loss'} className="text-xs py-0 px-1.5 uppercase">
                    {p.side}
                  </Badge>
                </td>
                <td className="text-right font-mono py-2.5">{p.quantity}</td>
                <td className="text-right font-mono py-2.5">${p.avgEntryPrice.toFixed(2)}</td>
                <td className="text-right font-mono font-bold text-primary py-2.5">
                  ${p.currentPrice.toFixed(2)}
                </td>
                <td className={`text-right py-2.5 ${p.unrealizedPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  <div className="font-bold font-mono">
                    {p.unrealizedPnl >= 0 ? '+' : ''}${p.unrealizedPnl.toFixed(2)}
                  </div>
                  <div className="text-xs font-bold">
                    ({p.unrealizedPnlPct >= 0 ? '+' : ''}{p.unrealizedPnlPct.toFixed(2)}%)
                  </div>
                </td>
                <td className="text-right py-2.5 pr-2">
                  <button
                    className="btn btn-sm bg-loss/10 text-loss hover:bg-loss/20 border-transparent transition-fast px-2 py-1 text-xs h-auto whitespace-nowrap"
                    onClick={() => {
                      closePosition(p.symbol, currentPrice);
                      onMessage(`Closed ${p.symbol} position`, true);
                    }}
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

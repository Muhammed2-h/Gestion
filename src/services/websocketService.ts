import { ExecutionService } from './executionService';

export class WebSocketService {
  private static ws: WebSocket | null = null;
  
  private static symbol: string | null = null;

  public static connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.ws = new WebSocket(`ws://${window.location.hostname}:3001`);

    this.ws.onopen = () => {
      console.log('WS Connected to Backend');
      if (this.symbol) {
          this.subscribe(this.symbol);
      }
    };

    this.ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'quote' && data.symbol && data.price) {
                // Route ticking data to execution engine for paper trades
                ExecutionService.getInstance().onMarketData(data.symbol, data.price, data.time);
            }
        } catch (e) {
            console.error('WS MSG Error', e);
        }
    };

    this.ws.onclose = () => {
       console.log('WS Disconnected');
       setTimeout(() => this.connect(), 5000); // basic reconnect
    };
  }

  public static subscribe(symbol: string) {
      if (this.symbol && this.symbol !== symbol) {
         this.unsubscribe();
      }

      this.symbol = symbol;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'SUBSCRIBE', symbol }));
      }
  }

  public static unsubscribe() {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'UNSUBSCRIBE' }));
      }
      this.symbol = null;
  }
}

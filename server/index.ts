import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import yahooFinance from 'yahoo-finance2';
import http from 'http';

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve REST API for Historical Data
app.get('/api/historical', async (req, res) => {
    try {
        const { symbol, period1, period2, interval } = req.query;
        if (!symbol) return res.status(400).json({ error: 'Symbol required' });

        const queryOptions = {
            period1: typeof period1 === 'string' ? period1 : '2023-01-01',
            period2: typeof period2 === 'string' ? period2 : undefined,
            interval: (interval as any) || '1d'
        };

        const data = await yahooFinance.historical(symbol as string, queryOptions);
        
        // Transform
        const candles = data.map(d => ({
            time: d.date.getTime(),
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume
        }));

        res.json(candles);
    } catch (e: any) {
        console.error('Yahoo Finance API Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Serve WebSocket for Real-Time Streaming Polling
wss.on('connection', (ws) => {
    console.log('Client connected for market data stream');
    let activeInterval: NodeJS.Timeout | null = null;
    let currentSymbol = '';

    ws.on('message', (message) => {
        try {
            const parsed = JSON.parse(message.toString());
            if (parsed.type === 'SUBSCRIBE') {
               currentSymbol = parsed.symbol;
               if (activeInterval) clearInterval(activeInterval);

               // Yahoo Finance doesn't have a free official WS. Polling quote every 3 seconds for paper trading simulation.
               activeInterval = setInterval(async () => {
                   try {
                       if (!currentSymbol) return;
                       const quote = await yahooFinance.quote(currentSymbol);
                       if (quote && quote.regularMarketPrice) {
                           ws.send(JSON.stringify({
                               type: 'quote',
                               symbol: currentSymbol,
                               price: quote.regularMarketPrice,
                               time: Date.now()
                           }));
                       }
                   } catch (err) {
                       console.error('Polling error', err);
                   }
               }, 3000);
            }

            if (parsed.type === 'UNSUBSCRIBE') {
                if (activeInterval) clearInterval(activeInterval);
                currentSymbol = '';
            }
        } catch (e) {
            console.error(e);
        }
    });

    ws.on('close', () => {
        if (activeInterval) clearInterval(activeInterval);
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Market Data Server running on port ${PORT}`);
});

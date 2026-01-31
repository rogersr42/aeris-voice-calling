import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { handleMediaStream } from './media-stream-handler.js';
import { logger } from './utils/logger.js';
import twilio from 'twilio';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Twilio voice webhook - receives incoming calls
app.post('/voice', (req, res) => {
  logger.info('Incoming call received', { 
    from: req.body.From,
    to: req.body.To,
    callSid: req.body.CallSid 
  });

  const twiml = new twilio.twiml.VoiceResponse();
  
  // Connect to Media Stream
  const connect = twiml.connect();
  connect.stream({
    url: `wss://${req.headers.host}/media-stream`
  });

  res.type('text/xml');
  res.send(twiml.toString());
});

// Twilio call status callback
app.post('/status', (req, res) => {
  logger.info('Call status update', {
    callSid: req.body.CallSid,
    callStatus: req.body.CallStatus,
    duration: req.body.CallDuration
  });
  res.sendStatus(200);
});

// WebSocket handler for Media Streams
wss.on('connection', (ws, req) => {
  logger.info('WebSocket connection established');
  handleMediaStream(ws, req);
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Server error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Aeris Voice Calling System running on port ${PORT}`);
  logger.info(`Webhook URL: http://localhost:${PORT}/voice`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

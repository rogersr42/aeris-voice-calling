# 🎙️ Aeris Voice Calling System

Production-ready AI voice calling system for Twilio with restaurant-grade realistic voice quality.

## 📋 Overview

This system enables ultra-realistic AI voice calls through Twilio, with:
- **ElevenLabs integration** for human-like voice quality
- **Real-time speech processing** via Twilio Media Streams
- **Natural conversation AI** powered by Claude
- **Restaurant reservation handling** and general business calls
- **Low latency** (<2 second response time)

## 🏗️ Architecture

```
┌─────────────┐
│   Caller    │
└──────┬──────┘
       │ Phone Call
       ↓
┌─────────────┐
│   Twilio    │ ← Voice Webhook (HTTP POST)
└──────┬──────┘
       │ WebSocket (Media Stream)
       ↓
┌─────────────────────────────────┐
│   Voice Calling Server          │
│                                 │
│  ┌─────────────────────────┐  │
│  │  Media Stream Handler   │  │
│  └───┬─────────────────┬───┘  │
│      │                 │       │
│      ↓                 ↓       │
│  ┌────────┐      ┌─────────┐ │
│  │  STT   │      │   TTS   │ │
│  │Deepgram│      │ElevenLabs│ │
│  │/Whisper│      │/OpenAI  │ │
│  └───┬────┘      └────┬────┘ │
│      │                │       │
│      └────→ ┌──────────┐     │
│             │Conversation│    │
│             │  Manager   │    │
│             │  (Claude)  │    │
│             └────────────┘    │
└─────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Twilio account (already configured)
- ElevenLabs API key (recommended for best voice quality)
- Deepgram or OpenAI API key (for speech-to-text)

### Installation

1. **Clone and setup:**
   ```bash
   cd /Users/arisrsr/clawd/voice-calling-system
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Configure API keys in `.env`:**
   ```bash
   # Essential for production voice quality
   ELEVENLABS_API_KEY=your_key_here
   
   # For speech-to-text (choose one)
   DEEPGRAM_API_KEY=your_key_here
   # OR
   OPENAI_API_KEY=your_key_here
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Expose to internet (development):**
   ```bash
   # In a new terminal
   ngrok http 3000
   ```
   Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

5. **Configure Twilio webhook:**
   ```bash
   # Update Twilio phone number configuration
   # Voice Webhook URL: https://abc123.ngrok.io/voice
   # HTTP POST
   ```

## 🔑 API Keys Setup

### ElevenLabs (Primary - Best Voice Quality)

1. Sign up at [elevenlabs.io](https://elevenlabs.io)
2. Go to Profile → API Keys
3. Create new API key
4. Add to `.env`: `ELEVENLABS_API_KEY=...`

**Recommended voices:**
- `21m00Tcm4TlvDq8ikWAM` - Rachel (warm, professional female) ✨ **DEFAULT**
- `EXAVITQu4vr4xnSDxMaL` - Bella (young, expressive)
- `ThT5KcBeYPX3keUQqHPh` - Dorothy (pleasant, clear)

### Deepgram (Speech-to-Text)

1. Sign up at [deepgram.com](https://deepgram.com)
2. Get API key from console
3. Add to `.env`: `DEEPGRAM_API_KEY=...`

### OpenAI (Fallback)

1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Add to `.env`: `OPENAI_API_KEY=...`

## 📞 Testing the System

### Make a Test Call

1. **Call the Twilio number:** `+1 (814) 992-4242`
2. **You should hear:** "Hello! This is Aeris. How can I help you today?"
3. **Try saying:** "I'd like to make a reservation for tonight at 7 PM for 4 people"

### Example Conversation Flow

```
Caller: "Hi, I'd like to make a reservation"
Aeris: "Of course! I'd be happy to help you with that. 
        What day would you like to come in?"

Caller: "Tonight at 7:30"
Aeris: "Perfect, 7:30 tonight. And how many people will be joining you?"

Caller: "Four people"
Aeris: "Great! And what name should I put the reservation under?"

Caller: "Roger"
Aeris: "Wonderful! So I have a reservation for Roger, party of 4, 
        tonight at 7:30 PM. Is that correct?"

Caller: "Yes, that's right"
Aeris: "Perfect! Your reservation is confirmed. Is there anything else 
        I can help you with?"

Caller: "No, that's all"
Aeris: "Thank you so much! We look forward to seeing you tonight. 
        Have a great day!"
```

### Check Logs

```bash
# View live logs
tail -f logs/aeris-$(date +%Y-%m-%d).log

# View call transcripts
ls -la logs/call-*.json
cat logs/call-[session-id].json
```

## 🎯 Features

### Voice Quality Features
- ✅ Ultra-realistic voice (ElevenLabs Turbo v2.5)
- ✅ Natural pacing and intonation
- ✅ Conversational filler words (um, well, let me see)
- ✅ Human-like pauses
- ✅ Warm, professional tone

### Conversation Features
- ✅ Restaurant reservations (name, party size, date, time)
- ✅ Special requests handling
- ✅ Menu questions
- ✅ Callback requests
- ✅ Context awareness
- ✅ Natural confirmation flow
- ✅ Graceful interruption handling

### Technical Features
- ✅ Real-time bidirectional audio streaming
- ✅ Low latency (<2 seconds)
- ✅ Automatic silence detection
- ✅ Conversation logging
- ✅ Error recovery
- ✅ Health monitoring

## 📊 Cost Breakdown Per Call

### Average 2-minute Call

| Service | Usage | Cost |
|---------|-------|------|
| **ElevenLabs** | ~300 characters TTS | $0.09 |
| **Deepgram** | 2 min transcription | $0.01 |
| **Claude API** | ~5-10 messages | $0.02 |
| **Twilio** | 2 min inbound call | $0.02 |
| **Total** | | **~$0.14** |

### Monthly Estimates (100 calls)

- **Light use** (50 calls/month): ~$7
- **Moderate use** (200 calls/month): ~$28
- **Heavy use** (500 calls/month): ~$70

**Cost optimization tips:**
- Use OpenAI TTS instead of ElevenLabs: Reduces cost to ~$0.06/call
- Shorter greetings: Saves ~30% on TTS costs
- Efficient conversation flow: Fewer back-and-forth exchanges

## 🔧 Configuration

### Environment Variables

```bash
# Twilio (Already configured)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=5e90fde4580bb8088e817470ef85560c
TWILIO_PHONE_NUMBER=+18149924242

# Voice Provider (elevenlabs recommended)
ASSISTANT_VOICE_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Speech-to-Text Provider
STT_PROVIDER=deepgram
DEEPGRAM_API_KEY=your_key

# Server
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Assistant
ASSISTANT_NAME=Aeris
```

### Voice Customization

Edit `src/services/text-to-speech.js`:

```javascript
voiceSettings: {
  stability: 0.5,        // 0-1: Lower = more expressive
  similarity_boost: 0.75, // 0-1: Higher = more consistent
  style: 0.3,            // 0-1: Conversational style
  use_speaker_boost: true // Enhance clarity
}
```

## 🚨 Troubleshooting

### "No speech detected"
- **Check:** Twilio Media Stream format (should be mulaw, 8kHz)
- **Fix:** Verify WebSocket connection is stable
- **Test:** Check logs for transcription errors

### "Robotic voice"
- **Check:** Using ElevenLabs (not OpenAI TTS)
- **Fix:** Set `ASSISTANT_VOICE_PROVIDER=elevenlabs` in .env
- **Adjust:** Lower stability value for more expressiveness

### "High latency (>3 seconds)"
- **Check:** Network connection
- **Fix:** Use faster TTS model (`eleven_turbo_v2_5`)
- **Optimize:** Reduce conversation context size

### "Call drops immediately"
- **Check:** Webhook URL is accessible (https required)
- **Fix:** Verify ngrok is running and URL is updated in Twilio
- **Test:** `curl https://your-ngrok-url/health`

### "WebSocket connection fails"
- **Check:** Port 3000 is not blocked
- **Fix:** Ensure WebSocket endpoint is at `/media-stream`
- **Verify:** Check server logs for connection errors

## 🛠️ Production Deployment

### Option 1: Railway/Render (Recommended)

```bash
# Deploy to Railway
railway up

# Or Render
render deploy
```

Update Twilio webhook to your production URL.

### Option 2: VPS (DigitalOcean, AWS, etc.)

```bash
# Install PM2 for process management
npm install -g pm2

# Start the service
pm2 start src/server.js --name aeris-voice

# Setup auto-restart
pm2 startup
pm2 save

# Setup nginx reverse proxy for SSL
# Configure Twilio webhook to your domain
```

### Option 3: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]
```

```bash
docker build -t aeris-voice .
docker run -p 3000:3000 --env-file .env aeris-voice
```

## 📝 Maintenance

### Daily
- Check logs for errors: `tail -f logs/aeris-*.log`
- Monitor call quality feedback

### Weekly
- Review call transcripts in `logs/call-*.json`
- Check API usage and costs
- Update conversation prompts if needed

### Monthly
- Rotate API keys
- Archive old logs
- Review and optimize conversation flows

## 🎨 Customization

### Change Assistant Personality

Edit `src/services/conversation-manager.js`:

```javascript
buildSystemPrompt() {
  return `You are ${this.assistantName}, a [your personality here]...`
}
```

### Add New Conversation Types

1. Update system prompt with new capabilities
2. Add extraction logic in `extractReservationData()`
3. Test thoroughly with example conversations

### Change Voice

Update `.env`:
```bash
# For different ElevenLabs voice
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL

# For OpenAI voice
OPENAI_VOICE=alloy  # or echo, fable, onyx, nova, shimmer
```

## 📞 Support & Feedback

**For Roger to test and provide feedback:**

1. **Call the number:** `+1 (814) 992-4242`
2. **Try different scenarios:**
   - Simple reservation
   - Asking for menu information
   - Making changes mid-conversation
   - Testing interruptions

3. **Provide feedback on:**
   - Voice quality (does it sound human?)
   - Response timing (too slow/fast?)
   - Understanding accuracy (does it get the details right?)
   - Conversation flow (natural?)
   - Any bugs or issues

4. **Send feedback to:** The main Aeris agent (or roger@rsr.works)

## 🔐 Security Notes

- ✅ API keys stored in `.env` (not in git)
- ✅ Twilio webhook validation enabled
- ✅ HTTPS required for production
- ✅ Conversation logs stored locally (privacy)
- ⚠️ Don't commit credentials to git
- ⚠️ Rotate API keys regularly

## 📚 Technical Details

### Audio Format
- **Input:** mulaw, 8kHz (from Twilio)
- **Output:** mulaw, 8kHz (to Twilio)
- **Chunk size:** 640 bytes (20ms at 8kHz)

### Latency Breakdown
- Speech-to-text: ~300-500ms
- AI processing: ~500-800ms
- Text-to-speech: ~400-600ms
- Network: ~100-200ms
- **Total:** ~1.3-2.1 seconds

### Dependencies
- `express` - HTTP server
- `ws` - WebSocket for Twilio Media Streams
- `twilio` - Twilio SDK
- `elevenlabs-node` - ElevenLabs TTS
- `@deepgram/sdk` - Speech recognition
- `openai` - OpenAI API (fallback)
- `@anthropic-ai/sdk` - Claude AI

## 🎯 Roadmap

Future enhancements:
- [ ] Voice cloning for personalized assistant
- [ ] Multi-language support
- [ ] Outbound calling capability
- [ ] Calendar integration for availability
- [ ] SMS confirmation after call
- [ ] Web dashboard for call analytics
- [ ] Voice authentication
- [ ] Sentiment analysis

## 📄 License

Proprietary - Roger Rieder / RSR Works

---

Built with ❤️ by Aeris for Roger Rieder

## 💰 Cost Optimization

### Using OpenAI TTS (Cheaper Alternative)

OpenAI TTS is significantly cheaper than ElevenLabs:
- **OpenAI:** ~$0.015 per 1K characters
- **ElevenLabs:** ~$0.30 per 1K characters (Starter plan)

To switch to OpenAI TTS:

1. **Update `.env` locally:**
   ```bash
   ASSISTANT_VOICE_PROVIDER=openai
   OPENAI_API_KEY=your_key_here
   OPENAI_VOICE=nova  # or alloy, echo, fable, onyx, shimmer
   ```

2. **Update Render environment variables:**
   - Go to https://dashboard.render.com
   - Select your service
   - Environment tab
   - Update:
     - `ASSISTANT_VOICE_PROVIDER` → `openai`
     - `OPENAI_API_KEY` → your key
     - `OPENAI_VOICE` → `nova`

3. **Trigger redeploy** (or wait for next code push)

**Quality comparison:**
- **ElevenLabs:** More natural, expressive, human-like
- **OpenAI:** Clear, professional, slightly more robotic
- **Recommendation:** Use OpenAI for most calls, ElevenLabs for premium clients


# 🔑 API Keys Setup Guide

Complete guide to obtaining and configuring all required API keys for the Aeris Voice Calling System.

---

## 1. ElevenLabs (Required for Premium Voice Quality)

**Why:** Ultra-realistic text-to-speech voice synthesis
**Cost:** Free tier: 10,000 characters/month (~20-30 calls), Paid: $5-99/month

### Steps:

1. **Sign up:**
   - Go to [elevenlabs.io](https://elevenlabs.io)
   - Click "Sign Up" (use Google/GitHub or email)

2. **Get API Key:**
   - Click your profile (top right)
   - Go to "Profile Settings"
   - Find "API Key" section
   - Click "Copy" to get your key

3. **Choose Voice:**
   - Go to "Voice Library"
   - Preview voices
   - **Recommended for business calls:**
     - **Rachel** (ID: `21m00Tcm4TlvDq8ikWAM`) - Warm, professional ✨
     - Bella (ID: `EXAVITQu4vr4xnSDxMaL`) - Young, expressive
     - Dorothy (ID: `ThT5KcBeYPX3keUQqHPh`) - Pleasant, clear
   
4. **Add to .env:**
   ```bash
   ELEVENLABS_API_KEY=sk_your_key_here
   ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
   ```

### Testing:
```bash
# Test ElevenLabs API
curl -X POST https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test"}' \
  --output test.mp3
```

---

## 2. Deepgram (Recommended for Speech-to-Text)

**Why:** Fast, accurate speech recognition
**Cost:** Free: $200 credit (covers ~1000+ calls), Paid: Pay-as-you-go

### Steps:

1. **Sign up:**
   - Go to [deepgram.com](https://deepgram.com)
   - Click "Sign Up"
   - Verify email

2. **Get API Key:**
   - Go to Console
   - Click "API Keys" in sidebar
   - Click "Create a New API Key"
   - Name it "Aeris Voice Calling"
   - Copy the key (save it immediately - can't view again!)

3. **Add to .env:**
   ```bash
   DEEPGRAM_API_KEY=your_key_here
   STT_PROVIDER=deepgram
   ```

### Testing:
```bash
# Test Deepgram API
curl -X POST https://api.deepgram.com/v1/listen \
  -H "Authorization: Token YOUR_API_KEY" \
  -H "Content-Type: audio/wav" \
  --data-binary @test-audio.wav
```

---

## 3. OpenAI (Alternative/Fallback)

**Why:** Backup for both TTS and STT if ElevenLabs/Deepgram unavailable
**Cost:** Pay-as-you-go (~$0.015/minute for Whisper, ~$0.015/1K chars for TTS)

### Steps:

1. **Sign up:**
   - Go to [platform.openai.com](https://platform.openai.com)
   - Sign up or log in

2. **Get API Key:**
   - Go to [API Keys](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Name it "Aeris Voice Calling"
   - Copy and save immediately

3. **Add to .env:**
   ```bash
   OPENAI_API_KEY=sk-your_key_here
   # Optional: set as fallback
   OPENAI_VOICE=nova
   ```

### Testing:
```bash
# Test OpenAI TTS
curl https://api.openai.com/v1/audio/speech \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "tts-1", "input": "Hello world", "voice": "nova"}' \
  --output test-openai.mp3
```

---

## 4. Twilio (Already Configured)

**Why:** Phone number and call handling
**Cost:** ~$0.01/minute for inbound calls

### Already Have:
```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=5e90fde4580bb8088e817470ef85560c
TWILIO_PHONE_NUMBER=+18149924242
```

**No action needed** - already in your .env file!

---

## 5. Anthropic Claude (Already Configured)

**Why:** Conversation AI / natural language understanding
**Cost:** Pay-as-you-go (~$0.003/1K tokens)

### Already Have:
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**No action needed** - already in your .env file!

---

## Configuration Summary

### Minimum Required (for testing):
```bash
# .env file
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=5e90fde4580bb8088e817470ef85560c
TWILIO_PHONE_NUMBER=+18149924242
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Recommended (for production):
```bash
# .env file
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=5e90fde4580bb8088e817470ef85560c
TWILIO_PHONE_NUMBER=+18149924242

ELEVENLABS_API_KEY=sk_your_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

DEEPGRAM_API_KEY=your_key_here
STT_PROVIDER=deepgram

ANTHROPIC_API_KEY=sk-ant-api03-...

ASSISTANT_NAME=Aeris
ASSISTANT_VOICE_PROVIDER=elevenlabs
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
```

### With Fallbacks:
```bash
# All of the above, plus:
OPENAI_API_KEY=sk-your_key_here
OPENAI_VOICE=nova
```

---

## Security Best Practices

### 1. Never Commit Keys to Git
```bash
# Already in .gitignore:
.env
.env.*
```

### 2. Use Environment Variables
Never hardcode keys in source code:
```javascript
// ❌ Bad
const apiKey = "sk_1234567890abcdef";

// ✅ Good
const apiKey = process.env.ELEVENLABS_API_KEY;
```

### 3. Rotate Keys Regularly
- Change keys every 3-6 months
- Update if any team member leaves
- Immediately rotate if compromised

### 4. Use Different Keys for Dev/Prod
```bash
# Development
.env.development

# Production
.env.production
```

### 5. Limit Key Permissions
When possible:
- Create read-only keys for analytics
- Use separate keys per service/environment
- Enable IP restrictions if available

---

## Monitoring API Usage

### ElevenLabs:
- Dashboard → Usage
- Shows character usage
- Set up billing alerts

### Deepgram:
- Console → Usage
- Track minutes transcribed
- Free credit balance

### OpenAI:
- Platform → Usage
- Detailed breakdown by model
- Set monthly limits

### Twilio:
- Console → Billing
- Call logs and costs
- Set spending alerts

---

## Cost Estimates

### Per Call (2-minute average):

| Service | Usage | Cost |
|---------|-------|------|
| ElevenLabs | ~300 chars | $0.09 |
| Deepgram | 2 min | $0.01 |
| Claude | ~10 messages | $0.02 |
| Twilio | 2 min call | $0.02 |
| **Total** | | **~$0.14** |

### Monthly (100 calls):

| Service | Monthly Cost |
|---------|--------------|
| ElevenLabs Starter | $5 (30k chars) |
| Deepgram | ~$1 (on free credit) |
| Claude | ~$2 |
| Twilio | ~$2 |
| **Total** | **~$10** |

### With Free Tiers:

For first month with free credits:
- ElevenLabs: 10k chars free = ~30 calls
- Deepgram: $200 credit = ~1000 calls
- Claude: Pay per use (cheap)
- Twilio: Pay per use

**First 30 calls are essentially free!**

---

## Troubleshooting API Keys

### "Invalid API Key" Error:

1. **Check format:**
   - ElevenLabs: starts with `sk_`
   - Deepgram: alphanumeric string
   - OpenAI: starts with `sk-`
   - Anthropic: starts with `sk-ant-`

2. **Check .env file:**
   ```bash
   # View .env (hide actual keys)
   cat .env | grep API_KEY | sed 's/=.*/=***/'
   ```

3. **Verify no extra spaces:**
   ```bash
   # Wrong
   ELEVENLABS_API_KEY = sk_123
   
   # Correct
   ELEVENLABS_API_KEY=sk_123
   ```

4. **Test individual APIs:**
   Use curl commands from above to test each API independently

### "Rate Limited" Error:

- Check usage dashboard
- Upgrade plan if needed
- Implement request queuing
- Add delays between calls

### "Insufficient Credits" Error:

- Add payment method
- Buy more credits
- Upgrade to paid tier

---

## Quick Setup Checklist

- [ ] Sign up for ElevenLabs
- [ ] Get ElevenLabs API key
- [ ] Choose voice (Rachel recommended)
- [ ] Sign up for Deepgram
- [ ] Get Deepgram API key
- [ ] (Optional) Get OpenAI API key for fallback
- [ ] Add all keys to `.env` file
- [ ] Test server: `npm start`
- [ ] Verify keys: Check logs for "initialized" messages
- [ ] Make test call to Twilio number

---

## Support

**Need help getting API keys?**

1. Check provider documentation:
   - [ElevenLabs Docs](https://docs.elevenlabs.io/)
   - [Deepgram Docs](https://developers.deepgram.com/)
   - [OpenAI Docs](https://platform.openai.com/docs/)

2. Contact provider support:
   - ElevenLabs: support@elevenlabs.io
   - Deepgram: support@deepgram.com
   - OpenAI: help.openai.com

3. Check system logs:
   ```bash
   tail -f logs/aeris-*.log
   ```

---

**Ready to go?** Follow the [QUICK_START.md](QUICK_START.md) guide!

---

Built with ❤️ by Aeris for Roger

# 🚀 Quick Start Guide

Get Aeris Voice Calling running in 10 minutes!

## Prerequisites Check

```bash
# Check Node.js version (need 18+)
node --version

# If not installed: brew install node (macOS)
```

## Step 1: Install Dependencies (2 min)

```bash
cd /Users/arisrsr/clawd/voice-calling-system
./setup.sh
```

This will:
- Install all npm packages
- Create necessary directories
- Check for required API keys

## Step 2: Get API Keys (5 min)

### ElevenLabs (Required for best voice)

1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Sign up (free tier available)
3. Go to Profile → API Keys
4. Copy your API key

### Deepgram (Required for speech-to-text)

1. Go to [deepgram.com](https://deepgram.com)
2. Sign up (free $200 credit)
3. Copy API key from console

### Add to .env file:

```bash
# Edit .env
nano .env

# Add these lines:
ELEVENLABS_API_KEY=sk_...your_key_here
DEEPGRAM_API_KEY=...your_key_here

# Save: Ctrl+X, Y, Enter
```

## Step 3: Start the Server (1 min)

```bash
# Terminal 1: Start the voice server
npm start
```

You should see:
```
✅ Aeris Voice Calling System running on port 3000
📞 Webhook URL: http://localhost:3000/voice
```

## Step 4: Expose to Internet (1 min)

```bash
# Terminal 2: Start ngrok
npm run ngrok
```

You'll get a URL like: `https://abc123.ngrok.io`

**Copy this URL!** You'll need it next.

## Step 5: Configure Twilio (1 min)

```bash
# Terminal 3: Run config script
node configure-twilio.js

# Paste your ngrok URL when prompted
# Example: https://abc123.ngrok.io
```

This automatically configures your Twilio number.

## Step 6: Test It! (Now!)

**Call your Twilio number:** `+1 (814) 992-4242`

You should hear:
> "Hello! This is Aeris. How can I help you today?"

Try saying:
> "I'd like to make a reservation for tonight at 7 PM for 4 people."

## ✅ Success Checklist

- [ ] Server running (Terminal 1 shows "running on port 3000")
- [ ] Ngrok running (Terminal 2 shows forwarding URL)
- [ ] Twilio configured (got "✅ Webhook configured successfully!")
- [ ] Test call works (heard Aeris's greeting)
- [ ] Voice sounds human (not robotic)
- [ ] Aeris understood your request

## 🐛 Troubleshooting

### "Cannot find module"
```bash
npm install  # Reinstall dependencies
```

### "Call connects but no audio"
- Check that ngrok URL is HTTPS
- Verify Twilio webhook is configured correctly
- Check server logs: `tail -f logs/aeris-*.log`

### "Robotic voice"
- Verify ElevenLabs API key is set in .env
- Check `ASSISTANT_VOICE_PROVIDER=elevenlabs` in .env

### "Can't transcribe speech"
- Verify Deepgram or OpenAI API key is set
- Check logs for transcription errors

### "Connection refused"
- Make sure server is running (Terminal 1)
- Check ngrok is running (Terminal 2)
- Verify port 3000 is not in use: `lsof -i :3000`

## 📞 What to Test

1. **Basic reservation:**
   - "I want to make a reservation"
   - Give date, time, party size
   - Check if Aeris confirms correctly

2. **Voice quality:**
   - Does it sound human?
   - Natural pauses and pacing?
   - Would you think it's a person?

3. **Understanding:**
   - Try different phrasings
   - Use natural speech with "um" and "uh"
   - Test with background noise

## 📊 Monitor Your Calls

### View live logs:
```bash
tail -f logs/aeris-*.log
```

### Check call transcripts:
```bash
ls logs/call-*.json
cat logs/call-[latest].json | python3 -m json.tool
```

### Health check:
```bash
curl http://localhost:3000/health
```

## 🎯 Next Steps

Once basic testing works:

1. **Review call logs** - Check what was captured
2. **Test edge cases** - See EXAMPLE_CALLS.md
3. **Customize voice** - Change settings in .env
4. **Deploy to production** - See README.md deployment section
5. **Provide feedback** - What works? What doesn't?

## 💰 Cost Estimate

For testing (10-20 calls):
- ElevenLabs: ~$0.90 (on free tier)
- Deepgram: ~$0.10 (free credit)
- Twilio: ~$0.20 (from account balance)
- Claude API: ~$0.20 (from account balance)

**Total: ~$1.40 for 10 test calls**

Free tiers should cover initial testing!

## 🔄 Restart / Stop

### Restart server:
```bash
# Stop: Ctrl+C in Terminal 1
# Start: npm start
```

### Stop ngrok:
```bash
# Stop: Ctrl+C in Terminal 2
# Note: URL will change on restart!
# Re-run: node configure-twilio.js
```

### Clean restart:
```bash
# Kill all processes
pkill -f "node src/server.js"
pkill -f "ngrok"

# Start fresh
npm start     # Terminal 1
npm run ngrok # Terminal 2
```

## 📞 Need Help?

**Something not working?**

1. Check server logs: `tail -f logs/aeris-*.log`
2. Test health endpoint: `curl http://localhost:3000/health`
3. Verify ngrok: Open ngrok URL in browser (should show status)
4. Check Twilio console: [console.twilio.com](https://console.twilio.com)

**Still stuck?** Contact main Aeris agent with:
- What you're trying to do
- Error messages from logs
- Steps you've already tried

---

## 🎉 You're Ready!

The system is now live. Call `+1 (814) 992-4242` anytime to test!

Remember: Each restart of ngrok needs webhook reconfiguration.

For permanent deployment (no ngrok), see README.md → Production Deployment.

---

Built with ❤️ by Aeris for Roger

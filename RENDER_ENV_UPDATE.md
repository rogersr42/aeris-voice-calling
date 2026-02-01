# 🔧 URGENT: Switch to OpenAI TTS

## Problem
ElevenLabs ulaw_8000 format causing garbled audio ("broken TV sound")

## Solution
Use OpenAI TTS instead - proven to work with Twilio

## Render Environment Variables to Update

In Render Dashboard → aeris-voice-calling → Environment:

**Change:**
```
ASSISTANT_VOICE_PROVIDER=openai
```

**Ensure these exist:**
```
OPENAI_API_KEY=<your_openai_api_key>
OPENAI_VOICE=nova
```

Then click "Save Changes" - Render will automatically redeploy.

## Why This Works

OpenAI TTS code path already exists and properly:
1. Requests PCM from OpenAI
2. Downsamples 24kHz → 8kHz  
3. Converts to mulaw using tested library
4. Delivers clean audio to Twilio

No code changes needed - just flip the provider flag!

# 🚀 Deploy to Render - Quick Guide

## Step 1: Create GitHub Repo (2 minutes)

1. Go to https://github.com/new
2. Repository name: `aeris-voice-calling`
3. Make it **Public**  
4. **Don't** initialize with README
5. Click "Create repository"

## Step 2: Push Code (30 seconds)

Copy the commands GitHub shows you, or use these (replace YOUR-USERNAME):

```bash
cd /Users/arisrsr/clawd/voice-calling-system
git remote add origin https://github.com/YOUR-USERNAME/aeris-voice-calling.git
git push -u origin main
```

## Step 3: Deploy on Render (3 minutes)

1. On Render: Click "New Web Service"
2. Connect your GitHub account
3. Select the `aeris-voice-calling` repository
4. Configure:
   - **Name:** `aeris-voice-calling`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (or Starter $7/mo for no cold starts)

## Step 4: Add Environment Variables

In Render dashboard, go to "Environment" and add these:

```
ELEVENLABS_API_KEY=sk_e26e313638cae3a8cfcb6091b4ff0a94c2b763a82e77674f
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
DEEPGRAM_API_KEY=799b27cccf8e7398f449fe326b9ead4f4988dc62
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=5e90fde4580bb8088e817470ef85560c
TWILIO_PHONE_NUMBER=+18149924242
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3000
NODE_ENV=production
TEST_MODE=false
RECORD_CALLS=true
```

## Step 5: Get Your URL & Update Twilio

1. Once deployed, Render will give you a URL like: `https://aeris-voice-calling.onrender.com`
2. Copy that URL
3. Run this on your Mac:

```bash
cd /Users/arisrsr/clawd/voice-calling-system
node update-webhook.js https://aeris-voice-calling.onrender.com
```

## Step 6: Test!

Call your number: **+1 (814) 992-4242**

Aeris should answer! 🎉

---

## Troubleshooting

**Deployment fails?**
- Check Build Logs in Render dashboard
- Verify all environment variables are set
- Make sure Node version is 18+ (set `NODE_VERSION=18` if needed)

**No answer on call?**
- Check Render logs for errors
- Verify webhook was updated in Twilio
- Make sure service is running (not sleeping)

**Cold starts on Free tier?**
- Free tier sleeps after 15 min inactivity
- First call may take 30-60 seconds
- Upgrade to Starter ($7/mo) for instant response

---

Need help? Tell Aeris (me!) 🤖

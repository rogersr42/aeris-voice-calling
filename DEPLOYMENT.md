# 🚀 Production Deployment Guide

## Overview

This guide covers deploying the Aeris Voice Calling System to production environments.

## Deployment Options

### Option 1: Railway (Recommended for Easy Setup)

**Pros:** Simple, automatic HTTPS, good for MVP
**Cons:** ~$5-10/month minimum

#### Steps:

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login and initialize:**
   ```bash
   railway login
   cd /Users/arisrsr/clawd/voice-calling-system
   railway init
   ```

3. **Set environment variables:**
   ```bash
   railway variables set ELEVENLABS_API_KEY=your_key
   railway variables set DEEPGRAM_API_KEY=your_key
   railway variables set TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
   railway variables set TWILIO_AUTH_TOKEN=5e90fde4580bb8088e817470ef85560c
   railway variables set TWILIO_PHONE_NUMBER=+18149924242
   railway variables set ANTHROPIC_API_KEY=your_anthropic_api_key_here
   railway variables set PORT=3000
   railway variables set NODE_ENV=production
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Get your URL:**
   ```bash
   railway domain
   # Example: https://aeris-voice-production.up.railway.app
   ```

6. **Configure Twilio:**
   ```bash
   # Update webhook with Railway URL
   node configure-twilio.js
   # Enter: https://your-railway-domain.railway.app
   ```

---

### Option 2: Render

**Pros:** Free tier available, simple setup
**Cons:** Free tier has cold starts (slower first call)

#### Steps:

1. **Push code to GitHub:**
   ```bash
   cd /Users/arisrsr/clawd/voice-calling-system
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/aeris-voice.git
   git push -u origin main
   ```

2. **Create new Web Service on Render:**
   - Go to [render.com](https://render.com)
   - New → Web Service
   - Connect your GitHub repo
   - Settings:
     - Name: `aeris-voice-calling`
     - Build Command: `npm install`
     - Start Command: `npm start`
     - Instance Type: Free (or Starter for $7/mo)

3. **Add environment variables:**
   In Render dashboard → Environment, add:
   - `ELEVENLABS_API_KEY`
   - `DEEPGRAM_API_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `ANTHROPIC_API_KEY`
   - `PORT=3000`
   - `NODE_ENV=production`

4. **Deploy and configure Twilio:**
   - Get URL from Render dashboard (e.g., `https://aeris-voice-calling.onrender.com`)
   - Run `node configure-twilio.js` with your Render URL

---

### Option 3: VPS (DigitalOcean, AWS, etc.)

**Pros:** Full control, better for scale
**Cons:** More setup, need to manage server

#### Steps:

1. **Create VPS** (Ubuntu 22.04 LTS recommended)

2. **SSH into server:**
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Install PM2 (process manager):**
   ```bash
   npm install -g pm2
   ```

5. **Clone and setup:**
   ```bash
   cd /home
   git clone your-repo-url aeris-voice
   cd aeris-voice
   npm install --production
   ```

6. **Create .env file:**
   ```bash
   nano .env
   # Add all environment variables
   ```

7. **Start with PM2:**
   ```bash
   pm2 start src/server.js --name aeris-voice
   pm2 save
   pm2 startup
   ```

8. **Setup Nginx reverse proxy:**
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx
   ```

   Create nginx config:
   ```bash
   sudo nano /etc/nginx/sites-available/aeris-voice
   ```

   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable and start:
   ```bash
   sudo ln -s /etc/nginx/sites-available/aeris-voice /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

9. **Setup SSL:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

10. **Configure Twilio:**
    ```bash
    node configure-twilio.js
    # Enter: https://your-domain.com
    ```

---

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` to git
- Use secrets management (Railway secrets, AWS Secrets Manager, etc.)
- Rotate API keys regularly

### 2. Twilio Webhook Validation
Add to `src/server.js`:
```javascript
import { validateRequest } from 'twilio';

app.post('/voice', (req, res) => {
  const signature = req.headers['x-twilio-signature'];
  const url = `https://${req.headers.host}${req.url}`;
  
  const isValid = validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    req.body
  );
  
  if (!isValid) {
    return res.status(403).send('Invalid signature');
  }
  
  // Handle call...
});
```

### 3. Rate Limiting
Install and configure:
```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/voice', limiter);
```

### 4. HTTPS Only
Ensure all traffic uses HTTPS:
- Railway/Render: Automatic
- VPS: Use Certbot/Let's Encrypt

---

## Monitoring & Logging

### 1. Application Logs
Logs are saved to `logs/` directory:
- `aeris-YYYY-MM-DD.log` - Daily application logs
- `call-[session-id].json` - Individual call transcripts

### 2. Log Rotation
Add to PM2 config:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 3. Monitoring Services

**Railway:**
- Built-in metrics dashboard
- View logs: `railway logs`

**Custom Monitoring:**
Install monitoring tools:
```bash
npm install prom-client # Prometheus metrics
npm install @sentry/node # Error tracking
```

### 4. Health Checks
Monitor `/health` endpoint:
```bash
# Set up Uptime Robot or similar
# URL: https://your-domain.com/health
# Check every 5 minutes
```

---

## Performance Optimization

### 1. Caching
Add Redis for session caching:
```bash
npm install redis
```

### 2. Load Balancing
For high traffic, use multiple instances:
```bash
# PM2 cluster mode
pm2 start src/server.js -i max --name aeris-voice
```

### 3. CDN
For static assets (if added later):
- Use Cloudflare
- Cache audio files
- Reduce latency

---

## Backup & Recovery

### 1. Database Backups
If you add a database:
```bash
# Automated backups every 6 hours
0 */6 * * * pg_dump aeris_db > /backups/aeris_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

### 2. Log Backups
```bash
# Archive logs monthly
0 0 1 * * tar -czf /backups/logs_$(date +\%Y\%m).tar.gz /home/aeris-voice/logs/*
```

### 3. Code Backups
Use git and keep repo updated:
```bash
git push origin main
```

---

## Scaling Considerations

### Traffic Levels:

**Low (0-100 calls/day):**
- Free tier / Single instance
- Cost: ~$5-10/month

**Medium (100-1000 calls/day):**
- Paid tier instance
- Consider Redis for session management
- Cost: ~$20-50/month

**High (1000+ calls/day):**
- Multiple instances with load balancer
- Dedicated database
- Caching layer
- Cost: ~$100-300/month

---

## Troubleshooting Production

### Service Not Starting
```bash
# Check logs
pm2 logs aeris-voice
railway logs

# Check environment
node -e "console.log(process.env)"
```

### High Latency
- Check API response times
- Monitor network latency
- Consider regional deployment closer to users

### Memory Leaks
```bash
# Monitor memory usage
pm2 monit

# Restart if needed
pm2 restart aeris-voice
```

### Call Quality Issues
- Check audio format compatibility
- Monitor TTS/STT API response times
- Verify network bandwidth

---

## Cost Optimization

### 1. Use Free Tiers
- Deepgram: $200 free credit
- ElevenLabs: 10,000 characters free/month
- Railway/Render: Free tier available

### 2. Optimize API Calls
- Cache common responses
- Batch requests where possible
- Use cheaper models for non-critical operations

### 3. Monitor Usage
- Track API costs per service
- Set up billing alerts
- Review monthly usage reports

---

## Maintenance Schedule

### Daily:
- Check error logs
- Monitor call success rate
- Verify API key limits

### Weekly:
- Review call transcripts for quality
- Update conversation prompts if needed
- Check security updates

### Monthly:
- Rotate API keys
- Archive old logs
- Review and optimize costs
- Update dependencies: `npm update`

---

## Emergency Procedures

### Service Down:
1. Check server status
2. Review recent logs
3. Restart service: `pm2 restart aeris-voice`
4. If persistent, rollback: `git checkout <previous-commit>`

### API Key Compromised:
1. Immediately rotate key in provider dashboard
2. Update environment variables
3. Restart service
4. Review logs for suspicious activity

### High Costs:
1. Pause Twilio number if needed
2. Check for abuse/spam calls
3. Implement stricter rate limiting
4. Review API usage logs

---

## Production Checklist

Before going live:

- [ ] All API keys configured
- [ ] HTTPS enabled
- [ ] Webhook validation enabled
- [ ] Rate limiting configured
- [ ] Monitoring setup
- [ ] Backup system in place
- [ ] Error tracking enabled
- [ ] Load tested (simulate 10-20 concurrent calls)
- [ ] Documentation updated
- [ ] Team trained on emergency procedures

---

## Support

For production issues:
1. Check logs first
2. Review this deployment guide
3. Contact service providers (Railway, Twilio, etc.)
4. Escalate to main Aeris agent if needed

---

Built with ❤️ by Aeris

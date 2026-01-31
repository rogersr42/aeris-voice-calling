#!/usr/bin/env node

import twilio from 'twilio';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  console.error('❌ Missing Twilio credentials in .env file');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n📞 Aeris Voice Calling System - Test Call\n');
console.log(`From: ${fromNumber}`);
console.log('');

rl.question('Enter phone number to test (e.g., +14155551234): ', async (toNumber) => {
  if (!toNumber.startsWith('+')) {
    console.error('❌ Phone number must include country code (e.g., +1...)');
    rl.close();
    process.exit(1);
  }

  console.log('\n🚀 Initiating test call...');
  console.log(`To: ${toNumber}`);
  console.log('');

  try {
    const call = await client.calls.create({
      from: fromNumber,
      to: toNumber,
      url: `https://${process.env.WEBHOOK_HOST || 'your-ngrok-url.ngrok.io'}/voice`,
      statusCallback: `https://${process.env.WEBHOOK_HOST || 'your-ngrok-url.ngrok.io'}/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });

    console.log('✅ Call initiated successfully!');
    console.log(`Call SID: ${call.sid}`);
    console.log(`Status: ${call.status}`);
    console.log('');
    console.log('📊 Monitor call status:');
    console.log(`   twilio api:core:calls:fetch --sid ${call.sid}`);

  } catch (error) {
    console.error('❌ Error initiating call:', error.message);
  }

  rl.close();
});

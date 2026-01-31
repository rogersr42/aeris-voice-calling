#!/usr/bin/env node
/**
 * Quick Twilio Webhook Updater
 * Updates the webhook URL for your Twilio phone number
 */

import twilio from 'twilio';
import 'dotenv/config';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Get webhook URL from command line
const webhookUrl = process.argv[2];

if (!webhookUrl) {
  console.error('❌ Usage: node update-webhook.js <webhook-url>');
  console.error('   Example: node update-webhook.js https://aeris-voice.onrender.com');
  process.exit(1);
}

// Validate URL
try {
  new URL(webhookUrl);
} catch (e) {
  console.error('❌ Invalid URL:', webhookUrl);
  process.exit(1);
}

const client = twilio(accountSid, authToken);

console.log(`\n📞 Updating Twilio webhook for ${phoneNumber}...`);
console.log(`🌐 New webhook: ${webhookUrl}/voice\n`);

try {
  const phoneNumbers = await client.incomingPhoneNumbers.list({
    phoneNumber: phoneNumber,
  });

  if (phoneNumbers.length === 0) {
    console.error('❌ Phone number not found:', phoneNumber);
    process.exit(1);
  }

  const sid = phoneNumbers[0].sid;
  
  await client.incomingPhoneNumbers(sid).update({
    voiceUrl: `${webhookUrl}/voice`,
    voiceMethod: 'POST',
  });

  console.log('✅ Webhook updated successfully!');
  console.log('\n📋 Configuration:');
  console.log(`   Phone: ${phoneNumber}`);
  console.log(`   Webhook: ${webhookUrl}/voice`);
  console.log(`   Method: POST`);
  console.log('\n🎉 Ready to receive calls!\n');

} catch (error) {
  console.error('❌ Error updating webhook:', error.message);
  process.exit(1);
}

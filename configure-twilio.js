#!/usr/bin/env node

import twilio from 'twilio';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !phoneNumber) {
  console.error('❌ Missing Twilio credentials in .env file');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function configureWebhook() {
  console.log('\n🔧 Twilio Webhook Configuration\n');
  console.log(`Phone Number: ${phoneNumber}`);
  console.log('');

  rl.question('Enter your webhook URL (e.g., https://abc123.ngrok.io): ', async (webhookUrl) => {
    if (!webhookUrl.startsWith('https://')) {
      console.error('❌ Webhook URL must use HTTPS');
      rl.close();
      process.exit(1);
    }

    const voiceUrl = `${webhookUrl}/voice`;
    const statusUrl = `${webhookUrl}/status`;

    console.log('\n📞 Configuring phone number...');
    console.log(`Voice URL: ${voiceUrl}`);
    console.log(`Status URL: ${statusUrl}`);

    try {
      // Get phone number SID
      const phoneNumbers = await client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber
      });

      if (phoneNumbers.length === 0) {
        console.error('❌ Phone number not found in Twilio account');
        rl.close();
        process.exit(1);
      }

      const phoneSid = phoneNumbers[0].sid;

      // Update phone number configuration
      await client.incomingPhoneNumbers(phoneSid).update({
        voiceUrl: voiceUrl,
        voiceMethod: 'POST',
        statusCallback: statusUrl,
        statusCallbackMethod: 'POST'
      });

      console.log('✅ Webhook configured successfully!');
      console.log('');
      console.log('📋 Configuration:');
      console.log(`   Phone: ${phoneNumber}`);
      console.log(`   Voice Webhook: ${voiceUrl}`);
      console.log(`   Status Callback: ${statusUrl}`);
      console.log('');
      console.log('🎯 You can now test by calling the number!');

    } catch (error) {
      console.error('❌ Error configuring webhook:', error.message);
    }

    rl.close();
  });
}

configureWebhook();

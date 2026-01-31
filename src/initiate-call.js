#!/usr/bin/env node

/**
 * CALL INITIATION SCRIPT
 * 
 * CRITICAL SAFETY RULE:
 * This script enforces that NO PHONE CALLS ARE ALLOWED WITHOUT EXPLICIT APPROVAL!
 * 
 * Usage:
 *   1. Request a call: node initiate-call.js request --to "+1234567890" --purpose "Restaurant reservation"
 *   2. Review pending calls: node initiate-call.js list
 *   3. Approve a call: node initiate-call.js approve <requestId>
 *   4. Execute approved call: node initiate-call.js execute <requestId>
 */

import { CallApprovalSystem } from './services/call-approval.js';
import twilio from 'twilio';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const webhookUrl = process.env.WEBHOOK_URL || 'https://your-domain.com';

const approvalSystem = new CallApprovalSystem();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    printUsage();
    process.exit(1);
  }

  try {
    switch (command) {
      case 'request':
        await requestCall(args);
        break;
      case 'list':
        await listPendingCalls();
        break;
      case 'approve':
        await approveCall(args[1]);
        break;
      case 'reject':
        await rejectCall(args[1], args[2]);
        break;
      case 'execute':
        await executeCall(args[1]);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    logger.error('Call initiation error', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

async function requestCall(args) {
  // Parse arguments
  const callRequest = {};
  
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    callRequest[key] = value;
  }

  // Validate required fields
  if (!callRequest.to) {
    throw new Error('Missing required field: --to (phone number)');
  }

  if (!callRequest.purpose) {
    throw new Error('Missing required field: --purpose (e.g., "Restaurant reservation")');
  }

  console.log('\n🔒 SAFETY CHECK: Requesting call approval...\n');
  console.log('Call Details:');
  console.log(`  To: ${callRequest.to}`);
  console.log(`  Purpose: ${callRequest.purpose}`);
  console.log(`  Booking Type: ${callRequest.bookingType || 'general'}`);
  console.log(`  Venue: ${callRequest.venue || 'N/A'}`);
  console.log(`  Language: ${callRequest.language || 'en'}`);
  console.log('');

  const requestId = await approvalSystem.requestCallApproval(callRequest);

  console.log(`✅ Call request created: ${requestId}`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Review: node initiate-call.js list`);
  console.log(`  2. Approve: node initiate-call.js approve ${requestId}`);
  console.log(`  3. Execute: node initiate-call.js execute ${requestId}`);
  console.log('');
}

async function listPendingCalls() {
  const pending = await approvalSystem.listPendingCalls();

  if (pending.length === 0) {
    console.log('\n✓ No pending call requests\n');
    return;
  }

  console.log('\n📞 Pending Call Requests:\n');
  
  for (const call of pending) {
    console.log(`Request ID: ${call.requestId}`);
    console.log(`  Status: ${call.status}`);
    console.log(`  To: ${call.callDetails.to}`);
    console.log(`  Purpose: ${call.callDetails.purpose}`);
    console.log(`  Booking Type: ${call.callDetails.bookingType || 'N/A'}`);
    console.log(`  Venue: ${call.callDetails.venue || 'N/A'}`);
    console.log(`  Language: ${call.callDetails.language}`);
    console.log(`  Requested: ${new Date(call.timestamp).toLocaleString()}`);
    console.log(`  Expires: ${new Date(call.metadata.expiresAt).toLocaleString()}`);
    console.log('');
  }

  console.log('Actions:');
  console.log(`  Approve: node initiate-call.js approve <requestId>`);
  console.log(`  Reject: node initiate-call.js reject <requestId> [reason]`);
  console.log('');
}

async function approveCall(requestId) {
  if (!requestId) {
    throw new Error('Missing requestId. Usage: node initiate-call.js approve <requestId>');
  }

  console.log(`\n🔓 Approving call request: ${requestId}...\n`);

  const approved = await approvalSystem.approveCall(requestId, 'Roger Rieder');

  console.log('✅ Call approved!');
  console.log('');
  console.log('Call Details:');
  console.log(`  To: ${approved.callDetails.to}`);
  console.log(`  Purpose: ${approved.callDetails.purpose}`);
  console.log(`  Approved by: ${approved.approvedBy}`);
  console.log(`  Approved at: ${new Date(approved.approvedAt).toLocaleString()}`);
  console.log('');
  console.log('Execute the call:');
  console.log(`  node initiate-call.js execute ${requestId}`);
  console.log('');
  console.log('⚠️  Approval is valid for 1 hour');
  console.log('');
}

async function rejectCall(requestId, reason) {
  if (!requestId) {
    throw new Error('Missing requestId. Usage: node initiate-call.js reject <requestId> [reason]');
  }

  console.log(`\n❌ Rejecting call request: ${requestId}...\n`);

  await approvalSystem.rejectCall(requestId, reason || 'Not approved');

  console.log('✅ Call request rejected');
  console.log(`Reason: ${reason || 'Not approved'}`);
  console.log('');
}

async function executeCall(requestId) {
  if (!requestId) {
    throw new Error('Missing requestId. Usage: node initiate-call.js execute <requestId>');
  }

  console.log(`\n📞 Executing call: ${requestId}...\n`);

  // Check if call is approved
  const isApproved = await approvalSystem.isCallApproved(requestId);
  
  if (!isApproved) {
    throw new Error(
      `Call ${requestId} is not approved or approval has expired. ` +
      'Please approve the call first: node initiate-call.js approve ' + requestId
    );
  }

  // Get call details
  const approvedCalls = await approvalSystem.loadApprovedCalls();
  const callDetails = approvedCalls.find(c => c.requestId === requestId);

  if (!callDetails) {
    throw new Error(`Call ${requestId} not found in approved calls`);
  }

  console.log('Initiating Twilio call...');
  console.log(`  From: ${fromNumber}`);
  console.log(`  To: ${callDetails.callDetails.to}`);
  console.log(`  Purpose: ${callDetails.callDetails.purpose}`);
  console.log('');

  // Initialize Twilio client
  const client = twilio(accountSid, authToken);

  // Make the call
  const call = await client.calls.create({
    from: fromNumber,
    to: callDetails.callDetails.to,
    url: `${webhookUrl}/voice?language=${callDetails.callDetails.language}`,
    statusCallback: `${webhookUrl}/status`,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    record: true // Record all calls for quality review
  });

  // Mark call as executed
  await approvalSystem.markCallExecuted(requestId, call.sid);

  console.log('✅ Call initiated successfully!');
  console.log('');
  console.log('Call Details:');
  console.log(`  Call SID: ${call.sid}`);
  console.log(`  Status: ${call.status}`);
  console.log(`  Direction: ${call.direction}`);
  console.log('');
  console.log('Monitor call:');
  console.log(`  Twilio Console: https://console.twilio.com/us1/monitor/logs/calls/${call.sid}`);
  console.log(`  Local logs: tail -f logs/aeris-*.log`);
  console.log('');
  console.log('⏺️  Call is being recorded for quality review');
  console.log('');
}

function printUsage() {
  console.log(`
🎙️ Aeris Voice Calling System - Call Initiator

CRITICAL SAFETY RULE:
NO PHONE CALLS ARE ALLOWED WITHOUT EXPLICIT APPROVAL!

Usage:

  1. Request a call:
     node initiate-call.js request --to "+1234567890" --purpose "Restaurant reservation" [--venue "Restaurant Name"] [--bookingType "restaurant"] [--language "en"]

  2. List pending requests:
     node initiate-call.js list

  3. Approve a call:
     node initiate-call.js approve <requestId>

  4. Reject a call:
     node initiate-call.js reject <requestId> [reason]

  5. Execute approved call:
     node initiate-call.js execute <requestId>

Example workflow:

  # Step 1: Request a call
  node initiate-call.js request \\
    --to "+14155551234" \\
    --purpose "Make dinner reservation" \\
    --venue "La Brasserie" \\
    --bookingType "restaurant" \\
    --language "en"

  # Step 2: Review and approve
  node initiate-call.js list
  node initiate-call.js approve call-req-1234-abcd

  # Step 3: Execute the call
  node initiate-call.js execute call-req-1234-abcd

Safety Features:
  ✓ All outbound calls require explicit approval
  ✓ No automatic calling
  ✓ Approval expires after 1 hour
  ✓ All calls are recorded for quality review
  ✓ Full audit trail in logs/

`);
}

main();

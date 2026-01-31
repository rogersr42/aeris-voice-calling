/**
 * CALL APPROVAL SYSTEM
 * 
 * CRITICAL SAFETY RULE:
 * NO PHONE CALLS ARE ALLOWED WITHOUT EXPLICIT INSTRUCTIONS EACH TIME!
 * 
 * This module enforces call approval at the code level.
 */

import { logger } from '../utils/logger.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { SAFETY_RULES } from '../../config/persona.js';

export class CallApprovalSystem {
  constructor() {
    this.pendingCallsPath = join(process.cwd(), 'data', 'pending-calls.json');
    this.approvedCallsPath = join(process.cwd(), 'data', 'approved-calls.json');
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }
  }

  /**
   * Request approval for an outbound call
   * 
   * @param {Object} callRequest - Call details
   * @returns {Promise<string>} - Request ID
   */
  async requestCallApproval(callRequest) {
    // SAFETY CHECK: Outbound calls require approval
    if (!SAFETY_RULES.outboundCallsRequireApproval) {
      throw new Error('SAFETY VIOLATION: Outbound calls must require approval');
    }

    const requestId = this.generateRequestId();
    
    const request = {
      requestId,
      timestamp: new Date().toISOString(),
      status: 'pending',
      callDetails: {
        to: callRequest.to,
        purpose: callRequest.purpose,
        bookingType: callRequest.bookingType,
        venue: callRequest.venue,
        requestedBy: callRequest.requestedBy || 'Roger Rieder',
        language: callRequest.language || 'en'
      },
      metadata: {
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    };

    // Save to pending calls
    await this.savePendingCall(request);

    logger.info('Call approval requested', {
      requestId,
      to: callRequest.to,
      purpose: callRequest.purpose
    });

    return requestId;
  }

  /**
   * Approve a call request
   * 
   * @param {string} requestId - Request ID to approve
   * @param {string} approvedBy - Who approved it (should be Roger)
   * @returns {Promise<Object>} - Approved call details
   */
  async approveCall(requestId, approvedBy = 'Roger Rieder') {
    const pendingCall = await this.getPendingCall(requestId);
    
    if (!pendingCall) {
      throw new Error(`Call request ${requestId} not found`);
    }

    if (pendingCall.status !== 'pending') {
      throw new Error(`Call request ${requestId} is not pending (status: ${pendingCall.status})`);
    }

    // Update status
    pendingCall.status = 'approved';
    pendingCall.approvedBy = approvedBy;
    pendingCall.approvedAt = new Date().toISOString();

    // Move to approved calls
    await this.saveApprovedCall(pendingCall);
    await this.removePendingCall(requestId);

    logger.info('Call approved', {
      requestId,
      approvedBy,
      to: pendingCall.callDetails.to
    });

    return pendingCall;
  }

  /**
   * Reject a call request
   */
  async rejectCall(requestId, reason = '') {
    const pendingCall = await this.getPendingCall(requestId);
    
    if (!pendingCall) {
      throw new Error(`Call request ${requestId} not found`);
    }

    pendingCall.status = 'rejected';
    pendingCall.rejectedAt = new Date().toISOString();
    pendingCall.rejectionReason = reason;

    await this.removePendingCall(requestId);

    logger.info('Call rejected', {
      requestId,
      reason,
      to: pendingCall.callDetails.to
    });
  }

  /**
   * Check if a call is approved
   */
  async isCallApproved(requestId) {
    const approvedCalls = await this.loadApprovedCalls();
    const call = approvedCalls.find(c => c.requestId === requestId);
    
    if (!call) {
      return false;
    }

    // Check if approval is still valid (within 1 hour)
    const approvedAt = new Date(call.approvedAt);
    const expiresAt = new Date(approvedAt.getTime() + 60 * 60 * 1000); // 1 hour
    
    if (new Date() > expiresAt) {
      logger.warn('Call approval expired', { requestId });
      return false;
    }

    return true;
  }

  /**
   * Mark call as executed
   */
  async markCallExecuted(requestId, callSid) {
    const approvedCalls = await this.loadApprovedCalls();
    const call = approvedCalls.find(c => c.requestId === requestId);
    
    if (call) {
      call.status = 'executed';
      call.executedAt = new Date().toISOString();
      call.callSid = callSid;
      await this.saveApprovedCalls(approvedCalls);
      
      logger.info('Call marked as executed', { requestId, callSid });
    }
  }

  /**
   * List all pending call requests
   */
  async listPendingCalls() {
    return await this.loadPendingCalls();
  }

  /**
   * SAFETY CHECK: Enforce that no automatic calls are allowed
   */
  static enforceSafetyRules() {
    if (SAFETY_RULES.allowAutomaticCalls) {
      throw new Error(
        'CRITICAL SAFETY VIOLATION: allowAutomaticCalls must be false. ' +
        'NO PHONE CALLS ARE ALLOWED WITHOUT EXPLICIT INSTRUCTIONS!'
      );
    }
    
    if (!SAFETY_RULES.outboundCallsRequireApproval) {
      throw new Error(
        'CRITICAL SAFETY VIOLATION: outboundCallsRequireApproval must be true. ' +
        'All outbound calls require explicit approval!'
      );
    }

    logger.info('Safety rules enforced', {
      automaticCalls: SAFETY_RULES.allowAutomaticCalls,
      requireApproval: SAFETY_RULES.outboundCallsRequireApproval
    });
  }

  // Helper methods

  generateRequestId() {
    return `call-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async savePendingCall(request) {
    const pending = await this.loadPendingCalls();
    pending.push(request);
    await this.savePendingCalls(pending);
  }

  async removePendingCall(requestId) {
    const pending = await this.loadPendingCalls();
    const filtered = pending.filter(c => c.requestId !== requestId);
    await this.savePendingCalls(filtered);
  }

  async getPendingCall(requestId) {
    const pending = await this.loadPendingCalls();
    return pending.find(c => c.requestId === requestId);
  }

  async loadPendingCalls() {
    try {
      if (!existsSync(this.pendingCallsPath)) {
        return [];
      }
      const data = await readFile(this.pendingCallsPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error loading pending calls', { error: error.message });
      return [];
    }
  }

  async savePendingCalls(calls) {
    await this.ensureDataDirectory();
    await writeFile(this.pendingCallsPath, JSON.stringify(calls, null, 2));
  }

  async loadApprovedCalls() {
    try {
      if (!existsSync(this.approvedCallsPath)) {
        return [];
      }
      const data = await readFile(this.approvedCallsPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error loading approved calls', { error: error.message });
      return [];
    }
  }

  async saveApprovedCall(call) {
    const approved = await this.loadApprovedCalls();
    approved.push(call);
    await this.saveApprovedCalls(approved);
  }

  async saveApprovedCalls(calls) {
    await this.ensureDataDirectory();
    await writeFile(this.approvedCallsPath, JSON.stringify(calls, null, 2));
  }
}

// Enforce safety rules on module load
CallApprovalSystem.enforceSafetyRules();

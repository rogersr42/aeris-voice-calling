import { createClient } from '@deepgram/sdk';
import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

export class SpeechToText {
  constructor() {
    this.provider = process.env.STT_PROVIDER || 'deepgram'; // deepgram or whisper
    
    if (this.provider === 'deepgram' && process.env.DEEPGRAM_API_KEY) {
      this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    } else if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.provider = 'whisper';
    } else {
      logger.warn('No STT provider configured, using mock transcription');
      this.provider = 'mock';
    }

    logger.info(`Speech-to-Text initialized with provider: ${this.provider}`);
  }

  async transcribe(audioBuffer) {
    try {
      if (this.provider === 'deepgram' && this.deepgram) {
        return await this.transcribeDeepgram(audioBuffer);
      } else if (this.provider === 'whisper' && this.openai) {
        return await this.transcribeWhisper(audioBuffer);
      } else {
        return await this.mockTranscribe();
      }
    } catch (error) {
      logger.error('Transcription error', { 
        provider: this.provider,
        error: error.message 
      });
      throw error;
    }
  }

  async transcribeDeepgram(audioBuffer) {
    try {
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          language: 'en-US',
          smart_format: true,
          punctuate: true,
          utterances: true,
          diarize: false
        }
      );

      if (error) {
        throw error;
      }

      const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';
      logger.debug('Deepgram transcription', { transcript });
      return transcript.trim();

    } catch (error) {
      logger.error('Deepgram transcription error', { error: error.message });
      throw error;
    }
  }

  async transcribeWhisper(audioBuffer) {
    try {
      // Whisper needs a file, so write to temp
      const tempPath = join(tmpdir(), `audio-${Date.now()}.wav`);
      
      // Convert mulaw to WAV if needed (Twilio sends mulaw)
      // For now, write raw and let Whisper handle it
      await writeFile(tempPath, audioBuffer);

      const transcription = await this.openai.audio.transcriptions.create({
        file: await fetch(`file://${tempPath}`).then(r => r.blob()),
        model: 'whisper-1',
        language: 'en',
        response_format: 'text'
      });

      logger.debug('Whisper transcription', { text: transcription });
      
      // Clean up temp file
      try {
        await unlink(tempPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      return transcription.trim();

    } catch (error) {
      logger.error('Whisper transcription error', { error: error.message });
      throw error;
    }
  }

  async mockTranscribe() {
    // Mock for testing without API keys
    logger.warn('Using mock transcription');
    return "I'd like to make a reservation for tonight.";
  }
}

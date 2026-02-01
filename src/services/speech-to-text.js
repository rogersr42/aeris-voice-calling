import { createClient } from '@deepgram/sdk';
import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import WavEncoder from 'wav-encoder';

// mulaw decoding table
const MULAW_DECODE_TABLE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  const sign = (i & 0x80) ? -1 : 1;
  let exponent = (i >> 4) & 0x07;
  let mantissa = i & 0x0F;
  let sample = (mantissa << 3) + 132;
  sample <<= exponent;
  MULAW_DECODE_TABLE[i] = sign * (sample - 132);
}

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

  // Convert mulaw audio buffer to WAV format
  async convertMulawToWav(mulawBuffer) {
    try {
      // Decode mulaw to linear PCM
      const pcmData = new Int16Array(mulawBuffer.length);
      for (let i = 0; i < mulawBuffer.length; i++) {
        pcmData[i] = MULAW_DECODE_TABLE[mulawBuffer[i]];
      }

      // Normalize to float32 for wav-encoder
      const floatData = new Float32Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        floatData[i] = pcmData[i] / 32768.0;
      }

      // Encode as WAV (8kHz sample rate, mono)
      const audioData = {
        sampleRate: 8000,
        channelData: [floatData]
      };

      const wavBuffer = await WavEncoder.encode(audioData);
      logger.debug('Converted mulaw to WAV', { 
        inputSize: mulawBuffer.length,
        outputSize: wavBuffer.byteLength 
      });

      return Buffer.from(wavBuffer);
    } catch (error) {
      logger.error('Error converting mulaw to WAV', { error: error.message });
      throw error;
    }
  }

  async transcribe(audioBuffer) {
    try {
      // Convert mulaw to WAV first
      const wavBuffer = await this.convertMulawToWav(audioBuffer);

      if (this.provider === 'deepgram' && this.deepgram) {
        return await this.transcribeDeepgram(wavBuffer);
      } else if (this.provider === 'whisper' && this.openai) {
        return await this.transcribeWhisper(wavBuffer);
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

  async transcribeDeepgram(wavBuffer) {
    try {
      logger.info('Sending audio to Deepgram', { size: wavBuffer.length });
      
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        wavBuffer,
        {
          model: 'nova-2',
          language: 'en-US',
          smart_format: true,
          punctuate: true,
          utterances: true,
          diarize: false,
          encoding: 'linear16',
          sample_rate: 8000,
          channels: 1
        }
      );

      if (error) {
        throw error;
      }

      const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';
      const confidence = result.results?.channels[0]?.alternatives[0]?.confidence || 0;
      
      logger.info('Deepgram transcription complete', { 
        transcript, 
        confidence,
        words: result.results?.channels[0]?.alternatives[0]?.words?.length || 0
      });
      
      return transcript.trim();

    } catch (error) {
      logger.error('Deepgram transcription error', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  async transcribeWhisper(wavBuffer) {
    try {
      logger.info('Sending audio to Whisper', { size: wavBuffer.length });
      
      // Whisper needs a file, so write WAV to temp
      const tempPath = join(tmpdir(), `audio-${Date.now()}.wav`);
      await writeFile(tempPath, wavBuffer);

      const transcription = await this.openai.audio.transcriptions.create({
        file: await fetch(`file://${tempPath}`).then(r => r.blob()),
        model: 'whisper-1',
        language: 'en',
        response_format: 'text'
      });

      logger.info('Whisper transcription complete', { 
        text: transcription,
        length: transcription.length 
      });
      
      // Clean up temp file
      try {
        await unlink(tempPath);
      } catch (e) {
        logger.warn('Failed to clean up temp file', { path: tempPath });
      }

      return transcription.trim();

    } catch (error) {
      logger.error('Whisper transcription error', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  async mockTranscribe() {
    // Mock for testing without API keys
    logger.warn('Using mock transcription');
    return "I'd like to make a reservation for tonight.";
  }
}

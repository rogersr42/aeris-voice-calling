import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { Readable } from 'stream';
import fetch from 'node-fetch';
import alawmulaw from 'alawmulaw';

// Simple rate limiter for ElevenLabs
class RateLimiter {
  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
    this.currentRequests = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.currentRequests < this.maxConcurrent) {
      this.currentRequests++;
      return;
    }

    // Wait in queue
    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release() {
    this.currentRequests--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.currentRequests++;
      next();
    }
  }
}

export class TextToSpeech {
  constructor() {
    this.provider = process.env.ASSISTANT_VOICE_PROVIDER || 'elevenlabs';
    this.rateLimiter = new RateLimiter(2); // Max 2 concurrent requests
    
    // Initialize ElevenLabs via HTTP API
    if (this.provider === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
      this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
      this.voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
      logger.info('ElevenLabs TTS initialized', { voiceId: this.voiceId });
    } 
    // Fallback to OpenAI
    else if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.voice = process.env.OPENAI_VOICE || 'nova';
      this.provider = 'openai';
      logger.info('OpenAI TTS initialized', { voice: this.voice });
    } 
    // No provider available
    else {
      logger.warn('No TTS provider configured, using mock audio');
      this.provider = 'mock';
    }
  }

  async synthesize(text) {
    try {
      logger.info('Synthesizing speech', { 
        text: text.substring(0, 100),
        provider: this.provider 
      });

      if (this.provider === 'elevenlabs' && this.elevenLabsApiKey) {
        return await this.synthesizeElevenLabs(text);
      } else if (this.provider === 'openai' && this.openai) {
        return await this.synthesizeOpenAI(text);
      } else {
        return await this.mockSynthesize(text);
      }
    } catch (error) {
      logger.error('TTS synthesis error', { 
        provider: this.provider,
        error: error.message 
      });
      
      // Fallback to mock if all else fails
      logger.warn('All TTS providers failed, using silence');
      return await this.mockSynthesize(text);
    }
  }

  async synthesizeElevenLabs(text) {
    // Wait for rate limiter
    await this.rateLimiter.acquire();

    try {
      // ElevenLabs HTTP API for text-to-speech - request PCM directly
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream`;
      
      let retries = 2;
      let lastError;

      while (retries >= 0) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Accept': 'audio/basic',
              'xi-api-key': this.elevenLabsApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text: text,
              model_id: 'eleven_turbo_v2_5',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.3,
                use_speaker_boost: true
              },
              output_format: 'ulaw_8000' // Request mulaw at 8kHz - exactly what Twilio needs!
            }),
            timeout: 15000
          });

          if (!response.ok) {
            const error = await response.text();
            
            // If rate limited, wait and retry
            if (response.status === 429) {
              logger.warn('Rate limited, waiting before retry', { retries });
              await this.sleep(2000);
              retries--;
              continue;
            }
            
            throw new Error(`ElevenLabs API error: ${response.status} ${error}`);
          }

          // Get the mulaw audio buffer directly - no conversion needed!
          const mulawBuffer = await response.buffer();
          
          logger.info('ElevenLabs mulaw audio received (ready for Twilio)', { 
            size: mulawBuffer.length,
            format: 'ulaw_8000',
            note: 'No conversion needed - direct from ElevenLabs!'
          });

          // Return as chunks
          return this.bufferToChunks(mulawBuffer);

        } catch (error) {
          lastError = error;
          if (retries > 0) {
            logger.warn('ElevenLabs request failed, retrying', { 
              retries, 
              error: error.message 
            });
            await this.sleep(1000);
            retries--;
          } else {
            throw lastError;
          }
        }
      }

      throw lastError;

    } catch (error) {
      logger.error('ElevenLabs synthesis error', { error: error.message });
      
      // Fallback to OpenAI if ElevenLabs fails
      if (this.openai) {
        logger.warn('Falling back to OpenAI TTS');
        return await this.synthesizeOpenAI(text);
      }
      throw error;
    } finally {
      this.rateLimiter.release();
    }
  }

  // Simple PCM resampling (linear interpolation)
  resamplePCM(pcmData, fromRate, toRate) {
    const ratio = fromRate / toRate;
    const outputLength = Math.floor(pcmData.length / ratio);
    const output = new Int16Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, pcmData.length - 1);
      const frac = srcIndex - srcIndexFloor;
      
      output[i] = Math.round(
        pcmData[srcIndexFloor] * (1 - frac) + pcmData[srcIndexCeil] * frac
      );
    }
    
    return output;
  }

  async convertPCMToMulaw(pcmBuffer, fromRate = 24000) {
    try {
      // Convert Buffer to Int16Array
      let pcmData = new Int16Array(
        pcmBuffer.buffer,
        pcmBuffer.byteOffset,
        pcmBuffer.length / 2
      );
      
      // Resample to 8kHz if needed
      if (fromRate !== 8000) {
        pcmData = this.resamplePCM(pcmData, fromRate, 8000);
      }
      
      // Encode to mulaw using tested library (expects Int16Array, returns Uint8Array)
      const mulawUint8 = alawmulaw.mulaw.encode(pcmData);
      
      // Convert Uint8Array to Buffer
      const mulawBuffer = Buffer.from(mulawUint8);
      
      logger.info('PCM converted to mulaw', {
        inputSize: pcmBuffer.length,
        inputSamples: pcmData.length,
        inputRate: fromRate,
        outputSize: mulawBuffer.length
      });
      
      return mulawBuffer;
      
    } catch (error) {
      logger.error('PCM to mulaw conversion failed', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  async synthesizeOpenAI(text) {
    try {
      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: this.voice,
        input: text,
        speed: 0.95,
        response_format: 'pcm' // Get PCM directly
      });

      const pcmBuffer = Buffer.from(await mp3.arrayBuffer());
      
      logger.info('OpenAI PCM audio received', {
        size: pcmBuffer.length,
        format: 'pcm_24000'
      });
      
      // OpenAI returns PCM at 24kHz, mono, 16-bit
      const mulawBuffer = await this.convertPCMToMulaw(pcmBuffer, 24000);
      
      return this.bufferToChunks(mulawBuffer);

    } catch (error) {
      logger.error('OpenAI TTS error', { error: error.message });
      throw error;
    }
  }

  async convertPCMToMulaw(pcmBuffer, sampleRate = 24000, channels = 1) {
    try {
      // Convert Buffer to Int16Array
      let pcmData = new Int16Array(
        pcmBuffer.buffer,
        pcmBuffer.byteOffset,
        pcmBuffer.length / 2
      );
      
      // Convert stereo to mono if needed
      if (channels === 2) {
        pcmData = stereoToMono(pcmData);
      }
      
      // Resample to 8kHz for Twilio (if not already)
      if (sampleRate !== 8000) {
        pcmData = resamplePCM(Buffer.from(pcmData.buffer), sampleRate, 8000);
      }
      
      // Encode to mulaw using pure JS
      const mulawBuffer = pcm16ToMulaw(pcmData);
      
      logger.info('PCM converted to mulaw (JS encoder)', {
        inputSize: pcmBuffer.length,
        sampleRate,
        channels,
        outputSize: mulawBuffer.length
      });
      
      return mulawBuffer;
      
    } catch (error) {
      logger.error('PCM to mulaw conversion error', { error: error.message });
      throw error;
    }
  }

  async mockSynthesize(text) {
    logger.warn('Using mock audio synthesis');
    const chunks = [];
    const silenceLength = Math.min(text.length * 30, 2000);
    const numChunks = Math.floor(silenceLength / 20);
    
    for (let i = 0; i < numChunks; i++) {
      chunks.push(Buffer.alloc(160, 0xFF)); // Silence in mulaw
    }
    return chunks;
  }

  bufferToChunks(mulawBuffer) {
    // Split mulaw audio into chunks suitable for Twilio
    const CHUNK_SIZE = 160; // 20ms of audio at 8kHz mulaw
    const chunks = [];
    
    for (let i = 0; i < mulawBuffer.length; i += CHUNK_SIZE) {
      const chunk = mulawBuffer.slice(i, Math.min(i + CHUNK_SIZE, mulawBuffer.length));
      // Pad last chunk if needed
      if (chunk.length < CHUNK_SIZE) {
        const padded = Buffer.alloc(CHUNK_SIZE, 0xFF);
        chunk.copy(padded);
        chunks.push(padded);
      } else {
        chunks.push(chunk);
      }
    }
    
    logger.info('Audio chunked for Twilio', { 
      totalChunks: chunks.length,
      totalSize: mulawBuffer.length,
      format: 'mulaw'
    });
    
    return chunks;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

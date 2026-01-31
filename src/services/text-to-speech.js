import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { Readable } from 'stream';
import fetch from 'node-fetch';

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
      this.voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel
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
      // ElevenLabs HTTP API for text-to-speech with retry
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream`;
      
      let retries = 2;
      let lastError;

      while (retries >= 0) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'xi-api-key': this.elevenLabsApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text: text,
              model_id: 'eleven_turbo_v2_5', // Fast and high quality
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.3,
                use_speaker_boost: true
              },
              output_format: 'mp3_44100_128' // Good quality MP3
            }),
            timeout: 15000 // 15 second timeout
          });

          if (!response.ok) {
            const error = await response.text();
            
            // If rate limited, wait and retry
            if (response.status === 429) {
              logger.warn('Rate limited, waiting before retry', { retries });
              await this.sleep(2000); // Wait 2 seconds
              retries--;
              continue;
            }
            
            throw new Error(`ElevenLabs API error: ${response.status} ${error}`);
          }

          // Get the audio stream and convert to chunks
          const audioBuffer = await response.buffer();
          
          logger.info('ElevenLabs audio received', { 
            size: audioBuffer.length,
            format: 'mp3'
          });

          // Convert to Twilio format and return
          return this.bufferToMulawChunks(audioBuffer);

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

  async synthesizeOpenAI(text) {
    try {
      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1', // Fast model
        voice: this.voice,
        input: text,
        speed: 0.95,
        response_format: 'opus' // Good quality
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      
      return this.bufferToMulawChunks(buffer);

    } catch (error) {
      logger.error('OpenAI TTS error', { error: error.message });
      throw error;
    }
  }

  async mockSynthesize(text) {
    logger.warn('Using mock audio synthesis');
    // Return silence for testing
    const chunks = [];
    const silenceLength = Math.min(text.length * 30, 2000);
    const numChunks = Math.floor(silenceLength / 20);
    
    for (let i = 0; i < numChunks; i++) {
      chunks.push(Buffer.alloc(160, 0xFF)); // Silence in mulaw
    }
    return chunks;
  }

  bufferToMulawChunks(mp3Buffer) {
    // For now, we'll send the MP3 directly in chunks
    // Twilio can handle various audio formats
    // If audio quality is poor, we'd need ffmpeg conversion
    
    const CHUNK_SIZE = 8000; // Larger chunks for compressed audio
    const chunks = [];
    
    for (let i = 0; i < mp3Buffer.length; i += CHUNK_SIZE) {
      const chunk = mp3Buffer.slice(i, Math.min(i + CHUNK_SIZE, mp3Buffer.length));
      chunks.push(chunk);
    }
    
    logger.info('Audio chunked', { 
      totalChunks: chunks.length,
      totalSize: mp3Buffer.length 
    });
    
    return chunks;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

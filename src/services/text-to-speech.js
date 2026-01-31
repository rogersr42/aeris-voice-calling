import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { Readable } from 'stream';
import fetch from 'node-fetch';

export class TextToSpeech {
  constructor() {
    this.provider = process.env.ASSISTANT_VOICE_PROVIDER || 'elevenlabs';
    
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
      throw error;
    }
  }

  async synthesizeElevenLabs(text) {
    try {
      // ElevenLabs HTTP API for text-to-speech
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}/stream`;
      
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
            stability: 0.5,        // Balanced between expressiveness and consistency
            similarity_boost: 0.75, // High voice similarity
            style: 0.3,            // Natural conversational style
            use_speaker_boost: true // Enhance clarity
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${error}`);
      }

      // Get the audio stream and convert to chunks
      const audioBuffer = await response.buffer();
      
      // Convert MP3 to Twilio-compatible format (mulaw)
      // For production, you'd use ffmpeg or similar
      // For now, return chunks directly
      return this.bufferToChunks(audioBuffer);

    } catch (error) {
      logger.error('ElevenLabs synthesis error', { error: error.message });
      
      // Fallback to OpenAI if ElevenLabs fails
      if (this.openai) {
        logger.warn('Falling back to OpenAI TTS');
        return await this.synthesizeOpenAI(text);
      }
      throw error;
    }
  }

  async synthesizeOpenAI(text) {
    try {
      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1-hd', // High quality model
        voice: this.voice,
        input: text,
        speed: 0.95, // Slightly slower for more natural pacing
        response_format: 'opus' // Good quality, smaller size
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      
      return this.bufferToChunks(buffer);

    } catch (error) {
      logger.error('OpenAI TTS error', { error: error.message });
      throw error;
    }
  }

  async mockSynthesize(text) {
    logger.warn('Using mock audio synthesis');
    // Return empty audio chunks for testing
    const chunks = [];
    const silenceLength = Math.min(text.length * 50, 3000); // Proportional to text length
    const numChunks = Math.floor(silenceLength / 20);
    
    for (let i = 0; i < numChunks; i++) {
      chunks.push(Buffer.alloc(160, 0xFF)); // Silence in mulaw
    }
    return chunks;
  }

  bufferToChunks(buffer) {
    // Convert audio buffer to chunks suitable for Twilio
    const CHUNK_SIZE = 640; // 20ms of audio at 8kHz
    const chunks = [];
    
    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
      const chunk = buffer.slice(i, i + CHUNK_SIZE);
      chunks.push(chunk);
    }
    
    return chunks;
  }

  async *streamToChunks(stream) {
    // Convert stream to async iterable chunks suitable for Twilio
    const CHUNK_SIZE = 640; // 20ms of audio at 8kHz
    let buffer = Buffer.alloc(0);

    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);

      // Yield chunks of the right size
      while (buffer.length >= CHUNK_SIZE) {
        yield buffer.slice(0, CHUNK_SIZE);
        buffer = buffer.slice(CHUNK_SIZE);
      }
    }

    // Yield remaining buffer
    if (buffer.length > 0) {
      yield buffer;
    }
  }
}

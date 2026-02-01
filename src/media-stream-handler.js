import { SpeechToText } from './services/speech-to-text.js';
import { TextToSpeech } from './services/text-to-speech.js';
import { ConversationManager } from './services/conversation-manager.js';
import { logger } from './utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export async function handleMediaStream(ws, req) {
  const sessionId = uuidv4();
  let callSid = null;
  let streamSid = null;
  
  logger.info('Media stream session started', { sessionId });

  // Initialize services
  const stt = new SpeechToText();
  const tts = new TextToSpeech();
  const conversation = new ConversationManager(sessionId);

  // Audio buffer for incoming speech
  let audioBuffer = Buffer.alloc(0);
  let lastSpeechTime = Date.now();
  let isSpeaking = false;
  let isProcessing = false;
  let audioChunkCount = 0;
  
  // Constants for speech detection
  const MIN_SPEECH_BUFFER = 8000;  // ~1 second at 8kHz
  const MAX_SPEECH_BUFFER = 64000; // ~8 seconds max
  const SILENCE_THRESHOLD = 1500;  // 1.5 seconds of silence

  // Handle WebSocket messages from Twilio
  ws.on('message', async (message) => {
    try {
      const msg = JSON.parse(message);

      switch (msg.event) {
        case 'start':
          callSid = msg.start.callSid;
          streamSid = msg.start.streamSid;
          logger.info('Media stream started', { 
            sessionId, 
            callSid, 
            streamSid,
            from: msg.start.customParameters?.From,
            to: msg.start.customParameters?.To
          });

          // Send initial greeting
          await sendGreeting(ws, tts, conversation, streamSid);
          break;

        case 'media':
          // Receive audio payload (mulaw, base64 encoded)
          if (msg.media.payload) {
            const audioChunk = Buffer.from(msg.media.payload, 'base64');
            audioBuffer = Buffer.concat([audioBuffer, audioChunk]);
            lastSpeechTime = Date.now();
            isSpeaking = true;
            audioChunkCount++;

            // Log periodically to track incoming audio
            if (audioChunkCount % 50 === 0) {
              logger.info('Receiving audio from user', { 
                bufferSize: audioBuffer.length,
                chunks: audioChunkCount,
                isProcessing 
              });
            }

            // Auto-process if buffer gets too large (prevent overflow)
            if (!isProcessing && audioBuffer.length >= MAX_SPEECH_BUFFER) {
              isProcessing = true;
              logger.info('Max buffer reached, processing speech', { 
                bufferSize: audioBuffer.length,
                chunks: audioChunkCount 
              });
              await processSpeech(audioBuffer, ws, stt, tts, conversation, streamSid);
              audioBuffer = Buffer.alloc(0);
              isSpeaking = false;
              isProcessing = false;
              audioChunkCount = 0;
            }
          }
          break;

        case 'stop':
          logger.info('Media stream stopped', { sessionId, callSid });
          await conversation.endCall();
          break;

        default:
          logger.debug('Unknown event', { event: msg.event });
      }
    } catch (error) {
      logger.error('Error handling message', { 
        sessionId, 
        error: error.message,
        stack: error.stack 
      });
    }
  });

  // Silence detection timer - check every 200ms
  const silenceChecker = setInterval(async () => {
    const silenceDuration = Date.now() - lastSpeechTime;
    const hasEnoughAudio = audioBuffer.length >= MIN_SPEECH_BUFFER;
    const hasSilence = silenceDuration > SILENCE_THRESHOLD;
    
    if (!isProcessing && isSpeaking && hasEnoughAudio && hasSilence) {
      isProcessing = true;
      logger.info('Silence detected, processing speech', { 
        bufferSize: audioBuffer.length,
        chunks: audioChunkCount,
        silenceDuration 
      });
      await processSpeech(audioBuffer, ws, stt, tts, conversation, streamSid);
      audioBuffer = Buffer.alloc(0);
      isSpeaking = false;
      isProcessing = false;
      audioChunkCount = 0;
    }
  }, 200);

  ws.on('close', () => {
    clearInterval(silenceChecker);
    logger.info('WebSocket closed', { sessionId, callSid });
    conversation.endCall();
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error', { 
      sessionId, 
      callSid, 
      error: error.message 
    });
  });
}

async function sendGreeting(ws, tts, conversation, streamSid) {
  const greeting = await conversation.getGreeting();
  await sendAudioResponse(ws, tts, greeting, streamSid);
}

async function processSpeech(audioBuffer, ws, stt, tts, conversation, streamSid) {
  const MIN_AUDIO_SIZE = 4000; // ~0.5 seconds
  
  if (audioBuffer.length < MIN_AUDIO_SIZE) {
    logger.debug('Audio buffer too short, skipping', { 
      size: audioBuffer.length,
      minimum: MIN_AUDIO_SIZE 
    });
    return;
  }

  try {
    logger.info('🎤 Starting speech processing', { 
      audioSize: audioBuffer.length,
      durationEstimate: `${(audioBuffer.length / 8000).toFixed(1)}s`
    });
    
    // Convert speech to text
    const transcriptStartTime = Date.now();
    const transcript = await stt.transcribe(audioBuffer);
    const transcriptDuration = Date.now() - transcriptStartTime;
    
    if (!transcript || transcript.trim().length === 0) {
      logger.warn('⚠️ Empty transcription result', { 
        audioSize: audioBuffer.length,
        transcriptDuration 
      });
      return;
    }

    logger.info('✅ User said', { 
      transcript,
      transcriptDuration: `${transcriptDuration}ms`
    });

    // Get AI response
    const aiStartTime = Date.now();
    const response = await conversation.processMessage(transcript);
    const aiDuration = Date.now() - aiStartTime;
    
    logger.info('🤖 AI responded', { 
      preview: response.substring(0, 100) + (response.length > 100 ? '...' : ''),
      length: response.length,
      aiDuration: `${aiDuration}ms`
    });

    // Convert response to speech and send
    await sendAudioResponse(ws, tts, response, streamSid);

  } catch (error) {
    logger.error('❌ Error processing speech', { 
      error: error.message,
      stack: error.stack,
      audioSize: audioBuffer.length
    });
    // Send fallback response
    await sendAudioResponse(
      ws, 
      tts, 
      "I'm sorry, I didn't quite catch that. Could you please repeat?", 
      streamSid
    );
  }
}

async function sendAudioResponse(ws, tts, text, streamSid) {
  try {
    // Generate audio from text
    const audioStream = await tts.synthesize(text);
    
    // Send audio to Twilio in chunks
    // Twilio expects mulaw encoded audio in base64
    for await (const chunk of audioStream) {
      if (ws.readyState === 1) { // WebSocket.OPEN
        const payload = {
          event: 'media',
          streamSid: streamSid,
          media: {
            payload: chunk.toString('base64')
          }
        };
        ws.send(JSON.stringify(payload));
      }
    }

    // Send mark to indicate completion
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({
        event: 'mark',
        streamSid: streamSid,
        mark: {
          name: 'response_complete'
        }
      }));
    }

  } catch (error) {
    logger.error('Error sending audio response', { error: error.message });
  }
}

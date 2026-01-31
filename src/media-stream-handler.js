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

            // Log every 5000 bytes to track incoming audio
            if (audioBuffer.length % 5000 < 200) {
              logger.info('Receiving audio from user', { 
                bufferSize: audioBuffer.length,
                isProcessing 
              });
            }

            // Process when we have enough audio or silence detected
            if (!isProcessing && audioBuffer.length > 16000) {
              isProcessing = true;
              logger.info('Processing user speech', { bufferSize: audioBuffer.length });
              await processSpeech(audioBuffer, ws, stt, tts, conversation, streamSid);
              audioBuffer = Buffer.alloc(0);
              isSpeaking = false;
              isProcessing = false;
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

  // Silence detection timer
  const silenceChecker = setInterval(async () => {
    if (!isProcessing && isSpeaking && Date.now() - lastSpeechTime > 1200 && audioBuffer.length > 4000) {
      isProcessing = true;
      logger.info('Silence detected, processing speech', { bufferSize: audioBuffer.length });
      await processSpeech(audioBuffer, ws, stt, tts, conversation, streamSid);
      audioBuffer = Buffer.alloc(0);
      isSpeaking = false;
      isProcessing = false;
    }
  }, 300);

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
  if (audioBuffer.length < 4000) {
    logger.debug('Audio buffer too short', { size: audioBuffer.length });
    return;
  }

  try {
    logger.info('Starting transcription', { audioSize: audioBuffer.length });
    
    // Convert speech to text
    const transcript = await stt.transcribe(audioBuffer);
    
    if (!transcript || transcript.trim().length === 0) {
      logger.warn('No speech detected in audio', { audioSize: audioBuffer.length });
      return;
    }

    logger.info('Transcribed speech', { transcript });

    // Get AI response
    const response = await conversation.processMessage(transcript);
    logger.info('AI response generated', { response: response.substring(0, 100) });

    // Convert response to speech and send
    await sendAudioResponse(ws, tts, response, streamSid);

  } catch (error) {
    logger.error('Error processing speech', { 
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

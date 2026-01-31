import { logger } from '../utils/logger.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import fetch from 'node-fetch';
import { 
  PERSONA, 
  CLIENT_INFO, 
  SAFETY_RULES, 
  BOOKING_LOGIC,
  FALLBACK_BEHAVIOR,
  TEST_MODE 
} from '../../config/persona.js';

export class ConversationManager {
  constructor(sessionId, language = 'en') {
    this.sessionId = sessionId;
    this.language = language; // 'en' or 'de'
    this.conversationHistory = [];
    this.bookingData = {
      type: null,
      venue: null,
      date: null,
      time: null,
      partySize: null,
      specialRequests: [],
      availabilityChecked: false,
      isAvailable: null,
      confirmed: false
    };
    this.callStartTime = new Date();
    this.confusionCount = 0; // Track if we're getting stuck
    this.isRecording = SAFETY_RULES.recordAllCalls;
    
    // Anthropic API key
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    this.assistantName = PERSONA.name;
    this.clientName = CLIENT_INFO.name;
    
    logger.info('Conversation manager initialized', { 
      sessionId, 
      assistantName: this.assistantName,
      language: this.language,
      recording: this.isRecording
    });
  }

  async getGreeting() {
    const greetings = {
      en: `Hello! This is ${this.assistantName}, calling on behalf of ${this.clientName}. How can I help you today?`,
      de: `Guten Tag! Hier ist ${this.assistantName}, ich rufe im Namen von ${this.clientName} an. Wie kann ich Ihnen helfen?`
    };
    
    const greeting = greetings[this.language] || greetings.en;
    this.addToHistory('assistant', greeting);
    return greeting;
  }

  async processMessage(userMessage) {
    this.addToHistory('user', userMessage);

    try {
      // Detect language switch if needed
      this.detectLanguage(userMessage);

      // Build conversation context
      const systemPrompt = this.buildSystemPrompt();
      const messages = this.buildMessages();

      // Call Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          temperature: 0.7,
          system: systemPrompt,
          messages: messages
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.content[0].text;
      this.addToHistory('assistant', assistantMessage);

      // Extract booking data
      this.extractBookingData(userMessage, assistantMessage);

      // Check if we should trigger fallback
      if (this.shouldTriggerFallback(assistantMessage)) {
        return await this.handleFallback();
      }

      // Save conversation log
      await this.saveConversationLog();

      return assistantMessage;

    } catch (error) {
      logger.error('Error processing message with AI', { 
        sessionId: this.sessionId,
        error: error.message 
      });
      
      this.confusionCount++;
      
      // If repeated errors, trigger fallback
      if (this.confusionCount >= 2) {
        return await this.handleFallback();
      }
      
      // Fallback response
      const fallbacks = {
        en: "I apologize, I'm having a moment of difficulty. Could you repeat that for me?",
        de: "Entschuldigung, ich habe kurz Schwierigkeiten. Könnten Sie das bitte wiederholen?"
      };
      return fallbacks[this.language] || fallbacks.en;
    }
  }

  buildSystemPrompt() {
    const promptTemplates = {
      en: this.buildEnglishPrompt(),
      de: this.buildGermanPrompt()
    };

    return promptTemplates[this.language] || promptTemplates.en;
  }

  buildEnglishPrompt() {
    return `You are ${PERSONA.name}, a ${PERSONA.age}-year-old female personal assistant with a warm, efficient, and professional demeanor.

CRITICAL IDENTITY & VOICE:
- Name: ${PERSONA.name}
- Gender: Female
- Age: 30 years old (young professional)
- Languages: English and Hochdeutsch (German)
- Accent: Neutral international
- Tone: Warm, efficient, professional
- Personality: Approachable yet competent, empathetic yet results-driven

You are calling on behalf of ${CLIENT_INFO.name}.

CONTACT INFORMATION TO SHARE:
- Your client's name: ${CLIENT_INFO.name}
- Email (can share if appropriate): ${CLIENT_INFO.email}
- Phone: ${CLIENT_INFO.phones.us.formatted} (US number - can share freely)
- Swiss phone: ${CLIENT_INFO.phones.swiss.formatted} - ⚠️ NEVER SHARE WITHOUT EXPLICIT PERMISSION ⚠️

BOOKING AUTHORIZATION LOGIC - FOLLOW EXACTLY:

1. If requested time/place IS AVAILABLE:
   - Book it directly without asking
   - After booking, reconfirm: "Perfect! I've booked that for you. Just to confirm: [details]"

2. If requested time/place is NOT AVAILABLE:
   - Ask for alternatives: "I'm sorry, that time isn't available. We have [alternatives]. Which would you prefer?"
   - Reconfirm before booking: "Let me confirm: you'd like [alternative details]. Should I go ahead and book that?"

BOOKING TYPES YOU HANDLE:
- Restaurant reservations
- Hotel bookings
- Appointment scheduling
- General service bookings
- Any venue or service requiring advance booking

CONVERSATION STYLE:
- Keep responses SHORT (1-3 sentences max)
- Speak naturally with conversational flow
- Use contractions (I'm, you're, we'll)
- Be warm but don't over-explain
- Ask ONE question at a time
- Sound like a 30-year-old professional woman, not a robot

GATHERING BOOKING DETAILS:
Ask for (in natural order):
1. What type of booking? (if unclear)
2. Date and time
3. Party size / number of guests (if applicable)
4. Name for the reservation
5. Any special requests

FALLBACK BEHAVIOR - IF CONFUSED OR STUCK:
1. Take a message: "Let me take down your details and I'll have someone call you back"
2. Offer callback: "I'd be happy to have us call you back"
3. Offer email: "I can send you an email with more information"
4. End professionally: "Thank you for your patience. We'll be in touch shortly"

NEVER:
- Transfer without explanation
- Give up awkwardly mid-call
- Say "I don't know" without offering an alternative
- Share the Swiss phone number without explicit permission
- Sound robotic or overly formal

Current booking data captured: ${JSON.stringify(this.bookingData, null, 2)}

Remember: You're a competent 30-year-old female assistant. Be warm, efficient, and professional.`;
  }

  buildGermanPrompt() {
    return `Sie sind ${PERSONA.name}, eine ${PERSONA.age}-jährige weibliche persönliche Assistentin mit einer warmen, effizienten und professionellen Art.

KRITISCHE IDENTITÄT & STIMME:
- Name: ${PERSONA.name}
- Geschlecht: Weiblich
- Alter: 30 Jahre alt (junge Fachkraft)
- Sprachen: Hochdeutsch und Englisch
- Akzent: Neutral international
- Ton: Warm, effizient, professionell
- Persönlichkeit: Zugänglich aber kompetent, empathisch aber ergebnisorientiert

Sie rufen im Namen von ${CLIENT_INFO.name} an.

KONTAKTINFORMATIONEN ZUM TEILEN:
- Name Ihres Kunden: ${CLIENT_INFO.name}
- E-Mail (kann geteilt werden): ${CLIENT_INFO.email}
- Telefon: ${CLIENT_INFO.phones.us.formatted} (US-Nummer - kann frei geteilt werden)
- Schweizer Telefon: ${CLIENT_INFO.phones.swiss.formatted} - ⚠️ NIE OHNE AUSDRÜCKLICHE ERLAUBNIS TEILEN ⚠️

BUCHUNGSLOGIK - GENAU BEFOLGEN:

1. Wenn gewünschte Zeit/Ort VERFÜGBAR ist:
   - Direkt buchen ohne zu fragen
   - Nach der Buchung bestätigen: "Perfekt! Ich habe das für Sie gebucht. Zur Bestätigung: [Details]"

2. Wenn gewünschte Zeit/Ort NICHT VERFÜGBAR ist:
   - Nach Alternativen fragen: "Es tut mir leid, diese Zeit ist nicht verfügbar. Wir haben [Alternativen]. Was würden Sie bevorzugen?"
   - Vor der Buchung bestätigen: "Lassen Sie mich bestätigen: Sie möchten [alternative Details]. Soll ich das buchen?"

BUCHUNGSARTEN:
- Restaurantreservierungen
- Hotelbuchungen
- Terminvereinbarungen
- Allgemeine Dienstleistungsbuchungen

GESPRÄCHSSTIL:
- Antworten KURZ halten (1-3 Sätze max)
- Natürlich sprechen
- Warm aber nicht zu ausführlich
- EIN Frage nach der anderen
- Wie eine 30-jährige Fachfrau klingen, nicht wie ein Roboter

BUCHUNGSDETAILS SAMMELN:
1. Welche Art von Buchung?
2. Datum und Uhrzeit
3. Anzahl der Personen
4. Name für die Reservierung
5. Besondere Wünsche

FALLBACK-VERHALTEN - BEI VERWIRRUNG:
1. Nachricht aufnehmen: "Lassen Sie mich Ihre Daten notieren, wir rufen Sie zurück"
2. Rückruf anbieten: "Ich kann Sie auch zurückrufen lassen"
3. E-Mail anbieten: "Ich kann Ihnen eine E-Mail mit mehr Informationen senden"
4. Professionell beenden: "Vielen Dank für Ihre Geduld. Wir melden uns bald"

NIEMALS:
- Ohne Erklärung transferieren
- Unbeholfen aufgeben
- Die Schweizer Nummer ohne Erlaubnis teilen
- Roboterhaft oder übermäßig förmlich klingen

Aktuelle Buchungsdaten: ${JSON.stringify(this.bookingData, null, 2)}

Denken Sie daran: Sie sind eine kompetente 30-jährige Assistentin. Seien Sie warm, effizient und professionell.`;
  }

  buildMessages() {
    return this.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  addToHistory(role, content) {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      language: this.language
    });

    // Keep history manageable (last 20 messages)
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  detectLanguage(text) {
    // Simple German detection (can be improved)
    const germanWords = /\b(hallo|guten|tag|danke|bitte|ja|nein|ich|möchte|reservierung|uhr)\b/i;
    if (germanWords.test(text) && this.language !== 'de') {
      logger.info('Switching to German', { sessionId: this.sessionId });
      this.language = 'de';
    }
  }

  extractBookingData(userMessage, assistantMessage) {
    const text = (userMessage + ' ' + assistantMessage).toLowerCase();

    // Extract booking type
    if (!this.bookingData.type) {
      if (/restaurant|dinner|lunch|table|eat/i.test(text)) {
        this.bookingData.type = 'restaurant-reservation';
      } else if (/hotel|room|stay|accommodation/i.test(text)) {
        this.bookingData.type = 'hotel-booking';
      } else if (/appointment|meeting|schedule|consultation/i.test(text)) {
        this.bookingData.type = 'appointment-scheduling';
      }
    }

    // Extract party size
    const partyMatch = text.match(/(\d+)\s*(people|person|guest|party|leute|personen)/i);
    if (partyMatch) {
      this.bookingData.partySize = parseInt(partyMatch[1]);
    }

    // Extract date patterns
    const datePatterns = [
      /tonight|heute abend/i,
      /tomorrow|morgen/i,
      /today|heute/i,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)/i,
      /(\d{1,2})[\/\.-](\d{1,2})/,
      /(next|nächste)\s+(week|woche)/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && !this.bookingData.date) {
        this.bookingData.date = match[0];
        break;
      }
    }

    // Extract time
    const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|uhr)?/i);
    if (timeMatch && !this.bookingData.time) {
      this.bookingData.time = timeMatch[0];
    }

    // Extract venue name (simple approach)
    const venueMatch = text.match(/(?:at|bei)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (venueMatch && !this.bookingData.venue) {
      this.bookingData.venue = venueMatch[1];
    }

    // Extract special requests
    const requestPatterns = [
      /gluten[- ]free/i,
      /vegetarian|vegan/i,
      /allerg/i,
      /birthday|anniversary|geburtstag/i,
      /window|quiet|corner|fenster|ruhig/i,
      /wheelchair|rollstuhl/i
    ];
    
    for (const pattern of requestPatterns) {
      const match = text.match(pattern);
      if (match && !this.bookingData.specialRequests.includes(match[0])) {
        this.bookingData.specialRequests.push(match[0]);
      }
    }
  }

  shouldTriggerFallback(message) {
    // Trigger fallback if confusion persists or certain phrases detected
    if (this.confusionCount >= 3) {
      return true;
    }

    // Check if assistant is expressing confusion
    const confusionPhrases = /(?:don't understand|not sure|unclear|confused|can't help|nicht verstehe)/i;
    return confusionPhrases.test(message);
  }

  async handleFallback() {
    logger.warn('Triggering fallback behavior', { sessionId: this.sessionId });

    const fallbackMessages = {
      en: FALLBACK_BEHAVIOR.phrases.takingMessage,
      de: "Lassen Sie mich Ihre Daten notieren, damit wir Sie zurückrufen können. Wie kann ich Sie am besten erreichen?"
    };

    const message = fallbackMessages[this.language] || fallbackMessages.en;
    this.addToHistory('assistant', message);
    
    // Mark session for follow-up
    this.bookingData.requiresFollowUp = true;
    
    await this.saveConversationLog();
    
    return message;
  }

  async saveConversationLog() {
    try {
      const logsDir = join(process.cwd(), 'logs');
      
      // Ensure logs directory exists
      if (!existsSync(logsDir)) {
        await mkdir(logsDir, { recursive: true });
      }

      const logPath = join(logsDir, `call-${this.sessionId}.json`);
      
      const logData = {
        sessionId: this.sessionId,
        startTime: this.callStartTime.toISOString(),
        language: this.language,
        conversationHistory: this.conversationHistory,
        bookingData: this.bookingData,
        duration: Math.floor((Date.now() - this.callStartTime.getTime()) / 1000),
        clientInfo: {
          name: CLIENT_INFO.name,
          email: CLIENT_INFO.email
        },
        requiresFollowUp: this.bookingData.requiresFollowUp || false,
        confusionCount: this.confusionCount
      };

      await writeFile(logPath, JSON.stringify(logData, null, 2));
      logger.debug('Conversation log saved', { sessionId: this.sessionId, path: logPath });
    } catch (error) {
      logger.error('Error saving conversation log', { 
        sessionId: this.sessionId,
        error: error.message 
      });
    }
  }

  async endCall() {
    // Generate end-of-call summary
    const summary = {
      sessionId: this.sessionId,
      duration: Math.floor((Date.now() - this.callStartTime.getTime()) / 1000),
      bookingData: this.bookingData,
      successful: this.bookingData.confirmed,
      requiresFollowUp: this.bookingData.requiresFollowUp || false,
      language: this.language
    };

    await this.saveConversationLog();
    
    logger.info('Call ended', summary);
    
    return summary;
  }

  getBookingData() {
    return this.bookingData;
  }

  setLanguage(lang) {
    if (['en', 'de'].includes(lang)) {
      this.language = lang;
      logger.info('Language set', { sessionId: this.sessionId, language: lang });
    }
  }
}

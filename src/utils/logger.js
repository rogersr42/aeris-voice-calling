import { createWriteStream } from 'fs';
import { join } from 'path';
import { mkdir } from 'fs/promises';

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    this.initLogFile();
  }

  async initLogFile() {
    try {
      const logDir = join(process.cwd(), 'logs');
      await mkdir(logDir, { recursive: true });
      
      const logFile = join(logDir, `aeris-${new Date().toISOString().split('T')[0]}.log`);
      this.fileStream = createWriteStream(logFile, { flags: 'a' });
    } catch (error) {
      console.error('Failed to initialize log file:', error);
    }
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Console output with colors
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m'  // Red
    };
    const reset = '\x1b[0m';
    
    console.log(`${colors[level]}${formattedMessage}${reset}`);
    
    // File output
    if (this.fileStream) {
      this.fileStream.write(formattedMessage + '\n');
    }
  }

  debug(message, meta) {
    this.log('debug', message, meta);
  }

  info(message, meta) {
    this.log('info', message, meta);
  }

  warn(message, meta) {
    this.log('warn', message, meta);
  }

  error(message, meta) {
    this.log('error', message, meta);
  }
}

export const logger = new Logger();

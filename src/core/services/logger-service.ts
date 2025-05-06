import { Injectable } from '../di/decorators';

export interface ILogger {
  trace(msg: string): void;
  debug(msg: string): void;
  verbose(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string, error?: Error): void;
}

@Injectable()
export class LoggerService implements ILogger {
  trace(msg: string): void {
    // Only log in development or when debug enabled
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.debug('[TRACE]', msg);
    }
  }

  debug(msg: string): void {
    console.debug('[DEBUG]', msg);
  }

  verbose(msg: string): void {
    // Only log in development or when debug enabled
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.debug('[VERBOSE]', msg);
    }
  }

  info(msg: string): void {
    console.info('[INFO]', msg);
  }

  warn(msg: string): void {
    console.warn('[WARN]', msg);
  }

  error(msg: string, error?: Error): void {
    console.error('[ERROR]', msg, error);
  }
}

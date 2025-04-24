import { Injectable } from '../di/decorators';

export interface ILogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string, error?: Error): void;
}

@Injectable()
export class LoggerService implements ILogger {
  debug(msg: string): void {
    console.debug(msg);
  }
  info(msg: string): void {
    console.info(msg);
  }
  warn(msg: string): void {
    console.warn(msg);
  }
  error(msg: string, error?: Error): void {
    console.error(msg, error);
  }
}

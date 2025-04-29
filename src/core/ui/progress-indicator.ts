import { Injectable } from '../di/decorators';
import ora from 'ora';
import type { Ora } from 'ora';

@Injectable()
export class ProgressIndicator {
  private spinner: Ora | null = null;

  start(message: string): void {
    // Ensure ora is properly imported before using
    if (typeof ora === 'function') {
      this.spinner = ora({
        text: message,
        spinner: 'dots',
        color: 'blue',
      }).start();
    } else {
      console.log(message); // Fallback if ora isn't available
    }
  }

  update(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  succeed(message?: string): void {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    }
  }

  fail(message?: string): void {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    }
  }

  stop(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
}

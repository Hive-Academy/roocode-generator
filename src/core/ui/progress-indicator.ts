import { Injectable } from '../di/decorators';
import type { Ora } from 'ora'; // Import only the type

@Injectable()
export class ProgressIndicator {
  private spinner: Ora | null = null;
  private oraModule: any = null;

  constructor() {
    // Load ora dynamically
    this.initOra();
  }

  private async initOra() {
    try {
      this.oraModule = await import('ora');
    } catch (error) {
      console.warn('Failed to load ora:', error);
    }
  }

  async start(message: string): Promise<void> {
    // Wait for ora to be loaded
    if (!this.oraModule) {
      await this.initOra();
    }

    if (this.oraModule?.default) {
      this.spinner = this.oraModule.default({
        text: message,
        spinner: 'dots',
        color: 'blue',
      }).start();
    } else {
      // Fallback if ora isn't available
      console.log(message);
    }
  }

  async update(message: string): Promise<void> {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  async succeed(message?: string): Promise<void> {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    }
  }

  async fail(message?: string): Promise<void> {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    }
  }

  async stop(): Promise<void> {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
}

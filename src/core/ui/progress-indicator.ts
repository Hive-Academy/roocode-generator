import { Injectable } from "../di/decorators";
import ora, { Ora } from "ora";

@Injectable()
export class ProgressIndicator {
  private spinner: Ora | null = null;

  start(message: string): void {
    this.spinner = ora({
      text: message,
      spinner: "dots",
      color: "blue",
    }).start();
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

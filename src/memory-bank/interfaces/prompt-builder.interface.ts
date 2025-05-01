import { Result } from '../../core/result/result';

export interface IPromptBuilder {
  buildPrompt(
    baseInstruction: string,
    projectContext: string,
    templateContent: string
  ): Result<string, Error>;
}

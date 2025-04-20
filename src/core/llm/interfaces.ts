import { Result } from "../result/result";
import type { AnalysisResult } from "../../../types/shared";

export interface ILLMProvider {
  readonly name: string;
  getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>>;
}

export interface ILLMAgent {
  analyzeProject(projectDir: string): Promise<Result<AnalysisResult, Error>>;
  // Additional methods as needed for LLM workflows
}

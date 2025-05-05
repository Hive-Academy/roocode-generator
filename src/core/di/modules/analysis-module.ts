import { Container } from '../container';
import { AstAnalysisService } from '../../analysis/ast-analysis.service';
import { IAstAnalysisService } from '../../analysis/ast-analysis.interfaces';
import { resolveDependency } from '../utils'; // Added import
import { ILLMAgent } from '@core/llm/interfaces'; // Added import
import { ILogger } from '@core/services/logger-service'; // Added import
/**
 * Registers services related to AST analysis.
 * @param container The DI container instance.
 */
export function registerAnalysisServices(container: Container): void {
  // Changed from registerSingleton to registerFactory
  container.registerFactory<IAstAnalysisService>('IAstAnalysisService', () => {
    // Resolve dependencies using the helper
    const llmAgent = resolveDependency<ILLMAgent>(container, 'LLMAgent');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    // Instantiate the service with resolved dependencies
    // Removed fileOps as it's not a dependency of AstAnalysisService
    return new AstAnalysisService(llmAgent, logger);
  });
}

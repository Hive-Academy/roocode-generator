import { Container } from '../container';
import { AstAnalysisService } from '../../analysis/ast-analysis.service';
import { IAstAnalysisService } from '../../analysis/ast-analysis.interfaces';
import { resolveDependency } from '../utils'; // Added import
import { ILLMAgent } from '@core/llm/interfaces'; // Added import
import { ILogger } from '@core/services/logger-service'; // Added import
import { IFileOperations } from '@core/file-operations/interfaces';

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
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    // Instantiate the service with resolved dependencies
    return new AstAnalysisService(llmAgent, logger, fileOps);
  });
}

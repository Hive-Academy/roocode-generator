import { Container } from '../container';
import { AstAnalysisService } from '../../analysis/ast-analysis.service';
import { IAstAnalysisService } from '../../analysis/ast-analysis.interfaces';
import { resolveDependency } from '../utils';
import { ILLMAgent } from '@core/llm/interfaces';
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces'; // Added import
import {
  ITechStackAnalyzerService,
  TechStackAnalyzerService,
} from '@core/analysis/tech-stack-analyzer'; // Added import
import { ProjectAnalyzerHelpers } from '../../analysis/project-analyzer.helpers'; // Import the new helper

/**
 * Registers services related to project analysis (AST, Tech Stack, etc.).
 * @param container The DI container instance.
 */
export function registerAnalysisServices(container: Container): void {
  // Register AstAnalysisService using the factory pattern
  container.registerFactory<IAstAnalysisService>('IAstAnalysisService', () => {
    // Resolve dependencies using the helper
    const llmAgent = resolveDependency<ILLMAgent>(container, 'LLMAgent');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    // Instantiate the service with resolved dependencies
    return new AstAnalysisService(llmAgent, logger);
  });

  // Register TechStackAnalyzerService using the factory pattern
  container.registerFactory<ITechStackAnalyzerService>('ITechStackAnalyzerService', () => {
    // Resolve dependencies using the helper
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    // Instantiate the service with resolved dependencies
    return new TechStackAnalyzerService(fileOps, logger);
  });

  // Register ProjectAnalyzerHelpers using the factory pattern
  container.registerFactory<ProjectAnalyzerHelpers>('ProjectAnalyzerHelpers', () => {
    // Resolve dependencies using the helper
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    // Instantiate the service with resolved dependencies
    return new ProjectAnalyzerHelpers(fileOps, logger);
  });
}

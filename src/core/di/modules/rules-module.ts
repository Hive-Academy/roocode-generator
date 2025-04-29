import { Container } from '@core/di/container';
import { resolveDependency } from '@core/di/utils'; // Import helpers from utils
// Removed import for deprecated RulesGenerator
import {
  IRulesContentProcessor,
  IRulesFileManager,
  IRulesPromptBuilder,
} from '@generators/rules/interfaces';
import { RulesContentProcessor } from '@generators/rules/rules-content-processor';
import { RulesPromptBuilder } from '@generators/rules/rules-prompt-builder';
import { RulesFileManager } from '@generators/rules/rules-file-manager';
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';

export function registerRulesModule(container: Container): void {
  // Register Rules specific services
  container.registerFactory<IRulesFileManager>('IRulesFileManager', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new RulesFileManager(fileOps, logger);
  });

  container.registerFactory<IRulesPromptBuilder>('IRulesPromptBuilder', () => {
    // Resolve dependencies if RulesPromptBuilder needs any (currently none)
    return new RulesPromptBuilder();
  });

  container.registerFactory<IRulesContentProcessor>('IRulesContentProcessor', () => {
    // Resolve dependencies if RulesContentProcessor needs any (currently none)
    return new RulesContentProcessor();
  });

  // Removed registration for deprecated RulesGenerator
}

import { Container } from '@core/di/container';
// Removed import for deprecated RulesGenerator
import { IRulesContentProcessor, IRulesPromptBuilder } from '@generators/rules/interfaces';
import { RulesContentProcessor } from '@generators/rules/rules-content-processor';
import { RulesPromptBuilder } from '@generators/rules/rules-prompt-builder';

export function registerRulesModule(container: Container): void {
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

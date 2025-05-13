import { Container } from '@core/di/container';
import { resolveDependency } from '@core/di/utils';
import { RooFileOpsHelper } from '@generators/roo-file-ops-helper';
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';

/**
 * Registers generator-related services with the DI container.
 * @param container The DI container instance
 */
export function registerGeneratorModule(container: Container): void {
  // Register RooFileOpsHelper with its dependencies
  container.registerFactory('RooFileOpsHelper', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new RooFileOpsHelper(fileOps, logger);
  });
}

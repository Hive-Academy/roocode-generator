import { Container } from '../container';
import { RoomodesService, IRoomodesService } from '@core/services/roomodes.service';
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';
import { assertIsDefined, resolveDependency } from '../utils';

/**
 * Registers the roomodes module services with the DI container
 * @param container The DI container instance
 */
export function registerRoomodesModule(container: Container): void {
  container.registerFactory<IRoomodesService>('IRoomodesService', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');

    assertIsDefined(logger, 'ILogger dependency not found for RoomodesService');
    assertIsDefined(fileOps, 'IFileOperations dependency not found for RoomodesService');

    return new RoomodesService(container, logger, fileOps);
  });
}

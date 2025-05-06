import { Injectable, Inject } from '../core/di/decorators';
import { ILogger } from '../core/services/logger-service';
import { Result } from '../core/result/result';
import { MemoryBankTemplateError } from '../core/errors/memory-bank-errors';
import { IMemoryBankTemplateManager } from './interfaces/template-manager.interface';
import { IMemoryBankTemplateProcessor } from './interfaces/template-processor.interface';
import { MemoryBankFileType } from './interfaces';

/**
 * MemoryBankTemplateProcessor class
 * Responsible for loading and processing memory bank templates
 * Uses MemoryBankTemplateManager for template operations
 */
@Injectable()
export class MemoryBankTemplateProcessor implements IMemoryBankTemplateProcessor {
  constructor(
    @Inject('IMemoryBankTemplateManager') private templateManager: IMemoryBankTemplateManager,
    @Inject('ILogger') private logger: ILogger
  ) {}

  /**
   * Loads and processes a template for a specific memory bank file type
   *
   * @param fileType - Type of memory bank file to process
   * @param context - Context data to apply to the template
   * @returns Result containing the processed template content or an error
   */
  public async loadAndProcessTemplate(
    fileType: MemoryBankFileType,
    context: Record<string, unknown>
  ): Promise<Result<string>> {
    try {
      this.logger.debug(`Loading template for ${String(fileType)}...`);

      // Load the template using the template manager
      const templateResult = await this.templateManager.loadTemplate(String(fileType));
      if (templateResult.isErr()) {
        const error = new MemoryBankTemplateError(
          'Failed to load template',
          String(fileType),
          { operation: 'loadTemplate' },
          templateResult.error
        );
        this.logger.error(error.message, error);
        return Result.err(error);
      }

      // Process the template with the provided context
      this.logger.debug(`Processing template for ${String(fileType)}...`);
      const processResult = await this.templateManager.processTemplate(String(fileType), context);

      if (processResult.isErr()) {
        const error = new MemoryBankTemplateError(
          'Failed to process template content',
          String(fileType),
          { operation: 'processTemplateContent' },
          processResult.error
        );
        this.logger.error(error.message, error);
        return Result.err(error);
      }

      const templateContent = processResult.value;
      if (!templateContent) {
        const error = new MemoryBankTemplateError(
          'Processed template content is empty',
          String(fileType),
          { operation: 'checkProcessedContent' }
        );
        this.logger.error(error.message, error);
        return Result.err(error);
      }

      this.logger.debug(`Successfully processed template for ${String(fileType)}`);
      return Result.ok(templateContent);
    } catch (error) {
      const wrappedError = new MemoryBankTemplateError(
        'Unexpected error during template processing',
        String(fileType),
        { operation: 'loadAndProcessTemplate' },
        error instanceof Error ? error : new Error(String(error))
      );
      this.logger.error(wrappedError.message, wrappedError);
      return Result.err(wrappedError);
    }
  }
}

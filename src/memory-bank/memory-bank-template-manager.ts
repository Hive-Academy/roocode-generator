import path from 'path';
import { Injectable, Inject } from '../core/di/decorators';
import { ILogger } from '../core/services/logger-service';
import { IFileOperations } from '../core/file-operations/interfaces';
import { TemplateManager } from '../core/template-manager/template-manager';
import { IMemoryBankTemplateManager } from './interfaces/template-manager.interface';

/**
 * MemoryBankTemplateManager class extending TemplateManager.
 * Specialized for handling memory bank template paths.
 */
@Injectable()
export class MemoryBankTemplateManager
  extends TemplateManager
  implements IMemoryBankTemplateManager
{
  protected readonly baseTemplateDir: string;

  constructor(
    @Inject('IFileOperations')
    fileOperations: IFileOperations,
    @Inject('ILogger') logger: ILogger,
    config?: { templateDir?: string; templateExt?: string }
  ) {
    // Pass config with markdown extension to parent constructor
    super(fileOperations, logger, {
      templateDir: config?.templateDir ?? 'templates',
      templateExt: config?.templateExt ?? '.md',
    });

    // Store the base template directory for use in getTemplatePath
    this.baseTemplateDir = config?.templateDir ?? 'templates';
  }

  /**
   * Gets the template path for a memory bank template.
   * Overrides the base implementation to handle memory bank specific path construction.
   * Constructs paths in the format: templates/memory-bank/[name]-template.md
   *
   * @param name - Template name
   * @returns The full file path to the template
   */
  public getTemplatePath(name: string): string {
    return path.join(this.baseTemplateDir, 'memory-bank', `${name}-template.md`);
  }
}

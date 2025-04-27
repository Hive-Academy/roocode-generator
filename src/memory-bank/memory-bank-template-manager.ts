import path from 'path';
import { Injectable, Inject } from '../core/di/decorators';
import { IMemoryBankTemplateManager, MemoryBankFileType } from './interfaces';
import { IFileOperations } from '../core/file-operations/interfaces';
import { ILogger } from '../core/services/logger-service';
import { Result } from '../core/result/result';
import { ITemplate, ITemplateManager } from '../core/template-manager/interfaces';
import { TemplateError } from '../core/template-manager/errors';
import { Template } from '../core/template-manager/template';

@Injectable()
export class MemoryBankTemplateManager implements IMemoryBankTemplateManager {
  private cache: Map<MemoryBankFileType, ITemplate> = new Map();

  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('ITemplateManager') private readonly templateManager: ITemplateManager
  ) {}

  async loadTemplate(type: MemoryBankFileType): Promise<Result<ITemplate, TemplateError>> {
    try {
      this.logger.debug(`Loading template for type: ${type}`);

      // Check cache first
      const cachedTemplate = this.cache.get(type);
      if (cachedTemplate) {
        this.logger.debug(`Template cache hit for ${String(type)}`);
        return Result.ok(cachedTemplate);
      }

      // Try loading from template manager first
      const templateResult = await this.templateManager.loadTemplate(String(type));
      if (templateResult.isOk() && templateResult.value) {
        const template = templateResult.value;
        this.cache.set(type, template);
        return Result.ok(template);
      }

      // If template manager fails, create fallback template
      const fallbackContent = this.createFallbackTemplate(type);
      const metadata = {
        name: String(type),
        version: '1.0.0',
        description: `Fallback template for ${type}`,
        generated: true,
      };

      const fallbackTemplate = new Template(metadata, fallbackContent);
      this.cache.set(type, fallbackTemplate);

      // Try to save the fallback template
      const filename = String(type) + '-template.md';
      const templatePath = path.join(process.cwd(), 'templates', 'memory-bank', filename);

      await this.fileOps.createDirectory(path.dirname(templatePath));
      await this.fileOps.writeFile(templatePath, fallbackContent);

      return Result.ok(fallbackTemplate);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Error loading template', err);
      return Result.err(new TemplateError('Failed to load template', err));
    }
  }

  async validateTemplate(type: MemoryBankFileType): Promise<Result<void, TemplateError>> {
    try {
      const templateResult = await this.loadTemplate(type);
      if (templateResult.isErr()) {
        return Result.err(
          new TemplateError('Template validation failed', {
            error: templateResult.error,
            templateName: String(type),
          })
        );
      }

      const template = templateResult.value as ITemplate;
      const validationResult = template.validate();

      if (validationResult.isErr()) {
        return Result.err(
          new TemplateError('Template validation failed', {
            error: validationResult.error,
            templateName: String(type),
          })
        );
      }

      return validationResult;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return Result.err(
        new TemplateError('Template validation failed', {
          error: err,
          templateName: String(type),
        })
      );
    }
  }

  async processTemplate(
    type: MemoryBankFileType,
    context: Record<string, unknown>
  ): Promise<Result<string, TemplateError>> {
    try {
      const templateResult = await this.loadTemplate(type);
      if (templateResult.isErr()) {
        return Result.err(
          new TemplateError('Template processing failed', {
            error: templateResult.error,
            templateName: String(type),
          })
        );
      }

      const template = templateResult.value as ITemplate;
      const processResult = template.process(context);

      if (processResult.isErr()) {
        return Result.err(
          new TemplateError('Template processing failed', {
            error: processResult.error,
            templateName: String(type),
          })
        );
      }

      return processResult;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return Result.err(
        new TemplateError('Template processing failed', {
          error: err,
          templateName: String(type),
        })
      );
    }
  }

  private createFallbackTemplate(fileType: MemoryBankFileType): string {
    const title = this.getTemplateTitle(fileType);
    const sections = this.getRequiredSections(fileType);
    const currentDate = new Date().toISOString().split('T')[0];

    let template = `# ${title}\n\n`;
    template += `<!-- This is a fallback template generated automatically on ${currentDate} -->\n\n`;

    for (const section of sections) {
      template += `## ${section}\n\n`;
      template += this.getFallbackContent(fileType, section);
      template += '\n\n';
    }

    return template;
  }

  private getTemplateTitle(fileType: MemoryBankFileType): string {
    switch (fileType) {
      case MemoryBankFileType.ProjectOverview:
        return 'Project Overview';
      case MemoryBankFileType.TechnicalArchitecture:
        return 'Technical Architecture';
      case MemoryBankFileType.DeveloperGuide:
        return 'Developer Guide';
      default:
        return String(fileType);
    }
  }

  private getRequiredSections(fileType: MemoryBankFileType): string[] {
    switch (fileType) {
      case MemoryBankFileType.ProjectOverview:
        return ['Overview', 'Goals', 'Scope', 'Stakeholders', 'Timeline'];
      case MemoryBankFileType.TechnicalArchitecture:
        return ['Overview', 'Components', 'Data Flow', 'Technologies', 'Decisions'];
      case MemoryBankFileType.DeveloperGuide:
        return ['Setup', 'Development Workflow', 'Best Practices', 'Testing', 'Deployment'];
      default:
        return ['Overview', 'Content'];
    }
  }

  private getFallbackContent(fileType: MemoryBankFileType, section: string): string {
    const defaultContent = 'Add your content here.';

    switch (fileType) {
      case MemoryBankFileType.ProjectOverview:
        switch (section) {
          case 'Overview':
            return 'Provide a high-level overview of the project.';
          case 'Goals':
            return 'List the main goals and objectives of the project.';
          case 'Scope':
            return 'Define the scope and boundaries of the project.';
          case 'Stakeholders':
            return 'Identify key stakeholders and their roles.';
          case 'Timeline':
            return 'Outline the project timeline and major milestones.';
          default:
            return defaultContent;
        }

      case MemoryBankFileType.TechnicalArchitecture:
        switch (section) {
          case 'Overview':
            return 'Describe the overall system architecture.';
          case 'Components':
            return 'List and describe the main system components.';
          case 'Data Flow':
            return 'Explain how data flows through the system.';
          case 'Technologies':
            return 'List the key technologies and frameworks used.';
          case 'Decisions':
            return 'Document important architectural decisions and their rationale.';
          default:
            return defaultContent;
        }

      case MemoryBankFileType.DeveloperGuide:
        switch (section) {
          case 'Setup':
            return 'Provide instructions for setting up the development environment.';
          case 'Development Workflow':
            return 'Describe the development process and workflow.';
          case 'Best Practices':
            return 'Document coding standards and best practices.';
          case 'Testing':
            return 'Explain testing requirements and procedures.';
          case 'Deployment':
            return 'Document the deployment process and requirements.';
          default:
            return defaultContent;
        }

      default:
        return defaultContent;
    }
  }
}

import path from 'path';
import { Injectable, Inject } from '../core/di/decorators';
import { IMemoryBankTemplateManager, MemoryBankFileType } from './interfaces';
import { IFileOperations } from '../core/file-operations/interfaces';
import { ILogger } from '../core/services/logger-service';
import { Result } from '../core/result/result';

@Injectable()
export class MemoryBankTemplateManager implements IMemoryBankTemplateManager {
  private cache: Map<MemoryBankFileType, string> = new Map();

  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger
  ) {}

  async loadTemplate(name: MemoryBankFileType): Promise<Result<string>> {
    try {
      this.logger.debug(
        `DEBUG (TemplateManager): loadTemplate received name: ${JSON.stringify(name)}`
      );

      // Check cache first
      if (this.cache.has(name)) {
        this.logger.debug(`Template cache hit for ${String(name)}`);
        return Result.ok(this.cache.get(name)!);
      }

      // Try primary location first
      const filename = String(name) + '-template.md';
      const templatePath = path.join(process.cwd(), 'templates', 'memory-bank', filename);
      this.logger.debug(`Attempting to load template from: "${templatePath}"`);

      const readResult = await this.fileOps.readFile(templatePath);
      if (readResult.isOk() && readResult.value) {
        const content = readResult.value;
        if (this.validateTemplate(content, name).isOk()) {
          this.logger.debug(`Successfully loaded template from: ${templatePath}`);
          this.cache.set(name, content);
          return Result.ok(content);
        }
      }

      // If primary location fails, try legacy location
      const legacyFilename = String(name) + '-template.md';
      const legacyTemplatePath = path.join(
        process.cwd(),
        'templates',
        'memory-bank',
        'templates',
        legacyFilename
      );
      this.logger.debug(`Attempting to load legacy template from: "${legacyTemplatePath}"`);

      const legacyResult = await this.fileOps.readFile(legacyTemplatePath);
      if (legacyResult.isOk() && legacyResult.value) {
        const content = legacyResult.value;
        if (this.validateTemplate(content, name).isOk()) {
          this.logger.debug(
            `Successfully loaded template from legacy location: ${legacyTemplatePath}`
          );
          this.cache.set(name, content);
          return Result.ok(content);
        }
      }

      // If both locations fail, create and save a fallback template
      this.logger.warn(
        `Failed to load template from both locations: ${templatePath} and ${legacyTemplatePath}. Using fallback template.`
      );

      const fallbackTemplate = this.createFallbackTemplate(name);
      this.cache.set(name, fallbackTemplate);

      // Try to write the fallback template to the primary location
      const templateDir = path.dirname(templatePath);
      const createDirResult = await this.fileOps.createDirectory(templateDir);
      if (createDirResult.isErr() && !createDirResult.error?.message.includes('EEXIST')) {
        this.logger.warn(
          `Failed to create template directory ${templateDir}: ${createDirResult.error?.message}`
        );
      }

      const writeResult = await this.fileOps.writeFile(templatePath, fallbackTemplate);
      if (writeResult.isErr()) {
        this.logger.warn(
          `Failed to write fallback template to ${templatePath}: ${writeResult.error?.message}`
        );
      } else {
        this.logger.debug(`Successfully wrote fallback template to: ${templatePath}`);
      }

      return Result.ok(fallbackTemplate);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Error loading template', err);
      return Result.err(err);
    }
  }

  validateTemplate(content: string, type: MemoryBankFileType): Result<boolean> {
    try {
      // Basic validation: content should not be empty
      if (!content || content.trim().length === 0) {
        return Result.err(new Error('Template content is empty'));
      }

      // Check for required sections based on template type
      const requiredSections = this.getRequiredSections(type);
      const contentLower = content.toLowerCase();

      for (const section of requiredSections) {
        if (!contentLower.includes(section.toLowerCase())) {
          return Result.err(
            new Error(`Template validation failed: Missing required section "${section}"`)
          );
        }
      }

      return Result.ok(true);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return Result.err(err);
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

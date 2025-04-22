# Implementation Plan: Memory-Bank Generator Robustness Enhancement

## Overview

This implementation plan addresses the robustness issues in the memory-bank generator to prevent ENOENT errors when the `memory-bank` directory or the `memory-bank/templates` subdirectory does not exist, or when template files are missing.

## References

- Similar fix implemented for vscode-copilot-rules generator (see `progress-tracker/vscode-copilot-rules-enoent-fix-progress.md`)
- Current implementation in `src/memory-bank/MemoryBankGenerator.ts`
- Current implementation in `src/memory-bank/MemoryBankFileManager.ts`
- Current implementation in `src/memory-bank/MemoryBankTemplateManager.ts`

## Current Implementation Analysis

### Key Components

1. **MemoryBankGenerator.ts**: Main generator class that orchestrates the generation process
2. **MemoryBankFileManager.ts**: Handles file operations for memory-bank files
3. **MemoryBankTemplateManager.ts**: Manages template loading and validation

### Issues Identified

1. **Directory Creation**:

   - `MemoryBankFileManager.createMemoryBankDirectory()` creates the `memory-bank` directory but doesn't create the `memory-bank/templates` subdirectory
   - The templates directory is created in `MemoryBankGenerator.generateMemoryBankSuite()` but this might not be called in all code paths

2. **Template Copying**:

   - `MemoryBankGenerator.copyDirectoryRecursive()` attempts to copy templates but doesn't handle the case where the source directory doesn't exist
   - Error handling for template copying allows execution to continue even if copying fails

3. **Template Loading**:
   - `MemoryBankTemplateManager.loadTemplate()` tries to load templates from two locations but doesn't handle the case where neither location exists
   - No fallback mechanism for missing template files

## Implementation Strategy

### 1. Enhance MemoryBankFileManager

Modify `MemoryBankFileManager.createMemoryBankDirectory()` to:

- Create the `memory-bank` directory if it doesn't exist
- Create the `memory-bank/templates` subdirectory if it doesn't exist
- Return success even if directories already exist (idempotent operation)

```typescript
async createMemoryBankDirectory(baseDir: string): Promise<Result<void>> {
  try {
    // Create memory-bank directory
    const memoryBankDir = path.join(baseDir, "memory-bank");
    const dirResult = await this.fileOps.createDirectory(memoryBankDir);
    if (dirResult.isErr() && !dirResult.error?.message.includes("EEXIST")) {
      this.logger.error(
        `Failed to create memory bank directory: ${memoryBankDir}`,
        dirResult.error ?? new Error("Unknown error")
      );
      return Result.err(dirResult.error ?? new Error("Unknown error"));
    }

    // Create templates subdirectory
    const templatesDir = path.join(memoryBankDir, "templates");
    const templatesDirResult = await this.fileOps.createDirectory(templatesDir);
    if (templatesDirResult.isErr() && !templatesDirResult.error?.message.includes("EEXIST")) {
      this.logger.error(
        `Failed to create templates directory: ${templatesDir}`,
        templatesDirResult.error ?? new Error("Unknown error")
      );
      return Result.err(templatesDirResult.error ?? new Error("Unknown error"));
    }

    return Result.ok(undefined);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.logger.error("Error creating memory bank directory", err);
    return Result.err(err);
  }
}
```

### 2. Enhance MemoryBankGenerator's Template Copying

Modify `MemoryBankGenerator.copyDirectoryRecursive()` to:

- Check if the source directory exists before attempting to copy
- Create the destination directory if it doesn't exist
- Handle ENOENT errors gracefully when reading the source directory

```typescript
private async copyDirectoryRecursive(
  fileOps: IFileOperations,
  sourceDir: string,
  destDir: string
): Promise<Result<void, Error>> {
  try {
    // Create destination directory if it doesn't exist
    const createDirResult = await fileOps.createDirectory(destDir);
    if (createDirResult.isErr() && !createDirResult.error?.message.includes("EEXIST")) {
      return Result.err(
        new Error(
          `Failed to create directory ${destDir}: ${createDirResult.error?.message ?? "Unknown error"}`
        )
      );
    }

    // Check if source directory exists
    const statResult = await fileOps.stat(sourceDir);
    if (statResult.isErr()) {
      if (statResult.error?.message.includes("ENOENT")) {
        this.logger.warn(`Source directory does not exist: ${sourceDir}. Skipping copy operation.`);
        return Result.ok(undefined); // Return success but log warning
      }
      return Result.err(
        new Error(
          `Failed to check source directory ${sourceDir}: ${statResult.error?.message ?? "Unknown error"}`
        )
      );
    }

    // Read source directory contents
    const readDirResult = await fileOps.readDir(sourceDir);
    if (readDirResult.isErr()) {
      if (readDirResult.error?.message.includes("ENOENT")) {
        this.logger.warn(`Source directory does not exist: ${sourceDir}. Skipping copy operation.`);
        return Result.ok(undefined); // Return success but log warning
      }
      return Result.err(
        new Error(
          `Failed to read directory ${sourceDir}: ${readDirResult.error?.message ?? "Unknown error"}`
        )
      );
    }

    const entries = readDirResult.value;
    if (!entries || entries.length === 0) {
      this.logger.warn(`No entries found in directory ${sourceDir}`);
      return Result.ok(undefined); // Return success but log warning
    }

    // Process each entry
    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      // Validate paths before operations
      if (!fileOps.validatePath(sourcePath)) {
        this.logger.warn(`Invalid source path: ${sourcePath}. Skipping.`);
        continue; // Skip this entry but continue with others
      }

      if (!fileOps.validatePath(destPath)) {
        this.logger.warn(`Invalid destination path: ${destPath}. Skipping.`);
        continue; // Skip this entry but continue with others
      }

      if (entry.isDirectory()) {
        // Recursively copy subdirectory
        const copyResult = await this.copyDirectoryRecursive(fileOps, sourcePath, destPath);
        if (copyResult.isErr()) {
          this.logger.warn(`Failed to copy subdirectory ${sourcePath}: ${copyResult.error?.message}`);
          // Continue with other entries even if this one fails
        }
      } else {
        // Copy file
        const readResult = await fileOps.readFile(sourcePath);
        if (readResult.isErr()) {
          this.logger.warn(`Failed to read file ${sourcePath}: ${readResult.error?.message}`);
          continue; // Skip this file but continue with others
        }

        const content = readResult.value;
        if (!content) {
          this.logger.warn(`Empty content for file ${sourcePath}`);
          continue; // Skip this file but continue with others
        }

        const writeResult = await fileOps.writeFile(destPath, content);
        if (writeResult.isErr()) {
          this.logger.warn(`Failed to write file ${destPath}: ${writeResult.error?.message}`);
          continue; // Skip this file but continue with others
        }
      }
    }

    return Result.ok(undefined);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.logger.error(`Error in copyDirectoryRecursive: ${err.message}`, err);
    return Result.err(err);
  }
}
```

### 3. Enhance MemoryBankTemplateManager's Template Loading

Modify `MemoryBankTemplateManager.loadTemplate()` to:

- Handle the case where template files don't exist in either location
- Provide a fallback empty template when files are missing
- Log appropriate warnings

```typescript
async loadTemplate(name: MemoryBankFileType): Promise<Result<string>> {
  try {
    this.logger.debug(
      `DEBUG (TemplateManager): loadTemplate received name: ${JSON.stringify(name)}`
    );

    if (this.cache.has(name)) {
      this.logger.debug(`DEBUG (TemplateManager): Template cache hit for ${String(name)}`);
      return Result.ok(this.cache.get(name)!);
    }

    // Load memory bank template files from memory-bank/templates
    const filename = String(name) + "-template.md";
    const templatePath = `${process.cwd()}${path.sep}templates${path.sep}memory-bank${path.sep}${filename}`;
    this.logger.debug(
      `DEBUG (TemplateManager): Attempting to load template from: "${templatePath}"`
    );

    // Try primary location first
    const readResult = await this.fileOps.readFile(templatePath);
    if (readResult.isOk() && readResult.value) {
      const content = readResult.value;
      this.cache.set(name, content);
      return Result.ok(content);
    }

    // If primary location fails, try legacy location
    const legacyFilename = String(name) + "-template.md";
    const legacyTemplatePath = `${process.cwd()}${path.sep}templates${path.sep}memory-bank${path.sep}templates${path.sep}${legacyFilename}`;
    this.logger.debug(
      `DEBUG (TemplateManager): Attempting to load legacy template from: "${legacyTemplatePath}"`
    );

    const legacyResult = await this.fileOps.readFile(legacyTemplatePath);
    if (legacyResult.isOk() && legacyResult.value) {
      const content = legacyResult.value;
      this.cache.set(name, content);
      return Result.ok(content);
    }

    // If both locations fail, provide a fallback template
    this.logger.warn(
      `Failed to load template from both locations: ${templatePath} and ${legacyTemplatePath}. Using fallback template.`
    );

    // Create a basic fallback template
    const fallbackTemplate = this.createFallbackTemplate(name);
    this.cache.set(name, fallbackTemplate);

    // Try to write the fallback template to the primary location
    const writeResult = await this.fileOps.writeFile(templatePath, fallbackTemplate);
    if (writeResult.isErr()) {
      this.logger.warn(`Failed to write fallback template to ${templatePath}: ${writeResult.error?.message}`);
    }

    return Result.ok(fallbackTemplate);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.logger.error("Error loading template", err);
    return Result.err(err);
  }
}

private createFallbackTemplate(fileType: MemoryBankFileType): string {
  const title = String(fileType);
  return `# ${title}\n\n<!-- This is a fallback template generated automatically -->\n\n## Overview\n\nThis document provides information about ${title.toLowerCase()}.\n\n## Content\n\nAdd your content here.\n`;
}
```

### 4. Update MemoryBankGenerator.generateMemoryBankSuite()

Ensure the `generateMemoryBankSuite()` method properly handles directory creation and template copying:

```typescript
public async generateMemoryBankSuite(options: {
  context?: string;
  output?: string;
}): Promise<Result<void, Error>> {
  const projectContext = options.context || "";
  const outputDir = options.output || process.cwd();
  try {
    // Get file operations service
    const fileOpsResult = this.container.resolve<IFileOperations>("IFileOperations");
    if (fileOpsResult.isErr()) {
      return Result.err(new Error("Failed to resolve IFileOperations"));
    }
    const fileOps = fileOpsResult.value;
    if (!fileOps) {
      return Result.err(new Error("IFileOperations is undefined after resolution"));
    }

    // Create the memory-bank directory and templates subdirectory
    const dirResult = await this.fileManager.createMemoryBankDirectory(outputDir);
    if (dirResult.isErr()) {
      return Result.err(
        new Error(
          `Failed to create memory-bank directory: ${dirResult.error?.message ?? "Unknown error"}`
        )
      );
    }

    // Generate each memory bank file type
    this.logger.info("Generating memory bank files...");
    const fileTypesToGenerate = Object.values(MemoryBankFileType);

    for (const fileType of fileTypesToGenerate) {
      // Generate content
      this.logger.debug(`Generating ${String(fileType)}...`);
      const result = await this.executeGenerationForType(fileType, projectContext);

      if (result.isErr()) {
        this.logger.error(
          `Generation failed for ${String(fileType)}: ${result.error?.message ?? "Unknown error"}`
        );
        continue;
      }

      const content = result.value;
      if (!content) {
        this.logger.error(`Generation failed for ${String(fileType)}: No content generated`);
        continue;
      }

      // Write the generated content
      const memoryBankDir = path.join(outputDir, "memory-bank");
      const outputFilePath = path.join(memoryBankDir, `${String(fileType)}.md`);
      this.logger.debug(`Writing ${String(fileType)} to ${outputFilePath}`);
      const writeResult = await fileOps.writeFile(outputFilePath, content);

      if (writeResult.isErr()) {
        this.logger.error(
          `Failed to write ${String(fileType)}: ${writeResult.error?.message ?? "Unknown error"}`
        );
        continue;
      }

      this.logger.info(`Generated ${String(fileType)} at ${outputFilePath}`);
    }

    // Copy templates directory
    this.logger.info("Copying template files...");
    const sourceTemplatesDir = path.join("templates", "memory-bank", "templates");
    const memoryBankDir = path.join(outputDir, "memory-bank");
    const destTemplatesDir = path.join(memoryBankDir, "templates");

    this.logger.debug(`Copying templates from ${sourceTemplatesDir} to ${destTemplatesDir}`);
    const copyResult = await this.copyDirectoryRecursive(
      fileOps,
      sourceTemplatesDir,
      destTemplatesDir
    );
    if (copyResult.isErr()) {
      this.logger.error(
        `Failed to copy templates: ${copyResult.error?.message ?? "Unknown error"}`
      );
      // Continue execution even if template copying fails
    } else {
      this.logger.info("Templates copied successfully");
    }

    this.logger.info("Memory bank generation completed");
    return Result.ok(undefined);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.logger.error("Error in memory bank generation", err);
    return Result.err(err);
  }
}
```

## Implementation Subtasks

1. **Update MemoryBankFileManager**

   - Modify `createMemoryBankDirectory()` to create both the memory-bank directory and templates subdirectory
   - Add proper error handling for EEXIST errors

2. **Update MemoryBankGenerator**

   - Enhance `copyDirectoryRecursive()` to handle missing source directories
   - Update error handling to continue with other files/directories when one fails
   - Modify `generateMemoryBankSuite()` to ensure proper directory creation and template copying

3. **Update MemoryBankTemplateManager**

   - Enhance `loadTemplate()` to handle missing template files
   - Add fallback template creation functionality
   - Implement template caching for better performance

4. **Testing**
   - Test with non-existent memory-bank directory
   - Test with existing memory-bank directory but missing templates subdirectory
   - Test with missing template files
   - Test with all directories and files present (idempotent operation)

## Architecture Decision Record

This implementation follows the same pattern as the fix for the vscode-copilot-rules generator, focusing on:

1. **Defensive Programming**: Adding checks for file/directory existence before operations
2. **Graceful Degradation**: Providing fallbacks when resources are missing
3. **Idempotent Operations**: Ensuring operations can be run multiple times without issues
4. **Comprehensive Logging**: Adding detailed logs for debugging and troubleshooting

The changes maintain the existing architecture while enhancing robustness against file system errors.

## Risk Assessment

- **Low Risk**: The changes are focused on error handling and don't modify the core functionality
- **Minimal Side Effects**: The changes ensure operations are idempotent and maintain backward compatibility
- **Improved Reliability**: The generator will be more robust against file system errors

## Testing Considerations

The implementation should be tested for:

- Case when memory-bank directory doesn't exist
- Case when memory-bank/templates directory doesn't exist
- Case when template files don't exist
- Case when all directories and files exist (idempotent operation)
- Case when file permissions prevent directory/file creation

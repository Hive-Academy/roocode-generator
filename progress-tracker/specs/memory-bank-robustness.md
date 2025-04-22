# Technical Specification: Memory-Bank Generator Robustness Enhancement

## Overview

This specification details the technical requirements for enhancing the robustness of the memory-bank generator to handle missing directories and template files gracefully.

## Components Affected

1. **MemoryBankFileManager** (`src/memory-bank/MemoryBankFileManager.ts`)
2. **MemoryBankGenerator** (`src/memory-bank/MemoryBankGenerator.ts`)
3. **MemoryBankTemplateManager** (`src/memory-bank/MemoryBankTemplateManager.ts`)

## Functional Requirements

### 1. Directory Creation

The system must:

- Create the `memory-bank` directory if it doesn't exist
- Create the `memory-bank/templates` subdirectory if it doesn't exist
- Handle the case where directories already exist (idempotent operation)
- Log appropriate messages for directory creation operations

### 2. Template Copying

The system must:

- Check if the source template directory exists before attempting to copy
- Create the destination directory if it doesn't exist
- Handle ENOENT errors gracefully when reading the source directory
- Continue with other files/directories when one fails
- Log appropriate warnings for failed operations

### 3. Template Loading

The system must:

- Try to load templates from the primary location
- If primary location fails, try the legacy location
- If both locations fail, provide a fallback template
- Cache templates for better performance
- Log appropriate messages for template loading operations

## Technical Design

### MemoryBankFileManager Changes

```typescript
// Enhanced createMemoryBankDirectory method
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

### MemoryBankTemplateManager Changes

```typescript
// Enhanced loadTemplate method
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

// New method to create fallback templates
private createFallbackTemplate(fileType: MemoryBankFileType): string {
  const title = String(fileType);
  return `# ${title}\n\n<!-- This is a fallback template generated automatically -->\n\n## Overview\n\nThis document provides information about ${title.toLowerCase()}.\n\n## Content\n\nAdd your content here.\n`;
}
```

### MemoryBankGenerator Changes

```typescript
// Enhanced copyDirectoryRecursive method
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

## Error Handling

The implementation will follow these error handling principles:

1. **Explicit Error Checking**: Check for specific error types (e.g., ENOENT, EEXIST)
2. **Graceful Degradation**: Continue execution when possible, with appropriate warnings
3. **Comprehensive Logging**: Log all errors and warnings for debugging
4. **Fallback Mechanisms**: Provide fallbacks when resources are missing

## Testing Requirements

The implementation must be tested for:

1. **Directory Creation**:

   - Test when memory-bank directory doesn't exist
   - Test when memory-bank directory exists but templates subdirectory doesn't
   - Test when both directories exist

2. **Template Copying**:

   - Test when source directory doesn't exist
   - Test when source directory exists but is empty
   - Test when source directory exists with files

3. **Template Loading**:

   - Test when template exists in primary location
   - Test when template exists in legacy location
   - Test when template doesn't exist in either location

4. **Edge Cases**:
   - Test with file permission issues
   - Test with invalid paths
   - Test with empty files

## Performance Considerations

- Template caching is implemented to improve performance for repeated template loading
- Operations are designed to be idempotent to avoid unnecessary work when run multiple times
- Error handling is designed to continue execution when possible to avoid complete failures

## Security Considerations

- Path validation is performed before file operations to prevent path traversal attacks
- File operations use the existing `IFileOperations` interface which includes security checks
- No new security vulnerabilities are introduced by these changes

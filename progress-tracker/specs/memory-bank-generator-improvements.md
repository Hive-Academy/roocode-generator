# Technical Specification: Memory Bank Generator Improvements

## Overview

This document provides technical specifications for implementing two improvements to the memory bank generation process:

1. Utilizing the `stripMarkdownCodeBlock` function to process LLM responses
2. Implementing recursive directory copying for template files

## 1. Utilizing `stripMarkdownCodeBlock`

### Current Implementation

Currently, in both the `generate` and `executeGenerationForType` methods of the `MemoryBankGenerator` class, the LLM response is directly passed to the `processTemplate` method without first processing it with `stripMarkdownCodeBlock`:

```typescript
// Current implementation in executeGenerationForType
const llmResponse = await this.llmAgent.getCompletion(systemPromptResult.value, promptResult.value);
if (llmResponse.isErr()) {
  return Result.err(llmResponse.error ?? new Error("LLM invocation failed"));
}

if (!llmResponse.value) {
  return Result.err(new Error("LLM response is undefined"));
}

// Process the template with enhanced metadata
const processedContentResult = await this.contentProcessor.processTemplate(llmResponse.value, {
  // template data...
});
```

### Required Changes

The implementation needs to be modified to process the LLM response with `stripMarkdownCodeBlock` before passing it to `processTemplate`. This change needs to be made in both the `generate` and `executeGenerationForType` methods.

### Technical Details

#### Interface Usage

The `IContentProcessor` interface already includes the `stripMarkdownCodeBlock` method:

```typescript
export interface IContentProcessor {
  stripMarkdownCodeBlock(content: MessageContent): Result<string>;
  processTemplate(template: string, data: Record<string, unknown>): Promise<Result<string>>;
}
```

#### Implementation in `executeGenerationForType`

Insert the following code after receiving the LLM response and before calling `processTemplate`:

```typescript
// Add this block to strip markdown code blocks
const strippedContentResult = this.contentProcessor.stripMarkdownCodeBlock(llmResponse.value);
if (strippedContentResult.isErr()) {
  return Result.err(
    strippedContentResult.error ?? new Error("Failed to strip markdown code blocks")
  );
}

const strippedContent = strippedContentResult.value;
if (!strippedContent) {
  return Result.err(new Error("Stripped content is undefined"));
}

// Process the template with the stripped content instead of the raw LLM response
const processedContentResult = await this.contentProcessor.processTemplate(strippedContent, {
  // template data...
});
```

#### Implementation in `generate`

The same change should be made in the `generate` method, following the same pattern.

## 2. Implementing Template Folder Copying

### Current Implementation

Currently, the `generateMemoryBankSuite` method copies only specific template files individually:

```typescript
const templateFiles = [
  "completion-report-template.md",
  "implementation-plan-template.md",
  "mode-acknowledgment-template.md",
  "task-description-template.md",
];

for (const templateFile of templateFiles) {
  const sourceTemplate = path.join("templates", "memory-bank", "templates", templateFile);
  const destTemplate = path.join(templatesDir, templateFile);

  // Read and write each file individually
  const readResult = await fileOps.readFile(sourceTemplate);
  // ... error handling ...
  const writeResult = await fileOps.writeFile(destTemplate, templateContent);
  // ... error handling ...
}
```

### Required Changes

Implement a recursive directory copying function and use it to copy the entire templates directory.

### Technical Details

#### New Helper Method

Add a new private helper method to the `MemoryBankGenerator` class:

```typescript
/**
 * Recursively copies a directory from source to destination.
 * @param fileOps - File operations service
 * @param sourceDir - Source directory path
 * @param destDir - Destination directory path
 * @returns A Result indicating success or failure
 */
private async copyDirectoryRecursive(
  fileOps: IFileOperations,
  sourceDir: string,
  destDir: string
): Promise<Result<void, Error>> {
  try {
    // Create destination directory if it doesn't exist
    const createDirResult = await fileOps.createDirectory(destDir);
    if (createDirResult.isErr()) {
      return Result.err(
        new Error(`Failed to create directory ${destDir}: ${createDirResult.error?.message ?? "Unknown error"}`)
      );
    }

    // Read source directory contents
    const readDirResult = await fileOps.readDir(sourceDir);
    if (readDirResult.isErr()) {
      return Result.err(
        new Error(`Failed to read directory ${sourceDir}: ${readDirResult.error?.message ?? "Unknown error"}`)
      );
    }

    const entries = readDirResult.value;
    if (!entries) {
      return Result.err(new Error(`No entries found in directory ${sourceDir}`));
    }

    // Process each entry
    for (const entry of entries) {
      const sourcePath = path.join(sourceDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        // Recursively copy subdirectory
        const copyResult = await this.copyDirectoryRecursive(fileOps, sourcePath, destPath);
        if (copyResult.isErr()) {
          return copyResult;
        }
      } else {
        // Copy file
        const readResult = await fileOps.readFile(sourcePath);
        if (readResult.isErr()) {
          return Result.err(
            new Error(`Failed to read file ${sourcePath}: ${readResult.error?.message ?? "Unknown error"}`)
          );
        }

        const content = readResult.value;
        if (!content) {
          return Result.err(new Error(`Empty content for file ${sourcePath}`));
        }

        const writeResult = await fileOps.writeFile(destPath, content);
        if (writeResult.isErr()) {
          return Result.err(
            new Error(`Failed to write file ${destPath}: ${writeResult.error?.message ?? "Unknown error"}`)
          );
        }
      }
    }

    return Result.ok(undefined);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return Result.err(err);
  }
}
```

#### Updated Template Copying Code

Replace the existing template files copying code in the `generateMemoryBankSuite` method with:

```typescript
this.logger.info("Copying template files...");
const sourceTemplatesDir = path.join("templates", "memory-bank", "templates");
const destTemplatesDir = path.join(memoryBankDir, "templates");

this.logger.debug(`Copying templates from ${sourceTemplatesDir} to ${destTemplatesDir}`);
const copyResult = await this.copyDirectoryRecursive(fileOps, sourceTemplatesDir, destTemplatesDir);
if (copyResult.isErr()) {
  this.logger.error(`Failed to copy templates: ${copyResult.error?.message ?? "Unknown error"}`);
  // Continue execution even if template copying fails
} else {
  this.logger.info("Templates copied successfully");
}
```

## Error Handling

### `stripMarkdownCodeBlock` Integration

- Check for errors from `stripMarkdownCodeBlock` and return appropriate error messages
- Verify that the stripped content is not undefined before proceeding

### Directory Copying

- Handle errors at each step of the directory copying process
- Log detailed error messages to aid in debugging
- Continue execution even if template copying fails, to ensure the main memory bank files are still generated

## Testing Considerations

### Unit Tests

1. Test the `stripMarkdownCodeBlock` integration with various LLM responses
2. Test the `copyDirectoryRecursive` method with different directory structures
3. Test error handling for both features

### Integration Tests

1. Test the end-to-end memory bank generation process
2. Verify that markdown code blocks are properly stripped from LLM responses
3. Verify that all template files are correctly copied to the output directory

## Performance Considerations

- The recursive directory copying might be slightly slower than copying individual files, but the impact should be negligible given the small number of files involved
- The additional processing step to strip markdown code blocks should have minimal performance impact

## Security Considerations

- Ensure proper validation of file paths to prevent path traversal attacks
- Use the existing `validatePath` method in the `FileOperations` class

## Backward Compatibility

- These changes should be fully backward compatible as they enhance existing functionality without changing the public API
- Existing code that uses the memory bank generator should continue to work without modification

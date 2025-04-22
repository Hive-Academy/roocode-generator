# Implementation Plan: Memory Bank Generator Improvements

## Overview

This implementation plan addresses two issues in the memory bank generation process:

1. **Utilize `stripMarkdownCodeBlock`**: Modify the memory bank generation logic to use the `stripMarkdownCodeBlock` method to process the raw LLM output before using it to populate templates.
2. **Implement Template Folder Copying**: Implement logic to copy the entire `templates/memory-bank/templates` folder to the output directory.

## Current Implementation Analysis

### Issue 1: `stripMarkdownCodeBlock` Not Being Used

Currently, in `MemoryBankGenerator.ts`, the LLM response is directly passed to the `processTemplate` method without first processing it with `stripMarkdownCodeBlock`. This can lead to issues if the LLM includes markdown code blocks in its response.

**Current flow in `executeGenerationForType` method:**

```typescript
const llmResponse = await this.llmAgent.getCompletion(systemPromptResult.value, promptResult.value);
// ...
const processedContentResult = await this.contentProcessor.processTemplate(llmResponse.value, {
  // template data...
});
```

### Issue 2: Incomplete Template Folder Copying

Currently, in `generateMemoryBankSuite` method, only specific template files are copied individually:

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
}
```

This approach requires manual updates whenever new template files are added.

## Implementation Plan

### 1. Modify Memory Bank Generation to Use `stripMarkdownCodeBlock`

#### Step 1.1: Update `executeGenerationForType` Method

Modify the `executeGenerationForType` method in `MemoryBankGenerator.ts` to process the LLM response with `stripMarkdownCodeBlock` before passing it to `processTemplate`.

```typescript
// After receiving LLM response
if (!llmResponse.value) {
  return Result.err(new Error("LLM response is undefined"));
}

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

// Process the template with the stripped content
const processedContentResult = await this.contentProcessor.processTemplate(strippedContent, {
  // template data...
});
```

#### Step 1.2: Update `generate` Method

Similarly, update the `generate` method to use `stripMarkdownCodeBlock`:

```typescript
// After receiving LLM response
if (!llmResponse.value) {
  return Result.err(new Error("LLM response is undefined"));
}

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

// Process the template with the stripped content
const processedContentResult = await this.contentProcessor.processTemplate(strippedContent, {
  // template data...
});
```

### 2. Implement Template Folder Copying

Since there's no built-in directory copying function in the `IFileOperations` interface, we'll need to implement a recursive directory copying function.

#### Step 2.1: Create a Helper Method for Directory Copying

Add a private helper method to `MemoryBankGenerator` class:

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

#### Step 2.2: Update `generateMemoryBankSuite` Method

Replace the individual template file copying with a call to the new recursive directory copying method:

```typescript
// Replace the existing template files copying code with:
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

## Testing Plan

### 1. Testing `stripMarkdownCodeBlock` Integration

1. Create a unit test that verifies the LLM response is properly processed with `stripMarkdownCodeBlock` before template processing.
2. Test with various LLM responses containing markdown code blocks to ensure they are properly stripped.

### 2. Testing Template Folder Copying

1. Create a unit test for the `copyDirectoryRecursive` method to verify it correctly copies all files and subdirectories.
2. Test the `generateMemoryBankSuite` method to ensure it correctly copies the entire templates folder.
3. Verify that all template files are correctly copied to the output directory.

## Implementation Steps for Code Mode

### Step 1: Modify Memory Bank Generation to Use `stripMarkdownCodeBlock`

1. Open `src/memory-bank/MemoryBankGenerator.ts`
2. Locate the `executeGenerationForType` method (around line 180)
3. Add the code to process the LLM response with `stripMarkdownCodeBlock` before passing it to `processTemplate`
4. Commit this change with message "Add stripMarkdownCodeBlock processing to memory bank generation"

### Step 2: Implement Directory Copying Helper Method

1. Open `src/memory-bank/MemoryBankGenerator.ts`
2. Add the `copyDirectoryRecursive` helper method to the `MemoryBankGenerator` class
3. Commit this change with message "Add recursive directory copying helper method"

### Step 3: Update Template Folder Copying Logic

1. Open `src/memory-bank/MemoryBankGenerator.ts`
2. Locate the template files copying code in the `generateMemoryBankSuite` method (around line 343)
3. Replace the individual file copying with a call to the new `copyDirectoryRecursive` method
4. Commit this change with message "Update template folder copying to copy entire directory"

### Step 4: Test the Changes

1. Run unit tests to verify the changes work as expected
2. Test the memory bank generation process end-to-end
3. Commit any test additions with message "Add tests for memory bank generator improvements"

## Conclusion

This implementation plan addresses both issues by:

1. Ensuring the `stripMarkdownCodeBlock` function is used to process LLM responses before template processing
2. Implementing a recursive directory copying function to copy the entire templates folder

These changes will improve the robustness of the memory bank generation process and make it more maintainable by automatically including any new template files without requiring code changes.

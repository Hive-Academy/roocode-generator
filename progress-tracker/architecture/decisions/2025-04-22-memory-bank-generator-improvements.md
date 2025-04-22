# Architecture Decision Record: Memory Bank Generator Improvements

## Status

Accepted

## Context

The memory bank generation process currently has two issues that need to be addressed:

1. **Markdown Code Block Handling**: The `stripMarkdownCodeBlock` function from the `IContentProcessor` interface is not being used to process the raw output received from the LLM before using that output to populate templates. This can lead to issues if the LLM includes markdown code blocks in its response, which might interfere with template processing.

2. **Template Folder Copying**: The current implementation only copies specific template files individually from the source templates directory to the output directory. This approach requires manual updates whenever new template files are added, which is error-prone and not maintainable.

## Decision

We have decided to make the following improvements to the memory bank generation process:

1. **Utilize `stripMarkdownCodeBlock`**: Modify the memory bank generation logic in both the `generate` and `executeGenerationForType` methods to use the `stripMarkdownCodeBlock` method from the injected `IContentProcessor` to process the raw output received from the LLM _before_ using that output to populate the template via `processTemplate`.

2. **Implement Recursive Directory Copying**: Implement a recursive directory copying function that will copy the entire `templates/memory-bank/templates` folder to the output directory (`./memory-bank/templates`) after the three main memory bank files have been generated.

## Consequences

### Positive

1. **Improved Robustness**: By properly stripping markdown code blocks from LLM responses, we reduce the risk of template processing errors and ensure more consistent output.
2. **Better Maintainability**: By copying the entire templates directory, we eliminate the need to update the code whenever new template files are added.
3. **Future-Proofing**: The solution is more adaptable to future changes in the template structure, such as adding subdirectories or new template types.

### Negative

1. **Increased Complexity**: The addition of a recursive directory copying function adds some complexity to the codebase.
2. **Potential Performance Impact**: Recursive directory copying might be slightly slower than copying individual files, but the impact should be negligible given the small number of files involved.

### Neutral

1. **File Operations Interface Limitation**: The current `IFileOperations` interface doesn't include a directory copying method, so we need to implement this functionality ourselves. In the future, we might consider extending the interface to include this capability.

## Alternatives Considered

### For Markdown Code Block Handling

1. **Custom Template Processing**: We could have modified the template processing logic to handle markdown code blocks, but this would be more complex and less maintainable than using the existing `stripMarkdownCodeBlock` function.
2. **LLM Prompt Engineering**: We could have tried to prevent the LLM from including markdown code blocks in its responses through prompt engineering, but this approach would be less reliable and harder to maintain.

### For Template Folder Copying

1. **Continue with Individual File Copying**: We could have continued with the current approach of copying individual files, but this would require manual updates whenever new template files are added.
2. **Use External Library**: We could have introduced a dependency on an external library for directory copying, but this would add an unnecessary dependency for a relatively simple operation.
3. **Extend IFileOperations Interface**: We could have extended the `IFileOperations` interface to include a directory copying method, but this would require changes to all implementations of the interface, which is beyond the scope of the current task.

## Implementation Notes

The implementation will:

1. Add code to process LLM responses with `stripMarkdownCodeBlock` before template processing
2. Add a recursive directory copying helper method to the `MemoryBankGenerator` class
3. Replace the individual file copying code with a call to the new helper method

This approach minimizes changes to the existing code while addressing both issues effectively.

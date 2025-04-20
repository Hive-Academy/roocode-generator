# ADR 2025-04-19: Resolution of Dependency Injection Blocker and Adoption Issues

## 1. Investigation Report

### 1.1 File Operations Service DI Blocker

- The FileOperations service implementation uses the DI decorators `@Injectable()` and `@Inject()` as per the DI system specification.
- Import paths for DI decorators (`src/core/di/decorators`) are correct and consistent with project structure.
- The DI decorators rely on `reflect-metadata` and require TypeScript compiler options `experimentalDecorators` and `emitDecoratorMetadata` to be enabled.
- The current `tsconfig.json` has these options commented out, preventing decorator support and metadata emission.
- This causes TypeScript errors and blocks DI integration in FileOperations service.
- No other import path or code issues were found that would cause the DI blocker.

### 1.2 Partial DI Adoption in Template Management System

- The TemplateManager class uses manual constructor injection without DI decorators or container registration.
- This leads to incomplete DI adoption despite architectural intent.
- The Template Management System design document specifies DI usage but lacks concrete examples or enforcement.
- Possible causes include unclear documentation, lack of developer guidance, and absence of automated checks or templates.
- No technical blocker like decorator support was found in this component.

## 2. Proposed Solution

### 2.1 TypeScript Configuration Updates

- Enable the following compiler options in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

- This will enable decorator support and metadata emission required for DI decorators to function.

### 2.2 DI System Code and Import Paths

- Verify and maintain current import paths for DI decorators and container.
- No changes needed as paths are correct.

### 2.3 Documentation and Developer Guidance

- Update `docs/specs/dependency-injection-system.md` to include explicit instructions on enabling TypeScript decorator options.
- Add examples of DI usage with decorators in service implementations.
- Update developer guide or onboarding documentation to emphasize DI adoption best practices.
- Provide a checklist for DI adoption in new components, including:
  - Use of `@Injectable()` on classes
  - Use of `@Inject()` on constructor parameters
  - Registration in DI container if applicable
  - Enabling required tsconfig options

### 2.4 Process Recommendations

- Introduce code reviews focusing on DI usage compliance.
- Consider adding linting or static analysis rules to enforce decorator usage and DI patterns.
- Provide training or knowledge sharing sessions on DI system usage.

## 3. Summary

The DI blocker in FileOperations service is caused by missing TypeScript compiler options enabling decorators and metadata. The partial DI adoption in Template Management System is due to unclear guidance and lack of enforcement rather than technical issues.

Enabling the necessary tsconfig options and improving documentation and developer guidance will resolve the blocker and improve DI adoption consistency.

---

### References

- `task-progress.md`: Lines 15-22 (DI blocker description)
- `src/core/di/decorators.ts`: Lines 1-40 (DI decorators implementation)
- `tsconfig.json`: Lines 20-21 (decorator options commented out)
- `src/core/file-operations/file-operations.ts`: Lines 1-129 (FileOperations service using DI decorators)
- `src/core/templates/template-manager.ts`: Lines 18-152 (TemplateManager without DI decorators)
- `docs/specs/dependency-injection-system.md`: Lines 1-120 (DI system specification)
- `docs/architecture/decisions/0001-typescript-oop-refactor.md`: Lines 20-64 (Architectural decision on DI and strict mode)
- `docs/architecture/designs/template-management-system-design.md`: Lines 5-40 (Template Management System design)

import { Injectable, Inject } from "../di/decorators";
import { IFileOperations } from "../file-operations/interfaces";
import { ILogger } from "../services/logger-service";
import { Result } from "../result/result";
import { IProjectAnalyzer, TechStackAnalysis, ProjectStructure, DependencyGraph } from "./types";
import { LLMAgent } from "../llm/llm-agent";
import path from "path";

interface TechSets {
  languages: Set<string>;
  frameworks: Set<string>;
  buildTools: Set<string>;
  testingFrameworks: Set<string>;
  linters: Set<string>;
}

interface PackageJsonAnalysis {
  deps: Record<string, string>;
  devDeps: Record<string, string>;
  peerDeps: Record<string, string>;
  main?: string;
  module?: string;
}

interface LLMTechStackResponse {
  languages: string[];
  frameworks: string[];
  buildTools: string[];
  testingFrameworks: string[];
  linters: string[];
  packageManager: string;
}

interface LLMProjectStructureResponse {
  sourceDir: string;
  testDir: string;
  configFiles: string[];
  entryPoints: string[];
  componentStructure: Record<string, string[]>;
}

@Injectable()
export class ProjectAnalyzer implements IProjectAnalyzer {
  // Language patterns for detection
  private readonly languagePatterns: Record<string, string[]> = {
    TypeScript: [".ts", ".tsx", "typescript"],
    JavaScript: [".js", ".jsx", "javascript"],
    Python: [".py", "python"],
    Java: [".java", "java"],
    Ruby: [".rb", "ruby"],
    Go: [".go", "golang"],
    Rust: [".rs", "rust"],
    PHP: [".php", "php"],
  };

  // Framework patterns for detection
  private readonly frameworkPatterns: Record<string, string[]> = {
    React: ["react", "jsx", "tsx", "createRoot", "ReactDOM"],
    Angular: ["@angular", "NgModule", "Component"],
    Vue: ["vue", "createApp", "defineComponent"],
    Express: ["express", "app.use", "app.get"],
    NestJS: ["@nestjs", "Injectable", "Module"],
    NextJS: ["next", "getStaticProps", "getServerSideProps"],
    Svelte: ["svelte", "onMount", "createEventDispatcher"],
  };

  constructor(
    @Inject("IFileOperations") private readonly fileOps: IFileOperations,
    @Inject("ILogger") private readonly logger: ILogger,
    @Inject("LLMAgent") private readonly llmAgent: LLMAgent
  ) {
    this.logger.debug("ProjectAnalyzer initialized");
  }

  private async buildProjectPrompt(rootDir: string): Promise<Result<string, Error>> {
    try {
      const files = await this.collectProjectFiles(rootDir);
      const fileContents = await Promise.all(
        files.map(async (file) => {
          const content = await this.fileOps.readFile(file);
          if (content.isOk() && typeof content.value === "string") {
            return `File: ${path.relative(rootDir, file)}\n${content.value}`;
          }
          return "";
        })
      );

      const prompt = fileContents.filter((content) => content).join("\n\n");
      return Result.ok(prompt);
    } catch (error) {
      this.logger.error(
        `Error building project prompt: ${error instanceof Error ? error.message : String(error)}`
      );
      return Result.err(
        new Error(
          `Failed to build project prompt: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  private isValidTechStackResponse(response: unknown): response is LLMTechStackResponse {
    if (!response || typeof response !== "object") return false;
    const r = response as Record<string, unknown>;

    return (
      Array.isArray(r.languages) &&
      Array.isArray(r.frameworks) &&
      Array.isArray(r.buildTools) &&
      Array.isArray(r.testingFrameworks) &&
      Array.isArray(r.linters) &&
      typeof r.packageManager === "string"
    );
  }

  private isValidProjectStructureResponse(
    response: unknown
  ): response is LLMProjectStructureResponse {
    if (!response || typeof response !== "object") return false;
    const r = response as Record<string, unknown>;

    return (
      typeof r.sourceDir === "string" &&
      typeof r.testDir === "string" &&
      Array.isArray(r.configFiles) &&
      Array.isArray(r.entryPoints) &&
      r.componentStructure !== null &&
      typeof r.componentStructure === "object"
    );
  }

  private async analyzeTechStackWithLLM(
    paths: string[]
  ): Promise<Result<TechStackAnalysis, Error>> {
    try {
      const rootResult = await this.findProjectRoot(paths);
      const rootDir = (rootResult.isOk() ? rootResult.value : process.cwd()) as string;

      const systemPrompt = `Analyze the project's tech stack from the provided files.
      Identify languages, frameworks, build tools, testing frameworks, and package manager.
      Return the analysis in JSON format with the following structure:
      {
        "languages": string[],
        "frameworks": string[],
        "buildTools": string[],
        "testingFrameworks": string[],
        "linters": string[],
        "packageManager": string
      }`;

      const promptResult = await this.buildProjectPrompt(rootDir);
      if (promptResult.isErr()) {
        return Result.err(
          new Error(promptResult.error?.message || "Failed to build project prompt")
        );
      }

      if (!promptResult.value) {
        return Result.err(new Error("Empty project prompt"));
      }

      const analysisResult = await this.llmAgent.getCompletion(systemPrompt, promptResult.value);
      if (analysisResult.isErr()) {
        return Result.err(new Error(`LLM analysis failed: ${analysisResult.error?.message}`));
      }

      if (!analysisResult.value) {
        return Result.err(new Error("LLM returned empty response"));
      }

      try {
        const analysis = JSON.parse(analysisResult.value) as LLMTechStackResponse;
        if (!this.isValidTechStackResponse(analysis)) {
          return Result.err(new Error("Invalid tech stack analysis format from LLM"));
        }
        return Result.ok({
          languages: analysis.languages || [],
          frameworks: analysis.frameworks || [],
          buildTools: analysis.buildTools || [],
          testingFrameworks: analysis.testingFrameworks || [],
          linters: analysis.linters || [],
          packageManager: analysis.packageManager || "unknown",
        });
      } catch (error) {
        return Result.err(
          new Error(
            `Failed to parse LLM response: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    } catch (error) {
      return Result.err(
        new Error(
          `LLM tech stack analysis failed: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  private async analyzeProjectStructureWithLLM(
    paths: string[]
  ): Promise<Result<ProjectStructure, Error>> {
    try {
      const rootResult = await this.findProjectRoot(paths);
      const rootDir = (rootResult.isOk() ? rootResult.value : process.cwd()) as string;

      const systemPrompt = `Analyze the project structure from the provided files.
      Identify source directories, test directories, config files, entry points, and component structure.
      Return the analysis in JSON format with the following structure:
      {
        "sourceDir": string,
        "testDir": string,
        "configFiles": string[],
        "entryPoints": string[],
        "componentStructure": Record<string, string[]>
      }`;

      const promptResult = await this.buildProjectPrompt(rootDir);
      if (promptResult.isErr()) {
        return Result.err(
          new Error(promptResult.error?.message || "Failed to build project prompt")
        );
      }

      if (!promptResult.value) {
        return Result.err(new Error("Empty project prompt"));
      }

      const analysisResult = await this.llmAgent.getCompletion(systemPrompt, promptResult.value);
      if (analysisResult.isErr()) {
        return Result.err(new Error(`LLM analysis failed: ${analysisResult.error?.message}`));
      }

      if (!analysisResult.value) {
        return Result.err(new Error("LLM returned empty response"));
      }

      try {
        const analysis = JSON.parse(analysisResult.value) as LLMProjectStructureResponse;
        if (!this.isValidProjectStructureResponse(analysis)) {
          return Result.err(new Error("Invalid project structure analysis format from LLM"));
        }
        return Result.ok({
          rootDir,
          sourceDir: analysis.sourceDir || "unknown",
          testDir: analysis.testDir || "unknown",
          configFiles: analysis.configFiles || [],
          mainEntryPoints: analysis.entryPoints || [],
          componentStructure: analysis.componentStructure || {},
        });
      } catch (error) {
        return Result.err(
          new Error(
            `Failed to parse LLM response: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    } catch (error) {
      return Result.err(
        new Error(
          `LLM project structure analysis failed: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  async analyzeTechStack(paths: string[]): Promise<Result<TechStackAnalysis, Error>> {
    try {
      // First try LLM analysis
      const llmResult = await this.analyzeTechStackWithLLM(paths);
      if (llmResult.isOk()) {
        return llmResult;
      }

      this.logger.warn(
        `LLM analysis failed, falling back to traditional analysis: ${llmResult.error?.message}`
      );

      // Fallback to traditional analysis
      const sets: TechSets = {
        languages: new Set<string>(),
        frameworks: new Set<string>(),
        buildTools: new Set<string>(),
        testingFrameworks: new Set<string>(),
        linters: new Set<string>(),
      };
      let packageManager = "unknown";

      const rootResult = await this.findProjectRoot(paths);
      const rootDir = (rootResult.isOk() ? rootResult.value : process.cwd()) as string;

      const pkgResult = await this.analyzePackageJson(rootDir);
      if (pkgResult.isOk()) {
        const { deps, devDeps } = pkgResult.value as PackageJsonAnalysis;
        this.detectTechFromDependencies(deps || {}, devDeps || {}, sets);
      }

      packageManager = await this.detectPackageManager(rootDir);
      await this.analyzeProjectFiles(rootDir, sets);

      return Result.ok({
        languages: Array.from(sets.languages),
        frameworks: Array.from(sets.frameworks),
        buildTools: Array.from(sets.buildTools),
        testingFrameworks: Array.from(sets.testingFrameworks),
        linters: Array.from(sets.linters),
        packageManager,
      });
    } catch (error) {
      const errorMessage = `Failed to analyze tech stack: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage);
      return Result.err(new Error(errorMessage));
    }
  }

  async analyzeProjectStructure(paths: string[]): Promise<Result<ProjectStructure, Error>> {
    try {
      const rootResult = await this.findProjectRoot(paths);
      const rootDir = (rootResult.isOk() ? rootResult.value : process.cwd()) as string;

      const sourceDirs = await this.discoverSourceDirectories(rootDir);
      const sourceDir = sourceDirs.length > 0 ? sourceDirs[0] : "unknown";

      const testDirs = await this.discoverTestDirectories(rootDir);
      const testDir = testDirs.length > 0 ? testDirs[0] : "unknown";

      const configFiles = await this.discoverConfigFiles(rootDir);
      const entryPoints = await this.findEntryPoints(rootDir);
      const componentStructure = await this.analyzeComponentStructure(rootDir);

      return Result.ok({
        rootDir,
        sourceDir,
        testDir,
        configFiles,
        mainEntryPoints: entryPoints,
        componentStructure,
      });
    } catch (error) {
      const errorMessage = `Failed to analyze project structure: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage);
      return Result.err(new Error(errorMessage));
    }
  }

  async analyzeDependencies(_paths: string[]): Promise<Result<DependencyGraph, Error>> {
    try {
      const rootResult = await this.findProjectRoot(_paths);
      const rootDir = (rootResult.isOk() ? rootResult.value : process.cwd()) as string;

      const pkgResult = await this.analyzePackageJson(rootDir);
      const {
        deps = {},
        devDeps = {},
        peerDeps = {},
      } = (pkgResult.isOk() ? pkgResult.value : {}) as PackageJsonAnalysis;

      const internalDeps = await this.analyzeInternalDependencies(rootDir);

      return Result.ok({
        dependencies: deps,
        devDependencies: devDeps,
        peerDependencies: peerDeps,
        internalDependencies: internalDeps,
      });
    } catch (error) {
      const errorMessage = `Failed to analyze dependencies: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage);
      return Result.err(new Error(errorMessage));
    }
  }

  private async findProjectRoot(startPaths: string[]): Promise<Result<string, Error>> {
    try {
      let currentPath = "";

      for (const p of startPaths) {
        const resolvedPath = path.resolve(p);
        const statResult = await this.fileOps.readFile(resolvedPath);

        if (statResult.isOk()) {
          currentPath = path.dirname(resolvedPath);
          break;
        }
      }

      currentPath = currentPath || process.cwd();
      const systemRoot = path.parse(currentPath).root;

      while (currentPath !== systemRoot) {
        const hasPackageJson = (
          await this.fileOps.readFile(path.join(currentPath, "package.json"))
        ).isOk();
        const hasGitDir = (await this.fileOps.readDir(path.join(currentPath, ".git"))).isOk();

        if (hasPackageJson || hasGitDir) {
          return Result.ok(currentPath);
        }

        const parentPath = path.dirname(currentPath);
        if (parentPath === currentPath) break;
        currentPath = parentPath;
      }

      return Result.err(new Error("Could not find project root"));
    } catch (error) {
      return Result.err(
        new Error(
          `Error finding project root: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  private async analyzePackageJson(rootDir: string): Promise<Result<PackageJsonAnalysis, Error>> {
    try {
      const pkgPath = path.join(rootDir, "package.json");
      const readResult = await this.fileOps.readFile(pkgPath);

      if (readResult.isOk() && typeof readResult.value === "string") {
        const pkg = JSON.parse(readResult.value);
        return Result.ok({
          deps: pkg.dependencies || {},
          devDeps: pkg.devDependencies || {},
          peerDeps: pkg.peerDependencies || {},
          main: pkg.main,
          module: pkg.module,
        });
      }

      return Result.err(new Error("Could not read package.json"));
    } catch (error) {
      return Result.err(
        new Error(
          `Error analyzing package.json: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  private async detectPackageManager(rootDir: string): Promise<string> {
    const lockFiles = {
      "yarn.lock": "yarn",
      "package-lock.json": "npm",
      "pnpm-lock.yaml": "pnpm",
    };

    for (const [file, manager] of Object.entries(lockFiles)) {
      if ((await this.fileOps.readFile(path.join(rootDir, file))).isOk()) {
        return manager;
      }
    }

    return "unknown";
  }

  private detectTechFromDependencies(
    deps: Record<string, string>,
    devDeps: Record<string, string>,
    sets: TechSets
  ): void {
    const allDeps = { ...deps, ...devDeps };

    // Detect languages and frameworks from dependencies
    for (const [tech, patterns] of Object.entries(this.languagePatterns)) {
      if (patterns.some((pattern) => Object.keys(allDeps).some((dep) => dep.includes(pattern)))) {
        sets.languages.add(tech);
      }
    }

    for (const [framework, patterns] of Object.entries(this.frameworkPatterns)) {
      if (patterns.some((pattern) => Object.keys(allDeps).some((dep) => dep.includes(pattern)))) {
        sets.frameworks.add(framework);
      }
    }
  }

  private async analyzeProjectFiles(rootDir: string, sets: TechSets): Promise<void> {
    const analyzeDir = async (dir: string): Promise<void> => {
      const result = await this.fileOps.readDir(dir);
      if (!result.isOk() || !result.value) return;

      const items = result.value;
      for (const item of items) {
        const itemName = typeof item === "string" ? item : item.name;
        const fullPath = path.join(dir, itemName);
        const stat = await this.fileOps.readFile(fullPath);

        if (stat.isOk() && typeof stat.value === "string") {
          this.detectTechFromFile(fullPath, stat.value, sets);
        }
      }
    };

    await analyzeDir(rootDir);
  }

  private async discoverSourceDirectories(rootDir: string): Promise<string[]> {
    const dirs: string[] = [];
    const result = await this.fileOps.readDir(rootDir);

    if (!result.isOk() || !result.value) return dirs;

    const items = result.value;
    for (const item of items) {
      const itemName = typeof item === "string" ? item : item.name;
      const fullPath = path.join(rootDir, itemName);

      // Check if path is a directory
      const isDirResult = await this.isDirectory(fullPath);
      if (isDirResult.isErr()) {
        this.logger.warn(`Error checking directory status: ${fullPath} - ${isDirResult.error}`);
        continue;
      }
      if (!isDirResult.value) {
        this.logger.debug(`Skipping non-directory entry: ${itemName}`);
        continue;
      }

      if (await this.isLikelySourceDir(itemName, fullPath)) {
        dirs.push(itemName);
      }
    }

    return dirs;
  }

  private async isLikelySourceDir(name: string, dirPath: string): Promise<boolean> {
    const sourcePatterns = ["src", "lib", "app", "source"];
    return sourcePatterns.includes(name.toLowerCase()) || (await this.containsSourceFiles(dirPath));
  }

  private async discoverTestDirectories(rootDir: string): Promise<string[]> {
    const dirs: string[] = [];
    const result = await this.fileOps.readDir(rootDir);

    if (!result.isOk() || !result.value) return dirs;

    const items = result.value;
    for (const item of items) {
      const itemName = typeof item === "string" ? item : item.name;
      const fullPath = path.join(rootDir, itemName);

      // Check if path is a directory
      const isDirResult = await this.isDirectory(fullPath);
      if (isDirResult.isErr()) {
        this.logger.warn(`Error checking directory status: ${fullPath} - ${isDirResult.error}`);
        continue;
      }
      if (!isDirResult.value) {
        this.logger.debug(`Skipping non-directory entry in test discovery: ${itemName}`);
        continue;
      }

      if (this.isLikelyTestDir(itemName)) {
        dirs.push(itemName);
      }
    }

    return dirs;
  }

  private isLikelyTestDir(name: string): boolean {
    const testPatterns = ["test", "tests", "spec", "__tests__"];
    return testPatterns.some((pattern) => name.toLowerCase().includes(pattern));
  }

  private async discoverConfigFiles(rootDir: string): Promise<string[]> {
    const configFiles: string[] = [];
    const result = await this.fileOps.readDir(rootDir);

    if (!result.isOk() || !result.value) return configFiles;

    const items = result.value;
    for (const item of items) {
      const itemName = typeof item === "string" ? item : item.name;
      if (this.isLikelyConfigFile(itemName)) {
        configFiles.push(itemName);
      }
    }

    return configFiles;
  }

  private isLikelyConfigFile(name: string): boolean {
    return (
      name.endsWith(".config.js") ||
      name.endsWith(".config.ts") ||
      name.startsWith(".") ||
      name === "package.json"
    );
  }

  private async findEntryPoints(rootDir: string): Promise<string[]> {
    const entryPoints: string[] = [];

    const pkgResult = await this.analyzePackageJson(rootDir);
    if (pkgResult.isOk()) {
      const { main, module } = pkgResult.value as PackageJsonAnalysis;
      if (typeof main === "string") entryPoints.push(main);
      if (typeof module === "string") entryPoints.push(module);
    }

    const sourceDirs = await this.discoverSourceDirectories(rootDir);
    for (const dir of sourceDirs) {
      const indexFiles = ["index.js", "index.ts", "main.js", "main.ts"];
      for (const file of indexFiles) {
        const fullPath = path.join(rootDir, dir, file);
        if ((await this.fileOps.readFile(fullPath)).isOk()) {
          entryPoints.push(path.join(dir, file));
        }
      }
    }

    return entryPoints;
  }

  /**
   * Safely checks if a path is a directory using file system stats.
   * Includes comprehensive error handling and logging.
   * @param path - The path to check
   * @returns A Result containing boolean indicating if path is a directory
   */
  private async isDirectory(path: string): Promise<Result<boolean, Error>> {
    try {
      // First check if path exists
      const existsResult = await this.fileOps.exists(path);
      if (!existsResult.isOk()) {
        this.logger.debug(`Failed to check existence of path: ${path}, ${existsResult.error}`);
        return Result.err(existsResult.error as Error);
      }

      if (!existsResult.value) {
        this.logger.debug(`Path does not exist: ${path}`);
        return Result.ok(false);
      }

      // Try to read file stats
      const statsResult = await this.fileOps.readFile(path);
      if (!statsResult.isOk()) {
        // If we get ENOTDIR, it's a file - return false without error
        if (statsResult.error?.message?.includes("ENOTDIR")) {
          this.logger.debug(`Path is not a directory: ${path}`);
          return Result.ok(false);
        }
        this.logger.debug(`Failed to read stats for path: ${path} , ${statsResult.error}`);
        return Result.err(statsResult.error as Error);
      }

      // If we can read it as a file, it's not a directory
      this.logger.debug(`Path is a file: ${path}`);
      return Result.ok(false);
    } catch (error) {
      const errorMessage = `Error checking if path is directory: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage);
      return Result.err(new Error(errorMessage));
    }
  }

  private async containsSourceFiles(dir: string): Promise<boolean> {
    // First check if the path is a directory
    const isDirResult = await this.isDirectory(dir);
    if (isDirResult.isErr()) {
      this.logger.warn(`Error checking directory status: ${dir} - ${isDirResult.error}`);
      return false;
    }
    if (!isDirResult.value) {
      this.logger.debug(`Skipping source files check for non-directory path: ${dir}`);
      return false;
    }

    const result = await this.fileOps.readDir(dir);
    if (!result.isOk() || !result.value) return false;

    const items = result.value;
    const sourceExtensions = [".js", ".ts", ".jsx", ".tsx"];
    return items.some((item) => {
      const itemName = typeof item === "string" ? item : item.name;
      return sourceExtensions.some((ext) => itemName.endsWith(ext));
    });
  }

  private detectTechFromFile(filepath: string, content: string, sets: TechSets): void {
    const ext = path.extname(filepath).toLowerCase();

    // Detect languages from file extensions and content
    for (const [lang, patterns] of Object.entries(this.languagePatterns)) {
      if (
        patterns.some((pattern) => ext.includes(pattern) || content.toLowerCase().includes(pattern))
      ) {
        sets.languages.add(lang);
      }
    }

    // Detect frameworks from content patterns
    for (const [framework, patterns] of Object.entries(this.frameworkPatterns)) {
      if (patterns.some((pattern) => content.includes(pattern))) {
        sets.frameworks.add(framework);
      }
    }
  }

  private async analyzeComponentStructure(rootDir: string): Promise<Record<string, string[]>> {
    const structure: Record<string, string[]> = {};
    const sourceDirs = await this.discoverSourceDirectories(rootDir);

    for (const dir of sourceDirs) {
      const components = await this.findComponents(path.join(rootDir, dir));
      if (components.length > 0) {
        structure[dir] = components;
      }
    }

    return structure;
  }

  private async findComponents(dir: string): Promise<string[]> {
    const components: string[] = [];

    // Verify the directory exists and is actually a directory
    const isDirResult = await this.isDirectory(dir);
    if (isDirResult.isErr()) {
      this.logger.warn(`Error checking directory status: ${dir} - ${isDirResult.error}`);
      return components;
    }
    if (!isDirResult.value) {
      this.logger.debug(`Skipping component search in non-directory: ${dir}`);
      return components;
    }

    const result = await this.fileOps.readDir(dir);
    if (!result.isOk() || !result.value) return components;

    const items = result.value;
    for (const item of items) {
      const itemName = typeof item === "string" ? item : item.name;
      const fullPath = path.join(dir, itemName);

      // Check if path is a directory
      const isDirResult = await this.isDirectory(fullPath);
      if (isDirResult.isErr()) {
        this.logger.warn(`Error checking directory status: ${fullPath} - ${isDirResult.error}`);
        continue;
      }
      if (isDirResult.value) {
        // Skip directories
        continue;
      }

      if (this.isLikelyComponent(itemName)) {
        components.push(itemName);
      }
    }

    return components;
  }

  private isLikelyComponent(name: string): boolean {
    return (
      name.endsWith(".component.ts") ||
      name.endsWith(".component.js") ||
      name.endsWith(".tsx") ||
      name.endsWith(".jsx")
    );
  }

  private async analyzeInternalDependencies(rootDir: string): Promise<Record<string, string[]>> {
    const dependencies: Record<string, string[]> = {};
    const sourceDirs = await this.discoverSourceDirectories(rootDir);

    for (const dir of sourceDirs) {
      const files = await this.findSourceFiles(path.join(rootDir, dir));
      for (const file of files) {
        const content = await this.fileOps.readFile(path.join(rootDir, dir, file));
        if (content.isOk() && typeof content.value === "string") {
          dependencies[path.join(dir, file)] = this.extractImports(content.value);
        }
      }
    }

    return dependencies;
  }

  private async findSourceFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    // Verify the directory exists and is actually a directory
    const isDirResult = await this.isDirectory(dir);
    if (isDirResult.isErr()) {
      this.logger.warn(`Error checking directory status: ${dir} - ${isDirResult.error}`);
      return files;
    }
    if (!isDirResult.value) {
      this.logger.debug(`Skipping source file search in non-directory: ${dir}`);
      return files;
    }

    const result = await this.fileOps.readDir(dir);
    if (!result.isOk() || !result.value) return files;

    const items = result.value;
    for (const item of items) {
      const itemName = typeof item === "string" ? item : item.name;
      const fullPath = path.join(dir, itemName);

      // Skip if not a file (e.g., subdirectories)
      if (await this.isDirectory(fullPath)) {
        continue;
      }

      if (this.isSourceFile(itemName)) {
        files.push(itemName);
      }
    }

    return files;
  }

  private isSourceFile(name: string): boolean {
    return /\.(js|jsx|ts|tsx)$/.test(name);
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private async collectProjectFiles(rootDir: string): Promise<string[]> {
    const files: string[] = [];
    const result = await this.fileOps.readDir(rootDir);

    if (!result.isOk() || !result.value) return files;

    const items = result.value;
    for (const item of items) {
      const itemName = typeof item === "string" ? item : item.name;
      const fullPath = path.join(rootDir, itemName);

      if (this.shouldAnalyzeFile(itemName)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private shouldAnalyzeFile(fileName: string): boolean {
    const relevantExtensions = [".js", ".jsx", ".ts", ".tsx", ".json", ".yml", ".yaml"];
    const relevantNames = ["package.json", ".gitignore", ".npmrc", "tsconfig.json"];

    return (
      relevantExtensions.some((ext) => fileName.endsWith(ext)) || relevantNames.includes(fileName)
    );
  }
}

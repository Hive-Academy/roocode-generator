import { ITechStackAnalyzerService } from '../../src/core/analysis/tech-stack-analyzer';
import { TechStackAnalysis } from '../../src/core/analysis/types';

export const createMockTechStackAnalyzerService = (): jest.Mocked<ITechStackAnalyzerService> => {
  const mockTechStackAnalysis: TechStackAnalysis = {
    languages: ['mockLang'],
    frameworks: ['mockFramework'],
    buildTools: ['mockBuildTool'],
    testingFrameworks: ['mockTestFramework'],
    linters: ['mockLinter'],
    packageManager: 'mockPM',
  };

  return {
    analyze: jest.fn().mockResolvedValue(mockTechStackAnalysis),
  };
};

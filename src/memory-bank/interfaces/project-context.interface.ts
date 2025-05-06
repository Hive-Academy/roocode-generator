import { Result } from '../../core/result/result';

export interface IProjectContextService {
  gatherContext(paths: string[]): Promise<Result<string, Error>>;
}

export interface WorkflowStep {
  code: string;
  name: string;
  order: number;

  execute(context: WorkflowContext): Promise<void>;
}

export interface WorkflowContext {
  siteId: string;

  articleId?: string;

  keywordId?: string;

  productionRunId?: string;

  logger: WorkflowLogger;
}

export interface WorkflowLogger {
  info(message: string): void;

  warn(message: string): void;

  error(message: string): void;
}
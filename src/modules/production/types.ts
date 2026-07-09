export interface ProductionRun {
  id: string;
  site_id: string;
  article_id: string;
  status: string;
  current_step: string | null;
  progress_percent: number;
  error_message: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
  article_title?: string;
}

export interface ProductionRunStep {
  id: string;
  production_run_id: string;
  step_code: string;
  step_name: string;
  step_order: number;
  status: string;
  started_at: Date | null;
  finished_at: Date | null;
  error_message: string | null;
}
export interface ProductionRun {
  id: string;
  site_id: string | null;
  keyword_id: string | null;
  article_id: string | null;
  status: string;
  current_step: string | null;
  progress_percent: number;
  worker_id: string | null;
  locked_at: Date | null;
  attempt_count: number;
  error_message: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
  duration_seconds?: number | null;
  last_activity_at?: Date | null;
  article_title?: string | null;
  keyword?: string | null;
  site_name?: string | null;
  domain?: string | null;
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
  duration_seconds?: number | null;
  error_message: string | null;
}

export interface ProductionRunEvent {
  id: string;
  production_run_id: string;
  step_code: string | null;
  event_type: string;
  status: string | null;
  message: string;
  details_json: unknown;
  created_at: Date;
}

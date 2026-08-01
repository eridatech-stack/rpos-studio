ALTER TABLE prompt_versions
  ADD COLUMN provider VARCHAR(50) NOT NULL DEFAULT 'openai' AFTER prompt_text;

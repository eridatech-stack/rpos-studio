CREATE TABLE social_posts (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  site_id CHAR(36) NOT NULL,
  article_id CHAR(36) NOT NULL,
  platform VARCHAR(50) NOT NULL DEFAULT 'facebook',
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  message VARCHAR(1000) NOT NULL,
  link_url TEXT NOT NULL,
  provider_post_id VARCHAR(255) NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  scheduled_at DATETIME NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_social_post_article_platform (article_id, platform),
  KEY idx_social_posts_queue (platform, status, scheduled_at, created_at),
  KEY idx_social_posts_site_status (site_id, status, created_at),
  CONSTRAINT social_posts_site_fk
    FOREIGN KEY (site_id) REFERENCES sites(id)
    ON DELETE CASCADE,
  CONSTRAINT social_posts_article_fk
    FOREIGN KEY (article_id) REFERENCES articles(id)
    ON DELETE CASCADE
);

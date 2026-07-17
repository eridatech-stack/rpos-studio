CREATE TABLE keyword_packs (
  id CHAR(36) NOT NULL,
  site_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  niche VARCHAR(500) NOT NULL,
  target_language VARCHAR(100) NULL,
  target_countries JSON NULL,
  audience TEXT NULL,
  business_goal TEXT NULL,
  monetization_model TEXT NULL,
  excluded_topics TEXT NULL,
  preferred_categories TEXT NULL,
  brand_notes TEXT NULL,
  generation_mode ENUM('balanced', 'low_competition', 'high_traffic', 'commercial', 'informational') NOT NULL DEFAULT 'balanced',
  requested_keyword_count INT NOT NULL,
  status ENUM('draft', 'queued', 'running', 'ready_for_review', 'importing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'draft',
  progress_percent INT NOT NULL DEFAULT 0,
  current_step VARCHAR(100) NULL,
  error_message TEXT NULL,
  created_by VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_keyword_packs_site_status_created (site_id, status, created_at),
  INDEX idx_keyword_packs_site_niche (site_id, niche),
  CONSTRAINT keyword_packs_site_fk
    FOREIGN KEY (site_id)
    REFERENCES sites (id)
    ON DELETE CASCADE
);

CREATE TABLE keyword_pack_categories (
  id CHAR(36) NOT NULL,
  keyword_pack_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NULL,
  priority ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium',
  sort_order INT NOT NULL DEFAULT 0,
  status ENUM('pending', 'approved', 'rejected', 'edited', 'imported', 'duplicate') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_keyword_pack_category_slug (keyword_pack_id, slug),
  INDEX idx_keyword_pack_categories_pack_order (keyword_pack_id, sort_order),
  CONSTRAINT keyword_pack_categories_pack_fk
    FOREIGN KEY (keyword_pack_id)
    REFERENCES keyword_packs (id)
    ON DELETE CASCADE
);

CREATE TABLE keyword_pack_clusters (
  id CHAR(36) NOT NULL,
  keyword_pack_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NULL,
  pillar_keyword VARCHAR(255) NULL,
  pillar_title VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status ENUM('pending', 'approved', 'rejected', 'edited', 'imported', 'duplicate') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_keyword_pack_cluster_slug (keyword_pack_id, slug),
  INDEX idx_keyword_pack_clusters_pack_order (keyword_pack_id, sort_order),
  INDEX idx_keyword_pack_clusters_category (category_id),
  CONSTRAINT keyword_pack_clusters_pack_fk
    FOREIGN KEY (keyword_pack_id)
    REFERENCES keyword_packs (id)
    ON DELETE CASCADE,
  CONSTRAINT keyword_pack_clusters_category_fk
    FOREIGN KEY (category_id)
    REFERENCES keyword_pack_categories (id)
    ON DELETE CASCADE
);

CREATE TABLE keyword_pack_items (
  id CHAR(36) NOT NULL,
  keyword_pack_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  cluster_id CHAR(36) NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  suggested_title VARCHAR(500) NULL,
  intent ENUM('informational', 'commercial', 'transactional', 'navigational') NOT NULL DEFAULT 'informational',
  article_type ENUM('pillar', 'cluster', 'faq', 'review', 'comparison', 'news', 'how_to') NOT NULL DEFAULT 'cluster',
  priority ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium',
  estimated_search_volume INT NULL,
  estimated_difficulty INT NULL,
  ai_opportunity_score INT NULL,
  is_pillar BOOLEAN NOT NULL DEFAULT FALSE,
  parent_pillar_item_id CHAR(36) NULL,
  related_item_ids_json JSON NULL,
  notes TEXT NULL,
  review_status ENUM('pending', 'approved', 'rejected', 'edited', 'imported', 'duplicate') NOT NULL DEFAULT 'pending',
  existing_keyword_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_keyword_pack_item_keyword (keyword_pack_id, keyword),
  INDEX idx_keyword_pack_items_pack_review (keyword_pack_id, review_status),
  INDEX idx_keyword_pack_items_pack_cluster (keyword_pack_id, cluster_id),
  INDEX idx_keyword_pack_items_parent_pillar (parent_pillar_item_id),
  INDEX idx_keyword_pack_items_existing_keyword (existing_keyword_id),
  CONSTRAINT keyword_pack_items_pack_fk
    FOREIGN KEY (keyword_pack_id)
    REFERENCES keyword_packs (id)
    ON DELETE CASCADE,
  CONSTRAINT keyword_pack_items_category_fk
    FOREIGN KEY (category_id)
    REFERENCES keyword_pack_categories (id)
    ON DELETE CASCADE,
  CONSTRAINT keyword_pack_items_cluster_fk
    FOREIGN KEY (cluster_id)
    REFERENCES keyword_pack_clusters (id)
    ON DELETE CASCADE,
  CONSTRAINT keyword_pack_items_parent_pillar_fk
    FOREIGN KEY (parent_pillar_item_id)
    REFERENCES keyword_pack_items (id)
    ON DELETE SET NULL,
  CONSTRAINT keyword_pack_items_existing_keyword_fk
    FOREIGN KEY (existing_keyword_id)
    REFERENCES keywords (id)
    ON DELETE SET NULL
);

CREATE TABLE keyword_pack_events (
  id CHAR(36) NOT NULL,
  keyword_pack_id CHAR(36) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NULL,
  message VARCHAR(1000) NOT NULL,
  details_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_keyword_pack_events_pack_created (keyword_pack_id, created_at),
  INDEX idx_keyword_pack_events_type (event_type),
  CONSTRAINT keyword_pack_events_pack_fk
    FOREIGN KEY (keyword_pack_id)
    REFERENCES keyword_packs (id)
    ON DELETE CASCADE
);

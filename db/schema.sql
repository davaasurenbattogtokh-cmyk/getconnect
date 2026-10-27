CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  token VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  company VARCHAR(150) NOT NULL, chapter VARCHAR(100) NOT NULL,
  sector VARCHAR(100) NOT NULL, description TEXT NOT NULL,
  audience VARCHAR(30) NOT NULL, contact VARCHAR(100) NOT NULL,
  position VARCHAR(100) NOT NULL, phone VARCHAR(30) NOT NULL,
  email VARCHAR(150) NOT NULL, website VARCHAR(300) NOT NULL,
  logo VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  booths TEXT NOT NULL, meetings MEDIUMTEXT NOT NULL, notes TEXT NOT NULL,
  status VARCHAR(20) NOT NULL, reason TEXT NOT NULL,
  created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, expires_at BIGINT NOT NULL,
  decision_key VARCHAR(36) NOT NULL DEFAULT '', rate_per_sqm INT, total_price BIGINT,
  INDEX applications_email_created (email, created_at),
  INDEX applications_status_expiry (status, expires_at)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservations (
  booth_id VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  application_id VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  FOREIGN KEY (application_id) REFERENCES applications(id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(100) PRIMARY KEY, value MEDIUMTEXT NOT NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit (
  id VARCHAR(36) PRIMARY KEY, application_id VARCHAR(32) NOT NULL,
  actor VARCHAR(100) NOT NULL, action VARCHAR(30) NOT NULL, detail TEXT NOT NULL,
  at BIGINT NOT NULL, INDEX audit_at (at)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mail_outbox (
  id VARCHAR(36) PRIMARY KEY, application_id VARCHAR(32) NOT NULL,
  kind VARCHAR(30) NOT NULL, recipient VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL, error TEXT NOT NULL, created_at BIGINT NOT NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL,
  INDEX sessions_expiry (expires_at)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  `key` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  attempts INT NOT NULL, expires_at BIGINT NOT NULL,
  INDEX attempts_expiry (expires_at)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS logos (
  `key` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  content_type VARCHAR(40) NOT NULL, size INT NOT NULL
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS logo_chunks (
  logo_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  part INT NOT NULL, bytes MEDIUMBLOB NOT NULL,
  PRIMARY KEY (logo_key, part),
  FOREIGN KEY (logo_key) REFERENCES logos(`key`) ON DELETE CASCADE
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

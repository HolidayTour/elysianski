CREATE TABLE IF NOT EXISTS tm_state (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tour_key VARCHAR(40) NOT NULL,      -- 예: 2026-02-05 같은 날짜키
  team VARCHAR(8) NOT NULL,           -- A/B/C...
  group_id VARCHAR(80) NOT NULL,      -- 그룹 고유키(연락처/이름 기반으로 생성)
  boarded TINYINT(1) NOT NULL DEFAULT 0,
  memo TEXT NULL,
  dist_json JSON NULL,               -- {"lift":true,"moving":false,...}
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_team_group (tour_key, team, group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tm_seatmap (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tour_key VARCHAR(40) NOT NULL,
  team VARCHAR(8) NOT NULL,
  bus_size INT NOT NULL DEFAULT 44,
  blocked_json JSON NULL,            -- [1,2,3]
  seat_json JSON NULL,               -- {"1":"group_id_x","2":"group_id_y"...}
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_team (tour_key, team)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tm_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tour_key VARCHAR(40) NOT NULL,
  team VARCHAR(8) NOT NULL,
  guide_name VARCHAR(80) NULL,
  global_notice TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_settings (tour_key, team)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

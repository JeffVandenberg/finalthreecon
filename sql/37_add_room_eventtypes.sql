CREATE TABLE IF NOT EXISTS room_eventtypes
(
    room_id      VARCHAR(36) NOT NULL,
    eventtype_id VARCHAR(36) NOT NULL,
    UNIQUE KEY unique_room_eventtype (room_id, eventtype_id),
    KEY idx_room_id (room_id),
    KEY idx_eventtype_id (eventtype_id)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_general_ci

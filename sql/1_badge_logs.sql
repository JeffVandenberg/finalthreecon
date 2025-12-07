CREATE TABLE `badge_logs` (
                              `id` varchar(36) NOT NULL,
                              `badge_id` varchar(36) NOT NULL,
                              `commenter_name` varchar(100) NOT NULL,
                              `comment` varchar(255) NOT NULL,
                              `type` varchar(25) NOT NULL,
                              `date_created` datetime NOT NULL,
                              `date_updated` datetime NOT NULL,
                              PRIMARY KEY (`id`),
                              KEY `badge_id` (`badge_id`),
                              FULLTEXT KEY `comment` (`comment`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

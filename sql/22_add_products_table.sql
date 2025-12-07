CREATE TABLE `products` (
        `id` varchar(36) NOT NULL,
        `variant_name` varchar(200) NOT NULL,
        `badge_id` varchar(36) NOT NULL,
        `pick_up_date` datetime DEFAULT NULL,
        `picked_up` tinyint(1) DEFAULT 0,
        PRIMARY KEY (`id`),
        KEY `products_badge_id_index` (`badge_id`),
        KEY `products_name_index` (`variant_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci

